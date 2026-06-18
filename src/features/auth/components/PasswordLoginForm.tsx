import { useState } from "react";
import type { FormEvent } from "react";

import { authTexts } from "@/features/auth/constants/authTexts";

type PasswordLoginFormProps = {
  isSubmitting: boolean;
  onSubmit: (
    password: string,
    rememberMe: boolean,
  ) => Promise<
    | { ok: true }
    | {
        ok: false;
        messageKey: "passwordInvalidMessage" | "passwordLoginFailedMessage";
      }
  >;
};

export function PasswordLoginForm({
  isSubmitting,
  onSubmit,
}: PasswordLoginFormProps) {
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const result = await onSubmit(password, rememberMe);

    if (!result.ok) {
      setErrorMessage(authTexts[result.messageKey]);
      return;
    }

    setErrorMessage("");
  }

  return (
    <form
      className="auth-form auth-password-form"
      onSubmit={handleSubmit}
      noValidate
    >
      <h1 className="auth-title">{authTexts.loginTitle}</h1>

      <label className="visually-hidden" htmlFor="password">
        {authTexts.passwordPlaceholder}
      </label>
      <div className="auth-input-wrapper">
        <input
          id="password"
          className="auth-input"
          name="password"
          placeholder={authTexts.passwordPlaceholder}
          type="password"
          value={password}
          disabled={isSubmitting}
          onChange={(event) => setPassword(event.target.value)}
        />
        <span className="auth-input-icon" aria-hidden="true">
          &#128274;
        </span>
      </div>

      {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

      <div className="auth-password-row">
        <label className="auth-checkbox-label">
          <input
            checked={rememberMe}
            className="auth-checkbox"
            name="rememberMe"
            type="checkbox"
            disabled={isSubmitting}
            onChange={(event) => setRememberMe(event.target.checked)}
          />
          <span>{authTexts.rememberMeLabel}</span>
        </label>

        <button
          className="auth-primary-button auth-password-submit"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? authTexts.passwordSubmittingLabel
            : authTexts.passwordSubmitLabel}
        </button>
      </div>
    </form>
  );
}
