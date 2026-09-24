import { isAxiosError } from "axios";

type ApiErrorBody = {
  message?: string;
};

export function readApiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) {
    return fallback;
  }

  const data = error.response?.data as ApiErrorBody | undefined;
  const message = typeof data?.message === "string" ? data.message.trim() : "";

  return message || fallback;
}
