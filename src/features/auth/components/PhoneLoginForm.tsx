import { Button, Input } from "@adminlte/react";
import { useState } from "react";
import type { FormEvent } from "react";

import { authTexts } from "@/features/auth/constants/authTexts";
import type { SessionData } from "@/features/auth/services/authApi";

type PhoneLoginFormProps = {
  isSubmitting: boolean;
  onSubmit: (
    phone: string,
    password: string,
  ) => Promise<
    | { ok: true; session?: SessionData }
    | {
        ok: false;
        messageKey:
          | "phoneInvalidMessage"
          | "passwordInvalidMessage"
          | "passwordLoginFailedMessage"
          | "otpRequestFailedMessage";
      }
  >;
};

export function PhoneLoginForm({ isSubmitting, onSubmit }: PhoneLoginFormProps) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const result = await onSubmit(phone, password);

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
        id="phone"
        className="mb-3"
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

      <Input
        id="password"
        className="mb-3"
        name="password"
        placeholder={authTexts.passwordPlaceholder}
        type="password"
        value={password}
        disabled={isSubmitting}
        onChange={(event) => setPassword(event.target.value)}
      />

      {errorMessage ? (
        <div className="alert alert-danger py-2" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <Button className="w-100" theme="primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? authTexts.phoneSubmittingLabel : authTexts.phoneSubmitLabel}
      </Button>

      <p className="mb-0 mt-3 text-center">
        <button className="btn btn-link px-0" type="button">
          {authTexts.forgotPasswordLabel}
        </button>
      </p>
    </form>
  );
}
