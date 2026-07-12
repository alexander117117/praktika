import type { Question, Topic } from "@/lib/types";
import { part1 } from "./part1";
import { part2 } from "./part2";
import { part3 } from "./part3";
import { part4 } from "./part4";
import { part5 } from "./part5";
import { part6 } from "./part6";
import { part7 } from "./part7";
import { part8 } from "./part8";

export const TOPICS: Topic[] = [
  ...part1,
  ...part2,
  ...part3,
  ...part4,
  ...part5,
  ...part6,
  ...part7,
  ...part8,
];

export const ALL_QUESTIONS: Question[] = TOPICS.flatMap((t) => t.questions);

export const TOTAL_QUESTIONS = ALL_QUESTIONS.length;

const QUESTION_BY_ID = new Map(ALL_QUESTIONS.map((q) => [q.id, q]));
const TOPIC_BY_ID = new Map(TOPICS.map((t) => [t.id, t]));

export function getQuestion(id: string): Question | undefined {
  return QUESTION_BY_ID.get(id);
}

export function getTopic(id: number): Topic | undefined {
  return TOPIC_BY_ID.get(id);
}
