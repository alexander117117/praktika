import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Circle } from "lucide-react";
import { DuoIcon } from "@/components/DuoIcon";
import { Topbar } from "@/components/Topbar";
import { ProgressRing } from "@/components/ProgressRing";
import { TopicCard } from "@/components/TopicCard";
import { TopicModal } from "@/components/TopicModal";
import { useProgress } from "@/store/useProgress";
import { TOPICS, TOTAL_QUESTIONS } from "@/data/topics";
import { overallStat, topicStat } from "@/lib/stats";
import type { Topic } from "@/lib/types";
import { useAuth } from "@/auth/AuthContext";

export function Dashboard() {
  const navigate = useNavigate();
  const progress = useProgress((s) => s.progress);
  const { enabled, user } = useAuth();
  const [selected, setSelected] = useState<Topic | null>(null);

  const overall = useMemo(() => overallStat(TOPICS, progress), [progress]);

  const continueTopics = useMemo(
    () =>
      TOPICS.map((t) => ({ topic: t, stat: topicStat(t, progress) }))
        .filter(({ stat }) => stat.learned < stat.total)
        .sort((a, b) => b.stat.learning + b.stat.learned - (a.stat.learning + a.stat.learned))
        .slice(0, 6),
    [progress],
  );

  const displayName = (user?.email?.split("@")[0] ?? "студент").slice(0, 24);
  const startReview = () => navigate("/study/all?review=1");

  return (
    <>
      <Topbar
        crumbs="Дашборд"
        right={
          <button className="btn btn-primary" onClick={startReview} aria-label="Начать тренировку">
            <DuoIcon name="sparkle" size={16} />
            <span className="btn-text">Начать тренировку</span>
          </button>
        }
      />
      <div className="content">
        <div className="page-head">
          <h1>С возвращением, {displayName} 👋</h1>
          <p>
            {overall.learned === 0
              ? "Начните с любой темы — прогресс сохранится автоматически."
              : `Вы выучили ${overall.learned} из ${TOTAL_QUESTIONS} вопросов. Так держать!`}
          </p>
        </div>

        {enabled && !user && (
          <div className="info-banner">
            <DuoIcon name="guide" size={16} />
            Вы не вошли в аккаунт. Прогресс хранится в этом браузере — войдите, чтобы
            синхронизировать между устройствами.
          </div>
        )}
        {!enabled && (
          <div className="info-banner">
            <DuoIcon name="guide" size={16} />
            Локальный режим: прогресс сохраняется в браузере. Подключите Supabase (см.
            README), чтобы включить аккаунты и синхронизацию.
          </div>
        )}

        <div className="overview">
          <div className="card ring-card">
            <ProgressRing learned={overall.learned} learning={overall.learning} total={overall.total} />
            <div className="ring-caption">Общий прогресс</div>
            <div className="ring-sub">
              {Math.round(overall.percent)}% материала выучено
            </div>
          </div>

          <div className="card legend">
            <div className="legend-row">
              <span className="lg-dot" style={{ background: "var(--success)" }} />
              <span className="lg-text">Выучено</span>
              <span className="lg-val">{overall.learned}</span>
            </div>
            <div className="bar">
              <span
                className="seg-learned"
                style={{ width: `${overall.total ? (overall.learned / overall.total) * 100 : 0}%` }}
              />
            </div>

            <div className="legend-row">
              <span className="lg-dot" style={{ background: "var(--warning)" }} />
              <span className="lg-text">На повторении</span>
              <span className="lg-val">{overall.learning}</span>
            </div>
            <div className="bar">
              <span
                className="seg-learning"
                style={{ width: `${overall.total ? (overall.learning / overall.total) * 100 : 0}%` }}
              />
            </div>

            <div className="legend-row">
              <span className="lg-dot" style={{ background: "var(--panel-3)" }} />
              <span className="lg-text">Не начато</span>
              <span className="lg-val">{overall.fresh}</span>
            </div>
            <div className="bar">
              <span style={{ width: `${overall.total ? (overall.fresh / overall.total) * 100 : 0}%`, background: "var(--panel-3)" }} />
            </div>
          </div>
        </div>

        <div className="stat-grid" style={{ marginTop: 16 }}>
          <div className="stat">
            <div className="stat-label">
              <span className="stat-icon green">
                <DuoIcon name="check" size={15} />
              </span>
              Выучено
            </div>
            <div className="stat-value">
              {overall.learned}
              <small> / {overall.total}</small>
            </div>
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
          <div className="stat">
            <div className="stat-label">
              <span className="stat-icon blue">
                <DuoIcon name="sparkle" size={15} />
              </span>
              Тем всего
            </div>
            <div className="stat-value">{TOPICS.length}</div>
          </div>
        </div>

        <div className="section-title">
          <h2>Продолжить</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/topics")}>
            Все темы
            <ChevronRight size={15} />
          </button>
        </div>

        {continueTopics.length === 0 ? (
          <div className="card empty">🎉 Все темы пройдены! Отличная работа.</div>
        ) : (
          <div className="topic-grid">
            {continueTopics.map(({ topic, stat }) => (
              <TopicCard key={topic.id} topic={topic} stat={stat} onClick={() => setSelected(topic)} />
            ))}
          </div>
        )}
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
