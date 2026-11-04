import fs from "fs";
import path from "path";

const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "ai-study-assistant")
  : path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "study_assistant.json");

export interface DocumentRow {
  id: string;
  filename: string;
  original_name: string;
  subject: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: "processing" | "ready" | "failed";
  page_count?: number;
  extracted_text?: string;
  gemini_file_uri?: string;
  gemini_file_name?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface NotesRow {
  id: string;
  document_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface QuizRow {
  id: string;
  document_id: string;
  title: string;
  difficulty: string;
  question_count: number;
  questions: string;
  created_at: string;
}

export interface QuizAttemptRow {
  id: string;
  quiz_id: string;
  document_id: string;
  answers: string;
  score: number;
  total: number;
  topic_scores: string | null;
  completed_at: string;
}

export interface FlashcardSetRow {
  id: string;
  document_id: string;
  title: string;
  cards: string;
  created_at: string;
}

export interface FlashcardReviewRow {
  id: string;
  set_id: string;
  card_index: number;
  rating: string;
  reviewed_at: string;
}

export interface ChatSessionRow {
  id: string;
  document_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageRow {
  id: string;
  session_id: string;
  role: string;
  content: string;
  sources?: string;
  created_at: string;
}

export interface DatabaseState {
  documents: DocumentRow[];
  notes: NotesRow[];
  quizzes: QuizRow[];
  quiz_attempts: QuizAttemptRow[];
  flashcard_sets: FlashcardSetRow[];
  flashcard_reviews: FlashcardReviewRow[];
  chat_sessions: ChatSessionRow[];
  chat_messages: ChatMessageRow[];
  settings: Record<string, string>;
}

function getDefaultState(): DatabaseState {
  return {
    documents: [],
    notes: [],
    quizzes: [],
    quiz_attempts: [],
    flashcard_sets: [],
    flashcard_reviews: [],
    chat_sessions: [],
    chat_messages: [],
    settings: {},
  };
}

class PersistentStore {
  private state: DatabaseState;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_PATH)) {
      try {
        const raw = fs.readFileSync(STORE_PATH, "utf-8");
        this.state = { ...getDefaultState(), ...JSON.parse(raw) };
      } catch (e) {
        console.error("Error reading database file, initializing defaults", e);
        this.state = getDefaultState();
        this.save();
      }
    } else {
      this.state = getDefaultState();
      this.save();
    }
  }

