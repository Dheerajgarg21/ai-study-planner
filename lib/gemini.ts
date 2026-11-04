import { GoogleGenAI } from "@google/genai";
import { getDb } from "./db";

let _client: GoogleGenAI | null = null;
let _cachedKey: string | null = null;

export function getGeminiApiKey(): string | null {
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  try {
    const db = getDb();
    const row = db.prepare("SELECT key, value FROM settings").all() as Array<{
      key: string;
      value: string;
    }>;
    const match = row.find((r) => r.key === "gemini_api_key");
    if (match && match.value.trim().length > 0) {
      return match.value.trim();
    }
  } catch {}
  return null;
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please enter your key in Settings or set GEMINI_API_KEY in your environment."
    );
  }
  if (_client && _cachedKey === apiKey) {
    return _client;
  }
  _cachedKey = apiKey;
  _client = new GoogleGenAI({ apiKey });
  return _client;
}

export function getGeminiModel(): string {
  if (process.env.GEMINI_MODEL) {
    return process.env.GEMINI_MODEL.trim();
  }
  try {
    const db = getDb();
    const rows = db.prepare("SELECT key, value FROM settings").all() as Array<{
      key: string;
      value: string;
    }>;
    const match = rows.find((r) => r.key === "gemini_model");
    if (match && match.value.trim().length > 0) {
      return match.value.trim();
    }
  } catch {}
  return "gemini-2.5-flash";
}

export const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-3-flash",
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

export const GEMINI_MODEL = "gemini-2.5-flash";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Execute content generation with automatic cascading model fallback and retry.
 */
export async function generateContentWithFallback(
  prompt: string,
  options?: { jsonMode?: boolean }
): Promise<string> {
  const client = getGeminiClient();
  const primaryModel = getGeminiModel();

  const modelQueue = [
    primaryModel,
    ...FALLBACK_MODELS.filter((m) => m !== primaryModel),
  ];

  const errors: string[] = [];

  for (const model of modelQueue) {
    // Attempt up to 2 times for transient 503 or 429 errors
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const config: any = {};
        if (options?.jsonMode) {
          config.responseMimeType = "application/json";
        }

        const response = await client.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: Object.keys(config).length > 0 ? config : undefined,
        });

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 0) {
          return text;
        }
      } catch (err: any) {
        const msg = err.message || String(err);
        const isTransient =
          msg.includes("503") ||
          msg.includes("UNAVAILABLE") ||
          msg.includes("429") ||
          msg.includes("RESOURCE_EXHAUSTED");

        if (isTransient && attempt === 1) {
          console.warn(`[Gemini Fallback] Model '${model}' transient error (503/429). Retrying in 1.2s...`);
          await sleep(1200);
          continue;
        }

        console.warn(`[Gemini Fallback] Model '${model}' failed: ${msg}. Trying next fallback...`);
        errors.push(`${model}: ${msg}`);
        break; // break to next model in queue
      }
    }
  }

  throw new Error(`All attempted Gemini models failed. Errors:\n${errors.join("\n")}`);
}

/**
 * Robust JSON cleaner and parser that extracts JSON arrays or objects
 * even if the model surrounds them with conversational text or markdown code fences.
 */
export function cleanAndParseJson<T>(rawText: string): T {
  let cleaned = rawText.trim();

  // Strip code fences like ```json ... ``` or ``` ... ```
  cleaned = cleaned.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/i, "").trim();

  // 1. Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch {}

  // 2. Extract outermost JSON array [ ... ]
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const arrayStr = cleaned.slice(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(arrayStr);
    } catch {}
  }

  // 3. Extract outermost JSON object { ... }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const objStr = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      const parsedObj = JSON.parse(objStr);
      // If object has a property containing an array (e.g. { "questions": [...] }), extract that
      for (const val of Object.values(parsedObj)) {
        if (Array.isArray(val)) {
          return val as unknown as T;
        }
      }
      return parsedObj;
    } catch {}
  }

  throw new Error(`Could not parse JSON response from AI model:\n${rawText.slice(0, 400)}`);
}

/**
 * Generate comprehensive structured study notes from extracted document text.
 */
export async function generateNotesFromDocument(
  docTitle: string,
  subject: string,
  fullText: string
): Promise<string> {
  const clippedText = fullText.slice(0, 120000);

  const prompt = `You are an expert academic note-taker and learning designer.
Create clear, elegant, highly structured academic study notes for the uploaded document: "${docTitle}" (Subject: ${subject}).

SOURCE MATERIAL:
"""
${clippedText}
"""

FORMATTING REQUIREMENTS (Markdown):
1. Title: # Study Notes: ${docTitle}
2. ## Overview: A concise summary of the subject and scope covered.
3. ## Important Concepts & Definitions: Clear explanations of key concepts and precise term definitions.
4. ## Formulas & Equations: (If applicable) Write equations in LaTeX format ($...$ or $$...$$). If none are present, explain core rules/principles.
5. ## Comparisons & Distinctions: A Markdown table comparing related mechanisms, theories, or classifications.
6. ## Key Points: Bullet-point takeaways.
7. ## Revision Summary: The "one-minute revision" synthesized into 3-4 high-yield points.

STRICT ACADEMIC RULES:
- Base everything STRICTLY on the source text above. Do not invent or extrapolate ungrounded facts.
- Preserve exact technical terminology, proper nouns, and notation.
- If a section does not apply to this material, omit it.
- Never output meta-commentary like "Here are your notes:".`;

  return await generateContentWithFallback(prompt);
}

