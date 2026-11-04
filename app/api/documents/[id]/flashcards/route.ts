import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { Document, FlashcardSet, Flashcard } from "@/lib/types";
import { generateFlashcardsFromDocument } from "@/lib/gemini";
import { v4 as uuidv4 } from "uuid";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const sets = db
      .prepare("SELECT * FROM flashcard_sets WHERE document_id = ? ORDER BY created_at DESC")
      .all(id) as Array<Omit<FlashcardSet, "cards"> & { cards: string }>;

    const parsed = sets.map((s) => ({
      ...s,
      cards: JSON.parse(s.cards) as Flashcard[],
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const doc = db
      .prepare("SELECT * FROM documents WHERE id = ?")
      .get(id) as Document | undefined;

    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    if (doc.status !== "ready") {
      return NextResponse.json({ error: "Document is not ready" }, { status: 400 });
    }
    if (!doc.extracted_text || doc.extracted_text.trim().length === 0) {
      return NextResponse.json({ error: "Document has no readable text" }, { status: 400 });
    }

    const rawCards = await generateFlashcardsFromDocument(
      doc.original_name,
      doc.extracted_text
    );

    const cards: Flashcard[] = rawCards.map((c: any) => ({
      id: uuidv4(),
      front: String(c.front || ""),
      back: String(c.back || ""),
      topic: c.topic ? String(c.topic) : "General",
    }));

    if (cards.length === 0) {
      return NextResponse.json({ error: "No flashcards were generated" }, { status: 500 });
    }

    // Replace previous set for this document
    db.prepare("DELETE FROM flashcard_sets WHERE document_id = ?").run(id);

    const setId = uuidv4();
    db.prepare(`
      INSERT INTO flashcard_sets (id, document_id, title, cards, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(setId, id, `Flashcards: ${doc.original_name}`, JSON.stringify(cards));

    const set = db
      .prepare("SELECT * FROM flashcard_sets WHERE id = ?")
      .get(setId) as Omit<FlashcardSet, "cards"> & { cards: string };

    return NextResponse.json({ ...set, cards }, { status: 201 });
  } catch (error: any) {
    console.error("Flashcard generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate flashcards" },
      { status: 500 }
    );
  }
}
