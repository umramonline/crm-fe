import { Button } from "@adminlte/react";
import { useState } from "react";

import { iettsTexts } from "@/features/ietts/constants/iettsTexts";
import { convertIettsToCustomer } from "@/features/ietts/services/iettsApi";
import { ControlledModal } from "@/shared/components/ControlledModal";
import { readApiErrorMessage } from "@/shared/utils/apiErrorMessage";
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
    } catch (error) {
      onError(readApiErrorMessage(error, iettsTexts.convertFailed));
      onClose();
    } finally {
      setIsConverting(false);
    }
  }

  return (
    <ControlledModal
      isOpen
      onClose={onClose}
      title={iettsTexts.convertConfirmTitle}
      footer={
        <>
          <Button theme="secondary" size="sm" type="button" onClick={onClose} disabled={isConverting}>
            {iettsTexts.cancel}
          </Button>
          <Button
            theme="primary"
            size="sm"
            type="button"
            onClick={() => void handleContinue()}
            disabled={isConverting}
          >
            {isConverting ? iettsTexts.converting : iettsTexts.continue}
          </Button>
        </>
      }
    >
      <p className="mb-0">{iettsTexts.convertConfirmMessage}</p>
    </ControlledModal>
  );
}
