"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  HelpCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Layers,
  Sparkles,
  Clock,
  ChevronRight,
  FileText,
  BarChart2
} from "lucide-react";
import { Document, Quiz, QuizQuestion, QuizAttempt } from "@/lib/types";

function QuizzesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialDocId = searchParams.get("doc");

  const [docs, setDocs] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocId || "");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState<QuizAttempt | null>(null);

  // Setup form states
  const [questionCount, setQuestionCount] = useState<number>(4);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [questionTypes, setQuestionTypes] = useState<string[]>(["mcq", "short"]);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active quiz taking states
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [viewState, setViewState] = useState<"setup" | "taking" | "result">("setup");

  // Load documents
  useEffect(() => {
    fetch("/api/documents")
      .then((res) => res.json())
      .then((data: Document[]) => {
        const ready = Array.isArray(data) ? data.filter((d) => d.status === "ready") : [];
        setDocs(ready);
        if (ready.length > 0) {
          const match = initialDocId ? ready.find((d) => d.id === initialDocId) : null;
          const chosen = match ? match.id : ready[0].id;
          setSelectedDocId(chosen);
        }
      })
      .catch(() => {});
  }, [initialDocId]);

  // Load quizzes for selected doc
  useEffect(() => {
    if (!selectedDocId) {
      setQuizzes([]);
      return;
    }
    fetch(`/api/documents/${selectedDocId}/quizzes`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setQuizzes(data);
          if (data.length > 0 && !activeQuiz) {
            // Keep setup view unless user starts quiz
          }
        }
      })
      .catch(() => {});
  }, [selectedDocId]);

  // Load attempts when activeQuiz changes
  useEffect(() => {
    if (!activeQuiz) return;
    fetch(`/api/quizzes/${activeQuiz.id}/attempts`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAttempts(data);
        }
      })
      .catch(() => {});
  }, [activeQuiz]);

  const handleCreateQuiz = async () => {
    if (!selectedDocId) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${selectedDocId}/quizzes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: questionCount,
          difficulty,
          types: questionTypes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate quiz");
      setQuizzes((prev) => [data, ...prev]);
      setActiveQuiz(data);
      setUserAnswers({});
      setViewState("taking");
    } catch (err: any) {
      setError(err.message || "Failed to generate quiz");
    } finally {
      setGenerating(false);
    }
  };

  const handleStartExistingQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setUserAnswers({});
    setViewState("taking");
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/quizzes/${activeQuiz.id}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: userAnswers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit quiz");
      setCurrentAttempt(data);
      setAttempts((prev) => [data, ...prev]);
      setViewState("result");
    } catch (err: any) {
      setError(err.message || "Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  const currentDoc = docs.find((d) => d.id === selectedDocId);

  if (docs.length === 0) {
    return (
      <div>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ marginBottom: "0.35rem" }}>Turn understanding into practice</h1>
          <p style={{ color: "var(--color-text-2)", fontSize: "0.9rem" }}>
            Build a focused quiz from the chapter you&rsquo;re studying.
          </p>
        </div>
        <div className="card empty-state">
          <BookOpen size={36} className="empty-state-icon" />
          <h3>No study materials ready</h3>
          <p>Upload a PDF document first. Once indexed, you can generate customized quizzes grounded in the text.</p>
          <Link href="/library" className="btn btn-primary" style={{ marginTop: "1.25rem" }}>
            Go to Study Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ─── STATE 1: QUIZ SETUP ─── */}
      {viewState === "setup" && (
        <div>
          <div style={{ marginBottom: "1.5rem" }}>
            <h1 style={{ marginBottom: "0.35rem" }}>Turn understanding into practice</h1>
            <p style={{ color: "var(--color-text-2)", fontSize: "0.9rem" }}>
              Build a focused quiz from the material you&rsquo;re studying.
            </p>
          </div>

          {/* Document Picker Pill */}
          <div
            className="card card-sm"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              marginBottom: "1.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-2)", fontWeight: 500 }}>
                Target document:
              </span>
              <select
                className="select"
                style={{ width: "auto", minWidth: 240, fontSize: "0.85rem", padding: "0.35rem 2rem 0.35rem 0.75rem" }}
                value={selectedDocId}
                onChange={(e) => {
                  setSelectedDocId(e.target.value);
                  router.replace(`/quizzes?doc=${e.target.value}`);
                }}
              >
                {docs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.original_name} ({d.subject})
                  </option>
                ))}
              </select>
              <span className="badge badge-ready">
                <CheckCircle size={11} /> Source available
              </span>
            </div>

            {quizzes.length > 0 && (
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-2)" }}>
                {quizzes.length} existing quiz{quizzes.length > 1 ? "zes" : ""} available
              </span>
            )}
          </div>

          {error && (
            <div
              style={{
                marginBottom: "1.5rem",
                padding: "0.75rem 1rem",
                background: "var(--color-error-bg)",
                border: "1px solid #fca5a5",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                color: "var(--color-error)",
                fontSize: "0.875rem",
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1.75rem", alignItems: "start" }}>
            {/* Left Configuration Steps */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Step 1: Scope */}
              <div className="card">
                <div style={{ fontSize: "0.75rem", fontWeight: 650, color: "var(--color-primary)", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>
                  01 CHOOSE YOUR SCOPE
                </div>
                <h3 style={{ fontSize: "0.95rem", marginBottom: "0.35rem" }}>
                  {currentDoc?.original_name}
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--color-text-2)" }}>
                  Subject: {currentDoc?.subject} · All questions will stay strictly grounded within this source document.
                </p>
              </div>

              {/* Step 2: Question Types */}
              <div className="card">
                <div style={{ fontSize: "0.75rem", fontWeight: 650, color: "var(--color-primary)", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>
                  02 SELECT QUESTION TYPES
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div
                    onClick={() => {
                      if (questionTypes.includes("mcq") && questionTypes.length > 1) {
                        setQuestionTypes(questionTypes.filter((t) => t !== "mcq"));
                      } else if (!questionTypes.includes("mcq")) {
                        setQuestionTypes([...questionTypes, "mcq"]);
                      }
                    }}
                    style={{
                      padding: "0.875rem 1rem",
                      border: `1.5px solid ${questionTypes.includes("mcq") ? "var(--color-primary)" : "var(--color-border)"}`,
                      background: questionTypes.includes("mcq") ? "var(--color-primary-l)" : "var(--bg-surface)",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      transition: "all 0.12s",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: "0.875rem", color: questionTypes.includes("mcq") ? "var(--color-primary)" : "var(--color-text)" }}>
                      Multiple choice
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-2)", marginTop: "0.2rem" }}>
                      Choose one correct answer from 4 options.
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      if (questionTypes.includes("short") && questionTypes.length > 1) {
                        setQuestionTypes(questionTypes.filter((t) => t !== "short"));
                      } else if (!questionTypes.includes("short")) {
                        setQuestionTypes([...questionTypes, "short"]);
                      }
                    }}
                    style={{
                      padding: "0.875rem 1rem",
                      border: `1.5px solid ${questionTypes.includes("short") ? "var(--color-primary)" : "var(--color-border)"}`,
                      background: questionTypes.includes("short") ? "var(--color-primary-l)" : "var(--bg-surface)",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      transition: "all 0.12s",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: "0.875rem", color: questionTypes.includes("short") ? "var(--color-primary)" : "var(--color-text)" }}>
                      Short answer
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-2)", marginTop: "0.2rem" }}>
                      Explain concepts and mechanisms in your own words.
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-3)", marginTop: "0.6rem" }}>
                  {questionTypes.length === 2
                    ? "Balanced mix: multiple choice and short answer questions."
                    : questionTypes[0] === "mcq"
                    ? "Standard multiple choice quiz."
                    : "Conceptual recall short answer quiz."}
                </p>
              </div>

              {/* Step 3: Count and Difficulty */}
              <div className="card">
                <div style={{ fontSize: "0.75rem", fontWeight: 650, color: "var(--color-primary)", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>
                  03 SET THE CHALLENGE
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                  <div>
                    <label className="label">Number of questions</label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {[4, 8, 12].map((num) => (
                        <button
                          key={num}
                          type="button"
                          className="btn btn-sm"
                          style={{
                            flex: 1,
                            border: `1px solid ${questionCount === num ? "var(--color-primary)" : "var(--color-border)"}`,
                            background: questionCount === num ? "var(--color-primary)" : "var(--bg-surface)",
                            color: questionCount === num ? "#fff" : "var(--color-text)",
                          }}
                          onClick={() => setQuestionCount(num)}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label">Difficulty</label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {(["easy", "medium", "hard"] as const).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          className="btn btn-sm"
                          style={{
                            flex: 1,
                            textTransform: "capitalize",
                            border: `1px solid ${difficulty === lvl ? "var(--color-primary)" : "var(--color-border)"}`,
                            background: difficulty === lvl ? "var(--color-primary)" : "var(--bg-surface)",
                            color: difficulty === lvl ? "#fff" : "var(--color-text)",
                          }}
                          onClick={() => setDifficulty(lvl)}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-2)", marginTop: "0.85rem" }}>
                  {difficulty === "easy"
                    ? "Easy focuses on core definitions, terms, and direct facts."
                    : difficulty === "medium"
                    ? "Medium tests both factual recall and conceptual application."
                    : "Hard requires deep synthesis, comparative analysis, and reasoning."}
                </p>
              </div>

              {/* Existing Quizzes Table */}
              {quizzes.length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}>Previous quizzes for this material</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {quizzes.map((q) => (
                      <div
                        key={q.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.6rem 0.75rem",
                          border: "1px solid var(--color-border-s)",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--bg-main)",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 500, fontSize: "0.825rem" }}>{q.title}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--color-text-2)" }}>
                            {q.question_count} questions · {q.difficulty} difficulty
                          </div>
                        </div>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleStartExistingQuiz(q)}
                        >
                          Take quiz <ArrowRight size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Practice Plan Box (matching Figma) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div
                className="card"
                style={{
                  background: "#1e1b4b",
                  color: "#fff",
                  borderColor: "#312e81",
                  padding: "1.75rem",
                }}
              >
                <div style={{ fontSize: "0.72rem", letterSpacing: "0.06em", color: "#a5b4fc", fontWeight: 650, textTransform: "uppercase" }}>
                  YOUR PRACTICE PLAN
                </div>
                <div style={{ fontSize: "1.15rem", fontWeight: 600, marginTop: "0.4rem", lineHeight: 1.3 }}>
                  Small session. Deeper understanding.
                </div>

                <div className="divider" style={{ background: "#312e81", margin: "1.25rem 0" }} />

                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.85rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#c7d2fe" }}>Questions</span>
                    <span style={{ fontWeight: 600 }}>{questionCount} total</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#c7d2fe" }}>Format</span>
                    <span style={{ fontWeight: 600 }}>
                      {questionTypes.length === 2 ? "MCQ + Short answer" : questionTypes[0] === "mcq" ? "MCQ only" : "Short answer only"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#c7d2fe" }}>Difficulty</span>
                    <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{difficulty}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#c7d2fe" }}>Scoring</span>
                    <span style={{ fontWeight: 600 }}>1 point per question</span>
                  </div>
                </div>

                <div className="divider" style={{ background: "#312e81", margin: "1.25rem 0" }} />

                <p style={{ fontSize: "0.75rem", color: "#c7d2fe", lineHeight: 1.5, marginBottom: "1.25rem" }}>
                  Answers and source-linked explanations appear after submission. The attempt is recorded in your performance history.
                </p>

                <button
                  className="btn"
                  style={{
                    width: "100%",
                    background: "#6366f1",
                    color: "#fff",
                    padding: "0.65rem 1rem",
                    fontWeight: 600,
                  }}
                  onClick={handleCreateQuiz}
                  disabled={generating}
                >
                  <Sparkles size={15} />
                  {generating ? "Generating with Gemini..." : "Create quiz"}
                </button>
              </div>

              <div className="card card-sm">
                <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.3rem" }}>
                  Source check matters
                </div>
                <p style={{ fontSize: "0.78rem", color: "var(--color-text-2)", lineHeight: 1.5 }}>
                  Every generated question and explanation is verified directly against the document text to eliminate hallucinated facts.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── STATE 2: ACTIVE QUIZ TAKING ─── */}
      {viewState === "taking" && activeQuiz && (
        <div>
          {/* Header */}
          <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h1 style={{ marginBottom: "0.35rem" }}>{activeQuiz.title}</h1>
              <p style={{ color: "var(--color-text-2)", fontSize: "0.875rem" }}>
                Practice quiz · <span style={{ textTransform: "capitalize" }}>{activeQuiz.difficulty}</span> difficulty · {activeQuiz.questions.length} questions · No time limit
              </p>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setViewState("setup")}
            >
              Exit quiz
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1.75rem", alignItems: "start" }}>
            {/* Questions List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {activeQuiz.questions.map((q, idx) => {
                const answer = userAnswers[q.id] || "";
                return (
                  <div key={q.id} className="card" style={{ padding: "1.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 650, color: "var(--color-primary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        QUESTION {idx + 1} · {q.type === "mcq" ? "MULTIPLE CHOICE" : "SHORT ANSWER"} · 1 POINT
                      </span>
                      {q.topic && (
                        <span style={{ fontSize: "0.72rem", color: "var(--color-text-3)", background: "var(--bg-main)", padding: "0.15rem 0.5rem", borderRadius: "var(--radius-sm)" }}>
                          {q.topic}
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: "1rem", fontWeight: 600, lineHeight: 1.45, marginBottom: "1.25rem", color: "var(--color-text)" }}>
                      {q.question}
                    </h3>

                    {q.type === "mcq" && q.options && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                        {q.options.map((opt, optIdx) => {
                          const isSelected = answer === opt;
                          return (
                            <div
                              key={optIdx}
                              onClick={() => setUserAnswers({ ...userAnswers, [q.id]: opt })}
                              className={`quiz-option ${isSelected ? "selected" : ""}`}
                            >
                              <div
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: "50%",
                                  border: `2px solid ${isSelected ? "var(--color-primary)" : "var(--color-border)"}`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                  marginTop: 2,
                                }}
                              >
                                {isSelected && (
                                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)" }} />
                                )}
                              </div>
                              <span style={{ flex: 1, fontSize: "0.875rem" }}>{opt}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.type === "short" && (
                      <div>
                        <textarea
                          className="input"
                          rows={4}
                          placeholder="Type your explanation based on the study material..."
                          value={answer}
                          onChange={(e) => {
                            if (e.target.value.length <= 600) {
                              setUserAnswers({ ...userAnswers, [q.id]: e.target.value });
                            }
                          }}
                          style={{ resize: "vertical", fontSize: "0.875rem" }}
                        />
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.35rem", fontSize: "0.72rem", color: "var(--color-text-3)" }}>
                          {answer.length} / 600 characters
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right Question Palette & Submit Bar */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", position: "sticky", top: "1rem" }}>
              <div className="card card-sm">
                <div style={{ fontWeight: 650, fontSize: "0.75rem", letterSpacing: "0.06em", color: "var(--color-text-3)", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                  YOUR QUESTIONS
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", marginBottom: "1rem" }}>
                  {activeQuiz.questions.map((q, idx) => {
                    const answered = Boolean(userAnswers[q.id]?.trim());
                    return (
                      <div
                        key={q.id}
                        style={{
                          height: 36,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "var(--radius-sm)",
                          border: `1.5px solid ${answered ? "var(--color-primary)" : "var(--color-border)"}`,
                          background: answered ? "var(--color-primary-l)" : "var(--bg-main)",
                          color: answered ? "var(--color-primary)" : "var(--color-text-2)",
                          fontWeight: 600,
                          fontSize: "0.85rem",
                        }}
                      >
                        {idx + 1}
                      </div>
                    );
                  })}
                </div>

                {/* Answered counter */}
                {(() => {
                  const answeredCount = Object.values(userAnswers).filter((a) => a.trim().length > 0).length;
                  const totalCount = activeQuiz.questions.length;
                  const unansweredCount = totalCount - answeredCount;
                  return (
                    <div>
                      <div style={{ fontSize: "0.8rem", color: "var(--color-text-2)", marginBottom: "0.5rem" }}>
                        {answeredCount} of {totalCount} answered
                      </div>
                      {unansweredCount > 0 ? (
                        <div
                          style={{
                            padding: "0.6rem 0.75rem",
                            background: "var(--color-warning-bg)",
                            border: "1px solid #fde68a",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.75rem",
                            color: "var(--color-warning)",
                            marginBottom: "1rem",
                            lineHeight: 1.4,
                          }}
                        >
                          <strong>{unansweredCount} answer{unansweredCount > 1 ? "s" : ""} still open.</strong> Submitting now records open questions as 0 points.
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: "0.6rem 0.75rem",
                            background: "var(--color-success-bg)",
                            border: "1px solid #a7f3d0",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.75rem",
                            color: "var(--color-success)",
                            marginBottom: "1rem",
                          }}
                        >
                          All questions answered. Ready to submit!
                        </div>
                      )}

                      <button
                        className="btn btn-primary"
                        style={{ width: "100%", padding: "0.65rem 1rem" }}
                        onClick={handleSubmitQuiz}
                        disabled={submitting}
                      >
                        <CheckCircle size={15} />
                        {submitting ? "Grading with live calculation..." : `Submit ${answeredCount} answers`}
                      </button>
                    </div>
                  );
                })()}
              </div>

              <div className="card card-sm">
                <div style={{ fontWeight: 600, fontSize: "0.825rem", marginBottom: "0.35rem" }}>
                  Live evaluation guarantee
                </div>
                <p style={{ fontSize: "0.78rem", color: "var(--color-text-2)", lineHeight: 1.5 }}>
                  Every answer is evaluated against the source document. No static or fabricated points.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── STATE 3: CHECKPOINT / RESULTS ─── */}
      {viewState === "result" && currentAttempt && activeQuiz && (
        <div>
          {/* Header */}
          <div style={{ marginBottom: "1.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h1 style={{ marginBottom: "0.35rem" }}>A checkpoint, not a finish line</h1>
              <p style={{ color: "var(--color-text-2)", fontSize: "0.875rem" }}>
                {activeQuiz.title} · <span style={{ textTransform: "capitalize" }}>{activeQuiz.difficulty}</span> · Submitted attempt
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setUserAnswers({});
                  setViewState("taking");
                }}
              >
                <RotateCcw size={13} /> Try again
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setViewState("setup")}
              >
                New quiz
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1.75rem", alignItems: "start" }}>
            {/* Left Score Breakdown & Detailed Review */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* Score Summary Card */}
              <div
                className="card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "1.5rem",
                  padding: "1.75rem 2rem",
                  background: "var(--bg-surface)",
                }}
              >
                <div>
                  <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--color-primary)", lineHeight: 1 }}>
                    {Math.round((currentAttempt.score / currentAttempt.total) * 100)}%
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem", marginTop: "0.4rem" }}>
                    {currentAttempt.score} / {currentAttempt.total} points
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", marginTop: "0.15rem" }}>
                    1 point per question · Exact score calculated
                  </div>
                </div>

                <div style={{ display: "flex", gap: "1.5rem", borderLeft: "1px solid var(--color-border)", paddingLeft: "1.5rem" }}>
                  <div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--color-success)" }}>
                      {currentAttempt.score}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-2)" }}>Correct</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--color-error)" }}>
                      {currentAttempt.total - currentAttempt.score}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-2)" }}>Incorrect</div>
                  </div>
                </div>
              </div>

              {/* Review Your Answers Section */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h2 style={{ fontSize: "0.95rem" }}>Review your answers ({activeQuiz.questions.length} questions)</h2>

                {activeQuiz.questions.map((q, idx) => {
                  const userAnswer = currentAttempt.answers[q.id] || "";
                  const isAnswered = userAnswer.trim().length > 0;
                  const isCorrect = q.type === "mcq"
                    ? userAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()
                    : isAnswered;

                  return (
                    <div
                      key={q.id}
                      className="card"
                      style={{
                        padding: "1.5rem",
                        borderLeft: `4px solid ${isCorrect ? "var(--color-success)" : "var(--color-error)"}`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 650, color: "var(--color-text-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          {q.type === "mcq" ? "MULTIPLE CHOICE" : "SHORT ANSWER"} · {isCorrect ? "CORRECT 1 / 1" : "INCORRECT 0 / 1"}
                        </span>
                        {q.topic && (
                          <span style={{ fontSize: "0.72rem", color: "var(--color-text-2)" }}>
                            Topic: {q.topic}
                          </span>
                        )}
                      </div>

                      <div style={{ fontWeight: 600, fontSize: "0.925rem", color: "var(--color-text)", marginBottom: "0.85rem" }}>
                        {idx + 1}. {q.question}
                      </div>

                      <div style={{ fontSize: "0.85rem", marginBottom: "0.6rem" }}>
                        <span style={{ color: "var(--color-text-2)" }}>Your answer: </span>
                        <strong style={{ color: isCorrect ? "var(--color-success)" : "var(--color-error)" }}>
                          {isAnswered ? userAnswer : "No response submitted (unanswered)"}
                        </strong>
                      </div>

                      {!isCorrect && (
                        <div style={{ fontSize: "0.85rem", marginBottom: "0.6rem" }}>
                          <span style={{ color: "var(--color-text-2)" }}>Correct answer: </span>
                          <strong style={{ color: "var(--color-text)" }}>{q.correct_answer}</strong>
                        </div>
                      )}

                      {q.explanation && (
                        <div
                          style={{
                            marginTop: "0.75rem",
                            padding: "0.65rem 0.85rem",
                            background: "var(--bg-main)",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.8rem",
                            color: "var(--color-text-2)",
                            lineHeight: 1.5,
                          }}
                        >
                          <strong>Explanation:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Recommendations & Saved Attempts Sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Know What to Revisit Box (matching Figma) */}
              <div className="card" style={{ background: "var(--color-primary-t)", borderColor: "var(--color-primary-l)" }}>
                <div style={{ fontWeight: 650, fontSize: "0.875rem", color: "var(--color-primary)", marginBottom: "0.35rem" }}>
                  Know what to revisit
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--color-text-2)", lineHeight: 1.5, marginBottom: "1rem" }}>
                  Reinforce the concepts you missed before moving forward to the next chapter.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <Link href={`/notes?doc=${selectedDocId}`} className="btn btn-secondary btn-sm" style={{ background: "#fff", justifyContent: "flex-start" }}>
                    <FileText size={13} color="var(--color-primary)" />
                    Read these notes
                  </Link>
                  <Link href={`/flashcards?doc=${selectedDocId}`} className="btn btn-secondary btn-sm" style={{ background: "#fff", justifyContent: "flex-start" }}>
                    <Layers size={13} color="var(--color-primary)" />
                    Review difficult cards
                  </Link>
                  <Link href="/progress" className="btn btn-secondary btn-sm" style={{ background: "#fff", justifyContent: "flex-start" }}>
                    <BarChart2 size={13} color="var(--color-primary)" />
                    View performance analytics
                  </Link>
                </div>
              </div>

              {/* Saved Attempts History (matching Figma) */}
              <div className="card card-sm">
                <div style={{ fontSize: "0.72rem", fontWeight: 650, letterSpacing: "0.06em", color: "var(--color-text-3)", textTransform: "uppercase", marginBottom: "0.6rem" }}>
                  SAVED ATTEMPTS
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--color-text-2)", marginBottom: "0.75rem" }}>
                  Each attempt retains its own questions, responses, and score.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {attempts.map((att, i) => {
                    const isViewing = att.id === currentAttempt.id;
                    const pct = Math.round((att.score / att.total) * 100);
                    return (
                      <div
                        key={att.id || i}
                        onClick={() => setCurrentAttempt(att)}
                        style={{
                          padding: "0.6rem 0.75rem",
                          borderRadius: "var(--radius-sm)",
                          border: `1px solid ${isViewing ? "var(--color-primary)" : "var(--color-border-s)"}`,
                          background: isViewing ? "var(--color-primary-l)" : "var(--bg-main)",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.8rem", color: isViewing ? "var(--color-primary)" : "var(--color-text)" }}>
                            {pct}% ({att.score}/{att.total} pts)
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "var(--color-text-3)" }}>
                            {new Date(att.completed_at).toLocaleString()}
                          </div>
                        </div>
                        {isViewing && (
                          <span style={{ fontSize: "0.7rem", color: "var(--color-primary)", fontWeight: 600 }}>
                            Viewing
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuizzesPage() {
  return (
    <Suspense fallback={<div className="card" style={{ padding: "3rem", textAlign: "center" }}>Loading quizzes...</div>}>
      <QuizzesContent />
    </Suspense>
  );
}

