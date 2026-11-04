import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { Document } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { extractPdfContent } from "@/lib/rag";

const UPLOADS_DIR = process.env.VERCEL
  ? path.join("/tmp", "ai-study-assistant", "uploads")
  : path.join(process.cwd(), "data", "uploads");

function ensureUploadDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export async function GET() {
  try {
    const db = getDb();
    const docs = db
      .prepare("SELECT * FROM documents ORDER BY created_at DESC")
      .all() as Document[];
    return NextResponse.json(docs);
  } catch (error) {
    console.error("GET /api/documents error:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    ensureUploadDir();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const subject = (formData.get("subject") as string) || "General";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const filename = file.name || "document.pdf";
    const mimeType = file.type || "application/pdf";
    const fileSize = file.size;

    if (!filename.toLowerCase().endsWith(".pdf") && mimeType !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 }
      );
    }

    if (fileSize > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 50MB limit" }, { status: 400 });
    }

    const db = getDb();

    // Check for duplicate by filename + size
    const existing = db
      .prepare(
        "SELECT id FROM documents WHERE original_name = ? AND file_size = ? AND status != 'failed'"
      )
      .get(filename, fileSize);

    if (existing) {
      return NextResponse.json(
        { error: `"${filename}" is already uploaded in your library.` },
        { status: 409 }
      );
    }

    const id = uuidv4();
    const safeFilename = `${id}_${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = path.join(UPLOADS_DIR, safeFilename);

    // Read buffer from File
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Save PDF file to disk
    fs.writeFileSync(filePath, fileBuffer);

    // Insert record with processing status
    db.prepare(`
      INSERT INTO documents (id, filename, original_name, subject, file_path, file_size, mime_type, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'processing')
    `).run(id, safeFilename, filename, subject, filePath, fileSize, mimeType);

    // Extract PDF text locally using pdf-parse
    try {
      const parsed = await extractPdfContent(id, fileBuffer);

      if (!parsed.fullText || parsed.fullText.trim().length < 20) {
        db.prepare(`
          UPDATE documents SET status = 'failed', error_message = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run("No readable text found. Scanned or image-only PDFs require searchable text.", id);
      } else {
        db.prepare(`
          UPDATE documents SET status = 'ready', page_count = ?, extracted_text = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(parsed.pageCount, parsed.fullText, id);
      }
    } catch (parseErr: any) {
      console.error("PDF extraction error:", parseErr);
      db.prepare(`
        UPDATE documents SET status = 'failed', error_message = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(parseErr.message || "Failed to parse PDF content.", id);
    }

    const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as Document;
    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error("POST /api/documents error:", error);
    return NextResponse.json(
      { error: "Failed to upload document", details: String(error) },
      { status: 500 }
    );
  }
}
