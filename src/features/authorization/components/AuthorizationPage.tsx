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
    <section className="permission-page">
      <div className="page-title">
        <h1>İzin Yönetimi</h1>
        <p>Modül, method ve rol izinlerini yönetin.</p>
      </div>

      {message ? <div className="panel-alert">{message}</div> : null}

      {isLoading ? (
        <div className="panel-card">Yükleniyor...</div>
      ) : !canViewModulesForm &&
        !canViewMethodsForm &&
        !canViewRolePermissionsForm ? (
        <div className="panel-card">Bu sayfada görüntüleyebileceğiniz form yok.</div>
      ) : (
        <div className="permission-layout">
          {canViewRolePermissionsForm ? (
          <section className="panel-card permission-table-panel">
            <div className="panel-card-title">
              <h2>Rol İzinleri</h2>
              {canUpdateRolePermissions ? (
              <button className="blue-button" type="button" onClick={() => void savePermissions()}>
                Kaydet
              </button>
              ) : null}
            </div>

            {canListRoles ? (
              <>
                <label className="panel-label" htmlFor="role-select">
                  Rol
                </label>
                <select
                  id="role-select"
                  className="panel-input"
                  value={selectedRoleId}
                  onChange={(event) => setSelectedRoleId(Number(event.target.value))}
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <p className="muted-text">Rol listesini görme yetkiniz yok.</p>
            )}

            {canListMethods && canListRolePermissions ? (
              <div className="permission-table-scroll">
              <table className="permission-table">
                <thead>
                  <tr>
                    <th>İzin</th>
                    <th>Method</th>
                    <th>Path</th>
                    <th>Aktif</th>
                  </tr>
                </thead>
                <tbody>
                  {methods.map((method) => (
                    <tr key={method.id}>
                      <td data-label="İzin">
                        <strong>{method.name}</strong>
                        <span>{method.description}</span>
                      </td>
                      <td data-label="Method">{method.method || "UI"}</td>
                      <td data-label="Path">{method.path || "-"}</td>
                      <td data-label="Aktif">
                        <input
                          type="checkbox"
                          disabled={!canUpdateRolePermissions}
                          checked={checkedIds.has(method.id)}
                          onChange={() => togglePermission(method.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            ) : (
              <p className="muted-text">
                Rol izinleri tablosunu görüntülemek için gerekli listeleme
                yetkileri bulunmuyor.
              </p>
            )}

            <small className="muted-text">
              Seçili role ait kayıtlı izin: {rolePermissions.length}
            </small>
          </section>
          ) : null}

          {canViewModulesForm ? (
          <section className="panel-card">
            <div className="panel-card-title">
              <h2>Modüller</h2>
            </div>

            {canCreateModules || canUpdateModules ? (
            <form className="panel-form" onSubmit={(event) => void handleModuleSubmit(event)}>
              <label className="panel-label" htmlFor="module-name">
                Modül Adı
              </label>
              <input
                id="module-name"
                className="panel-input"
                value={moduleForm.name}
                onChange={(event) =>
                  setModuleForm((current) => ({ ...current, name: event.target.value }))
                }
              />
              <div className="button-row">
                <button className="blue-button" type="submit">
                  {moduleForm.id ? "Güncelle" : "Ekle"}
                </button>
                {moduleForm.id ? (
                  <button
                    className="gray-button"
                    type="button"
                    onClick={() => setModuleForm(emptyModuleForm)}
                  >
                    Vazgeç
                  </button>
                ) : null}
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
                  <span>
                    {canUpdateModules ? (
                    <button
                      type="button"
                      onClick={() => setModuleForm({ id: module.id, name: module.name })}
                    >
                      Düzenle
                    </button>
                    ) : null}
                    {canDeleteModules ? (
                    <button type="button" onClick={() => void handleModuleDelete(module.id)}>
                      Sil
                    </button>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
            ) : (
              <p className="muted-text">Modül listesini görme yetkiniz yok.</p>
            )}
          </section>
          ) : null}

          {canViewMethodsForm ? (
          <section className="panel-card method-panel">
            <div className="panel-card-title">
              <h2>Methodlar</h2>
            </div>

            {canCreateMethods || canUpdateMethods ? (
            <form className="panel-form" onSubmit={(event) => void handleMethodSubmit(event)}>
              <label className="panel-label" htmlFor="method-module">
                Modül
              </label>
              <select
                id="method-module"
                className="panel-input"
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

              <label className="panel-label" htmlFor="method-name">
                İzin Adı
              </label>
              <input
                id="method-name"
                className="panel-input"
                placeholder="modules.list"
                value={methodForm.name}
                onChange={(event) =>
                  setMethodForm((current) => ({ ...current, name: event.target.value }))
                }
              />

              <label className="panel-label" htmlFor="method-description">
                Açıklama
              </label>
              <input
                id="method-description"
                className="panel-input"
                value={methodForm.description}
                onChange={(event) =>
                  setMethodForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />

              <div className="two-column-form">
                <label className="panel-label" htmlFor="method-http">
                  HTTP Method
                  <select
                    id="method-http"
                    className="panel-input"
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
                </label>

                <label className="panel-label" htmlFor="method-path">
                  Path
                  <input
                    id="method-path"
                    className="panel-input"
                    value={methodForm.path}
                    onChange={(event) =>
                      setMethodForm((current) => ({
                        ...current,
                        path: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="button-row">
                <button className="blue-button" type="submit">
                  {methodForm.id ? "Güncelle" : "Ekle"}
                </button>
                {methodForm.id ? (
                  <button
                    className="gray-button"
                    type="button"
                    onClick={() =>
                      setMethodForm({ ...emptyMethodForm, moduleId: selectedModuleId })
                    }
                  >
                    Vazgeç
                  </button>
                ) : null}
              </div>
            </form>
            ) : null}

            {canListMethods ? (
            <div className="method-list">
              {filteredMethods.map((method) => (
                <div className="method-item" key={method.id}>
                  <div>
                    <strong>{method.name}</strong>
                    <span>{method.description || "Açıklama yok"}</span>
                    <small>
                      {method.method || "UI"} {method.path || "permission"}
                    </small>
                  </div>
                  <span>
                    {canUpdateMethods ? (
                    <button
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
                    <button type="button" onClick={() => void handleMethodDelete(method.id)}>
                      Sil
                    </button>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
            ) : (
              <p className="muted-text">Method listesini görme yetkiniz yok.</p>
            )}
          </section>
          ) : null}
        </div>
      )}
    </section>
  );
}
