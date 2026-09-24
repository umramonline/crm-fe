import { useCallback, useEffect, useState } from "react";

export function usePathname(): string {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    function handleNavigation(): void {
      setPathname(window.location.pathname);
    }

    window.addEventListener("popstate", handleNavigation);
    return () => window.removeEventListener("popstate", handleNavigation);
  }, []);

  return pathname;
}

export function useRouter(): { push: (href: string) => void } {
  const push = useCallback((href: string): void => {
    window.history.pushState(null, "", href);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  return { push };
}
