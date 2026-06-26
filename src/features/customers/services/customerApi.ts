import { apiClient } from "@/services/apiClient";

export type Customer = {
  situation: string;
  unvan: string;
  cep: string;
  ad: string;
  soyad: string;
  branchName: string;
  zoneName: string;
  plusCardNo: string;
  credit: number;
  source: string;
  city: string;
  town: string;
  createdAt: string;
  type: string;
};

export type CustomerPagination = {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  from: number | null;
  to: number | null;
};

export type CustomerListResult = {
  items: Customer[];
  pagination: CustomerPagination;
};

export type CustomerListQuery = {
  page?: number;
  perPage?: number;
  situation?: string;
  unvan?: string;
  cep?: string;
  ad?: string;
  soyad?: string;
  branchName?: string;
  zoneName?: string;
  plusCardNo?: string;
  source?: string;
  city?: string;
  town?: string;
  createdAt?: string;
  type?: string;
  sortBy?: "credit" | "created_at" | "";
  sortOrder?: "asc" | "desc";
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data?: T;
};

type RawRecord = Record<string, unknown>;

export async function listCustomers(
  query: CustomerListQuery = {},
): Promise<CustomerListResult> {
  const response = await apiClient.get<ApiEnvelope<RawRecord>>("/api/v1/customers", {
    params: {
      page: query.page,
      per_page: query.perPage,
      situation: query.situation || undefined,
      unvan: query.unvan || undefined,
      cep: query.cep || undefined,
      ad: query.ad || undefined,
      soyad: query.soyad || undefined,
      branch_name: query.branchName || undefined,
      zone_name: query.zoneName || undefined,
      plus_card_no: query.plusCardNo || undefined,
      source: query.source || undefined,
      city: query.city || undefined,
      town: query.town || undefined,
      created_at: query.createdAt || undefined,
      type: query.type || undefined,
      sort_by: query.sortBy || undefined,
      sort_order: query.sortOrder || undefined,
    },
  });

  return normalizeCustomerListResult(response.data.data ?? {});
}

function normalizeCustomerListResult(data: RawRecord): CustomerListResult {
  const pagination = (data.pagination as RawRecord | undefined) ?? {};

  return {
    items: Array.isArray(data.items)
      ? data.items.map((item) => toCustomer(item as RawRecord))
      : [],
    pagination: {
      currentPage: numberValue(pagination.current_page),
      lastPage: numberValue(pagination.last_page),
      perPage: numberValue(pagination.per_page),
      total: numberValue(pagination.total),
      from: nullableNumberValue(pagination.from),
      to: nullableNumberValue(pagination.to),
    },
  };
}

function toCustomer(record: RawRecord): Customer {
  return {
    situation: stringValue(record.situation),
    unvan: stringValue(record.unvan),
    cep: stringValue(record.cep),
    ad: stringValue(record.ad),
    soyad: stringValue(record.soyad),
    branchName: stringValue(record.branch_name),
    zoneName: stringValue(record.zone_name),
    plusCardNo: stringValue(record.plus_card_no),
    credit: numberValue(record.credit),
    source: stringValue(record.source),
    city: stringValue(record.city),
    town: stringValue(record.town),
    createdAt: stringValue(record.created_at),
    type: stringValue(record.type),
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

function nullableNumberValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return numberValue(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}
