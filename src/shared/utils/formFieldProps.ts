type FormFieldProps = {
  id: string;
  name: string;
  "aria-label"?: string;
};

export function formFieldProps(
  scope: string,
  field: string,
  options?: {
    suffix?: string | number;
    label?: string;
  },
): FormFieldProps {
  const id =
    options?.suffix !== undefined
      ? `${scope}-${field}-${options.suffix}`
      : `${scope}-${field}`;

  return {
    id,
    name: id,
    ...(options?.label ? { "aria-label": options.label } : {}),
  };
}
