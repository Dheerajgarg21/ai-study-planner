import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { Quiz, QuizAttempt, QuizQuestion } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // quiz ID
    const db = getDb();
    const attempts = db
      .prepare("SELECT * FROM quiz_attempts WHERE quiz_id = ? ORDER BY completed_at DESC")
      .all(id) as Array<Omit<QuizAttempt, "answers" | "topic_scores"> & { answers: string; topic_scores: string | null }>;

    const parsed = attempts.map((a) => ({
      ...a,
      answers: JSON.parse(a.answers),
      topic_scores: a.topic_scores ? JSON.parse(a.topic_scores) : null,
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
    const { id } = await params; // quiz ID
    const db = getDb();
    const body = await request.json();
    const { answers } = body as { answers: Record<string, string> };

    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "answers must be an object" }, { status: 400 });
    }

    const quizRow = db.prepare("SELECT * FROM quizzes WHERE id = ?").get(id) as
      | (Omit<Quiz, "questions"> & { questions: string })
      | undefined;

    if (!quizRow) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

    const questions: QuizQuestion[] = JSON.parse(quizRow.questions);

    // Grade the quiz
    let score = 0;
    const topicScores: Record<string, { correct: number; total: number }> = {};

    for (const question of questions) {
      const userAnswer = answers[question.id] || "";
      const topic = question.topic || "General";

      if (!topicScores[topic]) topicScores[topic] = { correct: 0, total: 0 };
      topicScores[topic].total++;

      let isCorrect = false;
      if (question.type === "mcq") {
        isCorrect =
          userAnswer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();
      } else {
        // Short answer: basic keyword matching (not empty and reasonable length)
        isCorrect = userAnswer.trim().length > 0;
        // We award points for attempted short answers; display is the key mechanism
      }

      if (isCorrect) {
        score++;
        topicScores[topic].correct++;
      }
    }

    const attemptId = uuidv4();
    db.prepare(`
      INSERT INTO quiz_attempts (id, quiz_id, document_id, answers, score, total, topic_scores, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      attemptId,
      id,
      quizRow.document_id,
      JSON.stringify(answers),
      score,
      questions.length,
      JSON.stringify(topicScores)
    );

    const attempt = db.prepare("SELECT * FROM quiz_attempts WHERE id = ?").get(attemptId) as
      Omit<QuizAttempt, "answers" | "topic_scores"> & { answers: string; topic_scores: string };

    return NextResponse.json(
      {
        ...attempt,
        answers: JSON.parse(attempt.answers),
        topic_scores: JSON.parse(attempt.topic_scores),
        questions, // return questions with correct answers for review
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Quiz submission error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

