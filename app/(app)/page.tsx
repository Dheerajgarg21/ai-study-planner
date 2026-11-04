"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, FileText, HelpCircle, Layers, MessageSquare, ArrowRight, Upload } from "lucide-react";
import { Document, QuizAttempt } from "@/lib/types";

interface ProgressData {
  total_attempts: number;
  overall_percentage: number | null;
  recent_attempts: Array<{
    quiz_title: string;
    score: number;
    total: number;
    percentage: number;
    completed_at: string;
    doc_name: string;
  }>;
}

export default function OverviewPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/documents").then((r) => r.json()),
      fetch("/api/progress").then((r) => r.json()),
    ]).then(([docsData, progressData]) => {
      setDocs(Array.isArray(docsData) ? docsData : []);
      setProgress(progressData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const readyDocs = docs.filter((d) => d.status === "ready");
  const hasActivity = docs.length > 0 || (progress?.total_attempts ?? 0) > 0;

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ marginBottom: "0.35rem" }}>Overview</h1>
        <p style={{ color: "var(--color-text-2)", fontSize: "0.9rem" }}>
          A quieter place for everything you&rsquo;re learning.
        </p>
      </div>

      {!hasActivity ? (
        <EmptyOverview />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Quick stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
            <StatCard label="Documents" value={docs.length} sub={`${readyDocs.length} ready`} href="/library" />
            <StatCard label="Quiz attempts" value={progress?.total_attempts ?? 0} sub={progress?.overall_percentage != null ? `${progress.overall_percentage}% average` : "No attempts yet"} href="/progress" />
            <StatCard label="Ready to study" value={readyDocs.length} sub="documents indexed" href="/library" />
          </div>

          {/* Quick actions */}
          <div>
            <h2 style={{ marginBottom: "1rem", fontSize: "0.95rem" }}>Quick actions</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
              <QuickAction href="/library" icon={Upload} label="Upload material" desc="Add a new PDF to your library" />
              {readyDocs.length > 0 && (
                <>
                  <QuickAction href="/notes" icon={FileText} label="Generate notes" desc="Create structured notes from a document" />
                  <QuickAction href="/quizzes" icon={HelpCircle} label="Take a quiz" desc="Practise with AI-generated questions" />
                  <QuickAction href="/flashcards" icon={Layers} label="Review flashcards" desc="Reinforce key concepts" />
                  <QuickAction href="/chat" icon={MessageSquare} label="Chat with notes" desc="Ask questions about your material" />
                </>
              )}
            </div>
          </div>

          {/* Recent documents */}
          {docs.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{ fontSize: "0.95rem" }}>Recent documents</h2>
                <Link href="/library" style={{ fontSize: "0.8rem", color: "var(--color-primary)", display: "flex", alignItems: "center", gap: "0.25rem", textDecoration: "none" }}>
                  View all <ArrowRight size={12} />
                </Link>
              </div>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {docs.slice(0, 5).map((doc, i) => (
                  <div
                    key={doc.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0.875rem 1.25rem",
                      borderBottom: i < Math.min(docs.length, 5) - 1 ? "1px solid var(--color-border-s)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
                      <div style={{ width: 32, height: 32, background: "var(--color-primary-l)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <BookOpen size={14} color="var(--color-primary)" />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.original_name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-2)" }}>{doc.subject} · {new Date(doc.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <span className={`badge badge-${doc.status === "ready" ? "ready" : doc.status === "failed" ? "failed" : "process"}`}>
                      {doc.status === "ready" ? "Ready" : doc.status === "failed" ? "Failed" : "Processing"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent quiz attempts */}
          {(progress?.recent_attempts?.length ?? 0) > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{ fontSize: "0.95rem" }}>Recent quiz attempts</h2>
                <Link href="/progress" style={{ fontSize: "0.8rem", color: "var(--color-primary)", display: "flex", alignItems: "center", gap: "0.25rem", textDecoration: "none" }}>
                  View progress <ArrowRight size={12} />
                </Link>
              </div>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                {progress!.recent_attempts.slice(0, 5).map((attempt, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0.875rem 1.25rem",
                      borderBottom: i < Math.min(progress!.recent_attempts.length, 5) - 1 ? "1px solid var(--color-border-s)" : "none",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, fontSize: "0.875rem" }}>{attempt.quiz_title}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-2)" }}>
                        {attempt.doc_name} · {new Date(attempt.completed_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem", color: attempt.percentage >= 70 ? "var(--color-success)" : attempt.percentage >= 40 ? "var(--color-warning)" : "var(--color-error)" }}>
                        {attempt.percentage}%
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-2)" }}>{attempt.score}/{attempt.total}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, href }: { label: string; value: number; sub: string; href: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div className="card" style={{ cursor: "pointer", transition: "box-shadow 0.12s" }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = "var(--shadow-md)")}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
      >
        <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-primary)", lineHeight: 1 }}>{value}</div>
        <div style={{ fontWeight: 500, fontSize: "0.875rem", marginTop: "0.35rem" }}>{label}</div>
        <div style={{ fontSize: "0.75rem", color: "var(--color-text-2)", marginTop: "0.15rem" }}>{sub}</div>
      </div>
    </Link>
  );
}

function QuickAction({ href, icon: Icon, label, desc }: { href: string; icon: React.ElementType; label: string; desc: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div className="card card-sm" style={{ cursor: "pointer", transition: "all 0.12s", display: "flex", alignItems: "flex-start", gap: "0.75rem" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.background = "var(--color-primary-t)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.background = "var(--bg-surface)"; }}
      >
        <div style={{ width: 32, height: 32, background: "var(--color-primary-l)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "0.1rem" }}>
          <Icon size={15} color="var(--color-primary)" />
        </div>
        <div>
          <div style={{ fontWeight: 500, fontSize: "0.875rem" }}>{label}</div>
          <div style={{ fontSize: "0.78rem", color: "var(--color-text-2)", marginTop: "0.15rem" }}>{desc}</div>
        </div>
      </div>
    </Link>
  );
}

function EmptyOverview() {
  return (
    <div style={{ maxWidth: 500 }}>
      <div className="card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
        <div style={{ width: 48, height: 48, background: "var(--color-primary-l)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
          <BookOpen size={22} color="var(--color-primary)" />
        </div>
        <h2 style={{ marginBottom: "0.5rem" }}>Start your study library</h2>
        <p style={{ color: "var(--color-text-2)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
          Upload a PDF to get started. Once indexed, you can generate notes, quizzes, flashcards, and chat with your material.
        </p>
        <Link href="/library" className="btn btn-primary">
          <Upload size={15} /> Upload your first PDF
        </Link>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div>
      <div style={{ marginBottom: "2.5rem" }}>
        <div style={{ height: 28, width: 120, background: "var(--color-border)", borderRadius: 4, marginBottom: 8 }} />
        <div style={{ height: 16, width: 260, background: "var(--color-border-s)", borderRadius: 4 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="card" style={{ height: 90, background: "var(--color-border-s)" }} />
        ))}
      </div>
    </div>
  );
}

