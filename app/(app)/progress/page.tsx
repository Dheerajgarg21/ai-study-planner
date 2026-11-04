"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart2,
  HelpCircle,
  FileText,
  Layers,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info,
  Clock,
  Sparkles,
  Compass,
  Cpu
} from "lucide-react";
import { TopicPerformance, StudyRecommendation } from "@/lib/types";

interface ProgressApiResponse {
  total_attempts: number;
  overall_percentage: number | null;
  topic_performance: TopicPerformance[];
  recommendations: StudyRecommendation[];
  recent_attempts: Array<{
    quiz_id: string;
    document_id: string;
    score: number;
    total: number;
    percentage: number;
    completed_at: string;
    quiz_title: string;
    quiz_difficulty: string;
    doc_name: string;
    doc_subject: string;
  }>;
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/progress")
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <div
          style={{
            width: 36,
            height: 36,
            border: "3px solid var(--color-primary-l)",
            borderTopColor: "var(--color-primary)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 1rem",
          }}
        />
        <p style={{ color: "var(--color-text-2)", fontSize: "0.875rem" }}>
          Analyzing actual learner performance data...
        </p>
      </div>
    );
  }

  const hasAttempts = (data?.total_attempts ?? 0) > 0;

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ marginBottom: "0.35rem" }}>Learning State &amp; Progress</h1>
        <p style={{ color: "var(--color-text-2)", fontSize: "0.9rem" }}>
          Ground truth analysis from verified quiz attempts. Zero fabricated statistics or imaginary streaks.
        </p>
      </div>

      {!hasAttempts ? (
        <div className="card empty-state" style={{ padding: "4rem 2rem" }}>
          <BarChart2 size={40} className="empty-state-icon" />
          <h3 style={{ fontSize: "1.05rem" }}>No performance data recorded yet</h3>
          <p style={{ maxWidth: 440 }}>
            Take and submit quizzes from your study materials. Your scores, topic proficiencies, and revision priorities will be modeled here automatically.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
            <Link href="/quizzes" className="btn btn-primary">
              <HelpCircle size={15} /> Take a Quiz
            </Link>
            <Link href="/library" className="btn btn-secondary">
              Study Library
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Top Performance Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <div className="card">
              <div style={{ fontSize: "0.75rem", fontWeight: 650, color: "var(--color-text-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                QUIZ ATTEMPTS
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--color-primary)", marginTop: "0.25rem" }}>
                {data?.total_attempts}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-2)", marginTop: "0.2rem" }}>
                Recorded in persistent database
              </div>
            </div>

            <div className="card">
              <div style={{ fontSize: "0.75rem", fontWeight: 650, color: "var(--color-text-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                AVERAGE SCORE
              </div>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: (data?.overall_percentage ?? 0) >= 70
                    ? "var(--color-success)"
                    : (data?.overall_percentage ?? 0) >= 50
                    ? "var(--color-warning)"
                    : "var(--color-error)",
                  marginTop: "0.25rem",
                }}
              >
                {data?.overall_percentage !== null ? `${data?.overall_percentage}%` : "N/A"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-2)", marginTop: "0.2rem" }}>
                Across all submitted questions
              </div>
            </div>

            <div className="card">
              <div style={{ fontSize: "0.75rem", fontWeight: 650, color: "var(--color-text-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                TOPICS MONITORED
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--color-text)", marginTop: "0.25rem" }}>
                {data?.topic_performance.length || 0}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-2)", marginTop: "0.2rem" }}>
                Extracted from document quizzes
              </div>
            </div>
          </div>

          {/* Learning Agent: Transparent Study Plan Recommendations */}
          <div className="card" style={{ background: "var(--color-primary-t)", borderColor: "var(--color-primary-l)", padding: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <Compass size={18} color="var(--color-primary)" />
              <h2 style={{ fontSize: "1rem", color: "var(--color-primary)" }}>
                Learning Agent: Recommended Study Priorities
              </h2>
            </div>
            <p style={{ fontSize: "0.825rem", color: "var(--color-text-2)", lineHeight: 1.5, marginBottom: "1.25rem" }}>
              Priority recommendations generated via study plan search over actual learner performance data.
            </p>

            {data?.recommendations && data.recommendations.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.85rem" }}>
                {data.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#fff",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem 1.25rem",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                        <span
                          className={`badge ${rec.priority === "high" ? "badge-failed" : "badge-upload"}`}
                          style={{ textTransform: "uppercase", fontSize: "0.68rem" }}
                        >
                          {rec.priority} Priority
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "var(--color-text-3)" }}>
                          {rec.type === "review_topic" ? "Review Notes" : "Flashcard Drill"}
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-text)", marginBottom: "0.3rem" }}>
                        {rec.title}
                      </div>
                      <p style={{ fontSize: "0.78rem", color: "var(--color-text-2)", lineHeight: 1.45 }}>
                        {rec.description}
                      </p>
                    </div>

                    <div style={{ marginTop: "1rem", paddingTop: "0.6rem", borderTop: "1px solid var(--color-border-s)" }}>
                      <Link
                        href={rec.document_id ? `/notes?doc=${rec.document_id}` : "/notes"}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: "0.75rem", width: "100%", justifyContent: "center" }}
                      >
                        <FileText size={12} /> Open Revision Notes
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "0.825rem", color: "var(--color-text-2)", fontStyle: "italic" }}>
                All attempted topics have demonstrated strong proficiency (&ge;80%). Continue testing to identify new target areas!
              </div>
            )}
          </div>

          {/* Topic Performance Matrix */}
          <div>
            <div style={{ marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <h2 style={{ fontSize: "0.95rem" }}>Topic-Level Mastery &amp; Weak Areas</h2>
                <p style={{ fontSize: "0.78rem", color: "var(--color-text-2)", marginTop: "0.15rem" }}>
                  Distinguishes between weak performance and insufficient data (&lt;3 questions answered).
                </p>
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 110px 140px 120px",
                  padding: "0.6rem 1.25rem",
                  background: "var(--bg-sidebar)",
                  borderBottom: "1px solid var(--color-border)",
                  fontSize: "0.72rem",
                  fontWeight: 650,
                  color: "var(--color-text-2)",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                }}
              >
                <span>TOPIC / CONCEPT</span>
                <span>QUESTIONS</span>
                <span>PROFICIENCY</span>
                <span>STATUS</span>
              </div>

              {data?.topic_performance && data.topic_performance.length > 0 ? (
                data.topic_performance.map((tp, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 110px 140px 120px",
                      padding: "0.85rem 1.25rem",
                      borderBottom: idx < data.topic_performance.length - 1 ? "1px solid var(--color-border-s)" : "none",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 500, fontSize: "0.85rem", color: "var(--color-text)" }}>
                        {tp.topic}
                      </span>
                    </div>

                    <div style={{ fontSize: "0.8rem", color: "var(--color-text-2)" }}>
                      {tp.correct} / {tp.total} correct
                    </div>

                    <div style={{ paddingRight: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                        <span style={{ fontWeight: 600 }}>{tp.percentage}%</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${tp.percentage}%`,
                            background: tp.status === "strong"
                              ? "var(--color-success)"
                              : tp.status === "weak"
                              ? "var(--color-error)"
                              : "var(--color-warning)",
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      {tp.status === "strong" && (
                        <span className="badge badge-ready">
                          <CheckCircle size={10} /> Strong
                        </span>
                      )}
                      {tp.status === "average" && (
                        <span className="badge badge-upload">
                          Average
                        </span>
                      )}
                      {tp.status === "weak" && (
                        <span className="badge badge-failed">
                          <AlertTriangle size={10} /> Weak
                        </span>
                      )}
                      {tp.status === "insufficient_data" && (
                        <span className="badge" style={{ background: "var(--bg-main)", color: "var(--color-text-3)", border: "1px solid var(--color-border-s)" }}>
                          Low Data
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--color-text-2)", fontSize: "0.825rem" }}>
                  No topic labels recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Historical Quiz Attempts Table */}
          <div>
            <h2 style={{ fontSize: "0.95rem", marginBottom: "0.75rem" }}>Recent Quiz Attempts</h2>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr 110px 100px 120px",
                  padding: "0.6rem 1.25rem",
                  background: "var(--bg-sidebar)",
                  borderBottom: "1px solid var(--color-border)",
                  fontSize: "0.72rem",
                  fontWeight: 650,
                  color: "var(--color-text-2)",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                }}
              >
                <span>QUIZ</span>
                <span>SOURCE DOCUMENT</span>
                <span>SCORE</span>
                <span>DIFFICULTY</span>
                <span>DATE</span>
              </div>

              {data?.recent_attempts.map((att, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.5fr 1fr 110px 100px 120px",
                    padding: "0.85rem 1.25rem",
                    borderBottom: idx < data.recent_attempts.length - 1 ? "1px solid var(--color-border-s)" : "none",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontWeight: 500, fontSize: "0.85rem" }}>
                    {att.quiz_title}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--color-text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {att.doc_name}
                  </div>
                  <div>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        color: att.percentage >= 70
                          ? "var(--color-success)"
                          : att.percentage >= 50
                          ? "var(--color-warning)"
                          : "var(--color-error)",
                      }}
                    >
                      {att.percentage}%
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-3)", marginLeft: "0.35rem" }}>
                      ({att.score}/{att.total})
                    </span>
                  </div>
                  <div>
                    <span className="badge" style={{ background: "var(--bg-main)", color: "var(--color-text-2)", textTransform: "capitalize" }}>
                      {att.quiz_difficulty}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)" }}>
                    {new Date(att.completed_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

