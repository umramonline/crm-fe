import type { MenuNode } from "@adminlte/react";

import { pathFromPage } from "@/shared/layout/types";

type MenuPermissions = {
  canViewDashboard: boolean;
  canViewCustomers: boolean;
  canViewTasks: boolean;
  canViewFollowUps: boolean;
  canViewIetts: boolean;
  canViewPermissions: boolean;
};

export function buildMenuItems({
  canViewDashboard,
  canViewCustomers,
  canViewTasks,
  canViewFollowUps,
  canViewIetts,
  canViewPermissions,
}: MenuPermissions): MenuNode[] {
  const items: MenuNode[] = [
    {
      type: "item",
      text: "Anasayfa",
      href: pathFromPage("home"),
      icon: "bi-house",
    },
  ];

  if (canViewDashboard) {
    items.push({
      type: "item",
      text: "Dashboard",
      href: pathFromPage("dashboard"),
      icon: "bi-speedometer2",
    });
  }

  if (canViewCustomers) {
    items.push({
      type: "item",
      text: "Galeri Listesi",
      href: pathFromPage("customers"),
      icon: "bi-people",
    });
  }

  if (canViewTasks) {
    items.push({
      type: "item",
      text: "Tüm Görevler",
      href: pathFromPage("tasks"),
      icon: "bi-list-task",
    });
  }

  if (canViewFollowUps) {
    items.push({
      type: "item",
      text: "Tüm Takip Kayıtları",
      href: pathFromPage("followUps"),
      icon: "bi-clipboard-check",
    });
  }

  if (canViewIetts) {
    items.push({
      type: "item",
      text: "IETTS",
      href: pathFromPage("ietts"),
      icon: "bi-file-earmark-text",
    });
  }

  if (canViewPermissions) {
    items.push({
      type: "item",
      text: "İzinler",
      href: pathFromPage("permissions"),
      icon: "bi-shield-lock",
    });
  }

  return items;
}
