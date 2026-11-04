import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { Document } from "@/lib/types";

// Poll document processing status
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const doc = db
      .prepare("SELECT id, status, error_message, gemini_file_uri, updated_at FROM documents WHERE id = ?")
      .get(id) as Pick<Document, "id" | "status" | "error_message" | "gemini_file_uri" | "updated_at"> | undefined;

    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    return NextResponse.json(doc);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

