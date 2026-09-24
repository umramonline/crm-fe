import { Button, Input } from "@adminlte/react";
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
    <form onSubmit={handleSubmit} noValidate>
      <p className="login-box-msg fw-semibold">{authTexts.loginTitle}</p>

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

      <div className="row align-items-center">
        <div className="col-8">
          <div className="form-check">
            <input
              checked={rememberMe}
              className="form-check-input"
              id="rememberMe"
              name="rememberMe"
              type="checkbox"
              disabled={isSubmitting}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <label className="form-check-label" htmlFor="rememberMe">
              {authTexts.rememberMeLabel}
            </label>
          </div>
        </div>
        <div className="col-4">
          <Button className="w-100" theme="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? authTexts.passwordSubmittingLabel
              : authTexts.passwordSubmitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
