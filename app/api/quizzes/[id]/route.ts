import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { Quiz, QuizQuestion } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const quiz = db.prepare("SELECT * FROM quizzes WHERE id = ?").get(id) as
      | (Omit<Quiz, "questions"> & { questions: string })
      | undefined;

    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

    return NextResponse.json({
      ...quiz,
      questions: JSON.parse(quiz.questions) as QuizQuestion[],
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    db.prepare("DELETE FROM quizzes WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

