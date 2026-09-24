import { useEffect } from "react";

type CrmUserMenuManagerProps = {
  onLogout: () => void;
};

/** Wires the built-in AdminLTE user dropdown sign-out to CRM logout. */
export function CrmUserMenuManager({ onLogout }: CrmUserMenuManagerProps) {
  useEffect(() => {
    function handleSignOutClick(event: MouseEvent): void {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const signOut = target.closest(
        ".user-menu .user-footer a.btn-outline-danger",
      );
      if (!signOut) {
        return;
      }

      event.preventDefault();
      onLogout();
    }

    function localizeSignOutLabel(): void {
      const signOutLink = document.querySelector<HTMLAnchorElement>(
        ".user-menu .user-footer a.btn-outline-danger",
      );
      if (signOutLink?.textContent?.trim() === "Sign out") {
        signOutLink.textContent = "Çıkış yap";
      }
    }

    document.addEventListener("click", handleSignOutClick, true);
    localizeSignOutLabel();

    const header = document.querySelector(".app-header");
    const observer =
      header &&
      new MutationObserver(() => {
        localizeSignOutLabel();
      });

    if (header && observer) {
      observer.observe(header, { childList: true, subtree: true });
    }

    return () => {
      document.removeEventListener("click", handleSignOutClick, true);
      observer?.disconnect();
    };
  }, [onLogout]);

  return null;
}
