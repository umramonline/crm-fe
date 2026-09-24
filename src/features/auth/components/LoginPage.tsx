import { AuthShell } from "@/features/auth/components/AuthShell";
import { OtpVerificationForm } from "@/features/auth/components/OtpVerificationForm";
import { PhoneLoginForm } from "@/features/auth/components/PhoneLoginForm";
import { useLoginFlow } from "@/features/auth/hooks/useLoginFlow";
import type { SessionData } from "@/features/auth/services/authApi";

const initialRemainingTime = "04:55";

type LoginPageProps = {
  onAuthenticated?: (session: SessionData) => void;
};

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const {
    currentStep,
    goBackToCredentials,
    isCredentialsSubmitting,
    isOtpSubmitting,
    submitCredentials,
    submitOtp,
  } = useLoginFlow({ onAuthenticated });

  return (
    <AuthShell>
      {currentStep === "credentials" ? (
        <PhoneLoginForm
          isSubmitting={isCredentialsSubmitting}
          onSubmit={submitCredentials}
        />
      ) : null}

      {currentStep === "otp" ? (
        <OtpVerificationForm
          isSubmitting={isOtpSubmitting}
          remainingTime={initialRemainingTime}
          onBack={goBackToCredentials}
          onSubmit={submitOtp}
        />
      ) : null}
    </AuthShell>
  );
}
