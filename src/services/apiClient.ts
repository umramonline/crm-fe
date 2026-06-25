import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const defaultApiBaseUrl = "http://localhost:8321";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshRequest: Promise<void> | null = null;

function isAuthEndpoint(url?: string): boolean {
  return Boolean(url?.includes("/api/v1/auth/"));
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const response = error.response;
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (
      response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthEndpoint(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    refreshRequest ??= refreshClient
      .post("/api/v1/auth/refresh")
      .then(() => undefined)
      .finally(() => {
        refreshRequest = null;
      });

    await refreshRequest;

    return apiClient(originalRequest);
  },
);