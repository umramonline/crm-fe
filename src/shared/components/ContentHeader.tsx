import { AppContent } from "@adminlte/react";

export type ContentHeaderBreadcrumb = {
  label: string;
  href?: string;
  active?: boolean;
};

type ContentHeaderProps = {
  title: string;
  breadcrumbs?: ContentHeaderBreadcrumb[];
};

/**
 * Page title + breadcrumbs via @adminlte/react AppContent.
 * @see https://github.com/ColorlibHQ/adminlte-react — AppContent
 *
 * Library v0.6.x does not render AppContent children; page body stays a sibling below.
 */
export function ContentHeader({ title, breadcrumbs = [] }: ContentHeaderProps) {
  const appBreadcrumbs =
    breadcrumbs.length > 0
      ? breadcrumbs.map((item) => ({
          label: item.label,
          href: item.active ? undefined : item.href,
        }))
      : undefined;

  return (
    <AppContent title={title} breadcrumbs={appBreadcrumbs}>
      <></>
    </AppContent>
  );
}
