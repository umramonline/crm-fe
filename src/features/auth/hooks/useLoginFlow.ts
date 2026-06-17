import { useState } from 'react';

import { otpSchema, phoneSchema } from '@/features/auth/schemas/authSchemas';

type LoginStep = 'phone' | 'otp';

type PhoneSubmitResult =
  | { ok: true }
  | { ok: false; messageKey: 'phoneInvalidMessage' };

type OtpSubmitResult =
  | { ok: true }
  | { ok: false; messageKey: 'otpInvalidMessage' };

type UseLoginFlowReturn = {
  currentStep: LoginStep;
  phone: string;
  submitPhone: (nextPhone: string) => PhoneSubmitResult;
  submitOtp: (otpCode: string) => OtpSubmitResult;
  goBackToPhone: () => void;
};

export function useLoginFlow(): UseLoginFlowReturn {
  const [currentStep, setCurrentStep] = useState<LoginStep>('phone');
  const [phone, setPhone] = useState('');

  function submitPhone(nextPhone: string): PhoneSubmitResult {
    const normalizedPhone = nextPhone.trim();
    const result = phoneSchema.safeParse(normalizedPhone);

    if (!result.success) {
      return { ok: false, messageKey: 'phoneInvalidMessage' };
    }

    setPhone(normalizedPhone);
    setCurrentStep('otp');

    return { ok: true };
  }

  function submitOtp(otpCode: string): OtpSubmitResult {
    const result = otpSchema.safeParse(otpCode.trim());

    if (!result.success) {
      return { ok: false, messageKey: 'otpInvalidMessage' };
    }

    return { ok: true };
  }

  function goBackToPhone(): void {
    setCurrentStep('phone');
  }

  return {
    currentStep,
    phone,
    submitPhone,
    submitOtp,
    goBackToPhone,
  };
}
