import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { Document, ChatSession, ChatMessage } from "@/lib/types";
import { generateGroundedChatAnswer } from "@/lib/gemini";
import { extractPdfContent, searchChunksBM25 } from "@/lib/rag";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const sessions = db
      .prepare("SELECT * FROM chat_sessions WHERE document_id = ? ORDER BY updated_at DESC")
      .all(id) as ChatSession[];

    return NextResponse.json(sessions);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = await request.json();
    const { question, session_id } = body;

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

    const doc = db
      .prepare("SELECT * FROM documents WHERE id = ?")
      .get(id) as Document | undefined;

    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    if (doc.status !== "ready") {
      return NextResponse.json({ error: "Document is not ready for chat" }, { status: 400 });
    }

    // Get or create session
    let sessionId = session_id;
    if (!sessionId) {
      sessionId = uuidv4();
      db.prepare(`
        INSERT INTO chat_sessions (id, document_id, title, created_at, updated_at)
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
      `).run(sessionId, id, `Chat: ${doc.original_name}`);
    } else {
      const session = db.prepare("SELECT id FROM chat_sessions WHERE id = ?").get(sessionId);
      if (!session) {
        sessionId = uuidv4();
        db.prepare(`
          INSERT INTO chat_sessions (id, document_id, title, created_at, updated_at)
          VALUES (?, ?, ?, datetime('now'), datetime('now'))
        `).run(sessionId, id, `Chat: ${doc.original_name}`);
      }
    }

    // Retrieve conversation history
    const history = db
      .prepare("SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC")
      .all(sessionId) as ChatMessage[];

    // Extract chunks from document using pdf-parse for authentic BM25 retrieval
    let retrievedPassages: Array<{ page: number; text: string }> = [];

    if (doc.file_path && fs.existsSync(doc.file_path)) {
      try {
        const fileBuffer = fs.readFileSync(doc.file_path);
        const parsed = await extractPdfContent(doc.id, fileBuffer);
        const scoredChunks = searchChunksBM25(question, parsed.chunks, 4);

        if (scoredChunks.length > 0) {
          retrievedPassages = scoredChunks.map((item) => ({
            page: item.chunk.page_number,
            text: item.chunk.text,
          }));
        } else if (parsed.chunks.length > 0) {
          // If query has low lexical overlap, include the initial chunks
          retrievedPassages = parsed.chunks.slice(0, 3).map((c) => ({
            page: c.page_number,
            text: c.text,
          }));
        }
      } catch (err) {
        console.warn("Could not re-chunk from file path, falling back to stored text", err);
      }
    }

    // Fallback if file reading had an issue
    if (retrievedPassages.length === 0 && doc.extracted_text) {
      retrievedPassages = [{ page: 1, text: doc.extracted_text.slice(0, 4000) }];
    }

    // Generate grounded answer via Gemini
    const responseText = await generateGroundedChatAnswer(
      question.trim(),
      history.map((m) => ({ role: m.role, content: m.content })),
      doc.original_name,
      retrievedPassages
    );

    // Save user message
    const userMsgId = uuidv4();
    db.prepare(`
      INSERT INTO chat_messages (id, session_id, role, content, created_at)
      VALUES (?, ?, 'user', ?, datetime('now'))
    `).run(userMsgId, sessionId, question.trim());

    // Save assistant message
    const asstMsgId = uuidv4();
    db.prepare(`
      INSERT INTO chat_messages (id, session_id, role, content, created_at)
      VALUES (?, ?, 'assistant', ?, datetime('now'))
    `).run(asstMsgId, sessionId, responseText);

    // Touch session
    db.prepare("UPDATE chat_sessions SET updated_at = datetime('now') WHERE id = ?").run(sessionId);

    return NextResponse.json({
      session_id: sessionId,
      user_message: { id: userMsgId, role: "user", content: question.trim() },
      assistant_message: { id: asstMsgId, role: "assistant", content: responseText },
    });
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate response" },
      { status: 500 }
    );
  }
}
