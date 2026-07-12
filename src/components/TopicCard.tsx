import { Check } from "lucide-react";
import type { Topic } from "@/lib/types";
import type { Stat } from "@/lib/stats";
import { questionsWord } from "@/lib/format";

interface Props {
  topic: Topic;
  stat: Stat;
  onClick: () => void;
}

export function TopicCard({ topic, stat, onClick }: Props) {
  const done = stat.total > 0 && stat.learned === stat.total;
  const learnedPct = stat.total ? (stat.learned / stat.total) * 100 : 0;
  const learningPct = stat.total ? (stat.learning / stat.total) * 100 : 0;

  return (
    <button className={`topic-card${done ? " done" : ""}`} onClick={onClick}>
      <div className="tc-top">
        <div className="tc-index">{done ? <Check size={16} /> : topic.id}</div>
        <div>
          <div className="tc-title">{topic.title}</div>
          <div className="tc-meta">
            {topic.questions.length} {questionsWord(topic.questions.length)}
          </div>
        </div>
      </div>

      <div className="bar">
        <span className="seg-learned" style={{ width: `${learnedPct}%` }} />
        <span className="seg-learning" style={{ width: `${learningPct}%` }} />
      </div>

      <div className="tc-foot">
        <span className="tc-pct">{Math.round(stat.percent)}% выучено</span>
        {done ? (
          <span className="badge green dot">Готово</span>
        ) : (
          <span className="badge">
            {stat.learned}/{stat.total}
          </span>
        )}
      </div>
    </button>
  );
}
