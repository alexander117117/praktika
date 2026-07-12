export type AnswerType = "list" | "text";

export interface Question {
  /** Stable id, `${topicId}-${index}` */
  id: string;
  topicId: number;
  prompt: string;
  answerType: AnswerType;
  /** For "list" — enumerated items. For "text" — a single prose block. */
  answer: string[];
}

export interface Topic {
  id: number;
  title: string;
  questions: Question[];
}

export type QuestionStatus = "new" | "learning" | "learned";

export interface ProgressEntry {
  status: QuestionStatus;
  /** How many times the card has been reviewed. */
  reviews: number;
  /** epoch ms of last review */
  updatedAt: number;
}

export type ProgressMap = Record<string, ProgressEntry>;
