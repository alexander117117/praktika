import type { AnswerType, Question, Topic } from "@/lib/types";

/** Compact authoring shape. `a` as string => text answer, as array => list answer. */
export interface RawQuestion {
  q: string;
  a: string | string[];
}

export interface RawTopic {
  id: number;
  title: string;
  questions: RawQuestion[];
}

export function buildTopics(raw: RawTopic[]): Topic[] {
  return raw.map((t) => ({
    id: t.id,
    title: t.title,
    questions: t.questions.map((rq, i): Question => {
      const isText = typeof rq.a === "string";
      return {
        id: `${t.id}-${i + 1}`,
        topicId: t.id,
        prompt: rq.q,
        answerType: (isText ? "text" : "list") as AnswerType,
        answer: isText ? [rq.a as string] : (rq.a as string[]),
      };
    }),
  }));
}
