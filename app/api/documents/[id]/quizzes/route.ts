import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { Document, Quiz, QuizQuestion } from "@/lib/types";
import { generateQuizFromDocument } from "@/lib/gemini";
import { v4 as uuidv4 } from "uuid";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const quizzes = db
      .prepare("SELECT * FROM quizzes WHERE document_id = ? ORDER BY created_at DESC")
      .all(id) as Array<Omit<Quiz, "questions"> & { questions: string }>;

    const parsed = quizzes.map((q) => ({
      ...q,
      questions: JSON.parse(q.questions) as QuizQuestion[],
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = await request.json();
    const count = Math.min(Math.max(Number(body.count) || 4, 2), 20);
    const difficulty = ["easy", "medium", "hard"].includes(body.difficulty)
      ? body.difficulty
      : "medium";
    const types: string[] = Array.isArray(body.types) ? body.types : ["mcq", "short"];

    const doc = db
      .prepare("SELECT * FROM documents WHERE id = ?")
      .get(id) as Document | undefined;

    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    if (doc.status !== "ready") {
      return NextResponse.json({ error: "Document is not ready for quiz generation" }, { status: 400 });
    }
    if (!doc.extracted_text || doc.extracted_text.trim().length === 0) {
      return NextResponse.json({ error: "Document has no readable text for quiz generation" }, { status: 400 });
    }

    const rawQuestions = await generateQuizFromDocument(
      doc.original_name,
      doc.extracted_text,
      count,
      difficulty,
      types
    );

    const questions: QuizQuestion[] = rawQuestions.map((q: any) => ({
      id: uuidv4(),
      type: q.type === "short" ? "short" : "mcq",
      question: String(q.question || ""),
      options: Array.isArray(q.options) ? q.options.map(String) : undefined,
      correct_answer: String(q.correct_answer || ""),
      explanation: String(q.explanation || ""),
      topic: q.topic ? String(q.topic) : "General",
    }));

    if (questions.length === 0) {
      return NextResponse.json({ error: "No questions were generated" }, { status: 500 });
    }

    const quizId = uuidv4();
    db.prepare(`
      INSERT INTO quizzes (id, document_id, title, difficulty, question_count, questions, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      quizId,
      id,
      `Quiz: ${doc.original_name} (${difficulty})`,
      difficulty,
      questions.length,
      JSON.stringify(questions)
    );

    const quiz = db
      .prepare("SELECT * FROM quizzes WHERE id = ?")
      .get(quizId) as Omit<Quiz, "questions"> & { questions: string };

    return NextResponse.json({ ...quiz, questions }, { status: 201 });
  } catch (error: any) {
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
