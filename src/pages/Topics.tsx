import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { TopicCard } from "@/components/TopicCard";
import { TopicModal } from "@/components/TopicModal";
import { useProgress } from "@/store/useProgress";
import { TOPICS } from "@/data/topics";
import { topicStat } from "@/lib/stats";
import type { Topic } from "@/lib/types";

type Filter = "all" | "progress" | "new" | "done";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "progress", label: "В процессе" },
  { key: "new", label: "Не начатые" },
  { key: "done", label: "Выученные" },
];

export function Topics() {
  const navigate = useNavigate();
  const progress = useProgress((s) => s.progress);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Topic | null>(null);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOPICS.map((t) => ({ topic: t, stat: topicStat(t, progress) })).filter(
      ({ topic, stat }) => {
        if (q && !topic.title.toLowerCase().includes(q) && String(topic.id) !== q) return false;
        if (filter === "done") return stat.learned === stat.total;
        if (filter === "new") return stat.learned === 0 && stat.learning === 0;
        if (filter === "progress")
          return stat.learned < stat.total && stat.learned + stat.learning > 0;
        return true;
      },
    );
  }, [query, filter, progress]);

  return (
    <>
      <Topbar
        crumbs="Темы"
        right={
          <button
            className="btn btn-primary"
            onClick={() => navigate("/study/all?review=1")}
            aria-label="Начать тренировку"
          >
            <Sparkles size={16} />
            <span className="btn-text">Начать тренировку</span>
          </button>
        }
      />
      <div className="content">
        <div className="page-head">
          <h1>Темы</h1>
          <p>{TOPICS.length} тем диагностического профиля — 2 курс, лечебный факультет</p>
        </div>

        <div className="toolbar">
          <div className="search-input">
            <Search size={15} />
            <input
              placeholder="Поиск по названию или номеру темы…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="seg">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={filter === f.key ? "on" : ""}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="card empty">Ничего не найдено.</div>
        ) : (
          <div className="topic-grid">
            {items.map(({ topic, stat }) => (
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
