import { useEffect, useState } from "react";

import { LoginPage } from "@/features/auth/components/LoginPage";
import {
  getSession,
  logout,
  refreshSession,
} from "@/features/auth/services/authApi";
import { HelloPage } from "@/features/hello/components/HelloPage";

export function App() {
  const [path, setPath] = useState(() => window.location.pathname);
  const [isCheckingSession, setIsCheckingSession] = useState(false);

  useEffect(() => {
    function handlePopState(): void {
      setPath(window.location.pathname);
    }

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (path !== "/hello") {
      return;
    }

    let isActive = true;

    async function ensureSession(): Promise<void> {
      setIsCheckingSession(true);

      try {
        await getSession();
      } catch {
        try {
          await refreshSession();
        } catch {
          if (isActive) {
            navigateTo("/");
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
  }, [path]);

  function handleAuthenticated(): void {
    navigateTo("/hello");
  }

  async function handleLogout(): Promise<void> {
    try {
      await logout();
    } finally {
      navigateTo("/");
    }
  }

  function navigateTo(nextPath: string): void {
    window.history.pushState(null, "", nextPath);
    setPath(nextPath);
  }

  if (path === "/hello") {
    if (isCheckingSession) {
      return (
        <main className="hello-page">
          <section className="hello-card">
            <p>Oturum kontrol ediliyor...</p>
          </section>
        </main>
      );
    }

    return <HelloPage onLogout={() => void handleLogout()} />;
  }

  return <LoginPage onAuthenticated={handleAuthenticated} />;
}
