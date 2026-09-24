import type { ReactNode, SelectHTMLAttributes } from "react";

import { formFieldProps } from "@/shared/utils/formFieldProps";

type TableFilterSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "id" | "name"
> & {
  page: string;
  field: string;
  label?: string;
  children: ReactNode;
};

export function TableFilterSelect({
  page,
  field,
  label,
  className = "form-select form-select-sm",
  children,
  ...props
}: TableFilterSelectProps) {
  return (
    <select
      {...formFieldProps(page, field, { label: label ?? field })}
      className={className}
      {...props}
    >
      {children}
    </select>
  );
}
