import { AuthLayout } from "@adminlte/react";
import type { ReactNode } from "react";

import { authTexts } from "@/features/auth/constants/authTexts";

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <AuthLayout
      authType="login"
      logo={
        <img
          src="/logo.png"
          alt={authTexts.logoAlt}
          style={{ maxWidth: "220px", width: "100%" }}
        />
      }
    >
      {children}
    </AuthLayout>
  );
}
