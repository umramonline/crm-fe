import { Input, Select, Textarea } from "@adminlte/react";
import type { ReactNode } from "react";

import { formFieldProps } from "@/shared/utils/formFieldProps";

export const defaultCrmFormTextMaxLength = 255;

export function CrmFormFieldCol({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-12" : "col-12 col-md-6"}>{children}</div>
  );
}

export type CrmFormInputProps = {
  formScope: string;
  field: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  maxLength?: number;
  isPhone?: boolean;
  disabled?: boolean;
  suffix?: string | number;
  min?: string;
  placeholder?: string;
  readOnly?: boolean;
  hint?: string;
  "data-follow-up-error-field"?: string;
};

export function CrmFormInput({
  formScope,
  field,
  label,
  value,
  onChange,
  error,
  type = "text",
  maxLength = defaultCrmFormTextMaxLength,
  isPhone = false,
  disabled = false,
  suffix,
  min,
  placeholder,
  readOnly,
  hint,
  "data-follow-up-error-field": followUpErrorField,
}: CrmFormInputProps) {
  const fieldProps = formFieldProps(formScope, field, { label, suffix });

  return (
    <Input
      id={fieldProps.id}
      name={fieldProps.name}
      label={label}
      fgroupClass="mb-0"
      igroupSize="sm"
      error={error}
      hint={hint}
      type={type}
      inputMode={isPhone ? "tel" : undefined}
      pattern={isPhone ? "05[0-9]{9}" : undefined}
      maxLength={type === "number" ? undefined : isPhone ? 11 : maxLength}
      placeholder={placeholder ?? (isPhone ? "05XXXXXXXXX" : undefined)}
      value={value}
      min={min}
      disabled={disabled}
      readOnly={readOnly}
      data-follow-up-error-field={followUpErrorField}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export type CrmFormSelectProps = {
  formScope: string;
  field: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  suffix?: string | number;
  placeholderOption?: string;
  hidePlaceholder?: boolean;
  "data-follow-up-error-field"?: string;
};

export function CrmFormSelect({
  formScope,
  field,
  label,
  value,
  options,
  onChange,
  error,
  disabled = false,
  suffix,
  placeholderOption = "Seçiniz",
  hidePlaceholder = false,
  "data-follow-up-error-field": followUpErrorField,
}: CrmFormSelectProps) {
  const fieldProps = formFieldProps(formScope, field, { label, suffix });
  const selectOptions = [
    ...(hidePlaceholder ? [] : [{ value: "", label: placeholderOption }]),
    ...options,
  ];

  return (
    <Select
      id={fieldProps.id}
      name={fieldProps.name}
      label={label}
      fgroupClass="mb-0"
      className="form-select-sm"
      value={value}
      disabled={disabled}
      error={error}
      options={selectOptions}
      data-follow-up-error-field={followUpErrorField}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export type CrmFormTextareaProps = {
  formScope: string;
  field: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  maxLength?: number;
  rows?: number;
  hint?: string;
  "data-follow-up-error-field"?: string;
};

export function CrmFormTextarea({
  formScope,
  field,
  label,
  value,
  onChange,
  error,
  disabled = false,
  maxLength = defaultCrmFormTextMaxLength,
  rows = 3,
  hint,
  "data-follow-up-error-field": followUpErrorField,
}: CrmFormTextareaProps) {
  const fieldProps = formFieldProps(formScope, field, { label });

  return (
    <Textarea
      id={fieldProps.id}
      name={fieldProps.name}
      label={label}
      fgroupClass="mb-0"
      className="form-control-sm"
      rows={rows}
      maxLength={maxLength}
      value={value}
      disabled={disabled}
      error={error}
      hint={hint}
      data-follow-up-error-field={followUpErrorField}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
