import { useState } from 'react';
import type { FormEvent } from 'react';

import { authTexts } from '@/features/auth/constants/authTexts';

export function PasswordLoginForm() {
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
  }

  return (
    <form className="auth-form auth-password-form" onSubmit={handleSubmit} noValidate>
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
          onChange={(event) => setPassword(event.target.value)}
        />
        <span className="auth-input-icon" aria-hidden="true">
          &#128274;
        </span>
      </div>

      <div className="auth-password-row">
        <label className="auth-checkbox-label">
          <input
            checked={rememberMe}
            className="auth-checkbox"
            name="rememberMe"
            type="checkbox"
            onChange={(event) => setRememberMe(event.target.checked)}
          />
          <span>{authTexts.rememberMeLabel}</span>
        </label>

        <button className="auth-primary-button auth-password-submit" type="submit">
          {authTexts.passwordSubmitLabel}
        </button>
      </div>
    </form>
  );
}
