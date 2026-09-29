import type { ReactNode } from "react";

export type CrmDetailItem = {
  label: string;
  value: ReactNode;
};

type CrmDetailGridProps = {
  items: CrmDetailItem[];
};

export function CrmDetailGrid({ items }: CrmDetailGridProps) {
  return (
    <div className="crm-detail-grid">
      {items.map((item) => (
        <div className="crm-detail-item" key={item.label}>
          <span className="crm-detail-label">{item.label}</span>
          <div className="crm-detail-value">{item.value ?? "-"}</div>
        </div>
      ))}
    </div>
  );
}
