import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, useLocation, useOutletContext } from "react-router-dom";
import { hasGuestChoice, useAuth } from "@/auth/AuthContext";
import { Sidebar } from "./Sidebar";

export interface LayoutCtx {
  openNav: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLayout() {
  return useOutletContext<LayoutCtx>();
}

export function AppLayout() {
  const { enabled, user, loading } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const loc = useLocation();

  useEffect(() => {
    setNavOpen(false);
    mainRef.current?.scrollTo(0, 0);
  }, [loc.pathname]);

  // Signed out and never chose guest mode (or just signed out) — auth screen first.
  if (enabled && !loading && !user && !hasGuestChoice()) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="app">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}
      <main className="main" ref={mainRef}>
        <Outlet context={{ openNav: () => setNavOpen(true) } satisfies LayoutCtx} />
      </main>
    </div>
  );
}
