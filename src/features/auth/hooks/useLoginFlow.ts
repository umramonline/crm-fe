import { useState } from 'react';

import { otpSchema, phoneSchema } from '@/features/auth/schemas/authSchemas';
import { requestOtp } from '@/features/auth/services/authApi';

type LoginStep = 'phone' | 'otp';

type PhoneSubmitResult =
  | { ok: true }
  | { ok: false; messageKey: 'phoneInvalidMessage' | 'otpRequestFailedMessage' };

type OtpSubmitResult =
  | { ok: true }
  | { ok: false; messageKey: 'otpInvalidMessage' };

type UseLoginFlowReturn = {
  currentStep: LoginStep;
  isPhoneSubmitting: boolean;
  phone: string;
  submitPhone: (nextPhone: string) => Promise<PhoneSubmitResult>;
  submitOtp: (otpCode: string) => OtpSubmitResult;
  goBackToPhone: () => void;
};

export function useLoginFlow(): UseLoginFlowReturn {
  const [currentStep, setCurrentStep] = useState<LoginStep>('phone');
  const [isPhoneSubmitting, setIsPhoneSubmitting] = useState(false);
  const [phone, setPhone] = useState('');

  async function submitPhone(nextPhone: string): Promise<PhoneSubmitResult> {
    const normalizedPhone = nextPhone.trim();
    const result = phoneSchema.safeParse(normalizedPhone);

    if (!result.success) {
      return { ok: false, messageKey: 'phoneInvalidMessage' };
    }

    setIsPhoneSubmitting(true);

    try {
      await requestOtp({ phone: normalizedPhone });
      setPhone(normalizedPhone);
      setCurrentStep('otp');
    } catch {
      return { ok: false, messageKey: 'otpRequestFailedMessage' };
    } finally {
      setIsPhoneSubmitting(false);
    }

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
    isPhoneSubmitting,
    phone,
    submitPhone,
    submitOtp,
    goBackToPhone,
  };
}
