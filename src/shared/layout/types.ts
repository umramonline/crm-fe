export type AppPage =
  | "home"
  | "dashboard"
  | "customers"
  | "tasks"
  | "followUps"
  | "ietts"
  | "permissions";

export function pathFromPage(page: AppPage): string {
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
