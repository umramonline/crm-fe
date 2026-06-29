import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  createCustomer,
  listBranches,
  listCities,
  listCustomers,
  listTowns,
  listZones,
  searchCustomer,
  type Branch,
  type City,
  CustomerValidationError,
  type Customer,
  type CustomerDetail,
  type CustomerListQuery,
  type CustomerValidationErrors,
  type Town,
  type Zone,
} from "@/features/customers/services/customerApi";
import type { Permission } from "@/features/auth/services/authApi";

const situationOptions = [
  "Aktif Müşteri",
  "Yarı Aktif Müşteri",
  "Pasif Müşteri",
  "Kayıp Müşteri",
  "Potansiyel Müşteri",
] as const;

const sourceOptions = ["PlusCard", "Manuel"] as const;

const typeOptions = ["Kurumsal", "Bireysel"] as const;

const entryText = {
  button: "Müşteri Giriş",
  searchTitle: "Önce müşteri ara",
  searchPlaceholder: "Cep, telefon, T.C. no veya vergi no yazın",
  searchRequired: "Arama yapmak için cep, telefon, T.C. no veya vergi no yazın.",
  searchFailed: "Müşteri araması yapılamadı.",
  customerFound: "Müşteri kaydı bulundu. Edit formu sonraki aşamada açılacak.",
  customerNotFound: "Müşteri bulunamadı. Yeni müşteri formunu doldurun.",
  referenceFailed: "Form seçenekleri getirilemedi.",
  citiesLoading: "Seçenekler yükleniyor...",
  typeStepTitle: "Müşteri türü seçin",
  formStepTitle: "Yeni müşteri bilgileri",
  createSuccess: "Müşteri kaydedildi.",
  createFailed: "Müşteri kaydı oluşturulamadı.",
} as const;

const turkeyMobilePhoneRegex = /^05[0-9]{9}$/;

type CustomerFilters = {
  situation: string;
  unvan: string;
  cep: string;
  ad: string;
  soyad: string;
  branchName: string;
  zoneId: string;
  plusCardNo: string;
  source: string;
  city: string;
  town: string;
  createdAt: string;
  type: string;
};

type CustomerEntryType = "" | "bireysel" | "kurumsal";

type NewCustomerForm = {
  ad: string;
  soyad: string;
  cep: string;
  unvan: string;
  yetkiliAdi: string;
  telefon: string;
  ilKodu: string;
  ilceKodu: string;
  mahalle: string;
  branchId: string;
};

const emptyFilters: CustomerFilters = {
  situation: "",
  unvan: "",
  cep: "",
  ad: "",
  soyad: "",
  branchName: "",
  zoneId: "",
  plusCardNo: "",
  source: "",
  city: "",
  town: "",
  createdAt: "",
  type: "",
};

const emptyNewCustomerForm: NewCustomerForm = {
  ad: "",
  soyad: "",
  cep: "",
  unvan: "",
  yetkiliAdi: "",
  telefon: "",
  ilKodu: "",
  ilceKodu: "",
  mahalle: "",
  branchId: "",
};

type CustomersPageProps = {
  permissions: Permission[];
};

