import { apiClient } from '@/services/apiClient';

type RequestOtpPayload = {
  phone: string;
};

export async function requestOtp(payload: RequestOtpPayload): Promise<void> {
  await apiClient.post('/api/v1/auth/otp/request', payload);
}
