import { Card } from "@adminlte/react";
import type { ReactNode } from "react";

type CrmFormSectionProps = {
  title?: string;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
  tools?: ReactNode;
  nested?: boolean;
};

export function CrmFormSection({
  title,
  children,
  className,
  bodyClass,
  tools,
  nested = false,
}: CrmFormSectionProps) {
  return (
    <Card
      title={title}
      variant="outline"
      theme={nested ? "secondary" : "primary"}
      className={`crm-form-section${nested ? " crm-form-section-nested" : ""}${className ? ` ${className}` : ""}`}
      bodyClass={bodyClass ?? "pt-3 pb-3"}
      tools={tools}
    >
      {children}
    </Card>
  );
}
