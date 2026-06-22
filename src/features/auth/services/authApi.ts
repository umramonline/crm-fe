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
  name: string;
  phone: string;
  roleId: number;
  roleName: string;
};

export type SessionData = {
  userId: string;
  user: SessionUser;
  permissions: Permission[];
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data?: T;
};

type RequestOtpPayload = {
  phone: string;
};

type VerifyOtpPayload = {
  phone: string;
  otp_code: string;
};

type PasswordLoginPayload = {
  phone: string;
  password: string;
};

export async function requestOtp(payload: RequestOtpPayload): Promise<void> {
  await apiClient.post("/api/v1/auth/otp/request", payload);
}

export async function verifyOtp(payload: VerifyOtpPayload): Promise<void> {
  await apiClient.post("/api/v1/auth/otp/verify", payload);
}

export async function loginWithPassword(
  payload: PasswordLoginPayload,
): Promise<SessionData> {
  const response = await apiClient.post<ApiEnvelope<RawSessionData>>(
    "/api/v1/auth/password/login",
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
  user_id: string;
  user: Partial<{
    id: number;
    name: string;
    phone: string;
    role_id: number;
    role_name: string;
  }>;
  permissions: RawPermission[];
}>;

function normalizeSessionData(data: RawSessionData | undefined): SessionData {
  const user = data?.user ?? {};

  return {
    userId: data?.user_id ?? "",
    user: {
      id: user.id ?? 0,
      name: user.name ?? "",
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
