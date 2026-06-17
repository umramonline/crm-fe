import { apiClient } from '@/services/apiClient';

type RequestOtpPayload = {
  phone: string;
};

type VerifyOtpPayload = {
  phone: string;
  otp_code: string;
};

export async function requestOtp(payload: RequestOtpPayload): Promise<void> {
  await apiClient.post('/api/v1/auth/otp/request', payload);
}

export async function verifyOtp(payload: VerifyOtpPayload): Promise<void> {
  await apiClient.post('/api/v1/auth/otp/verify', payload);
}
