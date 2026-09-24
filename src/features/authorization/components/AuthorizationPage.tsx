import { Table } from "@adminlte/react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  createModule,
  createModuleMethod,
  deleteModule,
  deleteModuleMethod,
  listModuleMethods,
  listModules,
  listRolePermissions,
  listRoles,
  replaceRolePermissions,
  updateModule,
  updateModuleMethod,
  type HttpMethod,
  type Module,
  type ModuleMethod,
  type Role,
  type RolePermission,
} from "@/features/authorization/services/authorizationApi";
import type { Permission } from "@/features/auth/services/authApi";
import { ContentHeader } from "@/shared/components/ContentHeader";

const httpMethods: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

type ModuleForm = {
  id: number | null;
  name: string;
};

type MethodForm = {
  id: number | null;
  moduleId: number;
  name: string;
  description: string;
  method: HttpMethod | "";
  path: string;
};

const emptyModuleForm: ModuleForm = {
  id: null,
  name: "",
};

const emptyMethodForm: MethodForm = {
  id: null,
  moduleId: 0,
  name: "",
  description: "",
  method: "",
  path: "",
};

type AuthorizationPageProps = {
  permissions: Permission[];
};

export function AuthorizationPage({ permissions }: AuthorizationPageProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [methods, setMethods] = useState<ModuleMethod[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState(0);
  const [selectedModuleId, setSelectedModuleId] = useState(0);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(() => new Set());
  const [moduleForm, setModuleForm] = useState<ModuleForm>(emptyModuleForm);
  const [methodForm, setMethodForm] = useState<MethodForm>(emptyMethodForm);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const permissionNames = useMemo(
    () => new Set(permissions.map((permission) => permission.name)),
    [permissions],
  );
  const canViewModulesForm = permissionNames.has("modules.form");
  const canViewMethodsForm = permissionNames.has("module_methods.form");
  const canViewRolePermissionsForm = permissionNames.has("role_permissions.form");
  const canListRoles = permissionNames.has("roles.list");
  const canListModules = permissionNames.has("modules.list");
  const canCreateModules = permissionNames.has("modules.create");
  const canUpdateModules = permissionNames.has("modules.update");
  const canDeleteModules = permissionNames.has("modules.delete");
  const canListMethods = permissionNames.has("module_methods.list");
  const canCreateMethods = permissionNames.has("module_methods.create");
  const canUpdateMethods = permissionNames.has("module_methods.update");
  const canDeleteMethods = permissionNames.has("module_methods.delete");
  const canListRolePermissions = permissionNames.has("role_permissions.list");
  const canUpdateRolePermissions = permissionNames.has("role_permissions.update");
  const shouldLoadRoles = canViewRolePermissionsForm && canListRoles;
  const shouldLoadModules =
    canListModules && (canViewModulesForm || canViewMethodsForm);
  const shouldLoadMethods =
    canListMethods && (canViewMethodsForm || canViewRolePermissionsForm);

  const filteredMethods = useMemo(() => {
    if (selectedModuleId === 0) {
      return methods;
    }

    return methods.filter((method) => method.moduleId === selectedModuleId);
  }, [methods, selectedModuleId]);

  useEffect(() => {
    let isActive = true;

    async function loadData(): Promise<void> {
      setIsLoading(true);
      setMessage("");

      try {
        const [nextRoles, nextModules, nextMethods] = await Promise.all([
          shouldLoadRoles ? listRoles() : Promise.resolve([]),
          shouldLoadModules ? listModules() : Promise.resolve([]),
          shouldLoadMethods ? listModuleMethods() : Promise.resolve([]),
        ]);

        if (!isActive) {
          return;
        }

        setRoles(nextRoles);
        setModules(nextModules);
        setMethods(nextMethods);
        setSelectedRoleId(nextRoles[0]?.id ?? 0);
        setSelectedModuleId(nextModules[0]?.id ?? 0);
        setMethodForm((current) => ({
          ...current,
          moduleId: nextModules[0]?.id ?? 0,
        }));
      } catch {
        if (isActive) {
          setMessage("Yetkilendirme verileri getirilemedi.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isActive = false;
    };
  }, [shouldLoadMethods, shouldLoadModules, shouldLoadRoles]);

  useEffect(() => {
    let isActive = true;

    async function loadPermissions(): Promise<void> {
      if (
        selectedRoleId === 0 ||
        !canViewRolePermissionsForm ||
        !canListRolePermissions
      ) {
        setRolePermissions([]);
        setCheckedIds(new Set());
        return;
      }

      try {
        const permissions = await listRolePermissions(selectedRoleId);
        if (!isActive) {
          return;
        }

        setRolePermissions(permissions);
        setCheckedIds(
          new Set(permissions.map((permission) => permission.moduleMethodId)),
        );
      } catch {
        if (isActive) {
          setMessage("Rol izinleri getirilemedi.");
        }
      }
    }

    void loadPermissions();

    return () => {
      isActive = false;
    };
  }, [canListRolePermissions, canViewRolePermissionsForm, selectedRoleId]);

  async function reloadCatalog(nextModuleId = selectedModuleId): Promise<void> {
    const [nextModules, nextMethods] = await Promise.all([
      shouldLoadModules ? listModules() : Promise.resolve([]),
      shouldLoadMethods ? listModuleMethods() : Promise.resolve([]),
    ]);

    setModules(nextModules);
    setMethods(nextMethods);

    const safeModuleId =
      nextModules.find((module) => module.id === nextModuleId)?.id ??
      nextModules[0]?.id ??
      0;

    setSelectedModuleId(safeModuleId);
    setMethodForm((current) => ({ ...current, moduleId: safeModuleId }));
  }

  async function handleModuleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const name = moduleForm.name.trim();
    if (name === "") {
      setMessage("Modül adı zorunludur.");
      return;
    }

    if ((moduleForm.id && !canUpdateModules) || (!moduleForm.id && !canCreateModules)) {
      setMessage("Modül kaydetme yetkiniz bulunmuyor.");
      return;
    }

    try {
      const module = moduleForm.id
        ? await updateModule(moduleForm.id, name)
        : await createModule(name);
      await reloadCatalog(module.id);
      setModuleForm(emptyModuleForm);
      setMessage("Modül kaydedildi.");
    } catch {
      setMessage("Modül kaydedilemedi.");
    }
  }

  async function handleModuleDelete(id: number): Promise<void> {
    if (!canDeleteModules) {
      setMessage("Modül silme yetkiniz bulunmuyor.");
      return;
    }

    if (!window.confirm("Modül silinsin mi?")) {
      return;
    }

    try {
      await deleteModule(id);
      await reloadCatalog();
      setMessage("Modül silindi.");
    } catch {
      setMessage("Modül silinemedi.");
    }
  }

  async function handleMethodSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (methodForm.moduleId === 0 || methodForm.name.trim() === "") {
      setMessage("Method için modül ve isim zorunludur.");
      return;
    }

    if ((methodForm.id && !canUpdateMethods) || (!methodForm.id && !canCreateMethods)) {
      setMessage("Method kaydetme yetkiniz bulunmuyor.");
      return;
    }

    const payload = {
      module_id: methodForm.moduleId,
      name: methodForm.name.trim(),
      description: methodForm.description.trim(),
      method: methodForm.method,
      path: methodForm.path.trim(),
    };

    try {
      await (methodForm.id
        ? updateModuleMethod(methodForm.id, payload)
        : createModuleMethod(payload));
      await reloadCatalog(methodForm.moduleId);
      setMethodForm({ ...emptyMethodForm, moduleId: methodForm.moduleId });
      setMessage("Method kaydedildi.");
    } catch {
      setMessage("Method kaydedilemedi.");
    }
  }

  async function handleMethodDelete(id: number): Promise<void> {
    if (!canDeleteMethods) {
      setMessage("Method silme yetkiniz bulunmuyor.");
      return;
    }

    if (!window.confirm("Method silinsin mi?")) {
      return;
    }

    try {
      await deleteModuleMethod(id);
      await reloadCatalog();
      setMessage("Method silindi.");
    } catch {
      setMessage("Method silinemedi.");
    }
  }

  function togglePermission(methodId: number): void {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(methodId)) {
        next.delete(methodId);
      } else {
        next.add(methodId);
      }

      return next;
    });
  }

  async function savePermissions(): Promise<void> {
    if (!canUpdateRolePermissions) {
      setMessage("Rol izinlerini güncelleme yetkiniz bulunmuyor.");
      return;
    }

    if (selectedRoleId === 0) {
      setMessage("Rol seçiniz.");
      return;
    }

    try {
      await replaceRolePermissions(selectedRoleId, Array.from(checkedIds));
      const permissions = await listRolePermissions(selectedRoleId);
      setRolePermissions(permissions);
      setMessage("Rol izinleri güncellendi.");
    } catch {
      setMessage("Rol izinleri güncellenemedi.");
    }
  }

  return (
    <>
      <ContentHeader
        title="İzin Yönetimi"
        breadcrumbs={[
          { label: "Ana Sayfa", href: "/home" },
          { label: "İzinler", active: true },
        ]}
      />

      {message ? <div className="alert alert-info">{message}</div> : null}

      {isLoading ? (
        <div className="card mb-3">
          <div className="card-body">Yükleniyor...</div>
        </div>
      ) : !canViewModulesForm &&
        !canViewMethodsForm &&
        !canViewRolePermissionsForm ? (
        <div className="card mb-3">
          <div className="card-body">Bu sayfada görüntüleyebileceğiniz form yok.</div>
        </div>
      ) : (
        <div className="permission-layout">
          {canViewRolePermissionsForm ? (
          <section className="card mb-3 method-panel">
            <div className="card-header d-flex align-items-center justify-content-between gap-2">
              <h3 className="card-title mb-0">Rol İzinleri</h3>
              {canUpdateRolePermissions ? (
              <button className="btn btn-primary btn-sm" type="button" onClick={() => void savePermissions()}>
                Kaydet
              </button>
              ) : null}
            </div>

            <div className="card-body">
              {canListRoles ? (
                <div className="mb-3">
                  <label className="form-label" htmlFor="role-select">
                    Rol
                  </label>
                  <select
                    id="role-select"
                    name="roleId"
                    className="form-select form-select-sm"
                    value={selectedRoleId}
                    onChange={(event) => setSelectedRoleId(Number(event.target.value))}
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-muted small">Rol listesini görme yetkiniz yok.</p>
              )}

              {canListMethods && canListRolePermissions ? (
                <Table
                  striped
                  hover
                  small
                  responsive
                  data={methods}
                  rowKey={(method) => method.id}
                  columns={[
                    {
                      key: "name",
                      header: "İzin",
                      render: (method) => (
                        <div className="permission-name-cell">
                          <strong className="d-block">{method.name}</strong>
                          {method.description ? (
                            <span className="text-muted small d-block mt-1">
                              {method.description}
                            </span>
                          ) : null}
                        </div>
                      ),
                    },
                    {
                      key: "method",
                      header: "Method",
                      className: "text-nowrap",
                      render: (method) => method.method || "UI",
                    },
                    {
                      key: "path",
                      header: "Path",
                      render: (method) => method.path || "-",
                    },
                    {
                      key: "active",
                      header: "Aktif",
                      align: "center",
                      className: "text-center",
                      render: (method) => (
                        <input
                          id={`permission-method-${method.id}`}
                          name={`permission-method-${method.id}`}
                          className="form-check-input m-0"
                          type="checkbox"
                          aria-label={`${method.name} izni`}
                          disabled={!canUpdateRolePermissions}
                          checked={checkedIds.has(method.id)}
                          onChange={() => togglePermission(method.id)}
                        />
                      ),
                    },
                  ]}
                />
              ) : (
                <p className="text-muted small mb-0">
                  Rol izinleri tablosunu görüntülemek için gerekli listeleme
                  yetkileri bulunmuyor.
                </p>
              )}

              <p className="text-muted small mb-0 mt-3">
                Seçili role ait kayıtlı izin: {rolePermissions.length}
              </p>
            </div>
          </section>
          ) : null}

          {canViewModulesForm ? (
          <section className="card mb-3">
            <div className="card-header">
              <h3 className="card-title mb-0">Modüller</h3>
            </div>

            <div className="card-body">
              {canCreateModules || canUpdateModules ? (
              <form className="row g-3 mb-3" onSubmit={(event) => void handleModuleSubmit(event)}>
                <div className="col-12">
                  <label className="form-label" htmlFor="module-name">
                    Modül Adı
                  </label>
                  <input
                    id="module-name"
                    name="moduleName"
                    className="form-control form-control-sm"
                    value={moduleForm.name}
                    onChange={(event) =>
                      setModuleForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </div>
                <div className="col-12">
                  <div className="button-row">
                    <button className="btn btn-primary btn-sm" type="submit">
                      {moduleForm.id ? "Güncelle" : "Ekle"}
                    </button>
                    {moduleForm.id ? (
                      <button
                        className="btn btn-secondary btn-sm"
                        type="button"
                        onClick={() => setModuleForm(emptyModuleForm)}
                      >
                        Vazgeç
                      </button>
                    ) : null}
                  </div>
                </div>
              </form>
              ) : null}

              {canListModules ? (
              <div className="compact-list">
                {modules.map((module) => (
                  <div
                    className={
                      module.id === selectedModuleId
                        ? "compact-list-item active"
                        : "compact-list-item"
                    }
                    key={module.id}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedModuleId(module.id);
                        setMethodForm((current) => ({
                          ...current,
                          moduleId: module.id,
                        }));
                      }}
                    >
                      {module.name}
                    </button>
                    <span className="compact-list-actions">
                      {canUpdateModules ? (
                      <button
                        className="btn btn-link btn-sm"
                        type="button"
                        onClick={() => setModuleForm({ id: module.id, name: module.name })}
                      >
                        Düzenle
                      </button>
                      ) : null}
                      {canDeleteModules ? (
                      <button
                        className="btn btn-link btn-sm text-danger"
                        type="button"
                        onClick={() => void handleModuleDelete(module.id)}
                      >
                        Sil
                      </button>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
              ) : (
                <p className="text-muted small mb-0">Modül listesini görme yetkiniz yok.</p>
              )}
            </div>
          </section>
          ) : null}

          {canViewMethodsForm ? (
          <section className="card mb-3">
            <div className="card-header">
              <h3 className="card-title mb-0">Methodlar</h3>
            </div>

            <div className="card-body">
              {canCreateMethods || canUpdateMethods ? (
              <form className="row g-3 mb-3" onSubmit={(event) => void handleMethodSubmit(event)}>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="method-module">
                    Modül
                  </label>
                  <select
                    id="method-module"
                    name="methodModuleId"
                    className="form-select form-select-sm"
                    value={methodForm.moduleId}
                    onChange={(event) =>
                      setMethodForm((current) => ({
                        ...current,
                        moduleId: Number(event.target.value),
                      }))
                    }
                  >
                    {modules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label" htmlFor="method-name">
                    İzin Adı
                  </label>
                  <input
                    id="method-name"
                    name="methodName"
                    className="form-control form-control-sm"
                    placeholder="modules.list"
                    value={methodForm.name}
                    onChange={(event) =>
                      setMethodForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </div>

                <div className="col-12">
                  <label className="form-label" htmlFor="method-description">
                    Açıklama
                  </label>
                  <input
                    id="method-description"
                    name="methodDescription"
                    className="form-control form-control-sm"
                    value={methodForm.description}
                    onChange={(event) =>
                      setMethodForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label" htmlFor="method-http">
                    HTTP Method
                  </label>
                  <select
                    id="method-http"
                    name="methodHttp"
                    className="form-select form-select-sm"
                    value={methodForm.method}
                    onChange={(event) =>
                      setMethodForm((current) => ({
                        ...current,
                        method: event.target.value as HttpMethod | "",
                      }))
                    }
                  >
                    <option value="">UI İzni</option>
                    {httpMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label" htmlFor="method-path">
                    Path
                  </label>
                  <input
                    id="method-path"
                    name="methodPath"
                    className="form-control form-control-sm"
                    value={methodForm.path}
                    onChange={(event) =>
                      setMethodForm((current) => ({
                        ...current,
                        path: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="col-12">
                  <div className="button-row">
                    <button className="btn btn-primary btn-sm" type="submit">
                      {methodForm.id ? "Güncelle" : "Ekle"}
                    </button>
                    {methodForm.id ? (
                      <button
                        className="btn btn-secondary btn-sm"
                        type="button"
                        onClick={() =>
                          setMethodForm({ ...emptyMethodForm, moduleId: selectedModuleId })
                        }
                      >
                        Vazgeç
                      </button>
                    ) : null}
                  </div>
                </div>
              </form>
              ) : null}

              {canListMethods ? (
              <div className="method-list">
                {filteredMethods.map((method) => (
                  <div className="method-item" key={method.id}>
                    <div>
                      <strong className="d-block">{method.name}</strong>
                      <span className="text-muted small d-block mt-1">
                        {method.description || "Açıklama yok"}
                      </span>
                      <small className="text-muted d-block mt-1">
                        {method.method || "UI"} {method.path || "permission"}
                      </small>
                    </div>
                    <span className="compact-list-actions">
                      {canUpdateMethods ? (
                      <button
                        className="btn btn-link btn-sm"
                        type="button"
                        onClick={() =>
                          setMethodForm({
                            id: method.id,
                            moduleId: method.moduleId,
                            name: method.name,
                            description: method.description,
                            method: method.method,
                            path: method.path,
                          })
                        }
                      >
                        Düzenle
                      </button>
                      ) : null}
                      {canDeleteMethods ? (
                      <button
                        className="btn btn-link btn-sm text-danger"
                        type="button"
                        onClick={() => void handleMethodDelete(method.id)}
                      >
                        Sil
                      </button>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
              ) : (
                <p className="text-muted small mb-0">Method listesini görme yetkiniz yok.</p>
              )}
            </div>
          </section>
          ) : null}
        </div>
      )}
    </>
  );
}
