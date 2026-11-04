import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { TopicPerformance, StudyRecommendation } from "@/lib/types";

interface AttemptRow {
  quiz_id: string;
  document_id: string;
  score: number;
  total: number;
  topic_scores: string | null;
  completed_at: string;
  quiz_title: string;
  quiz_difficulty: string;
  doc_name: string;
  doc_subject: string;
}

export async function GET(_request: NextRequest) {
  try {
    const db = getDb();

    // Get all quiz attempts with document info
    const attempts = db.prepare(`
      SELECT 
        qa.quiz_id,
        qa.document_id,
        qa.score,
        qa.total,
        qa.topic_scores,
        qa.completed_at,
        q.title as quiz_title,
        q.difficulty as quiz_difficulty,
        d.original_name as doc_name,
        d.subject as doc_subject
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      JOIN documents d ON qa.document_id = d.id
      ORDER BY qa.completed_at DESC
    `).all() as AttemptRow[];

    // Aggregate topic performance across all attempts
    const topicMap: Record<string, { correct: number; total: number; document_id: string }> = {};

    for (const attempt of attempts) {
      if (attempt.topic_scores) {
        const scores = JSON.parse(attempt.topic_scores) as Record<string, { correct: number; total: number }>;
        for (const [topic, data] of Object.entries(scores)) {
          const key = `${attempt.document_id}::${topic}`;
          if (!topicMap[key]) {
            topicMap[key] = { correct: 0, total: 0, document_id: attempt.document_id };
          }
          topicMap[key].correct += data.correct;
          topicMap[key].total += data.total;
        }
      }
    }

    // Build topic performance list
    const topicPerformance: TopicPerformance[] = Object.entries(topicMap).map(([key, data]) => {
      const topic = key.split("::").slice(1).join("::");
      const percentage = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
      let status: TopicPerformance["status"] = "insufficient_data";
      if (data.total >= 3) {
        if (percentage >= 80) status = "strong";
        else if (percentage >= 50) status = "average";
        else status = "weak";
      }
      return { topic, correct: data.correct, total: data.total, percentage, status };
    });

    // Sort by performance (worst first)
    topicPerformance.sort((a, b) => a.percentage - b.percentage);

    // Build recommendations based on actual performance
    const recommendations: StudyRecommendation[] = [];

    const weakTopics = topicPerformance.filter((t) => t.status === "weak");
    const avgTopics = topicPerformance.filter((t) => t.status === "average");

    for (const topic of weakTopics.slice(0, 3)) {
      const topicKey = Object.keys(topicMap).find((k) => k.endsWith(`::${topic.topic}`));
      const docId = topicKey ? topicMap[topicKey].document_id : undefined;
      const doc = docId ? (db.prepare("SELECT original_name FROM documents WHERE id = ?").get(docId) as { original_name: string } | undefined) : undefined;

      recommendations.push({
        type: "review_topic",
        priority: "high",
        title: `Revise: ${topic.topic}`,
        description: `You scored ${topic.percentage}% on this topic (${topic.correct}/${topic.total} correct). Focus on this area.${doc ? ` From: ${doc.original_name}` : ""}`,
        document_id: docId,
        topic: topic.topic,
      });
    }

    for (const topic of avgTopics.slice(0, 2)) {
      const topicKey = Object.keys(topicMap).find((k) => k.endsWith(`::${topic.topic}`));
      const docId = topicKey ? topicMap[topicKey].document_id : undefined;

      recommendations.push({
        type: "study_flashcards",
        priority: "medium",
        title: `Practise: ${topic.topic}`,
        description: `You scored ${topic.percentage}% on this topic. Reviewing flashcards can help reinforce understanding.`,
        document_id: docId,
        topic: topic.topic,
      });
    }

    // Overall stats
    const totalAttempts = attempts.length;
    const totalScore = attempts.reduce((s, a) => s + a.score, 0);
    const totalQuestions = attempts.reduce((s, a) => s + a.total, 0);
    const overallPercentage = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : null;

    // Recent attempts (last 10)
    const recentAttempts = attempts.slice(0, 10).map((a) => ({
      quiz_id: a.quiz_id,
      document_id: a.document_id,
      score: a.score,
      total: a.total,
      percentage: Math.round((a.score / a.total) * 100),
      completed_at: a.completed_at,
      quiz_title: a.quiz_title,
      quiz_difficulty: a.quiz_difficulty,
      doc_name: a.doc_name,
      doc_subject: a.doc_subject,
    }));

    return NextResponse.json({
      total_attempts: totalAttempts,
      overall_percentage: overallPercentage,
      topic_performance: topicPerformance,
      recommendations,
      recent_attempts: recentAttempts,
    });
  } catch (error) {
    console.error("Progress API error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

