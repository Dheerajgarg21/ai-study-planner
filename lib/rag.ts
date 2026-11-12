// ─── Polyfill browser-only APIs required by pdf-parse / PDF.js in Node.js ───
// pdf-parse v2.x uses PDF.js which calls DOMMatrix and other DOM globals.
// Node.js does not have these, so we stub them out before any pdf-parse call.
if (typeof globalThis.DOMMatrix === "undefined") {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    is2D = true; isIdentity = true;
    constructor(_init?: string | number[]) {}
    multiply(_other?: any) { return new (globalThis as any).DOMMatrix(); }
    translate(_tx?: number, _ty?: number, _tz?: number) { return new (globalThis as any).DOMMatrix(); }
    scale(_sx?: number, _sy?: number, _sz?: number) { return new (globalThis as any).DOMMatrix(); }
    rotate(_angle?: number) { return new (globalThis as any).DOMMatrix(); }
    inverse() { return new (globalThis as any).DOMMatrix(); }
    transformPoint(_point?: any) { return { x: 0, y: 0, z: 0, w: 1 }; }
    toFloat32Array() { return new Float32Array(16); }
    toFloat64Array() { return new Float64Array(16); }
    toString() { return "matrix(1, 0, 0, 1, 0, 0)"; }
    static fromMatrix(_other?: any) { return new (globalThis as any).DOMMatrix(); }
    static fromFloat32Array(_arr: Float32Array) { return new (globalThis as any).DOMMatrix(); }
    static fromFloat64Array(_arr: Float64Array) { return new (globalThis as any).DOMMatrix(); }
  };
}

if (typeof globalThis.DOMPoint === "undefined") {
  (globalThis as any).DOMPoint = class DOMPoint {
    x = 0; y = 0; z = 0; w = 1;
    constructor(x = 0, y = 0, z = 0, w = 1) { this.x = x; this.y = y; this.z = z; this.w = w; }
    static fromPoint(p?: any) { return new (globalThis as any).DOMPoint(p?.x, p?.y, p?.z, p?.w); }
    matrixTransform(_m?: any) { return new (globalThis as any).DOMPoint(); }
    toJSON() { return { x: this.x, y: this.y, z: this.z, w: this.w }; }
  };
}

if (typeof globalThis.DOMRect === "undefined") {
  (globalThis as any).DOMRect = class DOMRect {
    x = 0; y = 0; width = 0; height = 0;
    constructor(x = 0, y = 0, w = 0, h = 0) { this.x = x; this.y = y; this.width = w; this.height = h; }
    get top() { return this.y; }
    get left() { return this.x; }
    get bottom() { return this.y + this.height; }
    get right() { return this.x + this.width; }
    static fromRect(r?: any) { return new (globalThis as any).DOMRect(r?.x, r?.y, r?.width, r?.height); }
    toJSON() { return { x: this.x, y: this.y, width: this.width, height: this.height, top: this.top, left: this.left, bottom: this.bottom, right: this.right }; }
  };
}

if (typeof globalThis.Path2D === "undefined") {
  (globalThis as any).Path2D = class Path2D {
    constructor(_path?: any) {}
    addPath(_path?: any, _transform?: any) {}
    closePath() {} moveTo(_x: number, _y: number) {} lineTo(_x: number, _y: number) {}
    bezierCurveTo(_cp1x: number, _cp1y: number, _cp2x: number, _cp2y: number, _x: number, _y: number) {}
    quadraticCurveTo(_cpx: number, _cpy: number, _x: number, _y: number) {}
    arc(_x: number, _y: number, _r: number, _sA: number, _eA: number, _cc?: boolean) {}
    arcTo(_x1: number, _y1: number, _x2: number, _y2: number, _r: number) {}
    rect(_x: number, _y: number, _w: number, _h: number) {}
    ellipse(_x: number, _y: number, _rx: number, _ry: number, _rot: number, _sA: number, _eA: number, _cc?: boolean) {}
  };
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  page_number: number;
  text: string;
  token_count?: number;
}

export interface ParsedPdfResult {
  fullText: string;
  pageCount: number;
  pages: Array<{ text: string; num: number }>;
  chunks: DocumentChunk[];
}

/**
 * Load pdf-parse v1 (function-based API) via createRequire to bypass webpack bundling.
 * pdf-parse is listed in serverExternalPackages in next.config.ts.
 */
async function loadPdfParse(): Promise<(buffer: Buffer, options?: any) => Promise<any>> {
  const { createRequire } = await import("module");
  const req = createRequire(import.meta.url);
  const mod = req("pdf-parse");
  if (typeof mod === "function") return mod;
  if (typeof mod.default === "function") return mod.default;
  throw new Error("Could not load pdf-parse: unexpected export shape");
}

