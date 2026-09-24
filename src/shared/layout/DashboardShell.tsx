import type { ReactNode } from "react";

import { DashboardLayout } from "@adminlte/react";

import type { SessionData } from "@/features/auth/services/authApi";
import { CrmUserMenuManager } from "@/shared/layout/CrmUserMenuManager";
import { buildMenuItems } from "@/shared/layout/menuItems";
import { SpaLink } from "@/shared/layout/SpaLink";
import { readStoredColorMode } from "@/shared/utils/colorMode";
import { createUserAvatarDataUri } from "@/shared/utils/userAvatar";

type DashboardShellProps = {
  canViewDashboard: boolean;
  canViewCustomers: boolean;
  canViewTasks: boolean;
  canViewFollowUps: boolean;
  canViewIetts: boolean;
  canViewPermissions: boolean;
  children: ReactNode;
  session: SessionData;
  onLogout: () => void;
};

export function DashboardShell({
  canViewDashboard,
  canViewCustomers,
  canViewTasks,
  canViewFollowUps,
  canViewIetts,
  canViewPermissions,
  children,
  onLogout,
  session,
}: DashboardShellProps) {
  const menuItems = buildMenuItems({
    canViewDashboard,
    canViewCustomers,
    canViewTasks,
    canViewFollowUps,
    canViewIetts,
    canViewPermissions,
  });

  const displayName = session.user.full_name || session.user.phone || "CRM";

  return (
    <>
      <CrmUserMenuManager onLogout={onLogout} />
      <DashboardLayout
        menuItems={menuItems}
        linkComponent={SpaLink}
        logo={
          <img
            src="/logo.png"
            alt="CRM"
            className="brand-image opacity-75"
            style={{ maxHeight: "33px" }}
          />
        }
        logoHref="/home"
        sidebarTheme="dark"
        sidebarClass="crm-dark-sidebar shadow"
        colorModeToggle
        initialColorMode={readStoredColorMode()}
        bodyClass="crm-light-layout"
        fixedHeader
        fixedSidebar
        user={{
          name: displayName,
          image: createUserAvatarDataUri(displayName),
          role: session.user.roleName || "Kullanıcı",
        }}
        footer={
          <span className="crm-footer-content">
            <span className="float-end d-none d-sm-inline">Version 1.0.0</span>
            <strong>
              Copyright © 2009-2025{" "}
              <a
                href="https://umranoto.com"
                className="text-decoration-none"
              >
                UMRAN OTO
              </a>
              .
            </strong>{" "}
            All rights reserved.
          </span>
        }
      >
        <div className="app-content">
          <div className="container-fluid">{children}</div>
        </div>
      </DashboardLayout>
    </>
  );
}
