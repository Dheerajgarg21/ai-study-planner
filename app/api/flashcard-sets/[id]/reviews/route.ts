import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { FlashcardReview } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // set ID
    const db = getDb();
    const reviews = db
      .prepare("SELECT * FROM flashcard_reviews WHERE set_id = ? ORDER BY reviewed_at DESC")
      .all(id) as FlashcardReview[];
    return NextResponse.json(reviews);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // set ID
    const db = getDb();
    const body = await request.json();
    const { card_index, rating } = body;

    if (typeof card_index !== "number") {
      return NextResponse.json({ error: "card_index must be a number" }, { status: 400 });
    }
    if (!["easy", "medium", "hard"].includes(rating)) {
      return NextResponse.json({ error: "rating must be easy, medium, or hard" }, { status: 400 });
    }

    // Verify set exists
    const set = db.prepare("SELECT id FROM flashcard_sets WHERE id = ?").get(id);
    if (!set) return NextResponse.json({ error: "Flashcard set not found" }, { status: 404 });

    const reviewId = uuidv4();
    db.prepare(`
      INSERT INTO flashcard_reviews (id, set_id, card_index, rating, reviewed_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(reviewId, id, card_index, rating);

    return NextResponse.json({ id: reviewId, set_id: id, card_index, rating }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

