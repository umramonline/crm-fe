import { FormEvent, MouseEvent, useEffect, useMemo, useState } from "react";

import type { Permission } from "@/features/auth/services/authApi";
import {
  getCustomer,
  type CustomerDetail,
} from "@/features/customers/services/customerApi";
import {
  getFollowUp,
  listAssignedFollowUps,
  listFollowUps,
  updateFollowUp,
  type FollowUpDetail,
  type FollowUpImage,
  type FollowUpListItem,
  type FollowUpListQuery,
  type FollowUpMeetPerson,
  type FollowUpUpdateInput,
} from "@/features/followUps/services/followUpApi";
import { apiBaseUrl } from "@/services/apiClient";

type FollowUpsPageProps = {
  permissions: Permission[];
};

type FollowUpFilters = {
  title: string;
  customer: string;
  assignedUserFullName: string;
  branchName: string;
  visitDate: string;
  nextVisitDate: string;
};

type EditMeetPersonForm = FollowUpMeetPerson & {
  formId: string;
};

type FollowUpEditForm = {
  uuid: string;
  title: string;
  customerUnvan: string;
  visitType: string;
  visitDate: string;
  nextVisitDate: string;
  agreementReached: boolean;
  agreementFailureReason: string;
  note: string;
  existingImages: FollowUpImage[];
  images: File[];
  meetPeople: EditMeetPersonForm[];
};

type FollowUpEditErrors = Partial<Record<string, string>>;

const followUpAgreementFailureReasons = [
  "Fiyat yüksek",
  "Mesafe Uzak",
  "Bayi ile yaşanan sorunlar",
  "Ekpertize ihtiyaç duymuyor",
  "Kendisi yapıyor",
  "Başka ekspertize yaptırıyor",
  "Değerlendirme",
];

const followUpMeetPersonTitles = [
  "Genel Müdür",
  "Satış Müdürü",
  "Operasyon Müdürü",
  "Pazarlama Müdürü",
  "İşletme Müdürü",
  "Bölge Müdürü",
  "Şube Müdürü",
  "Yönetici",
  "Sahibi",
  "Ortağı",
];

const followUpVisitTypes = ["Yerinde Ziyaret"];

function createEmptyFilters(): FollowUpFilters {
  return {
    title: "",
    customer: "",
    assignedUserFullName: "",
    branchName: "",
    visitDate: "",
    nextVisitDate: "",
  };
}

function createEmptyMeetPerson(): EditMeetPersonForm {
  return {
    formId: crypto.randomUUID(),
    uuid: "",
    title: "",
    name: "",
    surname: "",
    phone: "",
    email: "",
  };
}

function filtersAreEmpty(filters: FollowUpFilters): boolean {
  return Object.values(filters).every((value) => value.trim() === "");
}

