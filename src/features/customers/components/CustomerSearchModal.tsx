import { Button } from "@adminlte/react";
import { FormEvent, useEffect, useState } from "react";

import { customerEntryTexts } from "@/features/customers/constants/customerEntryTexts";
import {
  searchCustomer,
  type CustomerDetail,
} from "@/features/customers/services/customerApi";
import { ControlledModal } from "@/shared/components/ControlledModal";
import { CrmDetailGrid } from "@/shared/components/CrmDetailGrid";
import { CrmFormInput } from "@/shared/components/CrmFormField";
import { CrmFormSection } from "@/shared/components/CrmFormSection";

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
    <ControlledModal
      isOpen={isOpen}
      onClose={onClose}
      title={customerEntryTexts.searchTitle}
      size="lg"
      footer={
        <>
          <Button theme="secondary" size="sm" type="button" onClick={onClose}>
            Vazgeç
          </Button>
          <Button
            theme="primary"
            size="sm"
            type="submit"
            form="customer-search-form"
            disabled={isSearching}
          >
            {isSearching ? "Aranıyor..." : "Ara"}
          </Button>
        </>
      }
    >
      <form
        id="customer-search-form"
        className="customer-entry-form"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <CrmFormSection title="Arama kriteri">
          <CrmFormInput
            formScope="customer-search"
            field="query"
            label="Arama"
            value={searchQuery}
            placeholder={customerEntryTexts.searchPlaceholder}
            onChange={setSearchQuery}
          />
        </CrmFormSection>
      </form>

      {foundCustomer ? (
        <CrmFormSection title="Bulunan müşteri">
          <CrmDetailGrid
            items={[
              { label: "Ad / Ünvan", value: customerDisplayName(foundCustomer) },
              {
                label: "Telefon",
                value: foundCustomer.cep || foundCustomer.telefon || "-",
              },
              {
                label: "T.C. / Vergi No",
                value: foundCustomer.tcNo || foundCustomer.vergiNo || "-",
              },
            ]}
          />
        </CrmFormSection>
      ) : null}
    </ControlledModal>
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
