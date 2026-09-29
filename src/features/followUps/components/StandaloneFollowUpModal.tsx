import { Button } from "@adminlte/react";
import { FormEvent, useEffect, useState } from "react";

import { FollowUpRecordFormBody } from "@/features/followUps/components/FollowUpRecordFormBody";
import { ControlledModal } from "@/shared/components/ControlledModal";
import { CrmFormSection } from "@/shared/components/CrmFormSection";

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

const standaloneFollowUpFormId = "follow-up-standalone-form";
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
    <ControlledModal
      isOpen
      onClose={onClose}
      title="Takip Kaydı"
      size="xl"
      footer={
        <>
          <Button
            theme="secondary"
            size="sm"
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Vazgeç
          </Button>
          <Button
            theme="primary"
            size="sm"
            type="submit"
            form={standaloneFollowUpFormId}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </>
      }
    >
        <form
          id={standaloneFollowUpFormId}
          className="customer-entry-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <FollowUpRecordFormBody
            formScope="follow-up-standalone"
            headerSummary={
              <div className="customer-detail-grid">
                <span>Görev</span>
                <strong>Görevsiz Takip</strong>
                <span>Müşteri</span>
                <strong>{customerDisplayName(customer)}</strong>
              </div>
            }
            visitDate={form.visitDate}
            nextVisitDate={form.nextVisitDate}
            visitType={form.visitType}
            minVisitDate={todayDate()}
            onVisitDateChange={(value) => updateForm("visitDate", value)}
            onNextVisitDateChange={(value) => updateForm("nextVisitDate", value)}
            onVisitTypeChange={(value) =>
              updateForm("visitType", value as FollowUpVisitType | "")
            }
            visitDateError={errors.visitDate}
            nextVisitDateError={errors.nextVisitDate}
            visitTypeError={errors.visitType}
            meetPeople={form.meetPeople.map((person) => ({
              rowKey: person.id,
              title: person.title,
              name: person.name,
              surname: person.surname,
              phone: person.phone,
              email: person.email,
            }))}
            meetPeopleError={errors.meetPeople}
            meetPersonFieldError={(rowKey, field) =>
              errors[personErrorKey(rowKey, field as MeetPersonField)]
            }
            onMeetPersonChange={(rowKey, field, value) =>
              updatePerson(rowKey, field as MeetPersonField, value)
            }
            onAddMeetPerson={addPerson}
            onRemoveMeetPerson={removePerson}
            beforeAgreement={
              <CrmFormSection title="Firma Bilgileri">
                <div className="customer-detail-grid">
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
                  <p className="text-danger small mb-0 mt-2">{companyInfoMessage}</p>
                ) : null}
              </CrmFormSection>
            }
            agreementReached={form.agreementReached}
            agreementFailureReason={form.agreementFailureReason}
            onAgreementReachedChange={(value) => updateForm("agreementReached", value)}
            onAgreementFailureReasonChange={(value) =>
              updateForm(
                "agreementFailureReason",
                value as FollowUpAgreementFailureReason | "",
              )
            }
            agreementFailureReasonError={errors.agreementFailureReason}
            note={form.note}
            onNoteChange={(value) => updateForm("note", value)}
            noteError={errors.note}
            newImages={form.images}
            onNewImagesChange={(files) =>
              updateForm("images", Array.from(files ?? []))
            }
            imagesError={errors.images}
            formError={errors.form}
          />

        </form>
    </ControlledModal>
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

