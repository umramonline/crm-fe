import { useState } from 'react';

import { otpSchema, phoneSchema } from '@/features/auth/schemas/authSchemas';
import { requestOtp, verifyOtp } from '@/features/auth/services/authApi';

type LoginStep = 'phone' | 'otp' | 'password';

type PhoneSubmitResult =
  | { ok: true }
  | { ok: false; messageKey: 'phoneInvalidMessage' | 'otpRequestFailedMessage' };

type OtpSubmitResult =
  | { ok: true }
  | { ok: false; messageKey: 'otpInvalidMessage' | 'otpVerifyFailedMessage' };

type UseLoginFlowReturn = {
  currentStep: LoginStep;
  isPhoneSubmitting: boolean;
  isOtpSubmitting: boolean;
  phone: string;
  submitPhone: (nextPhone: string) => Promise<PhoneSubmitResult>;
  submitOtp: (otpCode: string) => Promise<OtpSubmitResult>;
  goBackToPhone: () => void;
};

export function useLoginFlow(): UseLoginFlowReturn {
  const [currentStep, setCurrentStep] = useState<LoginStep>('phone');
  const [isPhoneSubmitting, setIsPhoneSubmitting] = useState(false);
  const [isOtpSubmitting, setIsOtpSubmitting] = useState(false);
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

  async function submitOtp(otpCode: string): Promise<OtpSubmitResult> {
    const normalizedOtpCode = otpCode.trim();
    const result = otpSchema.safeParse(normalizedOtpCode);

    if (!result.success) {
      return { ok: false, messageKey: 'otpInvalidMessage' };
    }

    setIsOtpSubmitting(true);

    try {
      await verifyOtp({ phone, otp_code: normalizedOtpCode });
      setCurrentStep('password');
    } catch {
      return { ok: false, messageKey: 'otpVerifyFailedMessage' };
    } finally {
      setIsOtpSubmitting(false);
    }

    return { ok: true };
  }

  function goBackToPhone(): void {
    setCurrentStep('phone');
  }

  return {
    currentStep,
    isPhoneSubmitting,
    isOtpSubmitting,
    phone,
    submitPhone,
    submitOtp,
    goBackToPhone,
  };
}
