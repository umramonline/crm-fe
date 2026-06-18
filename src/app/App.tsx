import { useEffect, useState } from "react";

import { LoginPage } from "@/features/auth/components/LoginPage";
import { HelloPage } from "@/features/hello/components/HelloPage";

export function App() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    function handlePopState(): void {
      setPath(window.location.pathname);
    }

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function handleAuthenticated(): void {
    window.history.pushState(null, "", "/hello");
    setPath("/hello");
  }

  if (path === "/hello") {
    return <HelloPage />;
  }

  return <LoginPage onAuthenticated={handleAuthenticated} />;
}
