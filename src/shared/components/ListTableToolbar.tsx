import type { ReactNode } from "react";

type ListTableToolbarProps = {
  children: ReactNode;
};

/** AdminLTE card-header toolbar for filter / list actions */
export function ListTableToolbar({ children }: ListTableToolbarProps) {
  return (
    <div className="card-header list-table-toolbar d-flex flex-wrap align-items-center gap-2">
      {children}
    </div>
  );
}
