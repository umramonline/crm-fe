import type { ReactNode } from 'react';

import { authTexts } from '@/features/auth/constants/authTexts';

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="auth-page">
      <section className="auth-content" aria-label={authTexts.loginTitle}>
        <img className="auth-logo" src="/logo.png" alt={authTexts.logoAlt} />
        <div className="auth-card">{children}</div>
      </section>
    </main>
  );
}
