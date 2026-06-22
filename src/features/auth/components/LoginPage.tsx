import { AuthShell } from "@/features/auth/components/AuthShell";
import { OtpVerificationForm } from "@/features/auth/components/OtpVerificationForm";
import { PasswordLoginForm } from "@/features/auth/components/PasswordLoginForm";
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
    goBackToPhone,
    isOtpSubmitting,
    isPasswordSubmitting,
    isPhoneSubmitting,
    submitOtp,
    submitPassword,
    submitPhone,
  } = useLoginFlow({ onAuthenticated });

  return (
    <AuthShell>
      {currentStep === "phone" ? (
        <PhoneLoginForm
          isSubmitting={isPhoneSubmitting}
          onSubmit={submitPhone}
        />
      ) : null}

      {currentStep === "otp" ? (
        <OtpVerificationForm
          isSubmitting={isOtpSubmitting}
          remainingTime={initialRemainingTime}
          onBack={goBackToPhone}
          onSubmit={submitOtp}
        />
      ) : null}

      {currentStep === "password" ? (
        <PasswordLoginForm
          isSubmitting={isPasswordSubmitting}
          onSubmit={submitPassword}
        />
      ) : null}
    </AuthShell>
  );
}
