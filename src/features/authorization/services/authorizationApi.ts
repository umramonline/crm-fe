import { apiClient } from "@/services/apiClient";

export type Role = {
  id: number;
  name: string;
};

export type Module = {
  id: number;
  name: string;
};

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type ModuleMethod = {
  id: number;
  moduleId: number;
  moduleName: string;
  name: string;
  description: string;
  method: HttpMethod | "";
  path: string;
};

export type RolePermission = {
  id: number;
  roleId: number;
  moduleMethodId: number;
};

export type ModuleMethodPayload = {
  module_id: number;
  name: string;
  description: string;
  method: HttpMethod | "";
  path: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data?: T;
};

type ItemsEnvelope<T> = {
  items?: T[];
};

type RawRecord = Record<string, unknown>;

export async function listRoles(): Promise<Role[]> {
  const response =
    await apiClient.get<ApiEnvelope<ItemsEnvelope<RawRecord>>>(
      "/api/v1/authorization/roles",
    );

  return itemsOf(response.data).map(toRole);
}

export async function listModules(): Promise<Module[]> {
  const response =
    await apiClient.get<ApiEnvelope<ItemsEnvelope<RawRecord>>>(
      "/api/v1/authorization/modules",
    );

  return itemsOf(response.data).map(toModule);
}

export async function createModule(name: string): Promise<Module> {
  const response = await apiClient.post<ApiEnvelope<RawRecord>>(
    "/api/v1/authorization/modules",
    { name },
  );

  return toModule(response.data.data ?? {});
}

export async function updateModule(id: number, name: string): Promise<Module> {
  const response = await apiClient.put<ApiEnvelope<RawRecord>>(
    `/api/v1/authorization/modules/${id}`,
    { name },
  );

  return toModule(response.data.data ?? {});
}

export async function deleteModule(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/authorization/modules/${id}`);
}

export async function listModuleMethods(moduleId?: number): Promise<ModuleMethod[]> {
  const response = await apiClient.get<ApiEnvelope<ItemsEnvelope<RawRecord>>>(
    "/api/v1/authorization/module-methods",
    { params: moduleId ? { module_id: moduleId } : undefined },
  );

  return itemsOf(response.data).map(toModuleMethod);
}

export async function createModuleMethod(
  payload: ModuleMethodPayload,
): Promise<ModuleMethod> {
  const response = await apiClient.post<ApiEnvelope<RawRecord>>(
    "/api/v1/authorization/module-methods",
    payload,
  );

  return toModuleMethod(response.data.data ?? {});
}

export async function updateModuleMethod(
  id: number,
  payload: ModuleMethodPayload,
): Promise<ModuleMethod> {
  const response = await apiClient.put<ApiEnvelope<RawRecord>>(
    `/api/v1/authorization/module-methods/${id}`,
    payload,
  );

  return toModuleMethod(response.data.data ?? {});
}

export async function deleteModuleMethod(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/authorization/module-methods/${id}`);
}

export async function listRolePermissions(
  roleId: number,
): Promise<RolePermission[]> {
  const response = await apiClient.get<ApiEnvelope<ItemsEnvelope<RawRecord>>>(
    "/api/v1/authorization/role-permissions",
    { params: { role_id: roleId } },
  );

  return itemsOf(response.data).map(toRolePermission);
}

export async function replaceRolePermissions(
  roleId: number,
  moduleMethodIds: number[],
): Promise<void> {
  await apiClient.put(`/api/v1/authorization/role-permissions/${roleId}`, {
    module_method_ids: moduleMethodIds,
  });
}

function itemsOf(envelope: ApiEnvelope<ItemsEnvelope<RawRecord>>): RawRecord[] {
  return envelope.data?.items ?? [];
}

function toRole(record: RawRecord): Role {
  return {
    id: numberValue(record.id ?? record.ID),
    name: stringValue(record.name ?? record.Name),
  };
}

function toModule(record: RawRecord): Module {
  return {
    id: numberValue(record.id ?? record.ID),
    name: stringValue(record.name ?? record.Name),
  };
}

function toModuleMethod(record: RawRecord): ModuleMethod {
  return {
    id: numberValue(record.id ?? record.ID),
    moduleId: numberValue(record.module_id ?? record.ModuleID),
    moduleName: stringValue(record.module_name ?? record.ModuleName),
    name: stringValue(record.name ?? record.Name),
    description: stringValue(record.description ?? record.Description),
    method: methodValue(record.method ?? record.Method),
    path: stringValue(record.path ?? record.Path),
  };
}

function toRolePermission(record: RawRecord): RolePermission {
  return {
    id: numberValue(record.id ?? record.ID),
    roleId: numberValue(record.role_id ?? record.RoleID),
    moduleMethodId: numberValue(
      record.module_method_id ?? record.ModuleMethodID,
    ),
  };
}

function numberValue(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return 0;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function methodValue(value: unknown): HttpMethod | "" {
  const method = stringValue(value);
  const methods: HttpMethod[] = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
  ];

  return methods.includes(method as HttpMethod) ? (method as HttpMethod) : "";
}
