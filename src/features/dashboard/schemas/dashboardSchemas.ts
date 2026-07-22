import { z } from "zod";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const dashboardFilterSchema = z
  .object({
    startDate: z
      .string()
      .trim()
      .regex(datePattern, "Tarih YYYY-AA-GG formatında olmalıdır."),
    endDate: z
      .string()
      .trim()
      .regex(datePattern, "Tarih YYYY-AA-GG formatında olmalıdır."),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: "Bitiş tarihi başlangıç tarihinden önce olamaz.",
    path: ["endDate"],
  });

export type DashboardFilterInput = z.infer<typeof dashboardFilterSchema>;

export function validateDashboardFilter(input: DashboardFilterInput):
  | { success: true; data: DashboardFilterInput }
  | { success: false; errors: Record<string, string> } {
  const result = dashboardFilterSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return { success: false, errors };
}
