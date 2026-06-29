import { useEffect, useState } from "react";

import { subscribeApiLoading } from "@/services/apiLoading";

export function GlobalLoadingOverlay() {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => subscribeApiLoading(setIsLoading), []);

  if (!isLoading) {
    return null;
  }

  return (
    <div className="global-loading-overlay" aria-live="polite" aria-busy="true">
      <div className="global-loading-card">
        <span className="global-loading-spinner" />
        <span>Yükleniyor...</span>
      </div>
    </div>
  );
}
