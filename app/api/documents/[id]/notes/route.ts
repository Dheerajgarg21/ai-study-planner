import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { Document, Notes } from "@/lib/types";
import { generateNotesFromDocument } from "@/lib/gemini";
import { v4 as uuidv4 } from "uuid";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const notes = db
      .prepare("SELECT * FROM notes WHERE document_id = ? ORDER BY created_at DESC LIMIT 1")
      .get(id) as Notes | undefined;

    if (!notes) return NextResponse.json({ notes: null });
    return NextResponse.json({ notes });
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
      return NextResponse.json(
        { error: "Document is not ready. Text extraction must succeed before generating notes." },
        { status: 400 }
      );
    }
    if (!doc.extracted_text || doc.extracted_text.trim().length === 0) {
      return NextResponse.json(
        { error: "Document has no readable text for note generation." },
        { status: 400 }
      );
    }

    const content = await generateNotesFromDocument(
      doc.original_name,
      doc.subject,
      doc.extracted_text
    );

    // Delete old notes for this document
    db.prepare("DELETE FROM notes WHERE document_id = ?").run(id);

    const notesId = uuidv4();
    db.prepare(`
      INSERT INTO notes (id, document_id, content, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).run(notesId, id, content);

    const notes = db.prepare("SELECT * FROM notes WHERE id = ?").get(notesId) as Notes;
    return NextResponse.json({ notes });
  } catch (error: any) {
    console.error("Notes generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate notes" },
      { status: 500 }
    );
  }
}
