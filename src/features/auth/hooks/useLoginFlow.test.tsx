import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useLoginFlow } from '@/features/auth/hooks/useLoginFlow';

describe('useLoginFlow', () => {
  it('keeps the phone step when the phone format is invalid', () => {
    const { result } = renderHook(() => useLoginFlow());

    act(() => {
      const submitResult = result.current.submitPhone('5551234567');

      expect(submitResult.ok).toBe(false);
    });

    expect(result.current.currentStep).toBe('phone');
  });

  it('moves to the otp step when the phone format is valid', () => {
    const { result } = renderHook(() => useLoginFlow());

    act(() => {
      const submitResult = result.current.submitPhone('05551234567');

      expect(submitResult.ok).toBe(true);
    });

    expect(result.current.currentStep).toBe('otp');
    expect(result.current.phone).toBe('05551234567');
  });

  it('returns from the otp step to the phone step', () => {
    const { result } = renderHook(() => useLoginFlow());

    act(() => {
      result.current.submitPhone('05551234567');
      result.current.goBackToPhone();
    });

    expect(result.current.currentStep).toBe('phone');
  });
});
