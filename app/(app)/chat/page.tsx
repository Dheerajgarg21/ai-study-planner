"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  Send,
  Sparkles,
  BookOpen,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  FileText,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Info
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Document, ChatSession, ChatMessage } from "@/lib/types";

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialDocId = searchParams.get("doc");

  const [docs, setDocs] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocId || "");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load ready documents
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

  // Load chat session for selected doc
  useEffect(() => {
    if (!selectedDocId) {
      setMessages([]);
      setSessionId(null);
      return;
    }
    // Fetch sessions for this doc
    fetch(`/api/documents/${selectedDocId}/chat`)
      .then((res) => res.json())
      .then((sessions: ChatSession[]) => {
        if (Array.isArray(sessions) && sessions.length > 0) {
          setSessionId(sessions[0].id);
          // fetch messages for this session
          fetch(`/api/chat-sessions/${sessions[0].id}`)
            .then((r) => r.json())
            .then((msgs: ChatMessage[]) => {
              if (Array.isArray(msgs)) setMessages(msgs);
            })
            .catch(() => {});
        } else {
          setSessionId(null);
          setMessages([]);
        }
      })
      .catch(() => {});
  }, [selectedDocId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || !selectedDocId || sending) return;

    setInput("");
    setError(null);
    setSending(true);

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: sessionId || "",
      role: "user",
      content: q,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch(`/api/documents/${selectedDocId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          session_id: sessionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate grounded answer");
      }

      setSessionId(data.session_id);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        data.user_message,
        data.assistant_message,
      ]);
    } catch (err: any) {
      setError(err.message || "Chat failed");
      // keep user message in history
    } finally {
      setSending(false);
    }
  };

  const handleNewConversation = () => {
    setSessionId(null);
    setMessages([]);
  };

  const currentDoc = docs.find((d) => d.id === selectedDocId);

  // Suggested starter prompts based on academic study
  const suggestedPrompts = [
    "What are the main definitions and key concepts in this document?",
    "Explain the core mechanisms step-by-step.",
    "Are there any mathematical formulas or equations presented?",
    "Compare and contrast the primary ideas in this material.",
  ];

  if (docs.length === 0) {
    return (
      <div>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ marginBottom: "0.35rem" }}>Think it through, with your source</h1>
          <p style={{ color: "var(--color-text-2)", fontSize: "0.9rem" }}>
            Ask questions. Follow the evidence. Keep the original meaning.
          </p>
        </div>
        <div className="card empty-state">
          <BookOpen size={36} className="empty-state-icon" />
          <h3>No study materials ready</h3>
          <p>Upload a PDF document first. Once indexed, you can have a document-grounded conversation here.</p>
          <Link href="/library" className="btn btn-primary" style={{ marginTop: "1.25rem" }}>
            Go to Study Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ marginBottom: "0.35rem" }}>Think it through, with your source</h1>
        <p style={{ color: "var(--color-text-2)", fontSize: "0.9rem" }}>
          Ask questions. Follow the evidence. Keep the original meaning.
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
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--color-text-2)", fontWeight: 500 }}>
            Source document:
          </span>
          <select
            className="select"
            style={{ width: "auto", minWidth: 240, fontSize: "0.85rem", padding: "0.35rem 2rem 0.35rem 0.75rem" }}
            value={selectedDocId}
            onChange={(e) => {
              setSelectedDocId(e.target.value);
              router.replace(`/chat?doc=${e.target.value}`);
            }}
          >
            {docs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.original_name} ({d.subject})
              </option>
            ))}
          </select>
          <span className="badge badge-ready">
            <CheckCircle size={11} /> Grounded source
          </span>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={handleNewConversation}
        >
          <RotateCcw size={13} /> New conversation
        </button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "1.25rem",
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

      {/* Main 2-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "1.75rem", alignItems: "start" }}>
        {/* Left: Chat Canvas */}
        <div
          className="card"
          style={{
            display: "flex",
            flexDirection: "column",
            height: "640px",
            padding: 0,
            overflow: "hidden",
            background: "var(--bg-surface)",
          }}
        >
          {/* Messages Stream */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            {messages.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--color-text-2)" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    background: "var(--color-primary-l)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1rem",
                  }}
                >
                  <MessageSquare size={20} color="var(--color-primary)" />
                </div>
                <h3 style={{ fontSize: "1rem", color: "var(--color-text)", marginBottom: "0.4rem" }}>
                  Ask about {currentDoc?.original_name}
                </h3>
                <p style={{ fontSize: "0.825rem", maxWidth: 360, margin: "0 auto 1.5rem", lineHeight: 1.5 }}>
                  The assistant retrieves facts strictly from your uploaded document. It will explicitly notify you if a question cannot be answered from the source.
                </p>

                {/* Suggested Starters */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 420, margin: "0 auto", textAlign: "left" }}>
                  {suggestedPrompts.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(p)}
                      className="btn btn-secondary btn-sm"
                      style={{
                        justifyContent: "space-between",
                        padding: "0.55rem 0.85rem",
                        fontSize: "0.8rem",
                        background: "var(--bg-main)",
                      }}
                    >
                      <span>{p}</span>
                      <ChevronRight size={13} color="var(--color-text-3)" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => {
                const isUser = m.role === "user";
                const isNotInSource = !isUser && (
                  m.content.toLowerCase().includes("cannot find") ||
                  m.content.toLowerCase().includes("couldn't find") ||
                  m.content.toLowerCase().includes("not found in") ||
                  m.content.toLowerCase().includes("not mentioned in")
                );

                return (
                  <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: isUser ? "var(--color-primary)" : "var(--color-primary-l)",
                          color: isUser ? "#fff" : "var(--color-primary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.7rem",
                          fontWeight: 600,
                        }}
                      >
                        {isUser ? "You" : "AI"}
                      </div>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-2)" }}>
                        {isUser ? "You" : "Study Assistant"}
                      </span>
                      {isNotInSource && (
                        <span className="badge badge-failed" style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem" }}>
                          Not in selected source
                        </span>
                      )}
                    </div>

                    <div
                      className={`chat-bubble ${isUser ? "chat-bubble-user" : "chat-bubble-asst"}`}
                      style={{
                        marginLeft: isUser ? "auto" : "0",
                        maxWidth: isUser ? "80%" : "95%",
                      }}
                    >
                      {isUser ? (
                        m.content
                      ) : (
                        <div className="prose" style={{ fontSize: "0.875rem" }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {m.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {sending && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0" }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "var(--color-primary-l)",
                    color: "var(--color-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                  }}
                >
                  AI
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-primary)", animation: "bounce 1s infinite 0s" }} />
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-primary)", animation: "bounce 1s infinite 0.2s" }} />
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-primary)", animation: "bounce 1s infinite 0.4s" }} />
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-3)" }}>
                  Analyzing source document...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompt chips (shown when conversation is active) */}
          {messages.length > 0 && (
            <div
              style={{
                padding: "0.5rem 1rem",
                display: "flex",
                gap: "0.5rem",
                overflowX: "auto",
                borderTop: "1px solid var(--color-border-s)",
                background: "var(--bg-main)",
              }}
            >
              <button
                className="btn btn-secondary btn-sm"
                style={{ fontSize: "0.72rem", padding: "0.25rem 0.6rem" }}
                onClick={() => handleSend("Can you summarize the key takeaways of this material?")}
              >
                Summarize key takeaways
              </button>
              <button
                className="btn btn-secondary btn-sm"
                style={{ fontSize: "0.72rem", padding: "0.25rem 0.6rem" }}
                onClick={() => handleSend("Explain any formulas or technical definitions present.")}
              >
                Technical definitions
              </button>
            </div>
          )}

          {/* Input Bar */}
          <div
            style={{
              padding: "1rem",
              borderTop: "1px solid var(--color-border)",
              background: "var(--bg-surface)",
            }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
            >
              <input
                className="input"
                placeholder={`Ask about ${currentDoc?.original_name}...`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={sending}
                style={{ fontSize: "0.875rem", padding: "0.6rem 0.85rem" }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!input.trim() || sending}
                style={{ padding: "0.6rem 1rem", flexShrink: 0 }}
              >
                <Send size={15} />
                Send
              </button>
            </form>
            <div style={{ fontSize: "0.7rem", color: "var(--color-text-3)", marginTop: "0.4rem", textAlign: "center" }}>
              Answers are strictly limited to {currentDoc?.original_name}. External web sources are excluded.
            </div>
          </div>
        </div>

        {/* Right Sidebar: Source Notebook & Grounding Guarantee */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="card card-sm">
            <div style={{ fontSize: "0.72rem", fontWeight: 650, letterSpacing: "0.06em", color: "var(--color-text-3)", textTransform: "uppercase", marginBottom: "0.6rem" }}>
              SOURCE NOTEBOOK
            </div>
            <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--color-text)" }}>
              {currentDoc?.original_name}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-2)", marginTop: "0.2rem", marginBottom: "0.85rem" }}>
              Subject: {currentDoc?.subject} · Ready for RAG
            </div>
            <div
              style={{
                padding: "0.65rem 0.75rem",
                background: "var(--bg-main)",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.78rem",
                color: "var(--color-text-2)",
                lineHeight: 1.45,
              }}
            >
              The AI references the document via Gemini file context. Answers preserve exact technical nomenclature and terminology.
            </div>
          </div>

          <div className="card card-sm" style={{ background: "var(--color-primary-t)", borderColor: "var(--color-primary-l)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 650, fontSize: "0.825rem", color: "var(--color-primary)", marginBottom: "0.35rem" }}>
              <ShieldCheck size={16} /> Grounded, not guessed
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--color-text-2)", lineHeight: 1.5 }}>
              No web sources or arbitrary external data are used in this conversation. When the source material does not contain an answer, the model explicitly identifies that boundary.
            </p>
          </div>

          <div className="card card-sm">
            <div style={{ fontSize: "0.72rem", fontWeight: 650, letterSpacing: "0.06em", color: "var(--color-text-3)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              ACADEMIC CAPABILITIES
            </div>
            <ul style={{ fontSize: "0.78rem", color: "var(--color-text-2)", paddingLeft: "1.1rem", margin: 0, lineHeight: 1.6 }}>
              <li>Maintains conversation history and context</li>
              <li>Preserves equations and chemical notation</li>
              <li>Identifies definitions and section headings</li>
              <li>Zero fabricated citations or quotes</li>
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="card" style={{ padding: "3rem", textAlign: "center" }}>Loading chat...</div>}>
      <ChatContent />
    </Suspense>
  );
}

