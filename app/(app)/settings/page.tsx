"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Key,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Save,
  Cpu,
  Layers,
  Sparkles,
  ShieldCheck,
  Compass
} from "lucide-react";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("gemini-2.0-flash");
  const [hasServerKey, setHasServerKey] = useState(false);
  const [studentName, setStudentName] = useState("Student");
  const [courses, setCourses] = useState<string[]>(["BIO 201 · Cell Biology", "CHEM 102 · Chemistry", "PSY 101 · Psychology"]);
  const [newCourse, setNewCourse] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data: Record<string, string>) => {
        if (data.student_name) setStudentName(data.student_name);
        if (data.gemini_model) setModelName(data.gemini_model);
        if (data.courses) {
          try {
            setCourses(JSON.parse(data.courses));
          } catch {}
        }
        if (data.gemini_configured === "true") {
          setHasServerKey(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    setSavedMessage(null);
    try {
      const payload: Record<string, string> = {
        student_name: studentName,
        courses: JSON.stringify(courses),
        gemini_model: modelName.trim() || "gemini-2.0-flash",
      };
      if (apiKey.trim()) {
        payload.gemini_api_key = apiKey.trim();
        payload.gemini_configured = "true";
      }
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSavedMessage("Settings saved successfully.");
        if (apiKey.trim()) setHasServerKey(true);
        setApiKey("");
      }
    } catch {
      setSavedMessage("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCourse = () => {
    if (newCourse.trim() && !courses.includes(newCourse.trim())) {
      setCourses([...courses, newCourse.trim()]);
      setNewCourse("");
    }
  };

  const handleRemoveCourse = (courseToRemove: string) => {
    setCourses(courses.filter((c) => c !== courseToRemove));
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ marginBottom: "0.35rem" }}>Settings &amp; Architecture</h1>
        <p style={{ color: "var(--color-text-2)", fontSize: "0.9rem" }}>
          Configure prototype preferences, API connectivity, and review the academic AI paradigm breakdown.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem", maxWidth: 840 }}>
        {/* Gemini API Key Configuration */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <Key size={18} color="var(--color-primary)" />
            <h2 style={{ fontSize: "1rem" }}>Google Gemini API Configuration</h2>
          </div>
          <p style={{ fontSize: "0.825rem", color: "var(--color-text-2)", marginBottom: "1.25rem" }}>
            Keys are strictly held server-side and never exposed to client bundles. You can also specify <code>GEMINI_API_KEY</code> in <code>.env.local</code>.
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-2)" }}>Key status:</span>
            {hasServerKey ? (
              <span className="badge badge-ready">
                <CheckCircle size={11} /> Configured &amp; Active
              </span>
            ) : (
              <span className="badge badge-upload">
                <AlertCircle size={11} /> Pending configuration
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1.25rem" }}>
            <input
              type="password"
              className="input"
              placeholder={hasServerKey ? "•••••••••••••••• (Leave blank to keep current key)" : "Enter Gemini API key (AIza...)"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{ flex: 1, fontSize: "0.85rem" }}
            />
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label className="label">Gemini Model Name</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                className="input"
                placeholder="e.g. gemini-2.0-flash"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                style={{ flex: 1, fontSize: "0.85rem" }}
              />
              <select
                className="select"
                style={{ width: "auto" }}
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
              >
                <option value="gemini-2.0-flash">gemini-2.0-flash (Recommended)</option>
                <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite</option>
                <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite</option>
                <option value="gemini-2.0-flash-lite">gemini-2.0-flash-lite</option>
                <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro</option>
              </select>
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--color-text-3)", marginTop: "0.3rem" }}>
              Primary model with automatic cascading fallback to <code>gemini-2.5-flash-lite</code>, <code>gemini-3.5-flash-lite</code>, and others if rate limits or quota are hit.
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              className="btn btn-primary"
              onClick={handleSaveSettings}
              disabled={saving}
            >
              <Save size={14} />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
          {savedMessage && (
            <div style={{ fontSize: "0.78rem", color: "var(--color-success)", marginTop: "0.6rem" }}>
              {savedMessage}
            </div>
          )}
        </div>

        {/* Student & Course Profile */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <BookOpen size={18} color="var(--color-primary)" />
            <h2 style={{ fontSize: "1rem" }}>Academic Profile &amp; Courses</h2>
          </div>
          <p style={{ fontSize: "0.825rem", color: "var(--color-text-2)", marginBottom: "1.25rem" }}>
            Manage the active courses shown across your workspace and library.
          </p>

          <div style={{ marginBottom: "1.25rem" }}>
            <label className="label">Student Name / Workspace Title</label>
            <input
              className="input"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              style={{ maxWidth: 360, fontSize: "0.875rem" }}
            />
          </div>

          <div>
            <label className="label">Registered Courses</label>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <input
                className="input"
                placeholder="e.g. MATH 240 · Linear Algebra"
                value={newCourse}
                onChange={(e) => setNewCourse(e.target.value)}
                style={{ maxWidth: 360, fontSize: "0.85rem" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCourse();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddCourse}
              >
                Add Course
              </button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {courses.map((course, idx) => (
                <span
                  key={idx}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.3rem 0.65rem",
                    background: "var(--bg-main)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.8rem",
                    color: "var(--color-text)",
                  }}
                >
                  {course}
                  <button
                    onClick={() => handleRemoveCourse(course)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-text-3)",
                      cursor: "pointer",
                      padding: 0,
                      lineHeight: 1,
                      fontSize: "0.9rem",
                    }}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Academic Requirements Section: Comparison of AI Paradigms */}
        <div className="card" style={{ background: "var(--bg-surface)", border: "1.5px solid var(--color-primary-l)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <Cpu size={18} color="var(--color-primary)" />
            <h2 style={{ fontSize: "1rem", color: "var(--color-primary)" }}>
              Academic Concept: Comparison of AI Paradigms
            </h2>
          </div>
          <p style={{ fontSize: "0.825rem", color: "var(--color-text-2)", lineHeight: 1.5, marginBottom: "1.5rem" }}>
            As required by the college project specification, this academic section illustrates how Reactive, Goal-Based, and Utility-Based agent paradigms are operationalized within the AI Study Assistant:
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
            {/* Reactive Agent */}
            <div
              style={{
                padding: "1.2rem",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-main)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-primary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
                1. REACTIVE AGENT
              </div>
              <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.4rem" }}>
                Condition-Action &amp; RAG
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-2)", lineHeight: 1.5 }}>
                Operates on current perception without internal historical state. Manifested in <strong>Ask Your Notes</strong>: retrieves text passages corresponding to the student&rsquo;s query and generates immediate grounded responses, explicitly recognizing source boundaries.
              </p>
            </div>

            {/* Goal-Based Agent */}
            <div
              style={{
                padding: "1.2rem",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-main)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
                2. GOAL-BASED AGENT
              </div>
              <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.4rem" }}>
                Target Mastery States
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-2)", lineHeight: 1.5 }}>
                Selects actions toward an explicit goal state (e.g., reaching 100% quiz completion or eliminating all &ldquo;Hard&rdquo; flashcards). Drives the <strong>Difficult Card Drill</strong> and <strong>Checkpoint Verification</strong> workflows.
              </p>
            </div>

            {/* Utility-Based Agent */}
            <div
              style={{
                padding: "1.2rem",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-main)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-success)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
                3. UTILITY-BASED AGENT
              </div>
              <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.4rem" }}>
                Expected Learning Gain
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-2)", lineHeight: 1.5 }}>
                Maximizes an objective utility function: <code>Utility = (Weight_Weakness &times; Error_Rate) - Time_Cost</code>. Powers the <strong>Study Plan Search</strong> and <strong>Revision Recommendations</strong> on the Progress page to prioritize the highest yield learning activities.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

