import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLoginFlow } from '@/features/auth/hooks/useLoginFlow';
import { requestOtp } from '@/features/auth/services/authApi';

vi.mock('@/features/auth/services/authApi', () => ({
  requestOtp: vi.fn(),
}));

const requestOtpMock = vi.mocked(requestOtp);

describe('useLoginFlow', () => {
  beforeEach(() => {
    requestOtpMock.mockReset();
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
});
