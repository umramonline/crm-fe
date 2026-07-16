import { useState } from "react";

import { iettsTexts } from "@/features/ietts/constants/iettsTexts";
import { convertIettsToCustomer } from "@/features/ietts/services/iettsApi";
import { navigateToFullRegistration } from "@/shared/utils/navigation";

type ConvertIettsToCustomerModalProps = {
  recordUuid: string;
  onClose: () => void;
  onError: (message: string) => void;
};

export function ConvertIettsToCustomerModal({
  recordUuid,
  onClose,
  onError,
}: ConvertIettsToCustomerModalProps) {
  const [isConverting, setIsConverting] = useState(false);

  async function handleContinue(): Promise<void> {
    setIsConverting(true);

    try {
      const customerId = await convertIettsToCustomer(recordUuid);
      if (!customerId) {
        onError(iettsTexts.convertFailed);
        onClose();
        return;
      }

      onClose();
      navigateToFullRegistration(customerId);
    } catch {
      onError(iettsTexts.convertFailed);
      onClose();
    } finally {
      setIsConverting(false);
    }
  }

  return (
    <div className="customer-modal-backdrop" role="presentation">
      <section className="customer-modal" role="dialog" aria-modal="true">
        <div className="customer-modal-header">
          <h2>{iettsTexts.convertConfirmTitle}</h2>
          <button
            className="customer-modal-close"
            type="button"
            onClick={onClose}
            disabled={isConverting}
          >
            Kapat
          </button>
        </div>

        <p>{iettsTexts.convertConfirmMessage}</p>

        <div className="customer-modal-actions">
          <button
            className="gray-button"
            type="button"
            onClick={onClose}
            disabled={isConverting}
          >
            {iettsTexts.cancel}
          </button>
          <button
            className="blue-button"
            type="button"
            onClick={() => void handleContinue()}
            disabled={isConverting}
          >
            {isConverting ? iettsTexts.converting : iettsTexts.continue}
          </button>
        </div>
      </section>
    </div>
  );
}
