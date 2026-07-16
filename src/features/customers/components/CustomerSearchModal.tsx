import { FormEvent, useEffect, useState } from "react";

import { customerEntryTexts } from "@/features/customers/constants/customerEntryTexts";
import {
  searchCustomer,
  type CustomerDetail,
} from "@/features/customers/services/customerApi";

type CustomerSearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onNotFound: () => void;
  onFoundBackend: (customerId: number) => void;
  onNotify: (message: string) => void;
};

export function CustomerSearchModal({
  isOpen,
  onClose,
  onNotFound,
  onFoundBackend,
  onNotify,
}: CustomerSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [foundCustomer, setFoundCustomer] = useState<CustomerDetail | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setFoundCustomer(null);
      setIsSearching(false);
    }
  }, [isOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const normalizedQuery = searchQuery.trim();
    if (!normalizedQuery) {
      onNotify(customerEntryTexts.searchRequired);
      return;
    }

    setIsSearching(true);
    setFoundCustomer(null);

    try {
      const result = await searchCustomer(normalizedQuery);
      if (result.found && result.customer) {
        if (result.source === "backend") {
          onFoundBackend(result.customer.id);
          return;
        }

        setFoundCustomer(result.customer);
        onNotify(
          `${customerEntryTexts.customerFound} Kaynak: ${formatCustomerSource(result.source)}.`,
        );
        return;
      }

      onClose();
      onNotFound();
      onNotify(customerEntryTexts.customerNotFound);
    } catch {
      onNotify(customerEntryTexts.searchFailed);
    } finally {
      setIsSearching(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="customer-modal-backdrop" role="presentation">
      <section className="customer-modal" role="dialog" aria-modal="true">
        <div className="customer-modal-header">
          <h2>{customerEntryTexts.searchTitle}</h2>
          <button
            className="customer-modal-close"
            type="button"
            onClick={onClose}
          >
            Kapat
          </button>
        </div>

        <form className="panel-form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="field-label">
            Arama
            <input
              className="panel-input"
              value={searchQuery}
              placeholder={customerEntryTexts.searchPlaceholder}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>

          <div className="customer-modal-actions">
            <button className="blue-button" type="submit" disabled={isSearching}>
              {isSearching ? "Aranıyor..." : "Ara"}
            </button>
            <button className="gray-button" type="button" onClick={onClose}>
              Vazgeç
            </button>
          </div>
        </form>

        {foundCustomer ? (
          <div className="customer-found-card">
            <strong>{customerDisplayName(foundCustomer)}</strong>
            <span>{foundCustomer.cep || foundCustomer.telefon || "-"}</span>
            <span>{foundCustomer.tcNo || foundCustomer.vergiNo || "-"}</span>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function formatCustomerSource(value: string): string {
  if (value === "backend") {
    return "Backend";
  }

  if (value === "umramonline") {
    return "Umramonline";
  }

  return "-";
}

function customerDisplayName(customer: CustomerDetail): string {
  const corporateName = customer.unvan.trim();
  if (corporateName) {
    return corporateName;
  }

  const individualName = `${customer.ad} ${customer.soyad}`.trim();
  return individualName || "-";
}
