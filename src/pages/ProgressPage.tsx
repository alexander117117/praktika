import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Circle } from "lucide-react";
import { DuoIcon } from "@/components/DuoIcon";
import { Topbar } from "@/components/Topbar";
import { ProgressRing } from "@/components/ProgressRing";
import { TopicModal } from "@/components/TopicModal";
import { useProgress } from "@/store/useProgress";
import { TOPICS } from "@/data/topics";
import { overallStat, topicStat } from "@/lib/stats";
import type { Topic } from "@/lib/types";

export function ProgressPage() {
  const navigate = useNavigate();
  const progress = useProgress((s) => s.progress);
  const resetAll = useProgress((s) => s.resetAll);
  const [selected, setSelected] = useState<Topic | null>(null);

  const overall = useMemo(() => overallStat(TOPICS, progress), [progress]);
  const rows = useMemo(
    () => TOPICS.map((t) => ({ topic: t, stat: topicStat(t, progress) })),
    [progress],
  );

  const reset = () => {
    if (window.confirm("Сбросить весь прогресс? Это действие нельзя отменить.")) {
      resetAll();
    }
  };

  return (
    <>
      <Topbar
        crumbs="Прогресс"
        right={
          <button className="btn btn-ghost btn-sm" onClick={reset} aria-label="Сбросить прогресс">
            <DuoIcon name="trash" size={15} />
            <span className="btn-text">Сбросить</span>
          </button>
        }
      />
      <div className="content">
        <div className="page-head">
          <h1>Прогресс</h1>
          <p>Детальная статистика по всем темам диагностического профиля</p>
        </div>

        <div className="overview">
          <div className="card ring-card">
            <ProgressRing learned={overall.learned} learning={overall.learning} total={overall.total} />
            <div className="ring-caption">Выучено {Math.round(overall.percent)}%</div>
            <div className="ring-sub">
              {overall.learned} из {overall.total} вопросов
            </div>
          </div>

          <div className="stat-grid">
            <div className="stat">
              <div className="stat-label">
                <span className="stat-icon green">
                  <DuoIcon name="check" size={15} />
                </span>
                Выучено
              </div>
              <div className="stat-value">{overall.learned}</div>
            </div>
            <div className="stat">
              <div className="stat-label">
                <span className="stat-icon amber">
                  <DuoIcon name="calendar" size={15} />
                </span>
                На повторении
              </div>
              <div className="stat-value">{overall.learning}</div>
            </div>
            <div className="stat">
              <div className="stat-label">
                <span className="stat-icon gray">
                  <Circle size={15} />
                </span>
                Не начато
              </div>
              <div className="stat-value">{overall.fresh}</div>
            </div>
          </div>
        </div>

        <div className="section-title">
          <h2>По темам</h2>
          <span className="muted">Нажмите на тему, чтобы начать тренировку</span>
        </div>

        <div className="card" style={{ padding: 0 }}>
          {rows.map(({ topic, stat }) => {
            const learnedPct = stat.total ? (stat.learned / stat.total) * 100 : 0;
            const learningPct = stat.total ? (stat.learning / stat.total) * 100 : 0;
            return (
              <button key={topic.id} className="prow" onClick={() => setSelected(topic)}>
                <span className="pr-idx">{topic.id}</span>
                <span className="pr-title">{topic.title}</span>
                <span className="pr-bar">
                  <span className="bar">
                    <span className="seg-learned" style={{ width: `${learnedPct}%` }} />
                    <span className="seg-learning" style={{ width: `${learningPct}%` }} />
                  </span>
                </span>
                <span className="pr-val">
                  {stat.learned}/{stat.total} · {Math.round(stat.percent)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <TopicModal
          topic={selected}
          stat={topicStat(selected, progress)}
          onClose={() => setSelected(null)}
          onStart={(reviewOnly) =>
            navigate(`/study/${selected.id}${reviewOnly ? "?review=1" : ""}`)
          }
        />
      )}
    </>
  );
}