/**
 * Extract full text and individual pages from a PDF buffer using pdf-parse v1.
 * pdf-parse v1 natively returns { text, numpages, info, metadata } —
 * we use a pagerender callback to capture per-page text with page numbers.
 */
export async function extractPdfContent(
  docId: string,
  buffer: Buffer
): Promise<ParsedPdfResult> {
  const pdfParse = await loadPdfParse();

  // Collect per-page text with accurate page numbers via pagerender
  const pageTexts: Array<{ text: string; num: number }> = [];
  let pageCounter = 0;

  const options = {
    pagerender: async (pageData: any) => {
      pageCounter++;
      const pageNum = pageCounter;
      try {
        const textContent = await pageData.getTextContent();
        const text = textContent.items
          .map((item: any) => item.str || "")
          .join(" ")
          .trim();
        pageTexts.push({ text, num: pageNum });
        return text;
      } catch {
        pageTexts.push({ text: "", num: pageNum });
        return "";
      }
    },
  };

  const result = await pdfParse(buffer, options);

  // Use per-page data if captured; otherwise treat entire text as page 1
  const pages =
    pageTexts.length > 0
      ? pageTexts
      : [{ text: (result.text || "").trim(), num: 1 }];

  const pageCount = result.numpages || pages.length || 1;

  const chunks: DocumentChunk[] = [];
  let chunkIdCounter = 1;

  for (const page of pages) {
    if (!page.text || page.text.trim().length === 0) continue;

    // Split page text into paragraphs or sub-chunks of ~250 words
    const paragraphs = page.text
      .split(/\n\s*\n/)
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 20);

    if (paragraphs.length === 0) {
      chunks.push({
        id: `${docId}_c${chunkIdCounter++}`,
        document_id: docId,
        page_number: page.num,
        text: page.text,
      });
    } else {
      let currentChunkText = "";
      for (const para of paragraphs) {
        if ((currentChunkText + " " + para).split(/\s+/).length > 250) {
          if (currentChunkText.trim().length > 0) {
            chunks.push({
              id: `${docId}_c${chunkIdCounter++}`,
              document_id: docId,
              page_number: page.num,
              text: currentChunkText.trim(),
            });
          }
          currentChunkText = para;
        } else {
          currentChunkText = currentChunkText ? `${currentChunkText}\n\n${para}` : para;
        }
      }
      if (currentChunkText.trim().length > 0) {
        chunks.push({
          id: `${docId}_c${chunkIdCounter++}`,
          document_id: docId,
          page_number: page.num,
          text: currentChunkText.trim(),
        });
      }
    }
  }

  return {
    fullText: (result.text || "").trim(),
    pageCount,
    pages,
    chunks,
  };
}

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "in", "on", "at", "to", "for",
  "with", "by", "of", "from", "up", "about", "into", "over", "after", "is",
  "are", "was", "were", "be", "been", "being", "have", "has", "had", "do",
  "does", "did", "this", "that", "these", "those", "it", "its", "what",
  "which", "who", "whom", "whose", "why", "how", "can", "could", "will",
  "would", "should", "as"
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * BM25 Information Retrieval algorithm to rank document chunks for a query.
 * Standard academic IR parameters: k1 = 1.5, b = 0.75
 */
export function searchChunksBM25(
  query: string,
  chunks: DocumentChunk[],
  topK: number = 4
): Array<{ chunk: DocumentChunk; score: number }> {
  if (chunks.length === 0) return [];

  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) {
    return chunks.slice(0, topK).map((chunk) => ({ chunk, score: 1 }));
  }

  const N = chunks.length;
  const chunkTokens = chunks.map((c) => tokenize(c.text));
  const avgDocLength =
    chunkTokens.reduce((sum, tokens) => sum + tokens.length, 0) / (N || 1);

  // Document frequency (DF) for each query term
  const df: Record<string, number> = {};
  for (const term of queryTerms) {
    df[term] = 0;
    for (const tokens of chunkTokens) {
      if (tokens.includes(term)) {
        df[term]++;
      }
    }
  }

  const k1 = 1.5;
  const b = 0.75;

  const scored: Array<{ chunk: DocumentChunk; score: number }> = chunks.map(
    (chunk, idx) => {
      const tokens = chunkTokens[idx];
      const docLength = tokens.length;
      let score = 0;

      for (const term of queryTerms) {
        const docFreq = df[term] || 0;
        if (docFreq === 0) continue;

        // Inverse Document Frequency (IDF)
        const idf = Math.log(1 + (N - docFreq + 0.5) / (docFreq + 0.5));

        // Term Frequency (TF)
        const tf = tokens.filter((t) => t === term).length;

        // BM25 term weighting
        const termScore =
          idf *
          ((tf * (k1 + 1)) /
            (tf + k1 * (1 - b + b * (docLength / (avgDocLength || 1)))));

        score += termScore;
      }

      return { chunk, score };
    }
  );

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
