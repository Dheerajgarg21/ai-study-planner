"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Layers,
  RotateCw,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Sparkles,
  HelpCircle,
  RefreshCw,
  Flame,
  Check,
  Eye,
  SlidersHorizontal
} from "lucide-react";
import { Document, FlashcardSet, Flashcard, FlashcardReview } from "@/lib/types";

function FlashcardsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialDocId = searchParams.get("doc");

  const [docs, setDocs] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocId || "");
  const [cardSet, setCardSet] = useState<FlashcardSet | null>(null);
  const [reviews, setReviews] = useState<FlashcardReview[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [filterDifficultOnly, setFilterDifficultOnly] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  // Load flashcards for selected document
  useEffect(() => {
    if (!selectedDocId) {
      setCardSet(null);
      return;
    }
    fetch(`/api/documents/${selectedDocId}/flashcards`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCardSet(data[0]);
          setCurrentIndex(0);
          setIsFlipped(false);
          // fetch reviews for this set
          fetch(`/api/flashcard-sets/${data[0].id}/reviews`)
            .then((r) => r.json())
            .then((revs) => {
              if (Array.isArray(revs)) setReviews(revs);
            })
            .catch(() => {});
        } else {
          setCardSet(null);
        }
      })
      .catch(() => {});
  }, [selectedDocId]);

  const handleGenerate = async () => {
    if (!selectedDocId) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${selectedDocId}/flashcards`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate flashcards");
      setCardSet(data);
      setCurrentIndex(0);
      setIsFlipped(false);
      setReviews([]);
    } catch (err: any) {
      setError(err.message || "Failed to generate flashcards");
    } finally {
      setGenerating(false);
    }
  };

  const handleRate = async (rating: "easy" | "medium" | "hard") => {
    if (!cardSet) return;
    try {
      const res = await fetch(`/api/flashcard-sets/${cardSet.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_index: activeCardsIndices[currentIndex],
          rating,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setReviews((prev) => [data, ...prev]);
        // Auto-advance to next card if available
        if (currentIndex < activeCardsIndices.length - 1) {
          setCurrentIndex(currentIndex + 1);
          setIsFlipped(false);
        }
      }
    } catch {}
  };

  const currentDoc = docs.find((d) => d.id === selectedDocId);

  // Compute latest review for each card index
  const latestRatingMap: Record<number, "easy" | "medium" | "hard"> = {};
  reviews.forEach((r) => {
    if (!latestRatingMap[r.card_index]) {
      latestRatingMap[r.card_index] = r.rating;
    }
  });

  const totalCards = cardSet?.cards.length || 0;
  const cards = cardSet?.cards || [];

  // Filter indices based on difficult filter
  const activeCardsIndices = cards
    .map((_, i) => i)
    .filter((i) => {
      if (!filterDifficultOnly) return true;
      return latestRatingMap[i] === "hard";
    });

  const activeCard = activeCardsIndices.length > 0 ? cards[activeCardsIndices[currentIndex]] : null;

  // Deck statistics
  const reviewedCount = Object.keys(latestRatingMap).length;
  const easyCount = Object.values(latestRatingMap).filter((r) => r === "easy").length;
  const mediumCount = Object.values(latestRatingMap).filter((r) => r === "medium").length;
  const hardCount = Object.values(latestRatingMap).filter((r) => r === "hard").length;
  const notReviewedCount = Math.max(0, totalCards - reviewedCount);

  // Difficult cards list
  const difficultIndices = Object.entries(latestRatingMap)
    .filter(([_, r]) => r === "hard")
    .map(([idx]) => Number(idx));

  if (docs.length === 0) {
    return (
      <div>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ marginBottom: "0.35rem" }}>A little recall goes a long way</h1>
          <p style={{ color: "var(--color-text-2)", fontSize: "0.9rem" }}>
            Source-grounded flashcards. Review and rate at your own pace.
          </p>
        </div>
        <div className="card empty-state">
          <BookOpen size={36} className="empty-state-icon" />
          <h3>No study materials ready</h3>
          <p>Upload a PDF document first. Once indexed, you can generate active recall flashcards.</p>
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
        <h1 style={{ marginBottom: "0.35rem" }}>A little recall goes a long way</h1>
        <p style={{ color: "var(--color-text-2)", fontSize: "0.9rem" }}>
          {currentDoc?.original_name || "Document"} · {totalCards} source-grounded cards · Review at your own pace
        </p>
      </div>

      {/* Document Selector & Controls */}
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
            Card deck:
          </span>
          <select
            className="select"
            style={{ width: "auto", minWidth: 240, fontSize: "0.85rem", padding: "0.35rem 2rem 0.35rem 0.75rem" }}
            value={selectedDocId}
            onChange={(e) => {
              setSelectedDocId(e.target.value);
              router.replace(`/flashcards?doc=${e.target.value}`);
            }}
          >
            {docs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.original_name} ({d.subject})
              </option>
            ))}
          </select>

          {cardSet && (
            <span className="badge badge-primary">
              <Layers size={11} /> {totalCards} cards
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleGenerate}
            disabled={generating}
          >
            <RefreshCw size={13} className={generating ? "animate-spin" : ""} />
            {generating ? "Generating..." : cardSet ? "Regenerate deck" : "Generate deck"}
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

      {!cardSet ? (
        <div className="card empty-state" style={{ padding: "4rem 2rem" }}>
          <Layers size={40} className="empty-state-icon" />
          <h3 style={{ fontSize: "1.05rem" }}>No flashcards generated yet</h3>
          <p style={{ maxWidth: 420 }}>
            Create an active-recall flashcard deck directly from <strong>{currentDoc?.original_name}</strong> to test key concepts and definitions.
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: "1.25rem" }}
            onClick={handleGenerate}
            disabled={generating}
          >
            <Sparkles size={15} />
            {generating ? "Generating Flashcards..." : "Generate AI Flashcards"}
          </button>
        </div>
      ) : (
        /* Main Flashcards Experience */
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "1.75rem", alignItems: "start" }}>
          {/* Center Card Stage */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {activeCardsIndices.length === 0 ? (
              <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
                <CheckCircle size={36} color="var(--color-success)" style={{ margin: "0 auto 0.75rem" }} />
                <h3>No difficult cards in this deck</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--color-text-2)", marginTop: "0.4rem" }}>
                  You have not rated any cards as &ldquo;Hard&rdquo;, or all difficult cards have been reviewed.
                </p>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: "1rem" }}
                  onClick={() => setFilterDifficultOnly(false)}
                >
                  View all cards ({totalCards})
                </button>
              </div>
            ) : activeCard ? (
              <>
                {/* Filter / Nav sub-header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--color-text-2)", fontWeight: 500 }}>
                    {filterDifficultOnly ? "Revisiting difficult card" : "Card"} {currentIndex + 1} of {activeCardsIndices.length}
                    {latestRatingMap[activeCardsIndices[currentIndex]] && (
                      <span
                        style={{
                          marginLeft: "0.5rem",
                          fontSize: "0.75rem",
                          textTransform: "capitalize",
                          color: latestRatingMap[activeCardsIndices[currentIndex]] === "hard"
                            ? "var(--color-error)"
                            : latestRatingMap[activeCardsIndices[currentIndex]] === "medium"
                            ? "var(--color-warning)"
                            : "var(--color-success)",
                        }}
                      >
                        (Rated {latestRatingMap[activeCardsIndices[currentIndex]]})
                      </span>
                    )}
                  </span>

                  {difficultIndices.length > 0 && (
                    <button
                      className={`btn btn-sm ${filterDifficultOnly ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => {
                        setFilterDifficultOnly(!filterDifficultOnly);
                        setCurrentIndex(0);
                        setIsFlipped(false);
                      }}
                    >
                      <Flame size={12} />
                      {filterDifficultOnly ? "Show all cards" : `Difficult cards (${difficultIndices.length})`}
                    </button>
                  )}
                </div>

                {/* Flip Card Component */}
                <div
                  className="card"
                  onClick={() => setIsFlipped(!isFlipped)}
                  style={{
                    minHeight: 280,
                    padding: "2.25rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    position: "relative",
                    background: isFlipped ? "var(--bg-surface)" : "var(--bg-main)",
                    border: `1.5px solid ${isFlipped ? "var(--color-primary-l)" : "var(--color-border)"}`,
                    boxShadow: "var(--shadow-sm)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* Card Top Label */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 650,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: isFlipped ? "var(--color-primary)" : "var(--color-text-3)",
                      }}
                    >
                      {isFlipped ? "BACK / ANSWER REVEALED" : "FRONT / QUESTION"}
                    </span>
                    {activeCard.topic && (
                      <span style={{ fontSize: "0.75rem", color: "var(--color-text-2)", background: "rgba(0,0,0,0.04)", padding: "0.15rem 0.5rem", borderRadius: "var(--radius-sm)" }}>
                        {activeCard.topic}
                      </span>
                    )}
                  </div>

                  {/* Card Main Body */}
                  <div style={{ margin: "1.75rem 0", textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: isFlipped ? "1.05rem" : "1.2rem",
                        fontWeight: 600,
                        lineHeight: 1.5,
                        color: "var(--color-text)",
                      }}
                    >
                      {isFlipped ? activeCard.back : activeCard.front}
                    </div>
                  </div>

                  {/* Card Bottom Hint */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", color: "var(--color-text-3)" }}>
                    <span>{isFlipped ? "Source: " + (currentDoc?.original_name || "") : "Click anywhere to flip"}</span>
                    <span style={{ color: "var(--color-primary)", fontWeight: 500, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <RotateCw size={12} /> {isFlipped ? "Flip to question" : "Flip to answer"}
                    </span>
                  </div>
                </div>

                {/* Rating Bar (shown when flipped, or available to rate) */}
                <div className="card card-sm" style={{ background: "var(--bg-surface)" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-text-2)", marginBottom: "0.6rem", textAlign: "center" }}>
                    How well did you remember?
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem" }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleRate("hard")}
                      style={{
                        flexDirection: "column",
                        padding: "0.6rem 0.5rem",
                        borderColor: latestRatingMap[activeCardsIndices[currentIndex]] === "hard" ? "var(--color-error)" : "var(--color-border)",
                        background: latestRatingMap[activeCardsIndices[currentIndex]] === "hard" ? "var(--color-error-bg)" : "transparent",
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "var(--color-error)", fontSize: "0.85rem" }}>Hard</span>
                      <span style={{ fontSize: "0.7rem", color: "var(--color-text-2)" }}>Keep in difficult</span>
                    </button>

                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleRate("medium")}
                      style={{
                        flexDirection: "column",
                        padding: "0.6rem 0.5rem",
                        borderColor: latestRatingMap[activeCardsIndices[currentIndex]] === "medium" ? "var(--color-warning)" : "var(--color-border)",
                        background: latestRatingMap[activeCardsIndices[currentIndex]] === "medium" ? "var(--color-warning-bg)" : "transparent",
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "var(--color-warning)", fontSize: "0.85rem" }}>Medium</span>
                      <span style={{ fontSize: "0.7rem", color: "var(--color-text-2)" }}>Needed a thought</span>
                    </button>

                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleRate("easy")}
                      style={{
                        flexDirection: "column",
                        padding: "0.6rem 0.5rem",
                        borderColor: latestRatingMap[activeCardsIndices[currentIndex]] === "easy" ? "var(--color-success)" : "var(--color-border)",
                        background: latestRatingMap[activeCardsIndices[currentIndex]] === "easy" ? "var(--color-success-bg)" : "transparent",
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "var(--color-success)", fontSize: "0.85rem" }}>Easy</span>
                      <span style={{ fontSize: "0.7rem", color: "var(--color-text-2)" }}>Recalled confidently</span>
                    </button>
                  </div>
                </div>

                {/* Card Navigation */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={currentIndex === 0}
                    onClick={() => {
                      setCurrentIndex(currentIndex - 1);
                      setIsFlipped(false);
                    }}
                  >
                    <ArrowLeft size={13} /> Previous card
                  </button>

                  <span style={{ fontSize: "0.78rem", color: "var(--color-text-3)" }}>
                    Ratings track review state for targeted practice
                  </span>

                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={currentIndex >= activeCardsIndices.length - 1}
                    onClick={() => {
                      setCurrentIndex(currentIndex + 1);
                      setIsFlipped(false);
                    }}
                  >
                    Next card <ArrowRight size={13} />
                  </button>
                </div>
              </>
            ) : null}
          </div>

          {/* Right Sidebar: Deck Progress & Difficult Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Deck Progress Card (matching Figma) */}
            <div className="card card-sm">
              <div style={{ fontSize: "0.72rem", fontWeight: 650, letterSpacing: "0.06em", color: "var(--color-text-3)", textTransform: "uppercase", marginBottom: "0.6rem" }}>
                YOUR DECK PROGRESS
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-primary)", lineHeight: 1 }}>
                {reviewedCount} of {totalCards}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--color-text-2)", marginTop: "0.25rem", marginBottom: "1rem" }}>
                Unique cards reviewed
              </div>

              {/* Progress bar */}
              <div className="progress-bar" style={{ marginBottom: "1rem" }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${totalCards > 0 ? (reviewedCount / totalCards) * 100 : 0}%`,
                    background: "var(--color-primary)",
                  }}
                />
              </div>

              {/* Breakdown counts */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.8rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--color-success)" }}>Easy</span>
                  <span style={{ fontWeight: 600 }}>{easyCount} card{easyCount === 1 ? "" : "s"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--color-warning)" }}>Medium</span>
                  <span style={{ fontWeight: 600 }}>{mediumCount} card{mediumCount === 1 ? "" : "s"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--color-error)" }}>Hard</span>
                  <span style={{ fontWeight: 600 }}>{hardCount} card{hardCount === 1 ? "" : "s"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--color-text-3)" }}>Not reviewed</span>
                  <span style={{ fontWeight: 600 }}>{notReviewedCount} card{notReviewedCount === 1 ? "" : "s"}</span>
                </div>
              </div>
            </div>

            {/* Difficult Cards Revisit Panel (matching Figma) */}
            <div className="card card-sm">
              <div style={{ fontSize: "0.72rem", fontWeight: 650, letterSpacing: "0.06em", color: "var(--color-text-3)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                YOUR DIFFICULT CARDS
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-2)", lineHeight: 1.45, marginBottom: "0.75rem" }}>
                Cards you most recently rated Hard. Rating them Easy or Medium removes them from this filter.
              </p>

              {difficultIndices.length === 0 ? (
                <div style={{ fontSize: "0.78rem", color: "var(--color-text-3)", fontStyle: "italic", padding: "0.5rem 0" }}>
                  No difficult cards yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {difficultIndices.map((idx) => {
                    const c = cards[idx];
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setFilterDifficultOnly(false);
                          setCurrentIndex(idx);
                          setIsFlipped(false);
                        }}
                        style={{
                          padding: "0.5rem 0.65rem",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--color-border-s)",
                          background: "var(--bg-main)",
                          fontSize: "0.78rem",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
                          {c.front}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "var(--color-error)", fontWeight: 600 }}>
                          Revisit
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FlashcardsPage() {
  return (
    <Suspense fallback={<div className="card" style={{ padding: "3rem", textAlign: "center" }}>Loading flashcards...</div>}>
      <FlashcardsContent />
    </Suspense>
  );
}

