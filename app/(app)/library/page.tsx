"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Upload, Trash2, FileText, CheckCircle, XCircle, Loader2,
  AlertCircle, RefreshCw, Search, Filter
} from "lucide-react";
import { Document } from "@/lib/types";

const SUBJECTS = ["General", "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science",
  "History", "Geography", "Economics", "Psychology", "Literature", "Philosophy", "Engineering", "Medicine", "Law", "Other"];

export default function LibraryPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [subject, setSubject] = useState("General");
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("All");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const fetchDocs = useCallback(async () => {
    try {
      const r = await fetch("/api/documents");
      const data = await r.json();
      if (Array.isArray(data)) setDocs(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchDocs().finally(() => setLoading(false));
    return () => {
      pollingRef.current.forEach((t) => clearInterval(t));
    };
  }, [fetchDocs]);

  // Poll processing documents
  useEffect(() => {
    const processing = docs.filter((d) => d.status === "processing");
    processing.forEach((doc) => {
      if (pollingRef.current.has(doc.id)) return;
      const interval = setInterval(async () => {
        try {
          const r = await fetch(`/api/documents/${doc.id}/status`);
          const data = await r.json();
          if (data.status !== "processing") {
            clearInterval(interval);
            pollingRef.current.delete(doc.id);
            fetchDocs();
          }
        } catch {
          clearInterval(interval);
          pollingRef.current.delete(doc.id);
        }
      }, 3000);
      pollingRef.current.set(doc.id, interval);
    });
  }, [docs, fetchDocs]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError(`"${file.name}" is not a PDF. Please upload a PDF file.`);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("File size exceeds 50 MB. Please choose a smaller file.");
      return;
    }

    setError(null);
    setSuccess(null);
    setUploading(true);
    setUploadProgress(`Uploading ${file.name}…`);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("subject", subject);

    try {
      const r = await fetch("/api/documents", { method: "POST", body: formData });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || "Upload failed.");
      } else {
        setSuccess(`"${file.name}" uploaded successfully. Processing will begin shortly.`);
        await fetchDocs();
      }
    } catch (e) {
      setError("Network error during upload. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const r = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (r.ok) {
        setDocs((prev) => prev.filter((d) => d.id !== id));
        setDeleteId(null);
      } else {
        const data = await r.json();
        setError(data.error || "Delete failed.");
      }
    } catch {
      setError("Failed to delete document.");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = docs.filter((d) => {
    const matchSearch = !search || d.original_name.toLowerCase().includes(search.toLowerCase());
    const matchSubject = filterSubject === "All" || d.subject === filterSubject;
    return matchSearch && matchSubject;
  });

  const subjects = ["All", ...Array.from(new Set(docs.map((d) => d.subject)))];

  return (
    <div>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ marginBottom: "0.35rem" }}>Study Library</h1>
        <p style={{ color: "var(--color-text-2)", fontSize: "0.9rem" }}>
          Upload PDF study materials. Once processed, you can generate notes, quizzes, and flashcards from them.
        </p>
      </div>

      {/* Upload section */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "0.9rem", marginBottom: "1.25rem" }}>Upload PDF</h2>

        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 220px" }}>
            <label className="label">Subject / Course</label>
            <select className="select" value={subject} onChange={(e) => setSubject(e.target.value)}>
              {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div
          className={`dropzone ${dragOver ? "drag-over" : ""}`}
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            style={{ display: "none" }}
            onChange={(e) => handleFiles(e.target.files)}
          />
          {uploading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
              <Loader2 size={28} color="var(--color-primary)" style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ color: "var(--color-text-2)", fontSize: "0.875rem" }}>{uploadProgress}</span>
            </div>
          ) : (
            <div>
              <Upload size={28} color="var(--color-text-3)" style={{ margin: "0 auto 0.75rem" }} />
              <div style={{ fontWeight: 500, marginBottom: "0.35rem", fontSize: "0.9rem" }}>
                Drop your PDF here, or <span style={{ color: "var(--color-primary)" }}>browse files</span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--color-text-3)" }}>
                PDF files only · Up to 50 MB per file · Added to {subject}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div style={{ marginTop: "0.75rem", padding: "0.6rem 0.9rem", background: "var(--color-error-bg)", border: "1px solid #fca5a5", borderRadius: "var(--radius-md)", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
            <AlertCircle size={15} color="var(--color-error)" style={{ flexShrink: 0, marginTop: "0.1rem" }} />
            <span style={{ fontSize: "0.85rem", color: "var(--color-error)" }}>{error}</span>
          </div>
        )}
        {success && (
          <div style={{ marginTop: "0.75rem", padding: "0.6rem 0.9rem", background: "var(--color-success-bg)", border: "1px solid #6ee7b7", borderRadius: "var(--radius-md)", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
            <CheckCircle size={15} color="var(--color-success)" style={{ flexShrink: 0, marginTop: "0.1rem" }} />
            <span style={{ fontSize: "0.85rem", color: "var(--color-success)" }}>{success}</span>
          </div>
        )}
      </div>

      {/* Document list */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <h2 style={{ fontSize: "0.95rem" }}>
            Your documents {docs.length > 0 && <span style={{ color: "var(--color-text-2)", fontWeight: 400 }}>({docs.length})</span>}
          </h2>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: "0.6rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-3)" }} />
              <input
                className="input"
                style={{ paddingLeft: "2rem", width: 200 }}
                placeholder="Search filenames"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {subjects.length > 2 && (
              <select className="select" style={{ width: "auto" }} value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
                {subjects.map((s) => <option key={s}>{s}</option>)}
              </select>
            )}
          </div>
        </div>

        {loading ? (
          <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
            <Loader2 size={24} color="var(--color-text-3)" style={{ animation: "spin 1s linear infinite", margin: "0 auto" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card empty-state">
            <FileText size={32} className="empty-state-icon" />
            <h3>{docs.length === 0 ? "No documents yet" : "No matches found"}</h3>
            <p>{docs.length === 0 ? "Upload your first PDF to get started." : "Try a different search or filter."}</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {/* Table header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 130px 110px 150px",
              padding: "0.6rem 1.25rem",
              background: "var(--bg-sidebar)",
              borderBottom: "1px solid var(--color-border)",
              fontSize: "0.72rem",
              fontWeight: 650,
              color: "var(--color-text-2)",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}>
              <span>DOCUMENT NAME</span>
              <span>COURSE</span>
              <span>STATUS</span>
              <span>ACTIONS</span>
            </div>
            {filtered.map((doc, i) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                isLast={i === filtered.length - 1}
                onDelete={() => setDeleteId(doc.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete modal */}
      {deleteId && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 100,
        }}>
          <div className="card" style={{ maxWidth: 420, width: "90%", padding: "1.75rem" }}>
            <h2 style={{ marginBottom: "0.75rem", fontSize: "1rem" }}>
              Delete {docs.find((d) => d.id === deleteId)?.original_name}?
            </h2>
            <p style={{ color: "var(--color-text-2)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              This removes the document and all its notes, quizzes, and flashcards from your library. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)} disabled={deleting}>
                Keep file
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteId)} disabled={deleting}>
                {deleting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={14} />}
                Delete PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function DocumentRow({ doc, isLast, onDelete }: { doc: Document; isLast: boolean; onDelete: () => void }) {
  const size = doc.file_size < 1024 * 1024
    ? `${(doc.file_size / 1024).toFixed(1)} KB`
    : `${(doc.file_size / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 130px 110px 150px",
      padding: "0.875rem 1.25rem",
      borderBottom: isLast ? "none" : "1px solid var(--color-border-s)",
      alignItems: "center",
    }}>
      {/* Name */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {doc.original_name}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--color-text-2)", marginTop: "0.1rem" }}>
          {size} · Added {new Date(doc.created_at).toLocaleDateString()}
          {doc.status === "failed" && doc.error_message && (
            <span style={{ color: "var(--color-error)", marginLeft: "0.5rem" }}>· {doc.error_message.slice(0, 60)}</span>
          )}
        </div>
      </div>

      {/* Course */}
      <span style={{ fontSize: "0.8rem", color: "var(--color-text-2)" }}>{doc.subject}</span>

      {/* Status */}
      <div>
        {doc.status === "ready" && (
          <span className="badge badge-ready"><CheckCircle size={11} /> Ready</span>
        )}
        {doc.status === "processing" && (
          <span className="badge badge-process">
            <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> Processing
          </span>
        )}
        {doc.status === "failed" && (
          <span className="badge badge-failed"><XCircle size={11} /> Failed</span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.4rem" }}>
        {doc.status === "ready" && (
          <a href={`/notes?doc=${doc.id}`} className="btn btn-secondary btn-sm">
            <FileText size={12} /> Notes
          </a>
        )}
        <button className="btn btn-ghost btn-sm" onClick={onDelete} style={{ color: "var(--color-error)" }}>
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

