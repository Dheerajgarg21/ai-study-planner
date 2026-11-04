"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  RefreshCw,
  HelpCircle,
  Layers,
  ArrowRight,
  ExternalLink,
  BookOpen,
  CheckCircle,
  Clock,
  Sparkles,
  AlertCircle,
  FileQuestion
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Document, Notes } from "@/lib/types";

function NotesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialDocId = searchParams.get("doc");

  const [docs, setDocs] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocId || "");
  const [notes, setNotes] = useState<Notes | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [initialDocId]);

  useEffect(() => {
    if (!selectedDocId) {
      setNotes(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/documents/${selectedDocId}/notes`)
      .then((res) => res.json())
      .then((data) => {
        setNotes(data.notes || null);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load notes for this document.");
        setLoading(false);
      });
  }, [selectedDocId]);

  const handleGenerateNotes = async () => {
    if (!selectedDocId) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${selectedDocId}/notes`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate notes");
      }
      setNotes(data.notes);
    } catch (err: any) {
      setError(err.message || "Failed to generate notes from document");
    } finally {
      setGenerating(false);
    }
  };

  const currentDoc = docs.find((d) => d.id === selectedDocId);

  if (docs.length === 0 && !loading) {
    return (
      <div>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ marginBottom: "0.35rem" }}>A clearer view of the chapter</h1>
          <p style={{ color: "var(--color-text-2)", fontSize: "0.9rem" }}>
            Structured notes, with the original material always within reach.
          </p>
        </div>
        <div className="card empty-state">
          <BookOpen size={36} className="empty-state-icon" />
          <h3>No study materials ready</h3>
          <p>Upload a PDF document first. Once processed, you can generate comprehensive structured notes here.</p>
          <Link href="/library" className="btn btn-primary" style={{ marginTop: "1.25rem" }}>
            Go to Study Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Top Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ marginBottom: "0.35rem" }}>A clearer view of the chapter</h1>
        <p style={{ color: "var(--color-text-2)", fontSize: "0.9rem" }}>
          Structured notes, with the original material always within reach.
        </p>
      </div>

      {/* Document Selector & Meta Bar */}
      <div
        className="card card-sm"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.75rem",
          background: "var(--bg-surface)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-2)", fontWeight: 500 }}>
              Source document:
            </span>
            <select
              className="select"
              style={{ width: "auto", minWidth: 220, fontSize: "0.85rem", padding: "0.35rem 2rem 0.35rem 0.75rem" }}
              value={selectedDocId}
              onChange={(e) => {
                setSelectedDocId(e.target.value);
                router.replace(`/notes?doc=${e.target.value}`);
              }}
            >
              {docs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.original_name} ({d.subject})
                </option>
              ))}
            </select>
          </div>

          {currentDoc && (
            <span className="badge badge-ready">
              <CheckCircle size={11} /> Ready
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleGenerateNotes}
            disabled={generating}
          >
            <RefreshCw size={13} className={generating ? "animate-spin" : ""} />
            {generating ? "Generating with Gemini..." : notes ? "Regenerate notes" : "Generate notes"}
          </button>
        </div>
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

      {loading ? (
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
            Loading notes for {currentDoc?.original_name}...
          </p>
        </div>
      ) : !notes ? (
        <div className="card empty-state" style={{ padding: "4rem 2rem" }}>
          <FileText size={40} className="empty-state-icon" />
          <h3 style={{ fontSize: "1.05rem" }}>No notes generated yet</h3>
          <p style={{ maxWidth: 420 }}>
            Extract key concepts, definitions, formulas, chapter breakdowns, and revision summaries directly from{" "}
            <strong>{currentDoc?.original_name}</strong>.
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: "1.25rem" }}
            onClick={handleGenerateNotes}
            disabled={generating}
          >
            <Sparkles size={15} />
            {generating ? "Analyzing & Generating..." : "Generate AI Study Notes"}
          </button>
        </div>
      ) : (
        /* Notes Layout matching Figma */
        <div style={{ display: "grid", gridTemplateColumns: "270px 1fr", gap: "1.75rem", alignItems: "start" }}>
          {/* Left Reference Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="card card-sm">
              <div
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 650,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--color-text-3)",
                  marginBottom: "0.6rem",
                }}
              >
                DOCUMENT SOURCE
              </div>
              <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--color-text)" }}>
                {currentDoc?.original_name}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--color-text-2)", marginTop: "0.25rem" }}>
                Course: {currentDoc?.subject}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-3)", marginTop: "0.25rem" }}>
                Updated {new Date(notes.updated_at).toLocaleDateString()}
              </div>
            </div>

            <div className="card card-sm">
              <div
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 650,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--color-text-3)",
                  marginBottom: "0.6rem",
                }}
              >
                KEEP THE SOURCE CLOSE
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--color-text-2)", lineHeight: 1.5 }}>
                Check source notes and citations to verify exact definitions, formulas, and terminology.
              </p>
              <div
                style={{
                  marginTop: "0.75rem",
                  padding: "0.5rem 0.65rem",
                  background: "var(--bg-main)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.75rem",
                  color: "var(--color-text-2)",
                }}
              >
                Grounded in uploaded PDF · Technical terms preserved
              </div>
            </div>

            <div className="card card-sm" style={{ background: "var(--color-primary-t)", borderColor: "var(--color-primary-l)" }}>
              <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--color-primary)", marginBottom: "0.3rem" }}>
                Practice from these notes
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-2)", marginBottom: "0.85rem" }}>
                Convert this material directly into targeted practice questions or flashcards.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <Link
                  href={`/quizzes?doc=${selectedDocId}`}
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: "flex-start", background: "#fff" }}
                >
                  <HelpCircle size={14} color="var(--color-primary)" />
                  Quiz this material
                </Link>
                <Link
                  href={`/flashcards?doc=${selectedDocId}`}
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: "flex-start", background: "#fff" }}
                >
                  <Layers size={14} color="var(--color-primary)" />
                  Make flashcards
                </Link>
              </div>
            </div>
          </div>

          {/* Main Reading & Markdown Canvas */}
          <div className="card" style={{ padding: "2.25rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: "1rem",
                borderBottom: "1px solid var(--color-border)",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 650,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--color-primary)",
                  }}
                >
                  ACADEMIC STUDY NOTES
                </span>
                <div style={{ fontSize: "0.8rem", color: "var(--color-text-2)", marginTop: "0.15rem" }}>
                  {currentDoc?.original_name} · Source-grounded
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--color-text-3)" }}>
                <Clock size={13} />
                <span>Generated via Gemini 2.0</span>
              </div>
            </div>

            {/* Markdown Body */}
            <article className="prose">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {notes.content}
              </ReactMarkdown>
            </article>

            {/* Bottom Actions Banner */}
            <div
              style={{
                marginTop: "2.5rem",
                paddingTop: "1.25rem",
                borderTop: "1px solid var(--color-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-2)" }}>
                Notes use this document only. Verify technical details directly in source.
              </span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Link href={`/flashcards?doc=${selectedDocId}`} className="btn btn-secondary btn-sm">
                  <Layers size={13} /> Make flashcards
                </Link>
                <Link href={`/quizzes?doc=${selectedDocId}`} className="btn btn-primary btn-sm">
                  <HelpCircle size={13} /> Quiz this chapter
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NotesPage() {
  return (
    <Suspense fallback={<div className="card" style={{ padding: "3rem", textAlign: "center" }}>Loading notes...</div>}>
      <NotesContent />
    </Suspense>
  );
}

