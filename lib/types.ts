// All shared TypeScript types for the application

export interface Document {
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

export interface Notes {
  id: string;
  document_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: string;
  type: "mcq" | "short";
  question: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
  topic?: string;
}

export interface Quiz {
  id: string;
  document_id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  question_count: number;
  questions: QuizQuestion[];
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  document_id: string;
  answers: Record<string, string>;
  score: number;
  total: number;
  topic_scores?: Record<string, { correct: number; total: number }>;
  completed_at: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic?: string;
}

export interface FlashcardSet {
  id: string;
  document_id: string;
  title: string;
  cards: Flashcard[];
  created_at: string;
}

export interface FlashcardReview {
  id: string;
  set_id: string;
  card_index: number;
  rating: "easy" | "medium" | "hard";
  reviewed_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  created_at: string;
}

export interface ChatSession {
  id: string;
  document_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

// Performance analytics types
export interface TopicPerformance {
  topic: string;
  correct: number;
  total: number;
  percentage: number;
  status: "strong" | "average" | "weak" | "insufficient_data";
}

export interface StudyRecommendation {
  type: "review_topic" | "retake_quiz" | "study_flashcards" | "read_notes";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  document_id?: string;
  topic?: string;
}

export interface ApiError {
  error: string;
  details?: string;
}
