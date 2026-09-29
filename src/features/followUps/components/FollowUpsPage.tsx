import { Button } from "@adminlte/react";
import { FormEvent, useCallback, useMemo, useRef, useState } from "react";

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
  type FollowUpMeetPerson,
  type FollowUpUpdateInput,
} from "@/features/followUps/services/followUpApi";
import {
  FollowUpsDataTable,
  type FollowUpsDataTableHandle,
  type FollowUpsListMeta,
} from "@/features/followUps/components/FollowUpsDataTable";
import { FollowUpRecordFormBody } from "@/features/followUps/components/FollowUpRecordFormBody";
import { followUpVisitTypes } from "@/features/followUps/constants/followUpFormConstants";
import { apiBaseUrl } from "@/services/apiClient";
import { ListTableToolbar } from "@/shared/components";
import { ContentHeader } from "@/shared/components/ContentHeader";
import { ControlledModal } from "@/shared/components/ControlledModal";

type FollowUpsPageProps = {
  permissions: Permission[];
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

const followUpEditFormId = "follow-ups-edit-form";

const emptyListMeta: FollowUpsListMeta = {
  total: 0,
  currentPage: 1,
  lastPage: 1,
};

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

  const tableRef = useRef<FollowUpsDataTableHandle>(null);
  const [listMeta, setListMeta] = useState<FollowUpsListMeta>(emptyListMeta);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [message, setMessage] = useState("");

  const followUpListLoader = useMemo(
    () => (canListFollowUps ? listFollowUps : listAssignedFollowUps),
    [canListFollowUps],
  );

  const handleTableError = useCallback((errorMessage: string) => {
    setMessage(errorMessage);
  }, []);

  const handleLoadMeta = useCallback((meta: FollowUpsListMeta) => {
    setListMeta(meta);
  }, []);
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

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setMessage("");
    tableRef.current?.applyFilters();
  }

  function handleResetFilters(): void {
    setMessage("");
    tableRef.current?.clearFilters();
  }

  function closeFollowUpModals(): void {
    setSelectedFollowUp(null);
    setSelectedImageIndex(null);
    setEditForm(null);
    setEditErrors({});
    setSelectedCustomerDetail(null);
  }

  async function handleOpenFollowUpDetail(
    followUp: FollowUpListItem,
  ): Promise<void> {
    if (!canViewFollowUpDetail) {
      return;
    }

    setMessage("");
    closeFollowUpModals();

    try {
      const detail = await getFollowUp(followUp.uuid);
      setSelectedFollowUp(detail);
    } catch {
      setMessage("Takip kaydı detayı getirilemedi.");
    }
  }

  async function handleOpenEditFollowUp(
    followUp: FollowUpListItem,
  ): Promise<void> {
    if (!canUpdateFollowUps) {
      return;
    }

    setMessage("");
    closeFollowUpModals();
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

      tableRef.current?.refresh();
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

  async function handleOpenCustomerDetail(customerId: number): Promise<void> {
    if (!canViewCustomerDetail || !customerId) {
      return;
    }

    closeFollowUpModals();
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
      <>
        <ContentHeader
          title="Tüm Takip Kayıtları"
          breadcrumbs={[
            { label: "Ana Sayfa", href: "/home" },
            { label: "Tüm Takip Kayıtları", active: true },
          ]}
        />
        <section className="card mb-3">
          <div className="card-body">
            <p className="text-muted small mb-0">
              Takip kayıtları listesini görüntüleme yetkiniz yok.
            </p>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <ContentHeader
        title="Tüm Takip Kayıtları"
        breadcrumbs={[
          { label: "Ana Sayfa", href: "/home" },
          { label: "Tüm Takip Kayıtları", active: true },
        ]}
      />
      <section className="card list-table-card mb-3">
      {isLoadingEditForm ? (
        <p className="card-body pb-0 text-muted small mb-0">
          Takip kaydı düzenleme bilgileri yükleniyor...
        </p>
      ) : null}
      <form className="customer-filter-form" onSubmit={handleFilterSubmit}>
        <ListTableToolbar>
          <button
            className="btn btn-primary btn-sm"
            type="submit"
            disabled={isTableLoading}
          >
            Filtrele
          </button>
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            disabled={isTableLoading}
            onClick={handleResetFilters}
          >
            Temizle
          </button>
        </ListTableToolbar>

        {message || isLoadingCustomerDetail ? (
          <div className="card-body pb-0">
            {message ? (
              <p className="alert alert-danger py-2 mb-2 customer-message">{message}</p>
            ) : null}
            {isLoadingCustomerDetail ? (
              <p className="text-muted small mb-0">Müşteri detayı yükleniyor...</p>
            ) : null}
          </div>
        ) : null}

        <div className="card-body p-0">
          <FollowUpsDataTable
            ref={tableRef}
            listLoader={followUpListLoader}
            canViewFollowUpDetail={canViewFollowUpDetail}
            canUpdateFollowUps={canUpdateFollowUps}
            canViewCustomerDetail={canViewCustomerDetail}
            onOpenFollowUpDetail={(followUp) => void handleOpenFollowUpDetail(followUp)}
            onOpenEditFollowUp={(followUp) => void handleOpenEditFollowUp(followUp)}
            onOpenCustomerDetail={(customerId) =>
              void handleOpenCustomerDetail(customerId)
            }
            onError={handleTableError}
            onLoadMeta={handleLoadMeta}
            onLoadingChange={setIsTableLoading}
          />
        </div>

        <div
          className={`card-footer list-table-footer py-2${isTableLoading ? " list-table-footer--loading" : ""}`}
        >
          <span className="text-muted small list-table-footer-summary">
            Toplam <strong>{listMeta.total}</strong> kayıt
            <span className="mx-1" aria-hidden="true">
              ·
            </span>
            Sayfa {listMeta.currentPage} / {Math.max(1, listMeta.lastPage)}
          </span>
        </div>
      </form>
    </section>

      {editForm ? (
        <ControlledModal
          isOpen
          onClose={handleCloseEditFollowUp}
          title="Takip Kaydı Düzenle"
          size="xl"
          footer={
            <>
              <Button
                theme="secondary"
                size="sm"
                type="button"
                disabled={isUpdatingFollowUp}
                onClick={handleCloseEditFollowUp}
              >
                Vazgeç
              </Button>
              <Button
                theme="primary"
                size="sm"
                type="submit"
                form={followUpEditFormId}
                disabled={isUpdatingFollowUp}
              >
                {isUpdatingFollowUp ? "Güncelleniyor..." : "Güncelle"}
              </Button>
            </>
          }
        >
            <form
              id={followUpEditFormId}
              className="customer-entry-form"
              onSubmit={handleEditSubmit}
              noValidate
            >
              <FollowUpRecordFormBody
                formScope="follow-ups-edit"
                headerSummary={
                  <div className="customer-detail-grid task-assign-form-wide mb-3">
                    <span>Takip Başlığı</span>
                    <strong>{editForm.title || "-"}</strong>
                    <span>Müşteri</span>
                    <strong>{editForm.customerUnvan || "-"}</strong>
                  </div>
                }
                visitDate={editForm.visitDate}
                nextVisitDate={editForm.nextVisitDate}
                visitType={editForm.visitType}
                visitDateLabel="Görüşme Tarihi"
                visitDateReadOnly
                onNextVisitDateChange={(value) =>
                  updateEditForm("nextVisitDate", value)
                }
                onVisitTypeChange={(value) => updateEditForm("visitType", value)}
                nextVisitDateError={editErrors.nextVisitDate}
                visitTypeError={editErrors.visitType}
                meetPeople={editForm.meetPeople.map((person) => ({
                  rowKey: person.formId,
                  title: person.title,
                  name: person.name,
                  surname: person.surname,
                  phone: person.phone,
                  email: person.email,
                }))}
                meetPeopleError={editErrors.meetPeople}
                onMeetPersonChange={(rowKey, field, value) =>
                  updateEditMeetPerson(
                    rowKey,
                    field as keyof Omit<EditMeetPersonForm, "formId" | "uuid">,
                    value,
                  )
                }
                onAddMeetPerson={addEditMeetPerson}
                onRemoveMeetPerson={removeEditMeetPerson}
                agreementReached={editForm.agreementReached}
                agreementFailureReason={editForm.agreementFailureReason}
                onAgreementReachedChange={(value) =>
                  updateEditForm("agreementReached", value)
                }
                onAgreementFailureReasonChange={(value) =>
                  updateEditForm("agreementFailureReason", value)
                }
                agreementFailureReasonError={editErrors.agreementFailureReason}
                note={editForm.note}
                onNoteChange={(value) => updateEditForm("note", value)}
                noteError={editErrors.note}
                existingImages={editForm.existingImages.map((image, index) => ({
                  uuid: image.uuid,
                  label: `Mevcut Resim ${index + 1}`,
                }))}
                onRemoveExistingImage={removeExistingEditImage}
                newImages={editForm.images}
                onNewImagesChange={handleEditImageChange}
                onRemoveNewImage={removeNewEditImage}
                imagesError={editErrors.images}
                formError={editErrors.form}
              />
            </form>
        </ControlledModal>
      ) : null}
      {selectedFollowUp ? (
        <ControlledModal
          isOpen
          onClose={handleCloseFollowUpDetail}
          title="Takip Kaydı Detayı"
          size="xl"
        >
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
            <div className="table-responsive">
              <table className="table table-striped table-hover table-sm mb-0">
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
                      className="btn btn-link btn-sm p-0 border-0 text-start"
                      type="button"
                      onClick={() => handleOpenImageSlider(index)}
                    >
                      Görüntüle
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-muted small">Resim bulunamadı.</p>
            )}
        </ControlledModal>
      ) : null}

      {selectedFollowUp && selectedImageIndex !== null ? (
        <ControlledModal
          isOpen
          onClose={handleCloseImageSlider}
          title="Takip Kaydı Resimleri"
          size="xl"
        >
            <div className="follow-up-image-slider follow-up-image-modal">
              <button
                className="btn btn-secondary btn-sm"
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
                className="btn btn-secondary btn-sm"
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
        </ControlledModal>
      ) : null}

      {selectedCustomerDetail ? (
        <ControlledModal
          isOpen
          onClose={() => setSelectedCustomerDetail(null)}
          title="Müşteri Detayı"
          size="xl"
        >
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
        </ControlledModal>
      ) : null}
    </>
  );
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
  } else if (!(followUpVisitTypes as readonly string[]).includes(form.visitType)) {
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

function formatDate(value: string): string {
  if (!value) {
    return "-";
  }

  return value.slice(0, 10);
}

function formatAgreement(value: boolean): string {
  return value ? "Evet" : "Hayır";
}
