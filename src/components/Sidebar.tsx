import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ListChecks,
  LogOut,
  Search,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { AuthModal } from "./AuthModal";
import { TOPICS } from "@/data/topics";

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { enabled, user, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  const initial = (user?.email ?? "Г").charAt(0).toUpperCase();
  const name = user?.email ?? "Гость";
  const sub = enabled
    ? user
      ? "Синхронизация включена"
      : "Локально · не выполнен вход"
    : "Локальный режим";

  return (
    <aside className={`sidebar${open ? " open" : ""}`} onClick={onClose}>
      <div className="brand">Praktika</div>

      <NavLink to="/topics" className="sidebar-search">
        <Search size={15} />
        Поиск темы…
      </NavLink>

      <div className="nav-group">
        <NavLink to="/" end className="nav-item">
          <LayoutDashboard size={18} />
          Дашборд
        </NavLink>
        <NavLink to="/topics" className="nav-item">
          <ListChecks size={18} />
          Темы
          <span className="nav-count">{TOPICS.length}</span>
        </NavLink>
        <NavLink to="/progress" className="nav-item">
          <TrendingUp size={18} />
          Прогресс
        </NavLink>
      </div>

      <div className="sidebar-spacer" />

      <div className="sidebar-user" onClick={(e) => e.stopPropagation()}>
        <div className="avatar">{initial}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="su-name">{name}</div>
          <div className="su-sub">{sub}</div>
        </div>
        {enabled &&
          (user ? (
            <button className="btn btn-ghost btn-sm" title="Выйти" onClick={() => void signOut()}>
              <LogOut size={16} />
            </button>
          ) : (
            <button className="btn btn-sm" onClick={() => setAuthOpen(true)}>
              Войти
            </button>
          ))}
      </div>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </aside>
  );
}
