import { useState } from 'react';
import type { FormEvent } from 'react';

import { authTexts } from '@/features/auth/constants/authTexts';

type OtpVerificationFormProps = {
  isSubmitting: boolean;
  remainingTime: string;
  onBack: () => void;
  onSubmit: (
    otpCode: string,
  ) => Promise<{ ok: true } | { ok: false; messageKey: 'otpInvalidMessage' | 'otpVerifyFailedMessage' }>;
};

export function OtpVerificationForm({
  isSubmitting,
  remainingTime,
  onBack,
  onSubmit,
}: OtpVerificationFormProps) {
  const [otpCode, setOtpCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const result = await onSubmit(otpCode);

    if (!result.ok) {
      setErrorMessage(authTexts[result.messageKey]);
      return;
    }

    setErrorMessage('');
  }

  return (
    <form className="auth-form auth-form-wide" onSubmit={handleSubmit} noValidate>
      <h1 className="auth-title">{authTexts.loginTitle}</h1>

      <label className="auth-label" htmlFor="otp">
        {authTexts.otpInstruction}
      </label>
      <div className="auth-input-wrapper">
        <input
          id="otp"
          className="auth-input auth-otp-input"
          inputMode="numeric"
          maxLength={6}
          name="otp"
          pattern="[0-9]{6}"
          placeholder={authTexts.otpPlaceholder}
          type="text"
          value={otpCode}
          disabled={isSubmitting}
          onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ''))}
        />
        <span className="auth-input-icon" aria-hidden="true">
          &#128273;
        </span>
      </div>

      <div className="auth-meta">
        <span>{authTexts.remainingTimeLabel}</span>
        <strong>{remainingTime}</strong>
      </div>

      {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

      <div className="auth-actions">
        <button className="auth-secondary-button" type="button" disabled={isSubmitting} onClick={onBack}>
          {authTexts.backLabel}
        </button>
        <button className="auth-primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? authTexts.otpVerifyingLabel : authTexts.verifyLabel}
        </button>
      </div>
    </form>
  );
}
