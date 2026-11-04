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

async function getPDFParserClass() {
  try {
    const { createRequire } = await import("module");
    const req = createRequire(process.cwd() + "/package.json");
    const mod = req("pdf-parse");
    return mod.PDFParse || (mod.default && mod.default.PDFParse) || mod;
  } catch {
    const mod = await import("pdf-parse");
    return (mod as any).PDFParse || (mod as any).default?.PDFParse || mod;
  }
}

/**
 * Extract full text and individual pages from a PDF buffer using pdf-parse.
 */
export async function extractPdfContent(
  docId: string,
  buffer: Buffer
): Promise<ParsedPdfResult> {
  const PDFParse = await getPDFParserClass();
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const pageCount = result.total || result.pages?.length || 1;
    const pages = (result.pages || []).map((p: any) => ({
      text: p.text.trim(),
      num: p.num,
    }));

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
      fullText: result.text.trim(),
      pageCount,
      pages,
      chunks,
    };
  } finally {
    if (typeof parser.destroy === "function") {
      await parser.destroy().catch(() => {});
    }
  }
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
