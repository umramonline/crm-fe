import { apiClient } from "@/services/apiClient";

export type IettsRecord = {
  uuid: string;
  documentNumber: string;
  companyName: string;
  businessName: string;
  businessAddress: string;
  documentIssueDate: string;
  documentStatus: string;
  city: string;
  district: string;
  createdAt: string;
};

export type IettsPagination = {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  from: number | null;
  to: number | null;
};

export type IettsListResult = {
  items: IettsRecord[];
  pagination: IettsPagination;
};

export type IettsListQuery = {
  page?: number;
  perPage?: number;
  documentNumber?: string;
  companyName?: string;
  businessName?: string;
  businessAddress?: string;
  documentIssueDate?: string;
  documentStatus?: string;
  city?: string;
  district?: string;
  createdAt?: string;
  sortBy?: "document_issue_date" | "created_at" | "";
  sortOrder?: "asc" | "desc";
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data?: T;
};

type RawRecord = Record<string, unknown>;

export async function listIettsRecords(
  query: IettsListQuery = {},
): Promise<IettsListResult> {
  const response = await apiClient.get<ApiEnvelope<RawRecord>>("/api/v1/ietts", {
    params: {
      page: query.page,
      per_page: query.perPage,
      document_number: query.documentNumber || undefined,
      company_name: query.companyName || undefined,
      business_name: query.businessName || undefined,
      business_address: query.businessAddress || undefined,
      document_issue_date: query.documentIssueDate || undefined,
      document_status: query.documentStatus || undefined,
      city: query.city || undefined,
      district: query.district || undefined,
      created_at: query.createdAt || undefined,
      sort_by: query.sortBy || undefined,
      sort_order: query.sortOrder || undefined,
    },
  });

  return normalizeIettsListResult(response.data.data ?? {});
}

function normalizeIettsListResult(data: RawRecord): IettsListResult {
  const pagination = (data.pagination as RawRecord | undefined) ?? {};

  return {
    items: Array.isArray(data.items)
      ? data.items.map((item) => toIettsRecord(item as RawRecord))
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

function toIettsRecord(record: RawRecord): IettsRecord {
  return {
    uuid: stringValue(record.uuid),
    documentNumber: stringValue(record.document_number),
    companyName: stringValue(record.company_name),
    businessName: stringValue(record.business_name),
    businessAddress: stringValue(record.business_address),
    documentIssueDate: stringValue(record.document_issue_date),
    documentStatus: stringValue(record.document_status),
    city: stringValue(record.city),
    district: stringValue(record.district),
    createdAt: stringValue(record.created_at),
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
