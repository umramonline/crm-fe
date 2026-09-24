import { apiClient } from "@/services/apiClient";

export type Permission = {
  moduleId: number;
  moduleName: string;
  moduleMethodId: number;
  name: string;
  description: string;
  method: string;
  path: string;
};

export type SessionUser = {
  id: number;
  full_name: string;
  phone: string;
  roleId: number;
  roleName: string;
};

export type SessionData = {
  userId: number;
  user: SessionUser;
  permissions: Permission[];
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data?: T;
};

export type RequestOtpPayload = {
  phone: string;
  password: string;
};

export type RequestOtpResult = {
  mfaRequired: boolean;
  mfaToken?: string;
  mfaChannel?: string;
  session?: SessionData;
};

export type VerifyOtpPayload = {
  mfa_token: string;
  otp_code: string;
};

type RawRequestOtpData = Partial<{
  mfa_token: string;
  mfa_channel: string;
  user_id: number;
  user: Partial<{
    id: number;
    full_name: string;
    phone: string;
    role_id: number;
    role_name: string;
  }>;
  permissions: RawPermission[];
}>;

export async function requestOtp(
  payload: RequestOtpPayload,
): Promise<RequestOtpResult> {
  const response = await apiClient.post<ApiEnvelope<RawRequestOtpData>>(
    "/api/v1/auth/otp/request",
    payload,
  );

  const data = response.data.data;

  if (data?.user_id !== undefined || data?.user) {
    return {
      mfaRequired: false,
      session: normalizeSessionData(data),
    };
  }

  return {
    mfaRequired: true,
    mfaToken: data?.mfa_token,
    mfaChannel: data?.mfa_channel,
  };
}

export async function verifyOtp(payload: VerifyOtpPayload): Promise<SessionData> {
  const response = await apiClient.post<ApiEnvelope<RawSessionData>>(
    "/api/v1/auth/otp/verify",
    payload,
  );

  return normalizeSessionData(response.data.data);
}

export async function refreshSession(): Promise<SessionData> {
  const response =
    await apiClient.post<ApiEnvelope<RawSessionData>>("/api/v1/auth/refresh");

  return normalizeSessionData(response.data.data);
}

export async function logout(): Promise<void> {
  await apiClient.post("/api/v1/auth/logout");
}

export async function getSession(): Promise<SessionData> {
  const response =
    await apiClient.get<ApiEnvelope<RawSessionData>>("/api/v1/auth/session");

  return normalizeSessionData(response.data.data);
}

type RawPermission = Partial<{
  module_id: number;
  module_name: string;
  module_method_id: number;
  name: string;
  description: string;
  method: string;
  path: string;
}>;

type RawSessionData = Partial<{
  user_id: number;
  user: Partial<{
    id: number;
    full_name: string;
    phone: string;
    role_id: number;
    role_name: string;
  }>;
  permissions: RawPermission[];
}>;

function normalizeSessionData(data: RawSessionData | undefined): SessionData {
  const user = data?.user ?? {};

  return {
    userId: data?.user_id ?? 0,
    user: {
      id: user.id ?? 0,
      full_name: user.full_name ?? "",
      phone: user.phone ?? "",
      roleId: user.role_id ?? 0,
      roleName: user.role_name ?? "",
    },
    permissions: (data?.permissions ?? []).map((permission) => ({
      moduleId: permission.module_id ?? 0,
      moduleName: permission.module_name ?? "",
      moduleMethodId: permission.module_method_id ?? 0,
      name: permission.name ?? "",
      description: permission.description ?? "",
      method: permission.method ?? "",
      path: permission.path ?? "",
    })),
  };
}
