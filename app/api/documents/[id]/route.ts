import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { Document } from "@/lib/types";
import fs from "fs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as Document | undefined;
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    return NextResponse.json(doc);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as Document | undefined;
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    // Delete local file
    if (doc.file_path && fs.existsSync(doc.file_path)) {
      fs.unlinkSync(doc.file_path);
    }

    // Delete from DB (cascade deletes notes, quizzes, etc.)
    db.prepare("DELETE FROM documents WHERE id = ?").run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = await request.json();
    const { subject } = body;

    if (subject) {
      db.prepare(
        "UPDATE documents SET subject = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(subject, id);
    }

    const doc = db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as Document;
    return NextResponse.json(doc);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

