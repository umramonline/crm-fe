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
  const [isOpen, setIsOpen] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [redirectCustomerId, setRedirectCustomerId] = useState<number | null>(null);

  function requestClose(): void {
    if (isConverting) {
      return;
    }
    setIsOpen(false);
  }

  function handleModalClosed(): void {
    onClose();
    if (redirectCustomerId !== null) {
      navigateToFullRegistration(redirectCustomerId);
    }
  }

  async function handleContinue(): Promise<void> {
    setIsConverting(true);

    try {
      const customerId = await convertIettsToCustomer(recordUuid);
      if (!customerId) {
        onError(iettsTexts.convertFailed);
        setIsOpen(false);
        return;
      }

      setRedirectCustomerId(customerId);
      setIsOpen(false);
    } catch (error) {
      onError(readApiErrorMessage(error, iettsTexts.convertFailed));
      setIsOpen(false);
    } finally {
      setIsConverting(false);
    }
  }

  return (
    <ControlledModal
      isOpen={isOpen}
      onClose={handleModalClosed}
      title={iettsTexts.convertConfirmTitle}
      footer={
        <>
          <Button
            theme="secondary"
            size="sm"
            type="button"
            onClick={requestClose}
            disabled={isConverting}
          >
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