export function CustomersPage({ permissions }: CustomersPageProps) {
  const permissionNames = useMemo(
    () => new Set(permissions.map((permission) => permission.name)),
    [permissions],
  );
  const canListCustomers = permissionNames.has("customers.list");
  const canListZones = permissionNames.has("customers.zones.list");
  const canSearchCustomers = permissionNames.has("customers.search");
  const canCreateCustomers = permissionNames.has("customers.create");
  const canListCities = permissionNames.has("customers.cities.list");
  const canListTowns = permissionNames.has("customers.towns.list");
  const canListBranches = permissionNames.has("customers.branches.list");

  const [zones, setZones] = useState<Zone[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [towns, setTowns] = useState<Town[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [draftFilters, setDraftFilters] = useState<CustomerFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<CustomerFilters>(emptyFilters);
  const [items, setItems] = useState<Customer[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<CustomerListQuery["sortBy"]>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [foundCustomer, setFoundCustomer] = useState<CustomerDetail | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [customerEntryType, setCustomerEntryType] = useState<CustomerEntryType>("");
  const [newCustomerForm, setNewCustomerForm] =
    useState<NewCustomerForm>(emptyNewCustomerForm);
  const [isReferenceLoading, setIsReferenceLoading] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [createErrors, setCreateErrors] = useState<CustomerValidationErrors>({});

  useEffect(() => {
    if (!canListZones) {
      return;
    }

    let isActive = true;

    async function loadZones(): Promise<void> {
      try {
        const nextZones = await listZones();
        if (isActive) {
          setZones(nextZones);
        }
      } catch {
        if (isActive) {
          setMessage("Bölge listesi getirilemedi.");
        }
      }
    }

    void loadZones();

    return () => {
      isActive = false;
    };
  }, [canListZones]);

  useEffect(() => {
    if (!isCreateModalOpen || (!canListCities && !canListBranches)) {
      return;
    }

    let isActive = true;

    async function loadReferenceData(): Promise<void> {
      setIsReferenceLoading(true);
      setMessage("");

      try {
        const [nextCities, nextBranches] = await Promise.all([
          canListCities ? listCities() : Promise.resolve<City[]>([]),
          canListBranches ? listBranches() : Promise.resolve<Branch[]>([]),
        ]);

        if (isActive) {
          setCities(nextCities);
          setBranches(nextBranches);
        }
      } catch {
        if (isActive) {
          setMessage(entryText.referenceFailed);
        }
      } finally {
        if (isActive) {
          setIsReferenceLoading(false);
        }
      }
    }

    void loadReferenceData();

    return () => {
      isActive = false;
    };
  }, [canListBranches, canListCities, isCreateModalOpen]);

  useEffect(() => {
    if (!isCreateModalOpen || !newCustomerForm.ilKodu || !canListTowns) {
      setTowns([]);
      return;
    }

    let isActive = true;

    async function loadTowns(): Promise<void> {
      try {
        const nextTowns = await listTowns(Number(newCustomerForm.ilKodu));
        if (isActive) {
          setTowns(nextTowns);
        }
      } catch {
        if (isActive) {
          setTowns([]);
          setMessage(entryText.referenceFailed);
        }
      }
    }

    void loadTowns();

    return () => {
      isActive = false;
    };
  }, [canListTowns, isCreateModalOpen, newCustomerForm.ilKodu]);

  useEffect(() => {
    if (!canListCustomers) {
      return;
    }

    let isActive = true;

    async function loadCustomers(): Promise<void> {
      setIsLoading(true);
      setMessage("");

      try {
        const result = await listCustomers({
          page: currentPage,
          perPage: 10,
          situation: appliedFilters.situation,
          unvan: appliedFilters.unvan,
          cep: appliedFilters.cep,
          ad: appliedFilters.ad,
          soyad: appliedFilters.soyad,
          branchName: appliedFilters.branchName,
          zoneId: appliedFilters.zoneId ? Number(appliedFilters.zoneId) : undefined,
          plusCardNo: appliedFilters.plusCardNo,
          source: appliedFilters.source,
          city: appliedFilters.city,
          town: appliedFilters.town,
          createdAt: appliedFilters.createdAt,
          type: appliedFilters.type,
          sortBy,
          sortOrder,
        });

        if (!isActive) {
          return;
        }

        setItems(result.items);
        setCurrentPage(result.pagination.currentPage || 1);
        setLastPage(result.pagination.lastPage || 1);
        setTotal(result.pagination.total || 0);
      } catch {
        if (isActive) {
          setItems([]);
          setMessage("Müşteri listesi getirilemedi.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadCustomers();

    return () => {
      isActive = false;
    };
  }, [appliedFilters, canListCustomers, currentPage, sortBy, sortOrder]);

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setCurrentPage(1);
    setAppliedFilters({ ...draftFilters });
  }

  function handleResetFilters(): void {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setCurrentPage(1);
    setSortBy("");
    setSortOrder("desc");
  }

  async function handleCustomerSearchSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const normalizedQuery = searchQuery.trim();
    if (!normalizedQuery) {
      setMessage(entryText.searchRequired);
      return;
    }

    setIsSearching(true);
    setMessage("");
    setFoundCustomer(null);

    try {
      const result = await searchCustomer(normalizedQuery);
      if (result.found && result.customer) {
        setFoundCustomer(result.customer);
        setMessage(`${entryText.customerFound} Kaynak: ${formatCustomerSource(result.source)}.`);
        return;
      }

      setIsSearchModalOpen(false);
      setIsCreateModalOpen(true);
      setCreateStep(1);
      setCustomerEntryType("");
      setNewCustomerForm(emptyNewCustomerForm);
      setMessage(entryText.customerNotFound);
    } catch {
      setMessage(entryText.searchFailed);
    } finally {
      setIsSearching(false);
    }
  }

  function handleOpenCustomerSearch(): void {
    setSearchQuery("");
    setFoundCustomer(null);
    setIsSearchModalOpen(true);
    setMessage("");
  }

  function handleCloseCustomerSearch(): void {
    setIsSearchModalOpen(false);
    setFoundCustomer(null);
  }

  function handleSelectCustomerEntryType(type: CustomerEntryType): void {
    setCustomerEntryType(type);
    setNewCustomerForm(emptyNewCustomerForm);
    setCreateErrors({});
    setCreateStep(2);
  }

  function handleCloseCreateModal(): void {
    setIsCreateModalOpen(false);
    setCreateStep(1);
    setCustomerEntryType("");
    setNewCustomerForm(emptyNewCustomerForm);
    setCreateErrors({});
    setTowns([]);
  }

  function updateNewCustomerField(field: keyof NewCustomerForm, value: string): void {
    setNewCustomerForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "ilKodu" ? { ilceKodu: "" } : {}),
    }));
    setCreateErrors((current) => ({
      ...current,
      [formFieldToApiField(field)]: "",
      ...(field === "ilKodu" ? { ilce_kodu: "" } : {}),
    }));
  }

  async function handleCreateCustomerSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (customerEntryType !== "bireysel" && customerEntryType !== "kurumsal") {
      setCreateErrors({ type: "Müşteri türü seçiniz." });
      return;
    }

    const validationErrors = validateNewCustomerForm(customerEntryType, newCustomerForm);
    if (Object.keys(validationErrors).length > 0) {
      setCreateErrors(validationErrors);
      return;
    }

    setIsCreatingCustomer(true);
    setCreateErrors({});
    setMessage("");

    try {
      await createCustomer({
        type: customerEntryType,
        ad: newCustomerForm.ad.trim(),
        soyad: newCustomerForm.soyad.trim(),
        cep: newCustomerForm.cep.trim(),
        unvan: newCustomerForm.unvan.trim(),
        yetkiliAdi: newCustomerForm.yetkiliAdi.trim(),
        telefon: newCustomerForm.telefon.trim(),
        ilKodu: newCustomerForm.ilKodu,
        ilceKodu: newCustomerForm.ilceKodu,
        mahalle: newCustomerForm.mahalle.trim(),
        branchId: Number(newCustomerForm.branchId),
      });

      handleCloseCreateModal();
      setMessage(entryText.createSuccess);
      setCurrentPage(1);
      setAppliedFilters((current) => ({ ...current }));
    } catch (error: unknown) {
      if (error instanceof CustomerValidationError) {
        setCreateErrors(error.errors);
      } else {
        setMessage(entryText.createFailed);
      }
    } finally {
      setIsCreatingCustomer(false);
    }
  }

  function handleSort(column: "credit" | "created_at"): void {
    if (sortBy === column) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(column);
    setSortOrder(column === "credit" ? "desc" : "desc");
    setCurrentPage(1);
  }

  if (!canListCustomers) {
    return (
      <section className="panel-card">
        <div className="page-title">
          <h1>Müşteriler</h1>
          <p>Bu sayfayı görüntüleme yetkiniz bulunmuyor.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel-card permission-table-panel">
      <div className="page-title">
        <h1>Müşteriler</h1>
        <p>PlusCard müşteri listesini filtreleyebilir, sıralayabilir ve sayfalayabilirsiniz.</p>
      </div>

      {message ? <div className="panel-alert">{message}</div> : null}

      {isSearchModalOpen ? (
        <div className="customer-modal-backdrop" role="presentation">
          <section className="customer-modal" role="dialog" aria-modal="true">
            <div className="customer-modal-header">
              <h2>{entryText.searchTitle}</h2>
              <button className="customer-modal-close" type="button" onClick={handleCloseCustomerSearch}>
                Kapat
              </button>
            </div>

            <form className="panel-form" onSubmit={(event) => void handleCustomerSearchSubmit(event)}>
              <label className="field-label">
                Arama
                <input
                  className="panel-input"
                  value={searchQuery}
                  placeholder={entryText.searchPlaceholder}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </label>

              <div className="customer-modal-actions">
                <button className="blue-button" type="submit" disabled={isSearching}>
                  {isSearching ? "Aranıyor..." : "Ara"}
                </button>
                <button className="gray-button" type="button" onClick={handleCloseCustomerSearch}>
                  Vazgeç
                </button>
              </div>
            </form>

            {foundCustomer ? (
              <div className="customer-found-card">
                <strong>{customerDisplayName(foundCustomer)}</strong>
                <span>{foundCustomer.cep || foundCustomer.telefon || "-"}</span>
                <span>{foundCustomer.tcNo || foundCustomer.vergiNo || "-"}</span>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {isCreateModalOpen ? (
        <div className="customer-modal-backdrop" role="presentation">
          <section className="customer-modal customer-modal-wide" role="dialog" aria-modal="true">
            <div className="customer-modal-header">
              <h2>{createStep === 1 ? entryText.typeStepTitle : entryText.formStepTitle}</h2>
              <button className="customer-modal-close" type="button" onClick={handleCloseCreateModal}>
                Kapat
              </button>
            </div>

            {createStep === 1 ? (
              <div className="customer-entry-type-grid">
                <button
                  className="customer-entry-type-card"
                  type="button"
                  onClick={() => handleSelectCustomerEntryType("bireysel")}
                >
                  Bireysel
                </button>
                <button
                  className="customer-entry-type-card"
                  type="button"
                  onClick={() => handleSelectCustomerEntryType("kurumsal")}
                >
                  Kurumsal
                </button>
              </div>
            ) : (
              <form
                className="customer-entry-form"
                onSubmit={(event) => void handleCreateCustomerSubmit(event)}
              >
                {customerEntryType === "bireysel" ? (
                  <>
                    <label className="field-label">
                      Ad
                      <input
                        className="panel-input"
                        value={newCustomerForm.ad}
                        onChange={(event) => updateNewCustomerField("ad", event.target.value)}
                      />
                      {createErrors.ad ? (
                        <span className="customer-field-error">{createErrors.ad}</span>
                      ) : null}
                    </label>
                    <label className="field-label">
                      Soyad
                      <input
                        className="panel-input"
                        value={newCustomerForm.soyad}
                        onChange={(event) => updateNewCustomerField("soyad", event.target.value)}
                      />
                      {createErrors.soyad ? (
                        <span className="customer-field-error">{createErrors.soyad}</span>
                      ) : null}
                    </label>
                    <label className="field-label">
                      Cep
                      <input
                        className="panel-input"
                        inputMode="numeric"
                        pattern="05[0-9]{9}"
                        maxLength={11}
                        placeholder="05XXXXXXXXX"
                        value={newCustomerForm.cep}
                        onChange={(event) => updateNewCustomerField("cep", event.target.value)}
                      />
                      {createErrors.cep ? (
                        <span className="customer-field-error">{createErrors.cep}</span>
                      ) : null}
                    </label>
                  </>
                ) : (
                  <>
                    <label className="field-label">
                      Ünvan
                      <input
                        className="panel-input"
                        value={newCustomerForm.unvan}
                        onChange={(event) => updateNewCustomerField("unvan", event.target.value)}
                      />
                      {createErrors.unvan ? (
                        <span className="customer-field-error">{createErrors.unvan}</span>
                      ) : null}
                    </label>
                    <label className="field-label">
                      Yetkili Adı
                      <input
                        className="panel-input"
                        value={newCustomerForm.yetkiliAdi}
                        onChange={(event) => updateNewCustomerField("yetkiliAdi", event.target.value)}
                      />
                      {createErrors.yetkili_adi ? (
                        <span className="customer-field-error">{createErrors.yetkili_adi}</span>
                      ) : null}
                    </label>
                    <label className="field-label">
                      Telefon
                      <input
                        className="panel-input"
                        inputMode="numeric"
                        pattern="05[0-9]{9}"
                        placeholder="05XXXXXXXXX"
                        value={newCustomerForm.telefon}
                        onChange={(event) => updateNewCustomerField("telefon", event.target.value)}
                      />
                      {createErrors.telefon ? (
                        <span className="customer-field-error">{createErrors.telefon}</span>
                      ) : null}
                    </label>
                  </>
                )}

                <label className="field-label">
                  İl
                  <select
                    className="panel-input"
                    value={newCustomerForm.ilKodu}
                    onChange={(event) => updateNewCustomerField("ilKodu", event.target.value)}
                    disabled={isReferenceLoading || !canListCities}
                  >
                    <option value="">{isReferenceLoading ? entryText.citiesLoading : "Seçiniz"}</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.title}
                      </option>
                    ))}
                  </select>
                  {createErrors.il_kodu ? (
                    <span className="customer-field-error">{createErrors.il_kodu}</span>
                  ) : null}
                </label>

                <label className="field-label">
                  İlçe
                  <select
                    className="panel-input"
                    value={newCustomerForm.ilceKodu}
                    onChange={(event) => updateNewCustomerField("ilceKodu", event.target.value)}
                    disabled={!newCustomerForm.ilKodu || !canListTowns}
                  >
                    <option value="">Seçiniz</option>
                    {towns.map((town) => (
                      <option key={town.id} value={town.id}>
                        {town.title}
                      </option>
                    ))}
                  </select>
                  {createErrors.ilce_kodu ? (
                    <span className="customer-field-error">{createErrors.ilce_kodu}</span>
                  ) : null}
                </label>

                <label className="field-label">
                  Mahalle
                  <input
                    className="panel-input"
                    value={newCustomerForm.mahalle}
                    onChange={(event) => updateNewCustomerField("mahalle", event.target.value)}
                  />
                  {createErrors.mahalle ? (
                    <span className="customer-field-error">{createErrors.mahalle}</span>
                  ) : null}
                </label>

                <label className="field-label">
                  Bayi
                  <select
                    className="panel-input"
                    value={newCustomerForm.branchId}
                    onChange={(event) => updateNewCustomerField("branchId", event.target.value)}
                    disabled={isReferenceLoading || !canListBranches}
                  >
                    <option value="">{isReferenceLoading ? entryText.citiesLoading : "Seçiniz"}</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                  {createErrors.branch_id ? (
                    <span className="customer-field-error">{createErrors.branch_id}</span>
                  ) : null}
                </label>

                <div className="customer-modal-actions">
                  <button className="gray-button" type="button" onClick={() => setCreateStep(1)}>
                    Geri
                  </button>
                  <button
                    className="blue-button"
                    type="submit"
                    disabled={!canCreateCustomers || isCreatingCustomer}
                  >
                    {isCreatingCustomer ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      ) : null}

      <form className="customer-filter-form" onSubmit={handleFilterSubmit}>
        <div className="customer-filter-actions">
          <button
            className="blue-button"
            type="button"
            onClick={handleOpenCustomerSearch}
            disabled={!canSearchCustomers}
          >
            {entryText.button}
          </button>
          <button className="blue-button" type="submit">
            Filtrele
          </button>
          <button className="gray-button" type="button" onClick={handleResetFilters}>
            Temizle
          </button>
          <span className="muted-text">
            {isLoading ? "Yükleniyor..." : `Toplam ${total} kayıt`}
          </span>
        </div>
      </form>

      <div className="permission-table-scroll">
        <table className="permission-table customer-table">
          <thead>
            <tr>
              <th>Durum</th>
              <th>Firma İsmi</th>
              <th>Yetkili Telefonu</th>
              <th>Yetkili İsmi</th>
              <th>Yetkili Soyismi</th>
              <th>Bayi</th>
              <th>Bölge</th>
              <th>Plus Card No</th>
              <th>
                <button
                  className="table-sort-button"
                  type="button"
                  onClick={() => handleSort("credit")}
                >
                  Plus Card Bakiyesi
                  {sortBy === "credit" ? (sortOrder === "asc" ? " ↑" : " ↓") : ""}
                </button>
              </th>
              <th>Müşteri Kaynağı</th>
              <th>İl</th>
              <th>İlçe</th>
              <th>
                <button
                  className="table-sort-button"
                  type="button"
                  onClick={() => handleSort("created_at")}
                >
                  Kayıt Tarihi
                  {sortBy === "created_at" ? (sortOrder === "asc" ? " ↑" : " ↓") : ""}
                </button>
              </th>
              <th>Müşteri Türü</th>
            </tr>
            <tr className="customer-filter-row">
              <th>
                <select
                  className="panel-input"
                  value={draftFilters.situation}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      situation: event.target.value,
                    }))
                  }
                >
                  <option value="">Tümü</option>
                  {situationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </th>
              <th>
                <input
                  className="panel-input"
                  value={draftFilters.unvan}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      unvan: event.target.value,
                    }))
                  }
                />
              </th>
              <th>
                <input
                  className="panel-input"
                  value={draftFilters.cep}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      cep: event.target.value,
                    }))
                  }
                />
              </th>
              <th>
                <input
                  className="panel-input"
                  value={draftFilters.ad}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      ad: event.target.value,
                    }))
                  }
                />
              </th>
              <th>
                <input
                  className="panel-input"
                  value={draftFilters.soyad}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      soyad: event.target.value,
                    }))
                  }
                />
              </th>
              <th>
                <input
                  className="panel-input"
                  value={draftFilters.branchName}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      branchName: event.target.value,
                    }))
                  }
                />
              </th>
              <th>
                <select
                  className="panel-input"
                  value={draftFilters.zoneId}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      zoneId: event.target.value,
                    }))
                  }
                  disabled={!canListZones}
                >
                  <option value="">Tümü</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </th>
              <th>
                <input
                  className="panel-input"
                  value={draftFilters.plusCardNo}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      plusCardNo: event.target.value,
                    }))
                  }
                />
              </th>
              <th />
              <th>
                <select
                  className="panel-input"
                  value={draftFilters.source}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      source: event.target.value,
                    }))
                  }
                >
                  <option value="">Tümü</option>
                  {sourceOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </th>
              <th>
                <input
                  className="panel-input"
                  value={draftFilters.city}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                />
              </th>
              <th>
                <input
                  className="panel-input"
                  value={draftFilters.town}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      town: event.target.value,
                    }))
                  }
                />
              </th>
              <th>
                <input
                  className="panel-input"
                  value={draftFilters.createdAt}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      createdAt: event.target.value,
                    }))
                  }
                />
              </th>
              <th>
                <select
                  className="panel-input"
                  value={draftFilters.type}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                >
                  <option value="">Tümü</option>
                  {typeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={14}>Kayıt bulunamadı.</td>
              </tr>
            ) : null}

            {items.map((customer, index) => (
              <tr key={`${customer.plusCardNo}-${customer.cep}-${index}`}>
                <td>{customer.situation || "-"}</td>
                <td>{customer.unvan || "-"}</td>
                <td>{customer.cep || "-"}</td>
                <td>{customer.ad || "-"}</td>
                <td>{customer.soyad || "-"}</td>
                <td>{customer.branchName || "-"}</td>
                <td>{customer.zoneName || "-"}</td>
                <td>{customer.plusCardNo || "-"}</td>
                <td>{formatCredit(customer.credit)}</td>
                <td>{customer.source || "-"}</td>
                <td>{customer.city || "-"}</td>
                <td>{customer.town || "-"}</td>
                <td>{formatDate(customer.createdAt)}</td>
                <td>{formatCustomerType(customer.type)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="customer-pagination">
        <button
          className="gray-button"
          type="button"
          disabled={currentPage <= 1 || isLoading}
          onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
        >
          Önceki
        </button>
        <span className="muted-text">
          Sayfa {currentPage} / {lastPage}
        </span>
        <button
          className="gray-button"
          type="button"
          disabled={currentPage >= lastPage || isLoading}
          onClick={() => setCurrentPage((page) => Math.min(page + 1, lastPage))}
        >
          Sonraki
        </button>
      </div>
    </section>
  );
}

function formatCredit(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatCustomerType(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (normalized === "kurumsal") {
    return "Kurumsal";
  }

  if (normalized === "bireysel") {
    return "Bireysel";
  }

  if (!normalized || normalized === "-") {
    return "-";
  }

  return value;
}

function formatCustomerSource(value: string): string {
  if (value === "backend") {
    return "Backend";
  }

  if (value === "umramonline") {
    return "Umramonline";
  }

  return "-";
}

function customerDisplayName(customer: CustomerDetail): string {
  const corporateName = customer.unvan.trim();
  if (corporateName) {
    return corporateName;
  }

  const individualName = `${customer.ad} ${customer.soyad}`.trim();
  return individualName || "-";
}

function validateNewCustomerForm(
  customerType: Exclude<CustomerEntryType, "">,
  form: NewCustomerForm,
): CustomerValidationErrors {
  const errors: CustomerValidationErrors = {};

  if (customerType === "bireysel") {
    requireField(errors, "ad", form.ad, "Ad zorunludur.");
    requireField(errors, "soyad", form.soyad, "Soyad zorunludur.");
    validateMobilePhone(errors, "cep", form.cep);
  } else {
    requireField(errors, "unvan", form.unvan, "Ünvan zorunludur.");
    requireField(errors, "yetkili_adi", form.yetkiliAdi, "Yetkili adı zorunludur.");
    validateMobilePhone(errors, "telefon", form.telefon);
  }

  requireField(errors, "il_kodu", form.ilKodu, "İl zorunludur.");
  requireField(errors, "ilce_kodu", form.ilceKodu, "İlçe zorunludur.");
  requireField(errors, "mahalle", form.mahalle, "Mahalle zorunludur.");
  requireField(errors, "branch_id", form.branchId, "Bayi zorunludur.");

  return errors;
}

function requireField(
  errors: CustomerValidationErrors,
  field: string,
  value: string,
  message: string,
): void {
  if (!value.trim()) {
    errors[field] = message;
  }
}

function validateMobilePhone(
  errors: CustomerValidationErrors,
  field: string,
  value: string,
): void {
  if (!turkeyMobilePhoneRegex.test(value.trim())) {
    errors[field] = "Telefon 05XXXXXXXXX formatında, toplam 11 hane olmalıdır.";
  }
}

function formFieldToApiField(field: keyof NewCustomerForm): string {
  const fieldMap: Record<keyof NewCustomerForm, string> = {
    ad: "ad",
    soyad: "soyad",
    cep: "cep",
    unvan: "unvan",
    yetkiliAdi: "yetkili_adi",
    telefon: "telefon",
    ilKodu: "il_kodu",
    ilceKodu: "ilce_kodu",
    mahalle: "mahalle",
    branchId: "branch_id",
  };

  return fieldMap[field];
}
