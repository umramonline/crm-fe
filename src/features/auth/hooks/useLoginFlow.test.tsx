import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useLoginFlow } from "@/features/auth/hooks/useLoginFlow";
import { requestOtp, verifyOtp } from "@/features/auth/services/authApi";

vi.mock("@/features/auth/services/authApi", () => ({
  requestOtp: vi.fn(),
  verifyOtp: vi.fn(),
}));

const requestOtpMock = vi.mocked(requestOtp);
const verifyOtpMock = vi.mocked(verifyOtp);
const sessionFixture = {
  userId: 1,
  user: {
    id: 1,
    full_name: "Kemal Karaduman",
    phone: "05551234567",
    roleId: 30,
    roleName: "ADMIN",
  },
  permissions: [],
};

describe("useLoginFlow", () => {
  beforeEach(() => {
    requestOtpMock.mockReset();
    verifyOtpMock.mockReset();
  });

  it("keeps the credentials step when the phone format is invalid", async () => {
    const { result } = renderHook(() => useLoginFlow());

    await act(async () => {
      const submitResult = await result.current.submitCredentials(
        "5551234567",
        "secret",
      );

      expect(submitResult.ok).toBe(false);
    });

    expect(result.current.currentStep).toBe("credentials");
    expect(requestOtpMock).not.toHaveBeenCalled();
  });

  it("keeps the credentials step when the password is empty", async () => {
    const { result } = renderHook(() => useLoginFlow());

    await act(async () => {
      const submitResult = await result.current.submitCredentials(
        "05551234567",
        " ",
      );

      expect(submitResult.ok).toBe(false);
    });

    expect(result.current.currentStep).toBe("credentials");
    expect(requestOtpMock).not.toHaveBeenCalled();
  });

  it("moves to the otp step when credentials are valid and mfa is required", async () => {
    requestOtpMock.mockResolvedValue({
      mfaRequired: true,
      mfaToken: "mfa-token",
      mfaChannel: "sms",
    });
    const { result } = renderHook(() => useLoginFlow());

    await act(async () => {
      const submitResult = await result.current.submitCredentials(
        "05551234567",
        "secret",
      );

      expect(submitResult.ok).toBe(true);
    });

    expect(requestOtpMock).toHaveBeenCalledWith({
      phone: "05551234567",
      password: "secret",
    });
    expect(result.current.currentStep).toBe("otp");
  });

  it("authenticates immediately when mfa is disabled", async () => {
    const onAuthenticated = vi.fn();
    requestOtpMock.mockResolvedValue({
      mfaRequired: false,
      session: sessionFixture,
    });
    const { result } = renderHook(() => useLoginFlow({ onAuthenticated }));

    await act(async () => {
      const submitResult = await result.current.submitCredentials(
        "05551234567",
        "secret",
      );

      expect(submitResult.ok).toBe(true);
    });

    expect(onAuthenticated).toHaveBeenCalledWith(sessionFixture);
    expect(result.current.currentStep).toBe("credentials");
  });

  it("keeps the credentials step when the otp request fails", async () => {
    requestOtpMock.mockRejectedValue(new Error("request failed"));
    const { result } = renderHook(() => useLoginFlow());

    await act(async () => {
      const submitResult = await result.current.submitCredentials(
        "05551234567",
        "secret",
      );

      expect(submitResult.ok).toBe(false);
    });

    expect(result.current.currentStep).toBe("credentials");
  });

  it("returns from the otp step to the credentials step", async () => {
    requestOtpMock.mockResolvedValue({
      mfaRequired: true,
      mfaToken: "mfa-token",
    });
    const { result } = renderHook(() => useLoginFlow());

    await act(async () => {
      await result.current.submitCredentials("05551234567", "secret");
      result.current.goBackToCredentials();
    });

    expect(result.current.currentStep).toBe("credentials");
  });

  it("keeps the otp step when the otp format is invalid", async () => {
    requestOtpMock.mockResolvedValue({
      mfaRequired: true,
      mfaToken: "mfa-token",
    });
    const { result } = renderHook(() => useLoginFlow());

    await act(async () => {
      await result.current.submitCredentials("05551234567", "secret");
    });

    await act(async () => {
      const submitResult = await result.current.submitOtp("12345");

      expect(submitResult.ok).toBe(false);
    });

    expect(result.current.currentStep).toBe("otp");
    expect(verifyOtpMock).not.toHaveBeenCalled();
  });

  it("authenticates when otp verification succeeds", async () => {
    const onAuthenticated = vi.fn();
    requestOtpMock.mockResolvedValue({
      mfaRequired: true,
      mfaToken: "mfa-token",
    });
    verifyOtpMock.mockResolvedValue(sessionFixture);
    const { result } = renderHook(() => useLoginFlow({ onAuthenticated }));

    await act(async () => {
      await result.current.submitCredentials("05551234567", "secret");
    });

    await act(async () => {
      const submitResult = await result.current.submitOtp("123456");

      expect(submitResult.ok).toBe(true);
    });

    expect(verifyOtpMock).toHaveBeenCalledWith({
      mfa_token: "mfa-token",
      otp_code: "123456",
    });
    expect(onAuthenticated).toHaveBeenCalledWith(sessionFixture);
  });

  it("keeps the otp step when otp verification fails", async () => {
    requestOtpMock.mockResolvedValue({
      mfaRequired: true,
      mfaToken: "mfa-token",
    });
    verifyOtpMock.mockRejectedValue(new Error("verify failed"));
    const { result } = renderHook(() => useLoginFlow());

    await act(async () => {
      await result.current.submitCredentials("05551234567", "secret");
    });

    await act(async () => {
      const submitResult = await result.current.submitOtp("123456");

      expect(submitResult.ok).toBe(false);
    });

    expect(result.current.currentStep).toBe("otp");
  });
});
