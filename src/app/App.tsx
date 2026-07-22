import { useCallback, useEffect, useState } from "react";

import { AuthorizationPage } from "@/features/authorization/components/AuthorizationPage";
import { LoginPage } from "@/features/auth/components/LoginPage";
import { CustomerFullRegistrationPage } from "@/features/customers/components/CustomerFullRegistrationPage";
import { CustomersPage } from "@/features/customers/components/CustomersPage";
import { DashboardPage } from "@/features/dashboard/components/DashboardPage";
import { FollowUpsPage } from "@/features/followUps/components/FollowUpsPage";
import { IettsPage } from "@/features/ietts/components/IettsPage";
import { TasksPage } from "@/features/tasks/components/TasksPage";
import {
  getSession,
  logout,
  refreshSession,
  type SessionData,
} from "@/features/auth/services/authApi";
import { HelloPage } from "@/features/hello/components/HelloPage";
import { AppLayout, type AppPage } from "@/shared/components/AppLayout";
import { GlobalLoadingOverlay } from "@/shared/components/GlobalLoadingOverlay";

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
      <>
        <GlobalLoadingOverlay />
        <main className="hello-page">
          <section className="hello-card">
            <p>Oturum kontrol ediliyor...</p>
          </section>
        </main>
      </>
    );
  }

  if (path !== "/") {
    if (!session) {
      return <GlobalLoadingOverlay />;
    }

    const canViewDashboard = session.permissions.some(
      (permission) => permission.name === "dashboard.menu",
    );
    const canViewCustomers = session.permissions.some(
      (permission) => permission.name === "customers.menu",
    );
    const canViewTasks = session.permissions.some(
      (permission) => permission.name === "tasks.menu",
    );
    const canViewFollowUps = session.permissions.some(
      (permission) => permission.name === "follow_ups.menu",
    );
    const canViewIetts = session.permissions.some(
      (permission) => permission.name === "ietts.menu",
    );
    const canViewPermissions = session.permissions.some(
      (permission) => permission.name === "authorization.menu",
    );
    const activePage = pageFromPath(
      path,
      canViewDashboard,
      canViewCustomers,
      canViewTasks,
      canViewFollowUps,
      canViewIetts,
      canViewPermissions,
    );
    const fullRegistrationCustomerId = customerFullRegistrationId(path);

    return (
      <>
        <GlobalLoadingOverlay />
        <AppLayout
          activePage={activePage}
          canViewDashboard={canViewDashboard}
          canViewCustomers={canViewCustomers}
          canViewTasks={canViewTasks}
          canViewFollowUps={canViewFollowUps}
          canViewIetts={canViewIetts}
          canViewPermissions={canViewPermissions}
          session={session}
          onLogout={() => void handleLogout()}
          onNavigate={(page) => navigateTo(pathFromPage(page))}
        >
          {fullRegistrationCustomerId && canViewCustomers ? (
            <CustomerFullRegistrationPage
              customerId={fullRegistrationCustomerId}
              onBack={() => navigateTo("/customers")}
            />
          ) : activePage === "dashboard" ? (
            <DashboardPage permissions={session.permissions} />
          ) : activePage === "customers" ? (
            <CustomersPage permissions={session.permissions} />
          ) : activePage === "tasks" ? (
            <TasksPage
              permissions={session.permissions}
              roleId={session.user.roleId}
              userId={session.userId}
            />
          ) : activePage === "followUps" ? (
            <FollowUpsPage permissions={session.permissions} />
          ) : activePage === "ietts" ? (
            <IettsPage permissions={session.permissions} />
          ) : activePage === "permissions" ? (
            <AuthorizationPage permissions={session.permissions} />
          ) : (
            <HelloPage session={session} />
          )}
        </AppLayout>
      </>
    );
  }

  return (
    <>
      <GlobalLoadingOverlay />
      <LoginPage onAuthenticated={handleAuthenticated} />
    </>
  );
}

function pageFromPath(
  path: string,
  canViewDashboard: boolean,
  canViewCustomers: boolean,
  canViewTasks: boolean,
  canViewFollowUps: boolean,
  canViewIetts: boolean,
  canViewPermissions: boolean,
): AppPage {
  if (path.startsWith("/customers/full-registration/") && canViewCustomers) {
    return "customers";
  }

  if (path === "/dashboard" && canViewDashboard) {
    return "dashboard";
  }

  if (path === "/customers" && canViewCustomers) {
    return "customers";
  }

  if (path === "/tasks" && canViewTasks) {
    return "tasks";
  }

  if (path === "/follow-ups" && canViewFollowUps) {
    return "followUps";
  }

  if (path === "/ietts" && canViewIetts) {
    return "ietts";
  }

  if (path === "/permissions" && canViewPermissions) {
    return "permissions";
  }

  return "home";
}

function customerFullRegistrationId(path: string): number | null {
  const prefix = "/customers/full-registration/";
  if (!path.startsWith(prefix)) {
    return null;
  }

  const id = Number(path.slice(prefix.length));
  return Number.isFinite(id) && id > 0 ? id : null;
}

function pathFromPage(page: AppPage): string {
  if (page === "dashboard") {
    return "/dashboard";
  }

  if (page === "customers") {
    return "/customers";
  }

  if (page === "tasks") {
    return "/tasks";
  }

  if (page === "followUps") {
    return "/follow-ups";
  }

  if (page === "ietts") {
    return "/ietts";
  }

  return page === "permissions" ? "/permissions" : "/home";
}
