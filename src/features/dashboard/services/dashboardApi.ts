import { apiClient } from "@/services/apiClient";

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data?: T;
};

type RawRecord = Record<string, unknown>;

export type DashboardStats = {
  potentialCustomerCount: number;
  totalCustomerCount: number;
  customerVisitCount: number;
  newCustomerCount: number;
  vehicleEntryCount: number;
  totalAmount: number;
  loadedCreditAmount: number;
  vehicleStockCount: number;
  pendingTaskCount: number;
  inProgressTaskCount: number;
  completedTaskCount: number;
  overdueTaskCount: number;
};

export async function getDashboard(params: {
  startDate: string;
  endDate: string;
}): Promise<DashboardStats> {
  const response = await apiClient.get<ApiEnvelope<RawRecord>>("/api/v1/dashboard", {
    params: {
      start_date: params.startDate,
      end_date: params.endDate,
    },
  });

  return toDashboardStats(response.data.data ?? {});
}

function toDashboardStats(record: RawRecord): DashboardStats {
  return {
    potentialCustomerCount: numberValue(record.potential_customer_count),
    totalCustomerCount: numberValue(record.total_customer_count),
    customerVisitCount: numberValue(record.customer_visit_count),
    newCustomerCount: numberValue(record.new_customer_count),
    vehicleEntryCount: numberValue(record.vehicle_entry_count),
    totalAmount: numberValue(record.total_amount),
    loadedCreditAmount: numberValue(record.loaded_credit_amount),
    vehicleStockCount: numberValue(record.vehicle_stock_count),
    pendingTaskCount: numberValue(record.pending_task_count),
    inProgressTaskCount: numberValue(record.in_progress_task_count),
    completedTaskCount: numberValue(record.completed_task_count),
    overdueTaskCount: numberValue(record.overdue_task_count),
  };
}

function numberValue(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    return Number(value);
  }

  return 0;
}
