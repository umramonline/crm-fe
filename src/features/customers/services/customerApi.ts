import { apiClient } from "@/services/apiClient";

export type Customer = {
  id: number;
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

export type CustomerDetail = {
  id: number;
  uoId: number;
  branchId: number | null;
  unvan: string;
  ad: string;
  soyad: string;
  yetkiliAdi: string;
  cep: string;
  telefon: string;
  mahalle: string;
  ilKodu: string;
  ilceKodu: string;
  vergiNo: string;
  tcNo: string;
  type: string;
  createdAt: string;
};

export type CustomerSearchResult = {
  found: boolean;
  source: string;
  customer: CustomerDetail | null;
};

export type CustomerValidationErrors = Record<string, string>;

export type CreateCustomerPayload = {
  type: "bireysel" | "kurumsal";
  ad: string;
  soyad: string;
  cep: string;
  unvan: string;
  yetkiliAdi: string;
  telefon: string;
  ilKodu: string;
  ilceKodu: string;
  mahalle: string;
  branchId: number;
};

export class CustomerValidationError extends Error {
  errors: CustomerValidationErrors;

  constructor(errors: CustomerValidationErrors) {
    super("Müşteri bilgileri geçersiz.");
    this.errors = errors;
  }
}

export type City = {
  id: number;
  title: string;
};

export type Town = {
  id: number;
  title: string;
  cityId: number;
  cityTitle: string;
};

export type Branch = {
  id: number;
  name: string;
  title: string;
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
  zoneId?: number;
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
  errors?: CustomerValidationErrors;
};

type RawRecord = Record<string, unknown>;

export type Zone = {
  id: number;
  name: string;
};

export async function listZones(): Promise<Zone[]> {
  const response = await apiClient.get<ApiEnvelope<RawRecord>>("/api/v1/zones");
  const items = (response.data.data?.items as RawRecord[] | undefined) ?? [];

  return items.map((item) => ({
    id: numberValue(item.id),
    name: stringValue(item.name),
  }));
}

export async function searchCustomer(query: string): Promise<CustomerSearchResult> {
  const response = await apiClient.get<ApiEnvelope<RawRecord>>("/api/v1/customers/search", {
    params: {
      q: query,
    },
  });

  const data = response.data.data ?? {};
  const rawCustomer = data.customer as RawRecord | undefined;

  return {
    found: Boolean(data.found),
    source: stringValue(data.source),
    customer: rawCustomer ? toCustomerDetail(rawCustomer) : null,
  };
}

export async function listCities(): Promise<City[]> {
  const response = await apiClient.get<ApiEnvelope<RawRecord>>("/api/v1/cities");
  const items = (response.data.data?.items as RawRecord[] | undefined) ?? [];

  return items.map((item) => ({
    id: numberValue(item.id),
    title: stringValue(item.title),
  }));
}

export async function listTowns(cityId: number): Promise<Town[]> {
  const response = await apiClient.get<ApiEnvelope<RawRecord>>("/api/v1/towns", {
    params: {
      city_id: cityId,
    },
  });
  const items = (response.data.data?.items as RawRecord[] | undefined) ?? [];

  return items.map((item) => ({
    id: numberValue(item.id),
    title: stringValue(item.title),
    cityId: numberValue(item.city_id),
    cityTitle: stringValue(item.city_title),
  }));
}

export async function listBranches(): Promise<Branch[]> {
  const response = await apiClient.get<ApiEnvelope<RawRecord>>("/api/v1/branches");
  const items = (response.data.data?.items as RawRecord[] | undefined) ?? [];

  return items.map((item) => ({
    id: numberValue(item.id),
    name: stringValue(item.name),
    title: stringValue(item.title),
  }));
}

export async function createCustomer(payload: CreateCustomerPayload): Promise<CustomerDetail> {
  try {
    const response = await apiClient.post<ApiEnvelope<RawRecord>>("/api/v1/customers", {
      type: payload.type,
      ad: payload.ad,
      soyad: payload.soyad,
      cep: payload.cep,
      unvan: payload.unvan,
      yetkili_adi: payload.yetkiliAdi,
      telefon: payload.telefon,
      il_kodu: payload.ilKodu,
      ilce_kodu: payload.ilceKodu,
      mahalle: payload.mahalle,
      branch_id: payload.branchId,
    });

    return toCustomerDetail(response.data.data ?? {});
  } catch (error: unknown) {
    const apiError = error as {
      response?: {
        status?: number;
        data?: ApiEnvelope<RawRecord>;
      };
    };

    if (apiError.response?.status === 422) {
      throw new CustomerValidationError(apiError.response.data?.errors ?? {});
    }

    throw error;
  }
}

export async function getCustomer(id: number): Promise<CustomerDetail> {
  const response = await apiClient.get<ApiEnvelope<RawRecord>>(`/api/v1/customers/${id}`);

  return toCustomerDetail(response.data.data ?? {});
}

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
      zone_id: query.zoneId || undefined,
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

function toCustomerDetail(record: RawRecord): CustomerDetail {
  return {
    id: numberValue(record.id),
    uoId: numberValue(record.uo_id),
    branchId: nullableNumberValue(record.branch_id),
    unvan: stringValue(record.unvan),
    ad: stringValue(record.ad),
    soyad: stringValue(record.soyad),
    yetkiliAdi: stringValue(record.yetkili_adi),
    cep: stringValue(record.cep),
    telefon: stringValue(record.telefon),
    mahalle: stringValue(record.mahalle),
    ilKodu: stringValue(record.il_kodu),
    ilceKodu: stringValue(record.ilce_kodu),
    vergiNo: stringValue(record.vergi_no),
    tcNo: stringValue(record.tc_no),
    type: stringValue(record.type),
    createdAt: stringValue(record.created_at),
  };
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
    id: numberValue(record.id),
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