  public save() {
    try {
      const tempPath = `${STORE_PATH}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.state, null, 2), "utf-8");
      fs.renameSync(tempPath, STORE_PATH);
    } catch (e) {
      console.error("Failed to persist database state", e);
    }
  }

  public getState() {
    return this.state;
  }

  public prepare(query: string) {
    const q = query.trim().replace(/\s+/g, " ");

    return {
      all: (...params: any[]): any[] => {
        const s = this.state;

        // documents
        if (q.includes("FROM documents ORDER BY created_at DESC")) {
          return [...s.documents].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }

        // quizzes
        if (q.includes("FROM quizzes WHERE document_id = ? ORDER BY created_at DESC")) {
          const docId = params[0];
          return s.quizzes
            .filter((x) => x.document_id === docId)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        // quiz_attempts by quiz_id
        if (q.includes("FROM quiz_attempts WHERE quiz_id = ? ORDER BY completed_at DESC")) {
          const quizId = params[0];
          return s.quiz_attempts
            .filter((x) => x.quiz_id === quizId)
            .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
        }

        // progress join
        if (q.includes("FROM quiz_attempts qa JOIN quizzes q") || q.includes("FROM quiz_attempts qa")) {
          return s.quiz_attempts
            .map((qa) => {
              const quiz = s.quizzes.find((qItem) => qItem.id === qa.quiz_id);
              const doc = s.documents.find((dItem) => dItem.id === qa.document_id);
              return {
                quiz_id: qa.quiz_id,
                document_id: qa.document_id,
                score: qa.score,
                total: qa.total,
                topic_scores: qa.topic_scores,
                completed_at: qa.completed_at,
                quiz_title: quiz?.title || "Quiz",
                quiz_difficulty: quiz?.difficulty || "medium",
                doc_name: doc?.original_name || "Document",
                doc_subject: doc?.subject || "General",
              };
            })
            .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
        }

        // flashcard_sets
        if (q.includes("FROM flashcard_sets WHERE document_id = ? ORDER BY created_at DESC")) {
          const docId = params[0];
          return s.flashcard_sets
            .filter((x) => x.document_id === docId)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        // flashcard_reviews
        if (q.includes("FROM flashcard_reviews WHERE set_id = ? ORDER BY reviewed_at DESC")) {
          const setId = params[0];
          return s.flashcard_reviews
            .filter((x) => x.set_id === setId)
            .sort((a, b) => new Date(b.reviewed_at).getTime() - new Date(a.reviewed_at).getTime());
        }

        // chat_sessions
        if (q.includes("FROM chat_sessions WHERE document_id = ? ORDER BY updated_at DESC")) {
          const docId = params[0];
          return s.chat_sessions
            .filter((x) => x.document_id === docId)
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        }

        // chat_messages
        if (q.includes("FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC")) {
          const sessionId = params[0];
          return s.chat_messages
            .filter((x) => x.session_id === sessionId)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }

        // settings
        if (q.includes("FROM settings")) {
          return Object.entries(s.settings).map(([key, value]) => ({ key, value }));
        }

        return [];
      },

      get: (...params: any[]): any => {
        const s = this.state;

        // documents duplicate check
        if (q.includes("SELECT id FROM documents WHERE original_name = ? AND file_size = ? AND status != 'failed'")) {
          const [name, size] = params;
          const found = s.documents.find(
            (d) => d.original_name === name && d.file_size === size && d.status !== "failed"
          );
          return found ? { id: found.id } : undefined;
        }

        // document by id
        if (q.includes("FROM documents WHERE id = ?")) {
          const id = params[0];
          return s.documents.find((d) => d.id === id);
        }

        // notes by document_id
        if (q.includes("FROM notes WHERE document_id = ?")) {
          const docId = params[0];
          const matches = s.notes
            .filter((n) => n.document_id === docId)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          return matches[0] || undefined;
        }

        // notes by id
        if (q.includes("FROM notes WHERE id = ?")) {
          const id = params[0];
          return s.notes.find((n) => n.id === id);
        }

        // quiz by id
        if (q.includes("FROM quizzes WHERE id = ?")) {
          const id = params[0];
          return s.quizzes.find((x) => x.id === id);
        }

        // quiz_attempt by id
        if (q.includes("FROM quiz_attempts WHERE id = ?")) {
          const id = params[0];
          return s.quiz_attempts.find((x) => x.id === id);
        }

        // flashcard_set by id
        if (q.includes("FROM flashcard_sets WHERE id = ?")) {
          const id = params[0];
          return s.flashcard_sets.find((x) => x.id === id);
        }

        // chat_session by id
        if (q.includes("FROM chat_sessions WHERE id = ?")) {
          const id = params[0];
          return s.chat_sessions.find((x) => x.id === id);
        }

        return undefined;
      },

      run: (...params: any[]): { changes: number } => {
        const s = this.state;
        let changes = 0;

        // INSERT INTO documents
        if (q.includes("INSERT INTO documents")) {
          const [id, filename, original_name, subject, file_path, file_size, mime_type] = params;
          const now = new Date().toISOString();
          s.documents.unshift({
            id,
            filename,
            original_name,
            subject: subject || "General",
            file_path,
            file_size,
            mime_type,
            status: "processing",
            created_at: now,
            updated_at: now,
          });
          changes = 1;
        }

        // UPDATE documents SET status = 'ready'
        else if (q.includes("UPDATE documents SET status = 'ready'")) {
          const doc = s.documents.find((d) => d.id === params[params.length - 1]);
          if (doc) {
            doc.status = "ready";
            doc.page_count = typeof params[0] === "number" ? params[0] : doc.page_count;
            doc.extracted_text = typeof params[1] === "string" ? params[1] : doc.extracted_text;
            doc.updated_at = new Date().toISOString();
            changes = 1;
          }
        }

        // UPDATE documents SET status = 'failed'
        else if (q.includes("UPDATE documents SET status = 'failed'")) {
          const [err, id] = params;
          const doc = s.documents.find((d) => d.id === id);
          if (doc) {
            doc.status = "failed";
            doc.error_message = err;
            doc.updated_at = new Date().toISOString();
            changes = 1;
          }
        }

        // UPDATE documents SET subject = ?
        else if (q.includes("UPDATE documents SET subject = ?")) {
          const [subject, id] = params;
          const doc = s.documents.find((d) => d.id === id);
          if (doc) {
            doc.subject = subject;
            doc.updated_at = new Date().toISOString();
            changes = 1;
          }
        }

        // DELETE FROM documents WHERE id = ?
        else if (q.includes("DELETE FROM documents WHERE id = ?")) {
          const id = params[0];
          s.documents = s.documents.filter((d) => d.id !== id);
          s.notes = s.notes.filter((n) => n.document_id !== id);
          s.quizzes = s.quizzes.filter((qz) => qz.document_id !== id);
          s.quiz_attempts = s.quiz_attempts.filter((qa) => qa.document_id !== id);
          s.flashcard_sets = s.flashcard_sets.filter((fs) => fs.document_id !== id);
          s.chat_sessions = s.chat_sessions.filter((cs) => cs.document_id !== id);
          changes = 1;
        }

        // DELETE FROM notes WHERE document_id = ?
        else if (q.includes("DELETE FROM notes WHERE document_id = ?")) {
          const docId = params[0];
          s.notes = s.notes.filter((n) => n.document_id !== docId);
          changes = 1;
        }

        // INSERT INTO notes
        else if (q.includes("INSERT INTO notes")) {
          const [id, document_id, content] = params;
          const now = new Date().toISOString();
          s.notes.unshift({
            id,
            document_id,
            content,
            created_at: now,
            updated_at: now,
          });
          changes = 1;
        }

        // INSERT INTO quizzes
        else if (q.includes("INSERT INTO quizzes")) {
          const [id, document_id, title, difficulty, question_count, questions] = params;
          s.quizzes.unshift({
            id,
            document_id,
            title,
            difficulty,
            question_count,
            questions,
            created_at: new Date().toISOString(),
          });
          changes = 1;
        }

        // DELETE FROM quizzes WHERE id = ?
        else if (q.includes("DELETE FROM quizzes WHERE id = ?")) {
          const id = params[0];
          s.quizzes = s.quizzes.filter((qz) => qz.id !== id);
          s.quiz_attempts = s.quiz_attempts.filter((qa) => qa.quiz_id !== id);
          changes = 1;
        }

        // INSERT INTO quiz_attempts
        else if (q.includes("INSERT INTO quiz_attempts")) {
          const [id, quiz_id, document_id, answers, score, total, topic_scores] = params;
          s.quiz_attempts.unshift({
            id,
            quiz_id,
            document_id,
            answers,
            score,
            total,
            topic_scores,
            completed_at: new Date().toISOString(),
          });
          changes = 1;
        }

        // DELETE FROM flashcard_sets WHERE document_id = ?
        else if (q.includes("DELETE FROM flashcard_sets WHERE document_id = ?")) {
          const docId = params[0];
          const setIds = s.flashcard_sets.filter((f) => f.document_id === docId).map((f) => f.id);
          s.flashcard_sets = s.flashcard_sets.filter((f) => f.document_id !== docId);
          s.flashcard_reviews = s.flashcard_reviews.filter((r) => !setIds.includes(r.set_id));
          changes = 1;
        }

        // INSERT INTO flashcard_sets
        else if (q.includes("INSERT INTO flashcard_sets")) {
          const [id, document_id, title, cards] = params;
          s.flashcard_sets.unshift({
            id,
            document_id,
            title,
            cards,
            created_at: new Date().toISOString(),
          });
          changes = 1;
        }

        // INSERT INTO flashcard_reviews
        else if (q.includes("INSERT INTO flashcard_reviews")) {
          const [id, set_id, card_index, rating] = params;
          s.flashcard_reviews.unshift({
            id,
            set_id,
            card_index,
            rating,
            reviewed_at: new Date().toISOString(),
          });
          changes = 1;
        }

        // INSERT INTO chat_sessions
        else if (q.includes("INSERT INTO chat_sessions")) {
          const [id, document_id, title] = params;
          const now = new Date().toISOString();
          s.chat_sessions.unshift({
            id,
            document_id,
            title,
            created_at: now,
            updated_at: now,
          });
          changes = 1;
        }

        // UPDATE chat_sessions SET updated_at = datetime('now') WHERE id = ?
        else if (q.includes("UPDATE chat_sessions SET updated_at")) {
          const id = params[0];
          const cs = s.chat_sessions.find((c) => c.id === id);
          if (cs) {
            cs.updated_at = new Date().toISOString();
            changes = 1;
          }
        }

        // DELETE FROM chat_sessions WHERE id = ?
        else if (q.includes("DELETE FROM chat_sessions WHERE id = ?")) {
          const id = params[0];
          s.chat_sessions = s.chat_sessions.filter((c) => c.id !== id);
          s.chat_messages = s.chat_messages.filter((m) => m.session_id !== id);
          changes = 1;
        }

        // INSERT INTO chat_messages
        else if (q.includes("INSERT INTO chat_messages")) {
          const [id, session_id, role, content] = params;
          s.chat_messages.push({
            id,
            session_id,
            role,
            content,
            created_at: new Date().toISOString(),
          });
          changes = 1;
        }

        // INSERT INTO settings
        else if (q.includes("INSERT INTO settings")) {
          const [key, value] = params;
          s.settings[key] = value;
          changes = 1;
        }

        if (changes > 0) {
          this.save();
        }
        return { changes };
      },
    };
  }
}

let _store: PersistentStore | null = null;

export function getDb() {
  if (!_store) {
    _store = new PersistentStore();
  }
  return _store;
}
