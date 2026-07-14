import { FormEvent, useEffect, useState } from "react";

import {
  getCustomer,
  type Customer,
  type CustomerDetail,
} from "@/features/customers/services/customerApi";
import {
  createStandaloneFollowUp,
  FollowUpValidationError,
  type FollowUpAgreementFailureReason,
  type FollowUpFormPayload,
  type FollowUpMeetPersonTitle,
  type FollowUpVisitType,
} from "@/features/tasks/services/taskApi";

const visitTypes: FollowUpVisitType[] = ["Yerinde Ziyaret"];
const failureReasons: FollowUpAgreementFailureReason[] = [
  "Fiyat yüksek",
  "Mesafe Uzak",
  "Bayi ile yaşanan sorunlar",
  "Ekpertize ihtiyaç duymuyor",
  "Kendisi yapıyor",
  "Başka ekspertize yaptırıyor",
  "Değerlendirme",
];
const personTitles: FollowUpMeetPersonTitle[] = [
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
const imageTypes = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const maxImageTotalSize = 5 * 1024 * 1024;

type MeetPersonForm = {
  id: string;
  title: FollowUpMeetPersonTitle | "";
  name: string;
  surname: string;
  phone: string;
  email: string;
};

type FollowUpForm = Omit<FollowUpFormPayload, "meetPeople" | "visitType"> & {
  visitType: FollowUpVisitType | "";
  meetPeople: MeetPersonForm[];
};

type FormErrors = Record<string, string | undefined>;
type MeetPersonField = keyof Omit<MeetPersonForm, "id">;

type StandaloneFollowUpModalProps = {
  customer: Customer;
  onClose: () => void;
  onCreated: () => void;
};

export function StandaloneFollowUpModal({
  customer,
  onClose,
  onCreated,
}: StandaloneFollowUpModalProps) {
  const [form, setForm] = useState<FollowUpForm>(() => createEmptyForm());
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(
    null,
  );
  const [plusCardDetail, setPlusCardDetail] = useState<CustomerDetail | null>(
    null,
  );
  const [isCompanyInfoLoading, setIsCompanyInfoLoading] = useState(true);
  const [companyInfoMessage, setCompanyInfoMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadCompanyInfo(): Promise<void> {
      setIsCompanyInfoLoading(true);
      setCompanyInfoMessage("");
      try {
        const backendDetail = await getCustomer(customer.id, "backend");
        if (!isActive) return;
        setCustomerDetail(backendDetail);

        if (backendDetail.uoId > 0) {
          try {
            const umramonlineDetail = await getCustomer(
              backendDetail.uoId,
              "umramonline",
            );
            if (isActive) setPlusCardDetail(umramonlineDetail);
          } catch {
            if (isActive) setCompanyInfoMessage("PlusCard bilgileri getirilemedi.");
          }
        }
      } catch {
        if (isActive) setCompanyInfoMessage("Firma bilgileri getirilemedi.");
      } finally {
        if (isActive) setIsCompanyInfoLoading(false);
      }
    }

    void loadCompanyInfo();
    return () => {
      isActive = false;
    };
  }, [customer.id]);

  function updateForm<K extends keyof FollowUpForm>(
    field: K,
    value: FollowUpForm[K],
  ): void {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "agreementReached" && value === true) {
        next.agreementFailureReason = "";
      }
      if (
        field === "visitDate" &&
        typeof value === "string" &&
        next.nextVisitDate &&
        next.nextVisitDate < value
      ) {
        next.nextVisitDate = value;
      }
      return next;
    });
    setErrors((current) => ({ ...current, [field]: "", form: "" }));
  }

  function updatePerson(id: string, field: MeetPersonField, value: string): void {
    setForm((current) => ({
      ...current,
      meetPeople: current.meetPeople.map((person) =>
        person.id === id ? { ...person, [field]: value } : person,
      ),
    }));
    setErrors((current) => ({
      ...current,
      [personErrorKey(id, field)]: "",
      form: "",
    }));
  }

  function addPerson(): void {
    setForm((current) => ({
      ...current,
      meetPeople: [...current.meetPeople, createEmptyPerson()],
    }));
    setErrors((current) => ({ ...current, meetPeople: "" }));
  }

  function removePerson(id: string): void {
    setForm((current) => ({
      ...current,
      meetPeople:
        current.meetPeople.length <= 1
          ? current.meetPeople
          : current.meetPeople.filter((person) => person.id !== id),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      scrollToFirstError(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    try {
      await createStandaloneFollowUp({
        customerId: customer.id,
        visitDate: form.visitDate,
        nextVisitDate: form.nextVisitDate,
        visitType: form.visitType as FollowUpVisitType,
        agreementReached: form.agreementReached,
        agreementFailureReason: form.agreementFailureReason,
        note: form.note,
        meetPeople: form.meetPeople.map(({ title, name, surname, phone, email }) => ({
          title,
          name: name.trim(),
          surname: surname.trim(),
          phone: phone.trim(),
          email: email.trim(),
        })),
        images: form.images,
      });
      onCreated();
    } catch (error: unknown) {
      if (error instanceof FollowUpValidationError) {
        const apiErrors = apiErrorsToFormErrors(error.errors, form.meetPeople);
        setErrors(apiErrors);
        scrollToFirstError(apiErrors);
      } else {
        setErrors({ form: "Takip kaydı oluşturulamadı." });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="customer-modal-backdrop" role="presentation">
      <section
        className="customer-modal customer-modal-wide"
        role="dialog"
        aria-modal="true"
      >
        <div className="customer-modal-header">
          <h2>Takip Kaydı</h2>
          <button
            className="customer-modal-close"
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Kapat
          </button>
        </div>
        <hr className="hr-line-grid" />

        <form className="customer-entry-form" onSubmit={handleSubmit}>
          <div className="customer-detail-grid task-assign-form-wide">
            <span>Görev</span>
            <strong>Görevsiz Takip</strong>
            <span>Müşteri</span>
            <strong>{customerDisplayName(customer)}</strong>
          </div>

          <h3 className="task-assign-form-wide">Ziyaret Bilgileri</h3>
          <label className="field-label">
            Görüşme Tarihi*
            <input
              className="panel-input"
              type="date"
              min={todayDate()}
              data-follow-up-error-field="visitDate"
              value={form.visitDate}
              onChange={(event) => updateForm("visitDate", event.target.value)}
            />
            {fieldError(errors, "visitDate")}
          </label>
          <label className="field-label">
            Bir Sonraki Ziyaret Tarihi
            <input
              className="panel-input"
              type="date"
              min={form.visitDate}
              data-follow-up-error-field="nextVisitDate"
              value={form.nextVisitDate}
              onChange={(event) => updateForm("nextVisitDate", event.target.value)}
            />
            {fieldError(errors, "nextVisitDate")}
          </label>
          <label className="field-label">
            Görüşme Türü*
            <select
              className="panel-input"
              data-follow-up-error-field="visitType"
              value={form.visitType}
              onChange={(event) =>
                updateForm("visitType", event.target.value as FollowUpVisitType | "")
              }
            >
              <option value="">Seçiniz</option>
              {visitTypes.map((visitType) => (
                <option key={visitType} value={visitType}>
                  {visitType}
                </option>
              ))}
            </select>
            {fieldError(errors, "visitType")}
          </label>

          <h3 className="task-assign-form-wide">Görüşülen Kişi Bilgileri</h3>
          <div
            className="follow-up-meet-people task-assign-form-wide"
            data-follow-up-error-field="meetPeople"
            tabIndex={-1}
          >
            {form.meetPeople.map((person, index) => (
              <div className="follow-up-meet-person-card" key={person.id}>
                <div className="follow-up-meet-person-header">
                  <strong>Görüşülen Kişi {index + 1}</strong>
                  <button
                    className="gray-button"
                    type="button"
                    disabled={form.meetPeople.length <= 1}
                    onClick={() => removePerson(person.id)}
                  >
                    Sil
                  </button>
                </div>
                <label className="field-label">
                  Görevi*
                  <select
                    className="panel-input"
                    data-follow-up-error-field={personErrorKey(person.id, "title")}
                    value={person.title}
                    onChange={(event) => updatePerson(person.id, "title", event.target.value)}
                  >
                    <option value="">Seçiniz</option>
                    {personTitles.map((title) => (
                      <option key={title} value={title}>
                        {title}
                      </option>
                    ))}
                  </select>
                  {fieldError(errors, personErrorKey(person.id, "title"))}
                </label>
                <PersonInput
                  label="Ad*"
                  field="name"
                  person={person}
                  errors={errors}
                  onChange={updatePerson}
                />
                <PersonInput
                  label="Soyad*"
                  field="surname"
                  person={person}
                  errors={errors}
                  onChange={updatePerson}
                />
                <PersonInput
                  label="Telefon*"
                  field="phone"
                  person={person}
                  errors={errors}
                  onChange={updatePerson}
                />
                <PersonInput
                  label="Eposta"
                  field="email"
                  person={person}
                  errors={errors}
                  onChange={updatePerson}
                />
              </div>
            ))}
            {fieldError(errors, "meetPeople")}
            <button
              className="blue-button follow-up-add-person-button"
              type="button"
              onClick={addPerson}
            >
              Kişi Ekle
            </button>
          </div>

          <h3 className="task-assign-form-wide">Firma Bilgileri</h3>
          <div className="customer-detail-grid task-assign-form-wide">
            <span>Firma Adı</span>
            <strong>{customer.unvan || "-"}</strong>
            <span>E-posta</span>
            <strong>
              {isCompanyInfoLoading ? "Yükleniyor..." : customerDetail?.eposta || "-"}
            </strong>
            <span>Pluscard No</span>
            <strong>
              {isCompanyInfoLoading
                ? "Yükleniyor..."
                : plusCardDetail?.plusCardNo || customer.plusCardNo || "-"}
            </strong>
            <span>PlusCard Kredi</span>
            <strong>
              {isCompanyInfoLoading
                ? "Yükleniyor..."
                : plusCardDetail?.credit || customer.credit || "-"}
            </strong>
            <span>Pluscard Puan</span>
            <strong>
              {isCompanyInfoLoading ? "Yükleniyor..." : plusCardDetail?.point || "-"}
            </strong>
            <span>Araç Stok Adedi</span>
            <strong>
              {customerDetail?.vehicleStockCount ?? customer.vehicleStockCount ?? "-"}
            </strong>
          </div>
          {companyInfoMessage ? (
            <p className="customer-field-error task-assign-form-wide">
              {companyInfoMessage}
            </p>
          ) : null}

          <h3 className="task-assign-form-wide">Anlaşma Bilgileri</h3>
          <label className="field-label">
            Anlaşma Sağlandı mı?
            <select
              className="panel-input"
              value={form.agreementReached ? "true" : "false"}
              onChange={(event) =>
                updateForm("agreementReached", event.target.value === "true")
              }
            >
              <option value="false">Hayır</option>
              <option value="true">Evet</option>
            </select>
          </label>
          {!form.agreementReached ? (
            <label className="field-label">
              Anlaşamama Sebebi*
              <select
                className="panel-input"
                data-follow-up-error-field="agreementFailureReason"
                value={form.agreementFailureReason}
                onChange={(event) =>
                  updateForm(
                    "agreementFailureReason",
                    event.target.value as FollowUpAgreementFailureReason | "",
                  )
                }
              >
                <option value="">Seçiniz</option>
                {failureReasons.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
              {fieldError(errors, "agreementFailureReason")}
            </label>
          ) : null}
          <label className="field-label task-assign-form-wide">
            Not
            <textarea
              className="panel-input"
              data-follow-up-error-field="note"
              maxLength={150}
              value={form.note}
              onChange={(event) => updateForm("note", event.target.value)}
            />
            {fieldError(errors, "note")}
          </label>

          <h3 className="task-assign-form-wide">Resim</h3>
          <label className="field-label task-assign-form-wide">
            <span className="follow-up-upload-box">
              <input
                className="follow-up-upload-input"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                data-follow-up-error-field="images"
                onChange={(event) =>
                  updateForm("images", Array.from(event.target.files ?? []))
                }
              />
              <span className="follow-up-upload-title">
                Resim seçmek için tıklayın
              </span>
              <span className="follow-up-upload-help">
                JPEG, PNG, JPG, GIF veya WebP. Maksimum 3 resim, toplam 5 MB.
              </span>
            </span>
            {fieldError(errors, "images")}
          </label>
          {form.images.length > 0 ? (
            <ul className="follow-up-upload-list task-assign-form-wide">
              {form.images.map((image) => (
                <li key={`${image.name}-${image.size}`}>
                  <span>{image.name}</span>
                  <span>{formatFileSize(image.size)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {errors.form ? (
            <p className="customer-field-error task-assign-form-wide">{errors.form}</p>
          ) : null}

          <div className="customer-modal-actions">
            <button
              className="gray-button"
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Vazgeç
            </button>
            <button className="blue-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

type PersonInputProps = {
  label: string;
  field: "name" | "surname" | "phone" | "email";
  person: MeetPersonForm;
  errors: FormErrors;
  onChange: (id: string, field: MeetPersonField, value: string) => void;
};

function PersonInput({
  label,
  field,
  person,
  errors,
  onChange,
}: PersonInputProps) {
  const key = personErrorKey(person.id, field);
  return (
    <label className="field-label">
      {label}
      <input
        className="panel-input"
        type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
        inputMode={field === "phone" ? "tel" : undefined}
        placeholder={field === "phone" ? "05XXXXXXXXX" : undefined}
        maxLength={field === "phone" ? 11 : field === "email" ? 100 : 50}
        data-follow-up-error-field={key}
        value={person[field]}
        onChange={(event) => onChange(person.id, field, event.target.value)}
      />
      {fieldError(errors, key)}
    </label>
  );
}

function createEmptyForm(): FollowUpForm {
  return {
    visitDate: todayDate(),
    nextVisitDate: "",
    visitType: "Yerinde Ziyaret",
    meetPeople: [createEmptyPerson()],
    agreementReached: false,
    agreementFailureReason: "",
    note: "",
    images: [],
  };
}

function createEmptyPerson(): MeetPersonForm {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: "",
    name: "",
    surname: "",
    phone: "",
    email: "",
  };
}

function validateForm(form: FollowUpForm): FormErrors {
  const errors: FormErrors = {};
  if (!form.visitDate) errors.visitDate = "Görüşme tarihi zorunludur.";
  if (form.visitDate && form.nextVisitDate && form.nextVisitDate < form.visitDate) {
    errors.nextVisitDate =
      "Bir sonraki ziyaret tarihi görüşme tarihinden önce olamaz.";
  }
  if (!form.visitType) errors.visitType = "Görüşme türü zorunludur.";
  if (form.meetPeople.length === 0) {
    errors.meetPeople = "En az bir kişi bilgisi girilmelidir.";
  }
  form.meetPeople.forEach((person) => {
    if (!person.title) {
      errors[personErrorKey(person.id, "title")] = "Görev zorunludur.";
    }
    if (!person.name.trim()) {
      errors[personErrorKey(person.id, "name")] = "Ad zorunludur.";
    }
    if (!person.surname.trim()) {
      errors[personErrorKey(person.id, "surname")] = "Soyad zorunludur.";
    }
    if (!person.phone.trim()) {
      errors[personErrorKey(person.id, "phone")] = "Telefon zorunludur.";
    } else if (!/^05[0-9]{9}$/.test(person.phone.trim())) {
      errors[personErrorKey(person.id, "phone")] =
        "Telefon 05XXXXXXXXX formatında olmalıdır.";
    }
  });
  if (!form.agreementReached && !form.agreementFailureReason) {
    errors.agreementFailureReason = "Anlaşamama sebebi zorunludur.";
  }
  if (form.note.trim().length > 150) {
    errors.note = "Not en fazla 150 karakter olabilir.";
  }
  if (form.images.length > 3) {
    errors.images = "En fazla 3 resim yüklenebilir.";
  }
  if (form.images.reduce((total, image) => total + image.size, 0) > maxImageTotalSize) {
    errors.images = "Resimlerin toplam boyutu en fazla 5 MB olabilir.";
  }
  if (form.images.some((image) => !imageTypes.has(image.type))) {
    errors.images =
      "Sadece JPEG, PNG, JPG, GIF veya WebP dosyaları yüklenebilir.";
  }
  return errors;
}

function apiErrorsToFormErrors(
  apiErrors: Record<string, string>,
  people: MeetPersonForm[],
): FormErrors {
  const errors: FormErrors = {};
  Object.entries(apiErrors).forEach(([field, message]) => {
    const personMatch = field.match(
      /^meet_people\.(\d+)\.(title|name|surname|phone|email)$/,
    );
    if (personMatch) {
      const person = people[Number(personMatch[1])];
      if (person) {
        errors[personErrorKey(person.id, personMatch[2] as MeetPersonField)] =
          message;
      }
      return;
    }
    const fieldMap: Record<string, string> = {
      visit_date: "visitDate",
      next_visit_date: "nextVisitDate",
      visit_type: "visitType",
      agreement_failure_reason: "agreementFailureReason",
      meet_people: "meetPeople",
      images: "images",
      note: "note",
    };
    errors[fieldMap[field] ?? "form"] = message;
  });
  return errors;
}

function personErrorKey(id: string, field: MeetPersonField): string {
  return `meetPeople.${id}.${field}`;
}

function fieldError(errors: FormErrors, key: string) {
  return errors[key] ? (
    <span className="customer-field-error">{errors[key]}</span>
  ) : null;
}

function scrollToFirstError(errors: FormErrors): void {
  const firstKey = Object.keys(errors).find((key) => errors[key]);
  if (!firstKey) return;
  window.requestAnimationFrame(() => {
    const target = Array.from(
      document.querySelectorAll<HTMLElement>("[data-follow-up-error-field]"),
    ).find((element) => element.dataset.followUpErrorField === firstKey);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.querySelector<HTMLElement>("input, select, textarea")?.focus({
      preventScroll: true,
    });
  });
}

function customerDisplayName(customer: Customer): string {
  return (
    [customer.ad, customer.soyad].filter(Boolean).join(" ").trim() ||
    customer.unvan ||
    "-"
  );
}

function todayDate(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
