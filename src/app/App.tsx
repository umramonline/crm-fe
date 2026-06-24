import { useCallback, useEffect, useState } from "react";

import { AuthorizationPage } from "@/features/authorization/components/AuthorizationPage";
import { LoginPage } from "@/features/auth/components/LoginPage";
import {
  getSession,
  logout,
  refreshSession,
  type SessionData,
} from "@/features/auth/services/authApi";
import { HelloPage } from "@/features/hello/components/HelloPage";
import { AppLayout, type AppPage } from "@/shared/components/AppLayout";

export function App() {
  const [path, setPath] = useState(() => window.location.pathname);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);

  useEffect(() => {
    function handlePopState(): void {
      setPath(window.location.pathname);
    }

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateTo = useCallback((nextPath: string): void => {
    window.history.pushState(null, "", nextPath);
    setPath(nextPath);
  }, []);

  useEffect(() => {
    let isActive = true;

    async function ensureSession(): Promise<void> {
      setIsCheckingSession(true);

      try {
        const nextSession = await getSession();
        if (isActive) {
          setSession(nextSession);
          if (path === "/") {
            navigateTo("/home");
          }
        }
      } catch {
        try {
          const refreshedSession = await refreshSession();
          if (isActive) {
            setSession(refreshedSession);
            if (path === "/") {
              navigateTo("/home");
            }
          }
        } catch {
          if (isActive) {
            setSession(null);
            if (path !== "/") {
              navigateTo("/");
            }
          }
        }
      } finally {
        if (isActive) {
          setIsCheckingSession(false);
        }
      }
    }

    void ensureSession();

    return () => {
      isActive = false;
    };
  }, [navigateTo, path]);

  function handleAuthenticated(nextSession: SessionData): void {
    setSession(nextSession);
    navigateTo("/home");
  }

  async function handleLogout(): Promise<void> {
    try {
      await logout();
    } finally {
      setSession(null);
      navigateTo("/");
    }
  }

  if (isCheckingSession) {
    return (
      <main className="hello-page">
        <section className="hello-card">
          <p>Oturum kontrol ediliyor...</p>
        </section>
      </main>
    );
  }

  if (path !== "/") {
    if (!session) {
      return null;
    }

    const canViewPermissions = session.permissions.some(
      (permission) => permission.name === "authorization.menu",
    );
    const activePage = pageFromPath(path, canViewPermissions);

    return (
      <AppLayout
        activePage={activePage}
        canViewPermissions={canViewPermissions}
        session={session}
        onLogout={() => void handleLogout()}
        onNavigate={(page) => navigateTo(pathFromPage(page))}
      >
        {activePage === "permissions" ? (
          <AuthorizationPage permissions={session.permissions} />
        ) : (
          <HelloPage session={session} />
        )}
      </AppLayout>
    );
  }

  return <LoginPage onAuthenticated={handleAuthenticated} />;
}

function pageFromPath(path: string, canViewPermissions: boolean): AppPage {
  if (path === "/permissions" && canViewPermissions) {
    return "permissions";
  }

  return "home";
}

function pathFromPage(page: AppPage): string {
  return page === "permissions" ? "/permissions" : "/home";
}
