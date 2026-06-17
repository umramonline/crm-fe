import { useState } from 'react';
import type { FormEvent } from 'react';

import { authTexts } from '@/features/auth/constants/authTexts';

type PhoneLoginFormProps = {
  isSubmitting: boolean;
  onSubmit: (phone: string) => Promise<
    { ok: true } | { ok: false; messageKey: 'phoneInvalidMessage' | 'otpRequestFailedMessage' }
  >;
};

export function PhoneLoginForm({ isSubmitting, onSubmit }: PhoneLoginFormProps) {
  const [phone, setPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const result = await onSubmit(phone);

    if (!result.ok) {
      setErrorMessage(authTexts[result.messageKey]);
      return;
    }

    setErrorMessage('');
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <h1 className="auth-title">{authTexts.loginTitle}</h1>

      <label className="visually-hidden" htmlFor="phone">
        {authTexts.phonePlaceholder}
      </label>
      <div className="auth-input-wrapper">
        <input
          id="phone"
          className="auth-input"
          inputMode="tel"
          maxLength={11}
          name="phone"
          pattern="05[0-9]{9}"
          placeholder={authTexts.phonePlaceholder}
          type="tel"
          value={phone}
          disabled={isSubmitting}
          onChange={(event) => setPhone(event.target.value)}
        />
        <span className="auth-input-icon" aria-hidden="true">
          &#128222;
        </span>
      </div>

      {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

      <button className="auth-primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? authTexts.phoneSubmittingLabel : authTexts.phoneSubmitLabel}
      </button>

      <button className="auth-link-button" type="button">
        {authTexts.forgotPasswordLabel}
      </button>
    </form>
  );
}
