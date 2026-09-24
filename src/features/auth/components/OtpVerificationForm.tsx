import { Button, Input } from "@adminlte/react";
import { useState } from "react";
import type { FormEvent } from "react";

import { authTexts } from "@/features/auth/constants/authTexts";

type OtpVerificationFormProps = {
  isSubmitting: boolean;
  remainingTime: string;
  onBack: () => void;
  onSubmit: (
    otpCode: string,
  ) => Promise<{ ok: true } | { ok: false; messageKey: "otpInvalidMessage" | "otpVerifyFailedMessage" }>;
};

export function OtpVerificationForm({
  isSubmitting,
  remainingTime,
  onBack,
  onSubmit,
}: OtpVerificationFormProps) {
  const [otpCode, setOtpCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const result = await onSubmit(otpCode);

    if (!result.ok) {
      setErrorMessage(authTexts[result.messageKey]);
      return;
    }

    setErrorMessage("");
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p className="login-box-msg fw-semibold">{authTexts.loginTitle}</p>

      <Input
        id="otp"
        label={authTexts.otpInstruction}
        className="text-center fs-5 letter-spacing-wide mb-3"
        inputMode="numeric"
        maxLength={6}
        name="otp"
        pattern="[0-9]{6}"
        placeholder={authTexts.otpPlaceholder}
        type="text"
        value={otpCode}
        disabled={isSubmitting}
        onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ""))}
      />

      <div className="d-flex justify-content-between align-items-center mb-3 text-muted small">
        <span>{authTexts.remainingTimeLabel}</span>
        <strong>{remainingTime}</strong>
      </div>

      {errorMessage ? (
        <div className="alert alert-danger py-2" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <div className="row g-2">
        <div className="col-6">
          <Button
            className="w-100"
            theme="secondary"
            type="button"
            disabled={isSubmitting}
            onClick={onBack}
          >
            {authTexts.backLabel}
          </Button>
        </div>
        <div className="col-6">
          <Button className="w-100" theme="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? authTexts.otpVerifyingLabel : authTexts.verifyLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
