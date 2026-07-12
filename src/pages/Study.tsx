import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, Eye, RotateCcw } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { useProgress } from "@/store/useProgress";
import { ALL_QUESTIONS, getTopic } from "@/data/topics";
import type { Question } from "@/lib/types";

function buildQueue(topicId: string, review: boolean): Question[] {
  const snapshot = useProgress.getState().progress;
  const source =
    topicId === "all" ? ALL_QUESTIONS : getTopic(Number(topicId))?.questions ?? [];
  if (!review) return source;
  return source.filter((q) => (snapshot[q.id]?.status ?? "new") !== "learned");
}

export function Study() {
  const { topicId = "all" } = useParams();
  const [params] = useSearchParams();
  const review = params.get("review") === "1";
  const navigate = useNavigate();
  const mark = useProgress((s) => s.mark);

  const [queue] = useState<Question[]>(() => buildQueue(topicId, review));
  const [index, setIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    rootRef.current?.closest(".main")?.scrollTo({ top: 0 });
  }, [index]);
  const [revealed, setRevealed] = useState(false);
  const [known, setKnown] = useState(0);
  const [repeat, setRepeat] = useState(0);
  const [finished, setFinished] = useState(false);

  const topic = topicId === "all" ? null : getTopic(Number(topicId));
  const title = topic?.title ?? "Все темы";
  const current = queue[index];

  const grade = (isKnown: boolean) => {
    if (!current) return;
    mark(current.id, isKnown ? "learned" : "learning");
    if (isKnown) setKnown((k) => k + 1);
    else setRepeat((r) => r + 1);
    if (index + 1 >= queue.length) setFinished(true);
    else {
      setIndex((i) => i + 1);
      setRevealed(false);
    }
  };

  const restart = () => {
    setIndex(0);
    setRevealed(false);
    setKnown(0);
    setRepeat(0);
    setFinished(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished || !current) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed) {
        if (e.key === "1") grade(false);
        if (e.key === "2") grade(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const crumbs = (
    <button className="btn btn-ghost btn-sm" onClick={() => navigate("/topics")}>
      <ArrowLeft size={15} />
      Темы
    </button>
  );

  // Empty queue (e.g. review mode with everything already learned)
  if (queue.length === 0) {
    return (
      <>
        <Topbar crumbs={crumbs} />
        <div className="content">
          <div className="study">
            <div className="study-done card">
              <div className="sd-emoji">✅</div>
              <h2>Всё выучено</h2>
              <p>В этой подборке не осталось вопросов для повторения.</p>
              <div className="study-actions" style={{ maxWidth: 420, margin: "0 auto" }}>
                <button className="btn" onClick={() => navigate("/topics")}>
                  К темам
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/study/${topicId}`)}
                >
                  Пройти заново
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (finished) {
    return (
      <>
        <Topbar crumbs={crumbs} />
        <div className="content">
          <div className="study">
            <div className="study-done card">
              <div className="sd-emoji">🎉</div>
              <h2>Тренировка завершена</h2>
              <p>
                {title} · {queue.length} вопрос(ов)
              </p>
              <div className="done-stats">
                <div className="done-stat">
                  <div className="ds-v" style={{ color: "var(--success)" }}>
                    {known}
                  </div>
                  <div className="ds-l">Знаю</div>
                </div>
                <div className="done-stat">
                  <div className="ds-v" style={{ color: "var(--warning)" }}>
                    {repeat}
                  </div>
                  <div className="ds-l">Повторить</div>
                </div>
              </div>
              <div className="study-actions" style={{ maxWidth: 420, margin: "0 auto" }}>
                <button className="btn" onClick={() => navigate("/")}>
                  На дашборд
                </button>
                <button className="btn btn-primary" onClick={restart}>
                  <RotateCcw size={16} />
                  Заново
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const answered = known + repeat;

  return (
    <>
      <Topbar crumbs={crumbs} />
      <div className="content">
        <div className="study" ref={rootRef}>
          <div className="study-head">
            <div>
              <div className="sh-title">{title}</div>
              <div className="sh-sub">
                {review ? "Режим повторения" : "Тренировка"} · самопроверка
              </div>
            </div>
          </div>

          <div className="study-progress">
            <div className="sp-meta">
              <span>
                {index + 1} / {queue.length}
              </span>
              <span>Знаю: {known} · Повторить: {repeat}</span>
            </div>
            <div className="bar">
              <span
                className="seg-learned"
                style={{ width: `${(answered / queue.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="flashcard">
            <div className="fc-tag">
              <span className="badge blue">Тема №{current.topicId}</span>
              <span className="badge">
                {current.answerType === "list" ? "Перечисление" : "Определение"}
              </span>
            </div>

            <div className="fc-q">{current.prompt}</div>

            {revealed ? (
              <div className="fc-answer">
                <div className="fa-label">Эталонный ответ</div>
                {current.answerType === "list" ? (
                  <ol className="answer-list">
                    {current.answer.map((item, i) => (
                      <li key={i}>
                        <span className="ai-num">{i + 1}</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="answer-text">{current.answer[0]}</p>
                )}
              </div>
            ) : (
              <div className="fc-hint">Вспомните ответ, затем откройте эталон</div>
            )}
          </div>

          {revealed ? (
            <div className="study-actions">
              <button className="btn" onClick={() => grade(false)}>
                <RotateCcw size={16} />
                Повторить
              </button>
              <button className="btn btn-success" onClick={() => grade(true)}>
                <Check size={16} />
                Знаю
              </button>
            </div>
          ) : (
            <div className="study-actions">
              <button className="btn btn-primary btn-block" onClick={() => setRevealed(true)}>
                <Eye size={16} />
                Показать ответ
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
