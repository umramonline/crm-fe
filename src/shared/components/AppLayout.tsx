import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import type { SessionData } from "@/features/auth/services/authApi";

export type AppPage = "home" | "permissions";

type AppLayoutProps = {
  activePage: AppPage;
  canViewPermissions: boolean;
  children: ReactNode;
  session: SessionData;
  onLogout: () => void;
  onNavigate: (page: AppPage) => void;
};

export function AppLayout({
  activePage,
  canViewPermissions,
  children,
  onLogout,
  onNavigate,
  session,
}: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => window.innerWidth >= 992,
  );

  useEffect(() => {
    function handleResize(): void {
      setIsSidebarOpen(window.innerWidth >= 992);
    }

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function handleNavigate(page: AppPage): void {
    onNavigate(page);
    if (window.innerWidth < 992) {
      setIsSidebarOpen(false);
    }
  }

  return (
    <div className={isSidebarOpen ? "panel-shell" : "panel-shell sidebar-closed"}>
      <aside className="panel-sidebar">
        <div className="panel-logo">
          <img src="/logo.png" alt="CRM" />
        </div>

        <nav className="panel-menu" aria-label="Sol menü">
          <button
            className={activePage === "home" ? "panel-menu-item active" : "panel-menu-item"}
            type="button"
            onClick={() => handleNavigate("home")}
          >
            <span aria-hidden="true">◉</span>
            Anasayfa
          </button>

          {canViewPermissions ? (
            <button
              className={
                activePage === "permissions"
                  ? "panel-menu-item active"
                  : "panel-menu-item"
              }
              type="button"
              onClick={() => handleNavigate("permissions")}
            >
              <span aria-hidden="true">☷</span>
              İzinler
            </button>
          ) : null}

          <button className="panel-menu-item" type="button" onClick={onLogout}>
            <span aria-hidden="true">↪</span>
            Çıkış
          </button>
        </nav>
      </aside>

      <section className="panel-area">
        <header className="panel-header">
          <button
            className="panel-hamburger"
            type="button"
            aria-label={isSidebarOpen ? "Menüyü kapat" : "Menüyü aç"}
            onClick={() => setIsSidebarOpen((current) => !current)}
          >
            <span />
            <span />
            <span />
          </button>

          <div className="panel-user">
            <strong>{session.user.roleName || "Kullanıcı"}</strong>
            <span>{session.user.name || session.user.phone || "CRM"}</span>
            <button type="button" aria-label="Çıkış yap" onClick={onLogout}>
              ↪
            </button>
          </div>
        </header>

        <main className="panel-content">{children}</main>

        <footer className="panel-footer">
          <span>
            Copyright © 2009-2025 <a href="https://umranoto.com"><strong>UMRAN OTO</strong></a>. All rights reserved.
          </span>
          <span>Version 1.0.0</span>
        </footer>
      </section>

      {isSidebarOpen ? (
        <button
          className="panel-backdrop"
          type="button"
          aria-label="Menüyü kapat"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}
    </div>
  );
}