export function FollowUpsPage({ permissions }: FollowUpsPageProps) {
  const permissionNames = useMemo(
    () => new Set(permissions.map((permission) => permission.name)),
    [permissions],
  );
  const canListFollowUps = permissionNames.has("follow_ups.list");
  const canListAssignedFollowUps = permissionNames.has(
    "follow_ups.assigned.list",
  );
  const canLoadFollowUps = canListFollowUps || canListAssignedFollowUps;
  const canViewFollowUpDetail = permissionNames.has("follow_ups.detail");
  const canViewCustomerDetail =
    permissionNames.has("customers.detail") ||
    permissionNames.has("customers.detail.backend");
  const canUpdateFollowUps = permissionNames.has("follow_ups.update");

  const [draftFilters, setDraftFilters] =
    useState<FollowUpFilters>(() => createEmptyFilters());
  const [appliedFilters, setAppliedFilters] =
    useState<FollowUpFilters>(() => createEmptyFilters());
  const [items, setItems] = useState<FollowUpListItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<FollowUpListQuery["sortBy"]>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedFollowUp, setSelectedFollowUp] =
    useState<FollowUpDetail | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null,
  );
  const [selectedCustomerDetail, setSelectedCustomerDetail] =
    useState<CustomerDetail | null>(null);
  const [isLoadingCustomerDetail, setIsLoadingCustomerDetail] = useState(false);
  const [editForm, setEditForm] = useState<FollowUpEditForm | null>(null);
  const [editErrors, setEditErrors] = useState<FollowUpEditErrors>({});
  const [isLoadingEditForm, setIsLoadingEditForm] = useState(false);
  const [isUpdatingFollowUp, setIsUpdatingFollowUp] = useState(false);

  useEffect(() => {
    if (!canLoadFollowUps) {
      setItems([]);
      setTotal(0);
      setLastPage(1);
      return;
    }

    let isActive = true;

    async function loadFollowUps(): Promise<void> {
      setIsLoading(true);
      setMessage("");

      try {
        const followUpListLoader = canListFollowUps
          ? listFollowUps
          : listAssignedFollowUps;
        const result = await followUpListLoader({
          page: currentPage,
          perPage: 20,
          title: appliedFilters.title,
          customer: appliedFilters.customer,
          assignedUserFullName: appliedFilters.assignedUserFullName,
          branchName: appliedFilters.branchName,
          visitDate: appliedFilters.visitDate,
          nextVisitDate: appliedFilters.nextVisitDate,
          sortBy,
          sortOrder,
        });

        if (isActive) {
          setItems(result.items);
          setCurrentPage(result.pagination.currentPage || 1);
          setLastPage(result.pagination.lastPage || 1);
          setTotal(result.pagination.total || 0);
        }
      } catch {
        if (isActive) {
          setItems([]);
          setTotal(0);
          setLastPage(1);
          setMessage("Takip kayıtları getirilemedi.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadFollowUps();

    return () => {
      isActive = false;
    };
  }, [
    appliedFilters,
    canLoadFollowUps,
    canListFollowUps,
    currentPage,
    sortBy,
    sortOrder,
  ]);

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setCurrentPage(1);
    setAppliedFilters({ ...draftFilters });
  }

  function handleResetFilters(): void {
    const shouldClearDraftFilters = !filtersAreEmpty(draftFilters);
    const shouldClearAppliedFilters = !filtersAreEmpty(appliedFilters);
    const shouldResetPagination = currentPage !== 1;
    const shouldResetSort = sortBy !== "" || sortOrder !== "desc";

    if (!shouldClearDraftFilters && !shouldClearAppliedFilters && !shouldResetPagination && !shouldResetSort) {
      return;
    }

    if (shouldClearDraftFilters) {
      setDraftFilters(createEmptyFilters());
    }

    if (shouldClearAppliedFilters) {
      setAppliedFilters(createEmptyFilters());
    }

    if (shouldResetPagination) {
      setCurrentPage(1);
    }

    if (shouldResetSort) {
      setSortBy("");
      setSortOrder("desc");
    }

    if (message) {
      setMessage("");
    }
  }

  function handleSort(nextSortBy: FollowUpListQuery["sortBy"]): void {
    if (!nextSortBy) {
      return;
    }

    setCurrentPage(1);
    if (sortBy === nextSortBy) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(nextSortBy);
    setSortOrder("asc");
  }

  async function handleOpenFollowUpDetail(
    followUp: FollowUpListItem,
  ): Promise<void> {
    if (!canViewFollowUpDetail) {
      return;
    }

    setMessage("");

    try {
      const detail = await getFollowUp(followUp.uuid);
      setSelectedFollowUp(detail);
      setSelectedImageIndex(null);
    } catch {
      setMessage("Takip kaydı detayı getirilemedi.");
    }
  }

  async function handleOpenEditFollowUp(
    event: MouseEvent<HTMLButtonElement>,
    followUp: FollowUpListItem,
  ): Promise<void> {
    event.stopPropagation();

    if (!canUpdateFollowUps) {
      return;
    }

    setMessage("");
    setEditErrors({});
    setIsLoadingEditForm(true);

    try {
      const detail = await getFollowUp(followUp.uuid);
      setEditForm(detailToEditForm(detail));
    } catch {
      setMessage("Takip kaydı düzenleme bilgileri getirilemedi.");
    } finally {
      setIsLoadingEditForm(false);
    }
  }

  function handleCloseEditFollowUp(): void {
    if (isUpdatingFollowUp) {
      return;
    }

    setEditForm(null);
    setEditErrors({});
  }

  function updateEditForm<K extends keyof FollowUpEditForm>(
    field: K,
    value: FollowUpEditForm[K],
  ): void {
    setEditForm((current) => {
      if (!current) {
        return current;
      }

      const nextForm = { ...current, [field]: value };
      if (field === "agreementReached" && value === true) {
        nextForm.agreementFailureReason = "";
      }

      return nextForm;
    });
    setEditErrors((current) => ({ ...current, [field]: undefined }));
  }

  function updateEditMeetPerson(
    formId: string,
    field: keyof Omit<EditMeetPersonForm, "formId" | "uuid">,
    value: string,
  ): void {
    setEditForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        meetPeople: current.meetPeople.map((person) =>
          person.formId === formId ? { ...person, [field]: value } : person,
        ),
      };
    });
    setEditErrors((current) => ({ ...current, meetPeople: undefined }));
  }

  function addEditMeetPerson(): void {
    setEditForm((current) =>
      current
        ? { ...current, meetPeople: [...current.meetPeople, createEmptyMeetPerson()] }
        : current,
    );
    setEditErrors((current) => ({ ...current, meetPeople: undefined }));
  }

  function removeEditMeetPerson(formId: string): void {
    setEditForm((current) => {
      if (!current || current.meetPeople.length <= 1) {
        return current;
      }

      return {
        ...current,
        meetPeople: current.meetPeople.filter((person) => person.formId !== formId),
      };
    });
  }

  function removeExistingEditImage(uuid: string): void {
    setEditForm((current) =>
      current
        ? {
            ...current,
            existingImages: current.existingImages.filter(
              (image) => image.uuid !== uuid,
            ),
          }
        : current,
    );
    setEditErrors((current) => ({ ...current, images: undefined }));
  }

  function removeNewEditImage(index: number): void {
    setEditForm((current) =>
      current
        ? {
            ...current,
            images: current.images.filter((_, imageIndex) => imageIndex !== index),
          }
        : current,
    );
    setEditErrors((current) => ({ ...current, images: undefined }));
  }

  function handleEditImageChange(files: FileList | null): void {
    if (!files) {
      return;
    }

    const selectedFiles = Array.from(files);
    setEditForm((current) =>
      current ? { ...current, images: [...current.images, ...selectedFiles] } : current,
    );
    setEditErrors((current) => ({ ...current, images: undefined }));
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!editForm) {
      return;
    }

    const errors = validateEditForm(editForm);
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsUpdatingFollowUp(true);
    setMessage("");

    try {
      const updatedFollowUp = await updateFollowUp(editForm.uuid, {
        visitType: editForm.visitType,
        nextVisitDate: editForm.nextVisitDate,
        agreementReached: editForm.agreementReached,
        agreementFailureReason: editForm.agreementFailureReason,
        note: editForm.note,
        existingImageUuids: editForm.existingImages.map((image) => image.uuid),
        images: editForm.images,
        meetPeople: editForm.meetPeople.map((person) => ({
          title: person.title,
          name: person.name,
          surname: person.surname,
          phone: person.phone,
          email: person.email,
        })),
      } satisfies FollowUpUpdateInput);

      setItems((current) =>
        current.map((item) =>
          item.uuid === updatedFollowUp.uuid
            ? {
                ...item,
                nextVisitDate: updatedFollowUp.nextVisitDate,
                agreementReached: updatedFollowUp.agreementReached,
              }
            : item,
        ),
      );
      setSelectedFollowUp((current) =>
        current?.uuid === updatedFollowUp.uuid ? updatedFollowUp : current,
      );
      setEditForm(null);
      setEditErrors({});
      setMessage("Takip kaydı güncellendi.");
    } catch {
      setEditErrors({ form: "Takip kaydı güncellenemedi." });
    } finally {
      setIsUpdatingFollowUp(false);
    }
  }

  function handleCloseFollowUpDetail(): void {
    setSelectedFollowUp(null);
    setSelectedImageIndex(null);
  }

  function handleOpenImageSlider(index: number): void {
    setSelectedImageIndex(index);
  }

  function handleCloseImageSlider(): void {
    setSelectedImageIndex(null);
  }

  function handlePreviousImage(): void {
    if (!selectedFollowUp || selectedImageIndex === null) {
      return;
    }

    setSelectedImageIndex(
      (selectedImageIndex - 1 + selectedFollowUp.images.length) %
        selectedFollowUp.images.length,
    );
  }

  function handleNextImage(): void {
    if (!selectedFollowUp || selectedImageIndex === null) {
      return;
    }

    setSelectedImageIndex(
      (selectedImageIndex + 1) % selectedFollowUp.images.length,
    );
  }

  async function handleOpenCustomerDetail(
    event: MouseEvent<HTMLButtonElement>,
    customerId: number,
  ): Promise<void> {
    event.stopPropagation();

    if (!canViewCustomerDetail || !customerId) {
      return;
    }

    setSelectedCustomerDetail(null);
    setIsLoadingCustomerDetail(true);
    setMessage("");

    try {
      const customer = await getCustomer(customerId, "backend");
      setSelectedCustomerDetail(customer);
    } catch {
      setMessage("Müşteri detayı getirilemedi.");
    } finally {
      setIsLoadingCustomerDetail(false);
    }
  }

  if (!canLoadFollowUps) {
    return (
      <section className="panel-card permission-table-panel">
        <h1>Tüm Takip Kayıtları</h1>
        <p className="muted-text">
          Takip kayıtları listesini görüntüleme yetkiniz yok.
        </p>
      </section>
    );
  }

  return (
    <section className="panel-card permission-table-panel">
      {isLoadingEditForm ? (
        <p className="muted-text">Takip kaydı düzenleme bilgileri yükleniyor...</p>
      ) : null}

      {editForm ? (
        <div className="customer-modal-backdrop" role="presentation">
          <section
            className="customer-modal customer-modal-wide"
            role="dialog"
            aria-modal="true"
          >
            <div className="customer-modal-header">
              <h2>Takip Kaydı Düzenle</h2>
              <button
                className="customer-modal-close"
                type="button"
                disabled={isUpdatingFollowUp}
                onClick={handleCloseEditFollowUp}
              >
                Kapat
              </button>
            </div>
            <hr className="hr-line-grid" />

            <form className="customer-entry-form" onSubmit={handleEditSubmit}>
              <div className="customer-detail-grid task-assign-form-wide">
                <span>Takip Başlığı</span>
                <strong>{editForm.title || "-"}</strong>
                <span>Müşteri</span>
                <strong>{editForm.customerUnvan || "-"}</strong>
              </div>

              <h3 className="task-assign-form-wide">Ziyaret Bilgileri</h3>
              <label className="field-label">
                Görüşme Tarihi
                <input
                  className="panel-input"
                  type="date"
                  value={editForm.visitDate}
                  disabled
                  readOnly
                />
              </label>
              <label className="field-label">
                Bir Sonraki Ziyaret Tarihi
                <input
                  className="panel-input"
                  type="date"
                  min={editForm.visitDate}
                  value={editForm.nextVisitDate}
                  onChange={(event) =>
                    updateEditForm("nextVisitDate", event.target.value)
                  }
                />
                {editErrors.nextVisitDate ? (
                  <span className="customer-field-error">
                    {editErrors.nextVisitDate}
                  </span>
                ) : null}
              </label>
              <label className="field-label">
                Görüşme Türü*
                <select
                  className="panel-input"
                  value={editForm.visitType}
                  onChange={(event) =>
                    updateEditForm("visitType", event.target.value)
                  }
                >
                  <option value="">Seçiniz</option>
                  {followUpVisitTypes.map((visitType) => (
                    <option key={visitType} value={visitType}>
                      {visitType}
                    </option>
                  ))}
                </select>
                {editErrors.visitType ? (
                  <span className="customer-field-error">
                    {editErrors.visitType}
                  </span>
                ) : null}
              </label>
              <h3 className="task-assign-form-wide">Görüşülen Kişi Bilgileri</h3>
              <div className="follow-up-meet-people task-assign-form-wide">
                {editForm.meetPeople.map((person, index) => (
                  <div className="follow-up-meet-person-card" key={person.formId}>
                    <div className="follow-up-meet-person-header">
                      <strong>Görüşülen Kişi {index + 1}</strong>
                      <button
                        className="gray-button"
                        type="button"
                        disabled={editForm.meetPeople.length <= 1}
                        onClick={() => removeEditMeetPerson(person.formId)}
                      >
                        Sil
                      </button>
                    </div>
                    <label className="field-label">
                      Görevi*
                      <select
                        className="panel-input"
                        value={person.title}
                        onChange={(event) =>
                          updateEditMeetPerson(person.formId, "title", event.target.value)
                        }
                      >
                        <option value="">Seçiniz</option>
                        {followUpMeetPersonTitles.map((title) => (
                          <option key={title} value={title}>
                            {title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field-label">
                      Ad*
                      <input
                        className="panel-input"
                        value={person.name}
                        maxLength={50}
                        onChange={(event) =>
                          updateEditMeetPerson(person.formId, "name", event.target.value)
                        }
                      />
                    </label>
                    <label className="field-label">
                      Soyad*
                      <input
                        className="panel-input"
                        value={person.surname}
                        maxLength={50}
                        onChange={(event) =>
                          updateEditMeetPerson(person.formId, "surname", event.target.value)
                        }
                      />
                    </label>
                    <label className="field-label">
                      Telefon*
                      <input
                        className="panel-input"
                        type="tel"
                        inputMode="tel"
                        placeholder="05XXXXXXXXX"
                        value={person.phone}
                        maxLength={20}
                        onChange={(event) =>
                          updateEditMeetPerson(person.formId, "phone", event.target.value)
                        }
                      />
                    </label>
                    <label className="field-label">
                      Eposta
                      <input
                        className="panel-input"
                        type="email"
                        value={person.email}
                        maxLength={100}
                        onChange={(event) =>
                          updateEditMeetPerson(person.formId, "email", event.target.value)
                        }
                      />
                    </label>
                  </div>
                ))}
                {editErrors.meetPeople ? (
                  <span className="customer-field-error">{editErrors.meetPeople}</span>
                ) : null}
                <button
                  className="blue-button follow-up-add-person-button"
                  type="button"
                  onClick={addEditMeetPerson}
                >
                  Kişi Ekle
                </button>
              </div>

              <h3 className="task-assign-form-wide">Anlaşma Bilgileri</h3>
              <label className="field-label">
                Anlaşma Sağlandı mı?
                <select
                  className="panel-input"
                  value={editForm.agreementReached ? "true" : "false"}
                  onChange={(event) =>
                    updateEditForm("agreementReached", event.target.value === "true")
                  }
                >
                  <option value="false">Hayır</option>
                  <option value="true">Evet</option>
                </select>
              </label>
              {!editForm.agreementReached ? (
                <label className="field-label">
                  Anlaşamama Sebebi*
                  <select
                    className="panel-input"
                    value={editForm.agreementFailureReason}
                    onChange={(event) =>
                      updateEditForm("agreementFailureReason", event.target.value)
                    }
                  >
                    <option value="">Seçiniz</option>
                    {followUpAgreementFailureReasons.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                  {editErrors.agreementFailureReason ? (
                    <span className="customer-field-error">
                      {editErrors.agreementFailureReason}
                    </span>
                  ) : null}
                </label>
              ) : null}
              <label className="field-label task-assign-form-wide">
                Not
                <textarea
                  className="panel-input"
                  value={editForm.note}
                  maxLength={150}
                  onChange={(event) => updateEditForm("note", event.target.value)}
                />
                {editErrors.note ? (
                  <span className="customer-field-error">{editErrors.note}</span>
                ) : null}
              </label>

              <h3 className="task-assign-form-wide">Resim</h3>
              {editForm.existingImages.length > 0 ? (
                <div className="follow-up-upload-list task-assign-form-wide">
                  {editForm.existingImages.map((image, index) => (
                    <div key={image.uuid}>
                      <span>Mevcut Resim {index + 1}</span>
                      <button
                        className="gray-button"
                        type="button"
                        onClick={() => removeExistingEditImage(image.uuid)}
                      >
                        Sil
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <label className="field-label task-assign-form-wide">
                <span className="follow-up-upload-box">
                  <input
                    className="follow-up-upload-input"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    onChange={(event) => handleEditImageChange(event.target.files)}
                  />
                  <span className="follow-up-upload-title">
                    Yeni resim seçmek için tıklayın
                  </span>
                  <span className="follow-up-upload-help">
                    JPEG, PNG, JPG, GIF veya WebP. Maksimum 3 resim, toplam 5 MB.
                  </span>
                </span>
                {editErrors.images ? (
                  <span className="customer-field-error">{editErrors.images}</span>
                ) : null}
              </label>
              {editForm.images.length > 0 ? (
                <ul className="follow-up-upload-list task-assign-form-wide">
                  {editForm.images.map((image, index) => (
                    <li key={`${image.name}-${image.size}-${index}`}>
                      <span>{image.name}</span>
                      <span>{formatFileSize(image.size)}</span>
                      <button
                        className="gray-button"
                        type="button"
                        onClick={() => removeNewEditImage(index)}
                      >
                        Sil
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {editErrors.form ? (
                <p className="customer-field-error task-assign-form-wide">
                  {editErrors.form}
                </p>
              ) : null}
              <div className="customer-modal-actions">
                <button
                  className="gray-button"
                  type="button"
                  disabled={isUpdatingFollowUp}
                  onClick={handleCloseEditFollowUp}
                >
                  Vazgeç
                </button>
                <button
                  className="blue-button"
                  type="submit"
                  disabled={isUpdatingFollowUp}
                >
                  {isUpdatingFollowUp ? "Güncelleniyor..." : "Güncelle"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {selectedFollowUp ? (
        <div className="customer-modal-backdrop" role="presentation">
          <section
            className="customer-modal customer-modal-wide"
            role="dialog"
            aria-modal="true"
          >
            <div className="customer-modal-header">
              <h2>Takip Kaydı Detayı</h2>
              <button
                className="customer-modal-close"
                type="button"
                onClick={handleCloseFollowUpDetail}
              >
                Kapat
              </button>
            </div>

            <div className="customer-detail-grid">
              <span>Takip Başlığı</span>
              <strong>{selectedFollowUp.title || "-"}</strong>
              <span>Müşteri</span>
              <strong>{selectedFollowUp.customerUnvan || "-"}</strong>
              <span>Atanan Personel</span>
              <strong>{selectedFollowUp.assignedUserFullName || "-"}</strong>
              <span>Müşteri Bayisi</span>
              <strong>{selectedFollowUp.branchName || "-"}</strong>
              <span>Ziyaret Tipi</span>
              <strong>{selectedFollowUp.visitType || "-"}</strong>
              <span>Ziyaret Tarihi</span>
              <strong>{formatDate(selectedFollowUp.visitDate)}</strong>
              <span>Sonraki Ziyaret Tarihi</span>
              <strong>{formatDate(selectedFollowUp.nextVisitDate)}</strong>
              <span>Anlaşma Sağlandı mı?</span>
              <strong>{formatAgreement(selectedFollowUp.agreementReached)}</strong>
              <span>Anlaşmama Sebebi</span>
              <strong>{selectedFollowUp.agreementFailureReason || "-"}</strong>
              <span>Not</span>
              <strong>{selectedFollowUp.note || "-"}</strong>
            </div>

            <h3>Görüşülen Kişiler</h3>
            <div className="permission-table-scroll">
              <table className="permission-table customer-table">
                <thead>
                  <tr>
                    <th>Ünvan</th>
                    <th>Ad Soyad</th>
                    <th>Telefon</th>
                    <th>E-posta</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedFollowUp.meetPeople.length > 0 ? (
                    selectedFollowUp.meetPeople.map((person) => (
                      <tr key={person.uuid}>
                        <td>{person.title || "-"}</td>
                        <td>{`${person.name} ${person.surname}`.trim() || "-"}</td>
                        <td>{person.phone || "-"}</td>
                        <td>{person.email || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>Görüşülen kişi bulunamadı.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <h3>Resimler</h3>
            {selectedFollowUp.images.length > 0 ? (
              <div className="customer-detail-grid">
                {selectedFollowUp.images.map((image, index) => (
                  <span key={image.uuid}>
                    Resim {index + 1}:{" "}
                    <button
                      className="table-sort-button"
                      type="button"
                      onClick={() => handleOpenImageSlider(index)}
                    >
                      Görüntüle
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted-text">Resim bulunamadı.</p>
            )}
          </section>
        </div>
      ) : null}

      {selectedFollowUp && selectedImageIndex !== null ? (
        <div className="customer-modal-backdrop" role="presentation">
          <section
            className="customer-modal customer-modal-wide follow-up-image-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="customer-modal-header">
              <h2>Takip Kaydı Resimleri</h2>
              <button
                className="customer-modal-close"
                type="button"
                onClick={handleCloseImageSlider}
              >
                Kapat
              </button>
            </div>

            <div className="follow-up-image-slider">
              <button
                className="gray-button"
                type="button"
                disabled={selectedFollowUp.images.length <= 1}
                onClick={handlePreviousImage}
              >
                Önceki
              </button>
              <img
                src={backendAssetUrl(selectedFollowUp.images[selectedImageIndex])}
                alt={`Takip kaydı resmi ${selectedImageIndex + 1}`}
              />
              <button
                className="gray-button"
                type="button"
                disabled={selectedFollowUp.images.length <= 1}
                onClick={handleNextImage}
              >
                Sonraki
              </button>
            </div>

            <p className="muted-text follow-up-image-counter">
              {selectedImageIndex + 1} / {selectedFollowUp.images.length}
            </p>
          </section>
        </div>
      ) : null}

      {selectedCustomerDetail ? (
        <div className="customer-modal-backdrop" role="presentation">
          <section
            className="customer-modal customer-modal-wide"
            role="dialog"
            aria-modal="true"
          >
            <div className="customer-modal-header">
              <h2>Müşteri Detayı</h2>
              <button
                className="customer-modal-close"
                type="button"
                onClick={() => setSelectedCustomerDetail(null)}
              >
                Kapat
              </button>
            </div>

            <div className="customer-detail-grid">
              <span>ID</span>
              <strong>{selectedCustomerDetail.id || "-"}</strong>
              <span>Ünvan</span>
              <strong>{selectedCustomerDetail.unvan || "-"}</strong>
              <span>Ad</span>
              <strong>{selectedCustomerDetail.ad || "-"}</strong>
              <span>Soyad</span>
              <strong>{selectedCustomerDetail.soyad || "-"}</strong>
              <span>Yetkili Adı</span>
              <strong>{selectedCustomerDetail.yetkiliAdi || "-"}</strong>
              <span>Cep</span>
              <strong>{selectedCustomerDetail.cep || "-"}</strong>
              <span>Telefon</span>
              <strong>{selectedCustomerDetail.telefon || "-"}</strong>
              <span>Mahalle</span>
              <strong>{selectedCustomerDetail.mahalle || "-"}</strong>
              <span>İl Kodu</span>
              <strong>{selectedCustomerDetail.ilKodu || "-"}</strong>
              <span>İlçe Kodu</span>
              <strong>{selectedCustomerDetail.ilceKodu || "-"}</strong>
              <span>Vergi No</span>
              <strong>{selectedCustomerDetail.vergiNo || "-"}</strong>
              <span>T.C. No</span>
              <strong>{selectedCustomerDetail.tcNo || "-"}</strong>
              <span>Müşteri Türü</span>
              <strong>{selectedCustomerDetail.type || "-"}</strong>
              <span>Kayıt Tarihi</span>
              <strong>{formatDate(selectedCustomerDetail.createdAt)}</strong>
            </div>
          </section>
        </div>
      ) : null}
      <form className="customer-filter-form" onSubmit={handleFilterSubmit}>
        <div className="customer-filter-actions">
            <h1>Tüm Takip Kayıtları</h1>
            <button className="blue-button" type="submit">Ara</button>
            <button className="gray-button" type="button" onClick={handleResetFilters}>Temizle</button>
            <p className="muted-text">Toplam {total} takip kaydı listeleniyor.</p>
        </div>

        {message ? <p className="form-message">{message}</p> : null}
        {isLoadingCustomerDetail ? (
          <p className="muted-text">Müşteri detayı yükleniyor...</p>
        ) : null}

      
        <div className="permission-table-scroll">
          <table className="permission-table customer-table">
            <thead>
              <tr>
                <th>İşlemler</th>
                <th>
                  Görev Başlığı
                </th>
                <th>Müşteri</th>
                <th>Atanan Personel</th>
                <th>Müşteri Bayisi</th>
                <th>
                  <button
                    className="table-sort-button"
                    type="button"
                    onClick={() => handleSort("visit_date")}
                  >
                    Ziyaret Tarihi {sortIndicator("visit_date", sortBy, sortOrder)}
                  </button>
                </th>
                <th>
                  <button
                    className="table-sort-button"
                    type="button"
                    onClick={() => handleSort("next_visit_date")}
                  >
                    Sonraki Ziyaret Tarihi{" "}
                    {sortIndicator("next_visit_date", sortBy, sortOrder)}
                  </button>
                </th>
                <th>
                  <button
                    className="table-sort-button"
                    type="button"
                    onClick={() => handleSort("agreement_reached")}
                  >
                    Anlaşma Sağlandı mı?{" "}
                    {sortIndicator("agreement_reached", sortBy, sortOrder)}
                  </button>
                </th>
              </tr>
              <tr className="customer-filter-row">
                <th />
                <th>
                  <input
                    className="panel-input"
                    type="text"
                    value={draftFilters.title}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                  />
                </th>
                <th>
                  <input
                    className="panel-input"
                    type="text"
                    value={draftFilters.customer}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        customer: event.target.value,
                      }))
                    }
                  />
                </th>
                <th>
                  <input
                    className="panel-input"
                    type="text"
                    value={draftFilters.assignedUserFullName}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        assignedUserFullName: event.target.value,
                      }))
                    }
                  />
                </th>
                <th>
                  <input
                    className="panel-input"
                    type="text"
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
                  <input
                    className="panel-input"
                    type="text"
                    value={draftFilters.visitDate}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        visitDate: event.target.value,
                      }))
                    }
                  />
                </th>
                <th>
                  <input
                    className="panel-input"
                    type="text"
                    value={draftFilters.nextVisitDate}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        nextVisitDate: event.target.value,
                      }))
                    }
                  />
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((followUp) => (
                  <tr
                    key={followUp.uuid}
                    role="button"
                    tabIndex={0}
                    onClick={() => void handleOpenFollowUpDetail(followUp)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void handleOpenFollowUpDetail(followUp);
                      }
                    }}
                  >
                    <td>
                      <button
                        className="customer-action-button"
                        type="button"
                        disabled={!canViewFollowUpDetail}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleOpenFollowUpDetail(followUp);
                        }}
                        aria-label="Takip kaydını görüntüle"
                      >
                        ⓘ
                      </button>
                      <button
                        className="customer-action-button"
                        type="button"
                        disabled={!canUpdateFollowUps}
                        onClick={(event) => void handleOpenEditFollowUp(event, followUp)}
                        aria-label="Takip kaydını düzenle"
                      >
                        ✎
                      </button>
                    </td>
                    <td>{followUp.title || "-"}</td>
                    <td>
                      <button
                        className="table-sort-button"
                        type="button"
                        disabled={!canViewCustomerDetail}
                        onClick={(event) =>
                          void handleOpenCustomerDetail(
                            event,
                            followUp.customerId,
                          )
                        }
                      >
                        {followUp.customerUnvan || "-"}
                      </button>
                    </td>
                    <td>{followUp.assignedUserFullName || "-"}</td>
                    <td>{followUp.branchName || "-"}</td>
                    <td>{formatDate(followUp.visitDate)}</td>
                    <td>{formatDate(followUp.nextVisitDate)}</td>
                    <td>{formatAgreement(followUp.agreementReached)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    {isLoading ? "Takip kayıtları yükleniyor..." : "Kayıt bulunamadı."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </form>

      <div className="customer-pagination">
        <button
          className="gray-button"
          type="button"
          disabled={currentPage <= 1 || isLoading}
          onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
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
          onClick={() => setCurrentPage((page) => Math.min(lastPage, page + 1))}
        >
          Sonraki
        </button>
      </div>
    </section>
  );
}

function sortIndicator(
  column: FollowUpListQuery["sortBy"],
  sortBy: FollowUpListQuery["sortBy"],
  sortOrder: "asc" | "desc",
): string {
  if (column !== sortBy) {
    return "";
  }

  return sortOrder === "asc" ? "↑" : "↓";
}

function backendAssetUrl(image: FollowUpImage): string {
  const imageUrl = image.url.trim();
  if (!imageUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  return `${apiBaseUrl.replace(/\/$/, "")}/${imageUrl.replace(/^\//, "")}`;
}

function detailToEditForm(detail: FollowUpDetail): FollowUpEditForm {
  return {
    uuid: detail.uuid,
    title: detail.title,
    customerUnvan: detail.customerUnvan,
    visitType: detail.visitType,
    visitDate: detail.visitDate.slice(0, 10),
    nextVisitDate: detail.nextVisitDate.slice(0, 10),
    agreementReached: detail.agreementReached,
    agreementFailureReason: detail.agreementFailureReason,
    note: detail.note,
    existingImages: detail.images,
    images: [],
    meetPeople:
      detail.meetPeople.length > 0
        ? detail.meetPeople.map((person) => ({
            ...person,
            formId: person.uuid || crypto.randomUUID(),
          }))
        : [createEmptyMeetPerson()],
  };
}

function validateEditForm(form: FollowUpEditForm): FollowUpEditErrors {
  const errors: FollowUpEditErrors = {};

  if (!form.visitType.trim()) {
    errors.visitType = "Görüşme türü zorunludur.";
  } else if (!followUpVisitTypes.includes(form.visitType)) {
    errors.visitType = "Görüşme türü geçersiz.";
  }

  if (form.nextVisitDate && form.visitDate && form.nextVisitDate < form.visitDate) {
    errors.nextVisitDate = "Sonraki ziyaret tarihi görüşme tarihinden önce olamaz.";
  }

  if (!form.agreementReached && !form.agreementFailureReason) {
    errors.agreementFailureReason = "Anlaşamama sebebi zorunludur.";
  }

  if (form.note.trim().length > 150) {
    errors.note = "Not en fazla 150 karakter olabilir.";
  }

  if (form.existingImages.length + form.images.length > 3) {
    errors.images = "En fazla 3 resim seçilebilir.";
  }

  const totalImageSize = form.images.reduce((total, image) => total + image.size, 0);
  if (totalImageSize > 5 * 1024 * 1024) {
    errors.images = "Dosyaların toplam boyutu en fazla 5 MB olabilir.";
  }

  if (form.meetPeople.length === 0) {
    errors.meetPeople = "En az bir kişi bilgisi girilmelidir.";
  } else if (
    form.meetPeople.some(
      (person) =>
        !person.title.trim() ||
        !person.name.trim() ||
        !person.surname.trim() ||
        !person.phone.trim(),
    )
  ) {
    errors.meetPeople = "Görev, ad, soyad ve telefon alanları zorunludur.";
  }

  return errors;
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  if (!value) {
    return "-";
  }

  return value.slice(0, 10);
}

function formatAgreement(value: boolean): string {
  return value ? "Evet" : "Hayır";
}
