import { useState } from "react";

import {
  otpSchema,
  passwordSchema,
  phoneSchema,
} from "@/features/auth/schemas/authSchemas";
import {
  requestOtp,
  type SessionData,
  verifyOtp,
} from "@/features/auth/services/authApi";

type LoginStep = "credentials" | "otp";

type CredentialsSubmitResult =
  | { ok: true; session?: SessionData }
  | {
      ok: false;
      messageKey:
        | "phoneInvalidMessage"
        | "passwordInvalidMessage"
        | "passwordLoginFailedMessage"
        | "otpRequestFailedMessage";
    };

type OtpSubmitResult =
  | { ok: true; session: SessionData }
  | { ok: false; messageKey: "otpInvalidMessage" | "otpVerifyFailedMessage" };

type UseLoginFlowOptions = {
  onAuthenticated?: (session: SessionData) => void;
};

type UseLoginFlowReturn = {
  currentStep: LoginStep;
  isCredentialsSubmitting: boolean;
  isOtpSubmitting: boolean;
  submitCredentials: (
    phone: string,
    password: string,
  ) => Promise<CredentialsSubmitResult>;
  submitOtp: (otpCode: string) => Promise<OtpSubmitResult>;
  goBackToCredentials: () => void;
};

export function useLoginFlow(
  options: UseLoginFlowOptions = {},
): UseLoginFlowReturn {
  const [currentStep, setCurrentStep] = useState<LoginStep>("credentials");
  const [isCredentialsSubmitting, setIsCredentialsSubmitting] = useState(false);
  const [isOtpSubmitting, setIsOtpSubmitting] = useState(false);
  const [mfaToken, setMfaToken] = useState("");

  async function submitCredentials(
    nextPhone: string,
    password: string,
  ): Promise<CredentialsSubmitResult> {
    const normalizedPhone = nextPhone.trim();
    const phoneResult = phoneSchema.safeParse(normalizedPhone);
    const passwordResult = passwordSchema.safeParse(password);

    if (!phoneResult.success) {
      return { ok: false, messageKey: "phoneInvalidMessage" };
    }

    if (!passwordResult.success) {
      return { ok: false, messageKey: "passwordInvalidMessage" };
    }

    setIsCredentialsSubmitting(true);

    try {
      const result = await requestOtp({
        phone: normalizedPhone,
        password: passwordResult.data,
      });

      if (!result.mfaRequired && result.session) {
        options.onAuthenticated?.(result.session);
        return { ok: true, session: result.session };
      }

      if (!result.mfaToken) {
        return { ok: false, messageKey: "otpRequestFailedMessage" };
      }

      setMfaToken(result.mfaToken);
      setCurrentStep("otp");
    } catch (error: unknown) {
      if (isAxiosUnauthorized(error)) {
        return { ok: false, messageKey: "passwordLoginFailedMessage" };
      }

      return { ok: false, messageKey: "otpRequestFailedMessage" };
    } finally {
      setIsCredentialsSubmitting(false);
    }

    return { ok: true };
  }

  async function submitOtp(otpCode: string): Promise<OtpSubmitResult> {
    const normalizedOtpCode = otpCode.trim();
    const result = otpSchema.safeParse(normalizedOtpCode);

    if (!result.success) {
      return { ok: false, messageKey: "otpInvalidMessage" };
    }

    setIsOtpSubmitting(true);

    try {
      const session = await verifyOtp({
        mfa_token: mfaToken,
        otp_code: normalizedOtpCode,
      });
      options.onAuthenticated?.(session);
      return { ok: true, session };
    } catch {
      return { ok: false, messageKey: "otpVerifyFailedMessage" };
    } finally {
      setIsOtpSubmitting(false);
    }
  }

  function goBackToCredentials(): void {
    setCurrentStep("credentials");
    setMfaToken("");
  }

  return {
    currentStep,
    isCredentialsSubmitting,
    isOtpSubmitting,
    submitCredentials,
    submitOtp,
    goBackToCredentials,
  };
}

function isAxiosUnauthorized(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "status" in error.response &&
    error.response.status === 422
  );
}
