import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLoginFlow } from '@/features/auth/hooks/useLoginFlow';
import { requestOtp, verifyOtp } from '@/features/auth/services/authApi';

vi.mock('@/features/auth/services/authApi', () => ({
  requestOtp: vi.fn(),
  verifyOtp: vi.fn(),
}));

const requestOtpMock = vi.mocked(requestOtp);
const verifyOtpMock = vi.mocked(verifyOtp);

describe('useLoginFlow', () => {
  beforeEach(() => {
    requestOtpMock.mockReset();
    verifyOtpMock.mockReset();
  });

  it('keeps the phone step when the phone format is invalid', async () => {
    const { result } = renderHook(() => useLoginFlow());

    await act(async () => {
      const submitResult = await result.current.submitPhone('5551234567');

      expect(submitResult.ok).toBe(false);
    });

    expect(result.current.currentStep).toBe('phone');
    expect(requestOtpMock).not.toHaveBeenCalled();
  });

  it('moves to the otp step when the phone format is valid and otp request succeeds', async () => {
    requestOtpMock.mockResolvedValue();
    const { result } = renderHook(() => useLoginFlow());

    await act(async () => {
      const submitResult = await result.current.submitPhone('05551234567');

      expect(submitResult.ok).toBe(true);
    });

    expect(requestOtpMock).toHaveBeenCalledWith({ phone: '05551234567' });
    expect(result.current.currentStep).toBe('otp');
    expect(result.current.phone).toBe('05551234567');
  });

  it('keeps the phone step when the otp request fails', async () => {
    requestOtpMock.mockRejectedValue(new Error('request failed'));
    const { result } = renderHook(() => useLoginFlow());

    await act(async () => {
      const submitResult = await result.current.submitPhone('05551234567');

      expect(submitResult.ok).toBe(false);
    });

    expect(result.current.currentStep).toBe('phone');
  });

  it('returns from the otp step to the phone step', async () => {
    requestOtpMock.mockResolvedValue();
    const { result } = renderHook(() => useLoginFlow());

    await act(async () => {
      await result.current.submitPhone('05551234567');
      result.current.goBackToPhone();
    });

    expect(result.current.currentStep).toBe('phone');
  });

  it('keeps the otp step when the otp format is invalid', async () => {
    requestOtpMock.mockResolvedValue();
    const { result } = renderHook(() => useLoginFlow());

    await act(async () => {
      await result.current.submitPhone('05551234567');
    });

    await act(async () => {
      const submitResult = await result.current.submitOtp('12345');

      expect(submitResult.ok).toBe(false);
    });

    expect(result.current.currentStep).toBe('otp');
    expect(verifyOtpMock).not.toHaveBeenCalled();
  });

  it('moves to the password step when otp verification succeeds', async () => {
    requestOtpMock.mockResolvedValue();
    verifyOtpMock.mockResolvedValue();
    const { result } = renderHook(() => useLoginFlow());

    await act(async () => {
      await result.current.submitPhone('05551234567');
    });

    await act(async () => {
      const submitResult = await result.current.submitOtp('123456');

      expect(submitResult.ok).toBe(true);
    });

    expect(verifyOtpMock).toHaveBeenCalledWith({
      phone: '05551234567',
      otp_code: '123456',
    });
    expect(result.current.currentStep).toBe('password');
  });

  it('keeps the otp step when otp verification fails', async () => {
    requestOtpMock.mockResolvedValue();
    verifyOtpMock.mockRejectedValue(new Error('verify failed'));
    const { result } = renderHook(() => useLoginFlow());

    await act(async () => {
      await result.current.submitPhone('05551234567');
    });

    await act(async () => {
      const submitResult = await result.current.submitOtp('123456');

      expect(submitResult.ok).toBe(false);
    });

    expect(result.current.currentStep).toBe('otp');
  });
});
