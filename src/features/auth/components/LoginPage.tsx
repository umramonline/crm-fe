import { AuthShell } from '@/features/auth/components/AuthShell';
import { OtpVerificationForm } from '@/features/auth/components/OtpVerificationForm';
import { PhoneLoginForm } from '@/features/auth/components/PhoneLoginForm';
import { useLoginFlow } from '@/features/auth/hooks/useLoginFlow';

const initialRemainingTime = '04:55';

export function LoginPage() {
  const { currentStep, goBackToPhone, submitOtp, submitPhone } = useLoginFlow();

  return (
    <AuthShell>
      {currentStep === 'phone' ? (
        <PhoneLoginForm onSubmit={submitPhone} />
      ) : (
        <OtpVerificationForm
          remainingTime={initialRemainingTime}
          onBack={goBackToPhone}
          onSubmit={submitOtp}
        />
      )}
    </AuthShell>
  );
}