/**
 * Generate a quiz from document text with JSON extraction resilience.
 */
export async function generateQuizFromDocument(
  docTitle: string,
  fullText: string,
  count: number,
  difficulty: string,
  types: string[]
): Promise<any[]> {
  const clippedText = fullText.slice(0, 80000);

  const formatInstruction = types.includes("mcq") && types.includes("short")
    ? `Mix of MCQ and short-answer questions.`
    : types.includes("mcq")
    ? `All Multiple Choice Questions (MCQ).`
    : `All Short Answer questions.`;

  const prompt = `You are an academic test examiner. Based STRICTLY on the following document content from "${docTitle}", generate exactly ${count} quiz questions.

${formatInstruction}
Difficulty level: ${difficulty} (${
    difficulty === "easy"
      ? "factual recall and definitions"
      : difficulty === "medium"
      ? "conceptual application and understanding"
      : "comparative analysis, synthesis, and deep reasoning"
  })

SOURCE MATERIAL:
"""
${clippedText}
"""

OUTPUT FORMAT:
Return ONLY a valid JSON array of objects. Do NOT include markdown code blocks, backticks, or other text.
[
  {
    "type": "mcq",
    "question": "Clear question grounded in source...",
    "options": ["A) option 1", "B) option 2", "C) option 3", "D) option 4"],
    "correct_answer": "A) option 1",
    "explanation": "Ground-truth explanation from the document...",
    "topic": "Concept / Topic Name"
  },
  {
    "type": "short",
    "question": "Question requiring conceptual explanation...",
    "correct_answer": "Model answer based on document text...",
    "explanation": "Complete explanation...",
    "topic": "Concept / Topic Name"
  }
]

RULES:
- Every question MUST be answerable from the text.
- Options must be plausible, with exactly one unambiguously correct answer.
- The 'topic' field should reflect the chapter section or concept area.`;

  const rawText = await generateContentWithFallback(prompt, { jsonMode: true });
  const parsed = cleanAndParseJson<any>(rawText);
  if (!Array.isArray(parsed)) {
    // If parsed is an object with an array property
    for (const val of Object.values(parsed)) {
      if (Array.isArray(val)) return val;
    }
    throw new Error("Parsed quiz output is not a JSON array");
  }
  return parsed;
}

/**
 * Generate active-recall flashcards from document text with JSON extraction resilience.
 */
export async function generateFlashcardsFromDocument(
  docTitle: string,
  fullText: string
): Promise<any[]> {
  const clippedText = fullText.slice(0, 80000);

  const prompt = `You are an academic learning engineer. Generate 12 to 18 active-recall flashcards from "${docTitle}".

SOURCE MATERIAL:
"""
${clippedText}
"""

OUTPUT FORMAT:
Return ONLY a valid JSON array of objects. No markdown code blocks, no backticks.
[
  {
    "front": "Specific question, definition prompt, or concept recall...",
    "back": "Clear, concise answer (1-3 sentences) grounded in the text...",
    "topic": "Section or Concept Name"
  }
]

RULES:
- Cover the highest-yield definitions, principles, formulas, and distinctions.
- Keep the front clear and focused. Keep the back authoritative and concise.
- Base every single card strictly on the source material.`;

  const rawText = await generateContentWithFallback(prompt, { jsonMode: true });
  const parsed = cleanAndParseJson<any>(rawText);
  if (!Array.isArray(parsed)) {
    for (const val of Object.values(parsed)) {
      if (Array.isArray(val)) return val;
    }
    throw new Error("Parsed flashcard output is not a JSON array");
  }
  return parsed;
}

/**
 * Answer student questions strictly using BM25-retrieved passages.
 */
export async function generateGroundedChatAnswer(
  question: string,
  history: Array<{ role: string; content: string }>,
  docTitle: string,
  retrievedPassages: Array<{ page: number; text: string }>
): Promise<string> {
  const passagesContext = retrievedPassages
    .map((p, idx) => `[Source Passage ${idx + 1} · Page ${p.page}]\n${p.text}`)
    .join("\n\n---\n\n");

  const recentHistory = history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Student" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  const prompt = `You are an academic study assistant helping a student understand "${docTitle}".

RETRIEVED SOURCE PASSAGES:
"""
${passagesContext}
"""

${recentHistory ? `RECENT CONVERSATION HISTORY:\n${recentHistory}\n\n` : ""}STUDENT QUESTION:
${question}

STRICT GROUNDING INSTRUCTIONS:
1. Answer the question ONLY using the factual information present in the RETRIEVED SOURCE PASSAGES above.
2. If the answer cannot be found in the passages, state clearly:
   "I cannot find information about this in the uploaded document."
   Do NOT attempt to guess, extrapolate from external web knowledge, or hallucinate citations.
3. When referencing information, append the exact source citation in bracket format, e.g. [Page ${retrievedPassages[0]?.page || 1}].
4. Maintain a clear, helpful, academic tone. Format explanations with bullet points or bold key terms where appropriate.`;

  return await generateContentWithFallback(prompt);
}
