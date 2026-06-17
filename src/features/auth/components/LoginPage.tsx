import { AuthShell } from '@/features/auth/components/AuthShell';
import { OtpVerificationForm } from '@/features/auth/components/OtpVerificationForm';
import { PasswordLoginForm } from '@/features/auth/components/PasswordLoginForm';
import { PhoneLoginForm } from '@/features/auth/components/PhoneLoginForm';
import { useLoginFlow } from '@/features/auth/hooks/useLoginFlow';

const initialRemainingTime = '04:55';

export function LoginPage() {
  const { currentStep, goBackToPhone, isOtpSubmitting, isPhoneSubmitting, submitOtp, submitPhone } =
    useLoginFlow();

  return (
    <AuthShell>
      {currentStep === 'phone' ? (
        <PhoneLoginForm isSubmitting={isPhoneSubmitting} onSubmit={submitPhone} />
      ) : null}

      {currentStep === 'otp' ? (
        <OtpVerificationForm
          isSubmitting={isOtpSubmitting}
          remainingTime={initialRemainingTime}
          onBack={goBackToPhone}
          onSubmit={submitOtp}
        />
      ) : null}

      {currentStep === 'password' ? <PasswordLoginForm /> : null}
    </AuthShell>
  );
}
