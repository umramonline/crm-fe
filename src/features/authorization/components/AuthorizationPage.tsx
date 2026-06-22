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

export function AuthorizationPage() {
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
          listRoles(),
          listModules(),
          listModuleMethods(),
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
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadPermissions(): Promise<void> {
      if (selectedRoleId === 0) {
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
  }, [selectedRoleId]);

  async function reloadCatalog(nextModuleId = selectedModuleId): Promise<void> {
    const [nextModules, nextMethods] = await Promise.all([
      listModules(),
      listModuleMethods(),
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
      ) : (
        <div className="permission-layout">
          <section className="panel-card permission-table-panel">
            <div className="panel-card-title">
              <h2>Rol İzinleri</h2>
              <button className="blue-button" type="button" onClick={() => void savePermissions()}>
                Kaydet
              </button>
            </div>

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
                  {filteredMethods.map((method) => (
                    <tr key={method.id}>
                      <td>
                        <strong>{method.name}</strong>
                        <span>{method.description}</span>
                      </td>
                      <td>{method.method || "UI"}</td>
                      <td>{method.path || "-"}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={checkedIds.has(method.id)}
                          onChange={() => togglePermission(method.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <small className="muted-text">
              Seçili role ait kayıtlı izin: {rolePermissions.length}
            </small>
          </section>

          <section className="panel-card">
            <div className="panel-card-title">
              <h2>Modüller</h2>
            </div>

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
                    <button
                      type="button"
                      onClick={() => setModuleForm({ id: module.id, name: module.name })}
                    >
                      Düzenle
                    </button>
                    <button type="button" onClick={() => void handleModuleDelete(module.id)}>
                      Sil
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel-card method-panel">
            <div className="panel-card-title">
              <h2>Methodlar</h2>
            </div>

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
                    <button type="button" onClick={() => void handleMethodDelete(method.id)}>
                      Sil
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
