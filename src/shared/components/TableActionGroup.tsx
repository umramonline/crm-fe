import type { ButtonHTMLAttributes, ReactNode } from "react";

import {
  tableActionIcons,
  type TableActionIconKey,
} from "@/shared/constants/tableActionIcons";

type TableActionGroupProps = {
  children: ReactNode;
  label?: string;
};

export function TableActionGroup({
  children,
  label = "Satır işlemleri",
}: TableActionGroupProps) {
  return (
    <div
      className="btn-group btn-group-sm table-action-group"
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  );
}

type TableIconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  /** Semantic CRM action → Bootstrap Icon class */
  action: TableActionIconKey;
  label: string;
  variant?: "primary" | "secondary" | "danger" | "success" | "warning" | "info";
};

export function TableIconButton({
  action,
  label,
  variant = "primary",
  className = "",
  type = "button",
  ...rest
}: TableIconButtonProps) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${className}`.trim()}
      aria-label={label}
      title={label}
      {...rest}
    >
      <i className={tableActionIcons[action]} aria-hidden="true" />
    </button>
  );
}
