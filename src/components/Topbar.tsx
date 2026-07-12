import { Menu } from "lucide-react";
import type { ReactNode } from "react";
import { useLayout } from "./AppLayout";
import { useAuth } from "@/auth/AuthContext";
import { useProgress } from "@/store/useProgress";

interface Props {
  crumbs: ReactNode;
  right?: ReactNode;
}

/** Shown while logged in whenever local progress is not confirmed by the server. */
function SyncBadge() {
  const { user } = useAuth();
  const syncStatus = useProgress((s) => s.syncStatus);
  const pendingCount = useProgress((s) => s.pendingCount);
  const syncFromRemote = useProgress((s) => s.syncFromRemote);

  if (!user) return null;
  if (syncStatus === "syncing" && pendingCount > 0) {
    return <span className="badge sync-badge">Синхронизация…</span>;
  }
  if (syncStatus === "error") {
    return (
      <button
        className="badge amber dot sync-badge"
        onClick={() => void syncFromRemote()}
        title="Изменения не сохранены на сервере — нажмите, чтобы повторить"
      >
        Не синхронизировано{pendingCount > 0 ? ` · ${pendingCount}` : ""}
      </button>
    );
  }
  return null;
}

export function Topbar({ crumbs, right }: Props) {
  const { openNav } = useLayout();
  return (
    <header className="topbar">
      <button className="hamburger" onClick={openNav} aria-label="Меню">
        <Menu size={18} />
      </button>
      <div className="crumb">{crumbs}</div>
      <div className="spacer" />
      <SyncBadge />
      {right}
    </header>
  );
}
