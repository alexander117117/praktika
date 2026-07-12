import { Menu } from "lucide-react";
import type { ReactNode } from "react";
import { useLayout } from "./AppLayout";

interface Props {
  crumbs: ReactNode;
  right?: ReactNode;
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
      {right}
    </header>
  );
}
