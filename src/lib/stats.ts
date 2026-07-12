import type { ProgressMap, QuestionStatus, Topic } from "@/lib/types";

export interface Stat {
  total: number;
  learned: number;
  learning: number;
  fresh: number; // "new" — reserved word avoided
  percent: number; // learned / total, 0..100
}

function statusOf(progress: ProgressMap, questionId: string): QuestionStatus {
  return progress[questionId]?.status ?? "new";
}

export function topicStat(topic: Topic, progress: ProgressMap): Stat {
  let learned = 0;
  let learning = 0;
  for (const q of topic.questions) {
    const s = statusOf(progress, q.id);
    if (s === "learned") learned++;
    else if (s === "learning") learning++;
  }
  const total = topic.questions.length;
  const fresh = total - learned - learning;
  return { total, learned, learning, fresh, percent: total ? (learned / total) * 100 : 0 };
}

export function overallStat(topics: Topic[], progress: ProgressMap): Stat {
  const acc: Stat = { total: 0, learned: 0, learning: 0, fresh: 0, percent: 0 };
  for (const t of topics) {
    const s = topicStat(t, progress);
    acc.total += s.total;
    acc.learned += s.learned;
    acc.learning += s.learning;
    acc.fresh += s.fresh;
  }
  acc.percent = acc.total ? (acc.learned / acc.total) * 100 : 0;
  return acc;
}
