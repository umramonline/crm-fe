import type { InputHTMLAttributes } from "react";

import { formFieldProps } from "@/shared/utils/formFieldProps";

type TableFilterInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "name"
> & {
  page: string;
  field: string;
  label?: string;
};

export function TableFilterInput({
  page,
  field,
  label,
  className = "form-control form-control-sm",
  type = "text",
  ...props
}: TableFilterInputProps) {
  return (
    <input
      {...formFieldProps(page, field, { label: label ?? field })}
      className={className}
      type={type}
      {...props}
    />
  );
}
