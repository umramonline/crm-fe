import { z } from "zod";

export const phoneSchema = z
  .string()
  .regex(/^05\d{9}$/, "PHONE_FORMAT_INVALID");

export const otpSchema = z.string().regex(/^\d{6}$/, "OTP_FORMAT_INVALID");

export const passwordSchema = z.string().trim().min(1, "PASSWORD_REQUIRED");
