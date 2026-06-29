import { FormEvent, useEffect, useState } from "react";

import {
  completeFullRegistration,
  fullRegistrationPhoneExists,
  getFullRegistrationCustomer,
  listBranches,
  listCities,
  listTowns,
  CustomerValidationError,
  type Branch,
  type City,
  type CustomerTelephone,
  type CustomerValidationErrors,
  type Town,
} from "@/features/customers/services/customerApi";

type CustomerFullRegistrationPageProps = {
  customerId: number;
  onBack: () => void;
};

type FullRegistrationType = "bireysel" | "kurumsal";

type FullRegistrationForm = {
  type: FullRegistrationType;
  cep: string;
  ad: string;
  soyad: string;
  tcNo: string;
  dogumTarihi: string;
  eposta: string;
  website: string;
  googleMapLink: string;
  classifiedsWebsiteLink: string;
  vehicleStockCount: string;
  branchId: string;
  telephones: CustomerTelephone[];
  ilKodu: string;
  ilceKodu: string;
  mahalle: string;
  addressDetail: string;
};

const emptyFullRegistrationForm: FullRegistrationForm = {
  type: "bireysel",
  cep: "",
  ad: "",
  soyad: "",
  tcNo: "",
  dogumTarihi: "",
  eposta: "",
  website: "",
  googleMapLink: "",
  classifiedsWebsiteLink: "",
  vehicleStockCount: "",
  branchId: "",
  telephones: [],
  ilKodu: "",
  ilceKodu: "",
  mahalle: "",
  addressDetail: "",
};

const customerTextMaxLength = 255;
const telephoneTitleMaxLength = 255;
const turkeyMobilePhoneRegex = /^05[0-9]{9}$/;

export function CustomerFullRegistrationPage({
  customerId,
  onBack,
}: CustomerFullRegistrationPageProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<FullRegistrationForm>(emptyFullRegistrationForm);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [towns, setTowns] = useState<Town[]>([]);
  const [errors, setErrors] = useState<CustomerValidationErrors>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadInitialData(): Promise<void> {
      try {
        const [customer, nextBranches, nextCities] = await Promise.all([
          getFullRegistrationCustomer(customerId),
          listBranches(),
          listCities(),
        ]);

        if (!isActive) {
          return;
        }

        setBranches(nextBranches);
        setCities(nextCities);
        setForm({
          type: customer.type === "kurumsal" ? "kurumsal" : "bireysel",
          cep: customer.cep,
          ad: customer.ad,
          soyad: customer.soyad,
          tcNo: customer.tcNo,
          dogumTarihi: customer.dogumTarihi,
          eposta: customer.eposta,
          website: customer.website,
          googleMapLink: customer.googleMapLink,
          classifiedsWebsiteLink: customer.classifiedsWebsiteLink,
          vehicleStockCount:
            customer.vehicleStockCount === null ? "" : String(customer.vehicleStockCount),
          branchId: customer.branchId === null ? "" : String(customer.branchId),
          telephones: customer.telephones,
          ilKodu: customer.ilKodu,
          ilceKodu: customer.ilceKodu,
          mahalle: customer.mahalle,
          addressDetail: customer.addressDetail,
        });
      } catch {
        if (isActive) {
          setMessage("Tam kayıt bilgileri getirilemedi.");
        }
      }
    }

    void loadInitialData();

    return () => {
      isActive = false;
    };
  }, [customerId]);

  useEffect(() => {
    if (!form.ilKodu) {
      setTowns([]);
      return;
    }

    let isActive = true;

    async function loadTowns(): Promise<void> {
      try {
        const nextTowns = await listTowns(Number(form.ilKodu));
        if (isActive) {
          setTowns(nextTowns);
        }
      } catch {
        if (isActive) {
          setTowns([]);
        }
      }
    }

    void loadTowns();

    return () => {
      isActive = false;
    };
  }, [form.ilKodu]);

  function updateField(field: keyof FullRegistrationForm, value: string): void {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "ilKodu" ? { ilceKodu: "" } : {}),
    }));
    setErrors((current) => ({ ...current, [fieldToApiField(field)]: "" }));
  }

  function updateTelephone(index: number, field: keyof CustomerTelephone, value: string): void {
    setForm((current) => ({
      ...current,
      telephones: current.telephones.map((telephone, telephoneIndex) =>
        telephoneIndex === index ? { ...telephone, [field]: value } : telephone,
      ),
    }));
  }

  function addTelephone(): void {
    setForm((current) => ({
      ...current,
      telephones: [...current.telephones, { phoneNumber: "", title: "" }],
    }));
  }

  function removeTelephone(index: number): void {
    setForm((current) => ({
      ...current,
      telephones: current.telephones.filter((_, telephoneIndex) => telephoneIndex !== index),
    }));
  }

  async function handleNext(): Promise<void> {
    const stepErrors = validateStep(step, form);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      return;
    }

    if (step === 1) {
      try {
        const exists = await fullRegistrationPhoneExists(customerId, form.cep.trim());
        if (exists) {
          setErrors({ cep: "Bu cep numarası backend veya umramonline müşteri kayıtlarında zaten var." });
          return;
        }
      } catch {
        setErrors({ cep: "Cep telefonu kontrolü yapılamadı." });
        return;
      }
    }

    setStep((current) => Math.min(current + 1, 4) as 1 | 2 | 3 | 4);
  }

  function handleBack(): void {
    setStep((current) => Math.max(current - 1, 1) as 1 | 2 | 3 | 4);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const validationErrors = validateAll(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setStep(firstInvalidStep(validationErrors));
      return;
    }

    try {
      await completeFullRegistration(customerId, {
        type: form.type,
        cep: form.cep.trim(),
        ad: form.ad.trim(),
        soyad: form.soyad.trim(),
        tcNo: form.tcNo.trim(),
        dogumTarihi: form.dogumTarihi,
        eposta: form.eposta.trim(),
        website: form.website.trim(),
        googleMapLink: form.googleMapLink.trim(),
        classifiedsWebsiteLink: form.classifiedsWebsiteLink.trim(),
        vehicleStockCount: Number(form.vehicleStockCount),
        branchId: Number(form.branchId),
        telephones: form.telephones,
        ilKodu: form.ilKodu,
        ilceKodu: form.ilceKodu,
        mahalle: form.mahalle.trim(),
        addressDetail: form.addressDetail.trim(),
      });
      setMessage("Tam kayıt tamamlandı.");
    } catch (error: unknown) {
      if (error instanceof CustomerValidationError) {
        setErrors(error.errors);
        setStep(firstInvalidStep(error.errors));
      } else {
        setMessage("Tam kayıt tamamlanamadı.");
      }
    }
  }

  return (
    <section className="panel-card permission-table-panel">
      <div className="page-title">
        <h1>Müşteri Tam Kayıt</h1>
        <p>Backend müşteri kaydını dört aşamada tamamlayabilirsiniz.</p>
      </div>

      {message ? <div className="panel-alert">{message}</div> : null}

      <form className="full-registration-form" onSubmit={(event) => void handleSubmit(event)}>
        <div className="full-registration-steps">
          {[1, 2, 3, 4].map((stepNumber) => (
            <span key={stepNumber} className={step === stepNumber ? "active" : ""}>
              {stepNumber}
            </span>
          ))}
        </div>

        {step === 1 ? (
          <div className="customer-entry-form">
            <FormSelect
              label="Müşteri Türü *"
              value={form.type}
              onChange={(value) => updateField("type", value)}
              options={[
                { value: "bireysel", label: "Bireysel" },
                { value: "kurumsal", label: "Kurumsal" },
              ]}
              error={errors.type}
            />
            <FormInput label="Cep *" value={form.cep} onChange={(value) => updateField("cep", value)} error={errors.cep} maxLength={11} />
            <FormInput label="Ad *" value={form.ad} onChange={(value) => updateField("ad", value)} error={errors.ad} />
            <FormInput label="Soyad *" value={form.soyad} onChange={(value) => updateField("soyad", value)} error={errors.soyad} />
            <FormInput label="T.C. No" value={form.tcNo} onChange={(value) => updateField("tcNo", value)} error={errors.tc_no} />
            <FormInput label="Doğum Tarihi" type="date" value={form.dogumTarihi} onChange={(value) => updateField("dogumTarihi", value)} error={errors.dogum_tarihi} />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="customer-entry-form">
            <FormInput label="E-posta" value={form.eposta} onChange={(value) => updateField("eposta", value)} error={errors.eposta} />
            <FormInput label="Website" value={form.website} onChange={(value) => updateField("website", value)} error={errors.website} />
            <FormInput label="Google Map Link" value={form.googleMapLink} onChange={(value) => updateField("googleMapLink", value)} error={errors.google_map_link} />
            <FormInput label="İlan Sitesi Linki" value={form.classifiedsWebsiteLink} onChange={(value) => updateField("classifiedsWebsiteLink", value)} error={errors.classifieds_website_link} />
            <FormInput label="Araç Stok Adedi *" type="number" value={form.vehicleStockCount} onChange={(value) => updateField("vehicleStockCount", value)} error={errors.vehicle_stock_count} />
            <FormSelect
              label="Bayi *"
              value={form.branchId}
              onChange={(value) => updateField("branchId", value)}
              options={branches.map((branch) => ({ value: String(branch.id), label: branch.name }))}
              error={errors.branch_id}
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="full-registration-list">
            <button className="blue-button" type="button" onClick={addTelephone}>
              Cep Telefonu Ekle
            </button>
            {form.telephones.length === 0 ? <p className="muted-text">Ek cep telefonu yok.</p> : null}
            {form.telephones.map((telephone, index) => (
              <div className="full-registration-phone-row" key={`${index}-${telephone.id ?? 0}`}>
                <FormInput label="Cep telefonu başlığı" value={telephone.title} onChange={(value) => updateTelephone(index, "title", value)} />
                <FormInput label="Cep telefonu" value={telephone.phoneNumber} onChange={(value) => updateTelephone(index, "phoneNumber", value)} />
                <button className="gray-button" type="button" onClick={() => removeTelephone(index)}>
                  Sil
                </button>
              </div>
            ))}
            {errors.telephones ? <span className="customer-field-error">{errors.telephones}</span> : null}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="customer-entry-form">
            <FormSelect
              label="İl *"
              value={form.ilKodu}
              onChange={(value) => updateField("ilKodu", value)}
              options={cities.map((city) => ({ value: String(city.id), label: city.title }))}
              error={errors.il_kodu}
            />
            <FormSelect
              label="İlçe"
              value={form.ilceKodu}
              onChange={(value) => updateField("ilceKodu", value)}
              options={towns.map((town) => ({ value: String(town.id), label: town.title }))}
              error={errors.ilce_kodu}
            />
            <FormInput label="Mahalle" value={form.mahalle} onChange={(value) => updateField("mahalle", value)} error={errors.mahalle} />
            <FormInput label="Adres Detayı *" value={form.addressDetail} onChange={(value) => updateField("addressDetail", value)} error={errors.address_detail} />
          </div>
        ) : null}

        <div className="customer-modal-actions">
          <button className="gray-button" type="button" onClick={step === 1 ? onBack : handleBack}>
            {step === 1 ? "Listeye Dön" : "Geri"}
          </button>
          {step < 4 ? (
            <button className="blue-button" type="button" onClick={() => void handleNext()}>
              Sonraki
            </button>
          ) : (
            <button className="blue-button" type="submit">
              Tam Kaydı Tamamla
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

type FormInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  maxLength?: number;
};

function FormInput({
  label,
  value,
  onChange,
  error,
  type = "text",
  maxLength = customerTextMaxLength,
}: FormInputProps) {
  return (
    <label className="field-label">
      {label}
      <input
        className="panel-input"
        type={type}
        maxLength={type === "number" ? undefined : maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <span className="customer-field-error">{error}</span> : null}
    </label>
  );
}

type FormSelectProps = {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  error?: string;
};

function FormSelect({ label, value, options, onChange, error }: FormSelectProps) {
  return (
    <label className="field-label">
      {label}
      <select className="panel-input" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Seçiniz</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="customer-field-error">{error}</span> : null}
    </label>
  );
}

function validateStep(step: 1 | 2 | 3 | 4, form: FullRegistrationForm): CustomerValidationErrors {
  const errors: CustomerValidationErrors = {};

  if (step === 1) {
    requireField(errors, "type", form.type, "Müşteri türü zorunludur.");
    validatePhone(errors, "cep", form.cep);
    requireField(errors, "ad", form.ad, "Ad zorunludur.");
    validateMaxLength(errors, "ad", form.ad, "Ad");
    requireField(errors, "soyad", form.soyad, "Soyad zorunludur.");
    validateMaxLength(errors, "soyad", form.soyad, "Soyad");
    validateMaxLength(errors, "tc_no", form.tcNo, "T.C. no");
  }

  if (step === 2) {
    validateMaxLength(errors, "eposta", form.eposta, "E-posta");
    validateEmail(errors, "eposta", form.eposta);
    validateMaxLength(errors, "website", form.website, "Website");
    validateMaxLength(errors, "google_map_link", form.googleMapLink, "Google map link");
    validateMaxLength(errors, "classifieds_website_link", form.classifiedsWebsiteLink, "İlan sitesi linki");
    if (form.vehicleStockCount === "" || Number(form.vehicleStockCount) < 0) {
      errors.vehicle_stock_count = "Araç stok adedi 0 veya daha büyük olmalıdır.";
    }
    requireField(errors, "branch_id", form.branchId, "Bayi zorunludur.");
  }

  if (step === 3) {
    form.telephones.forEach((telephone) => {
      if (telephone.phoneNumber.trim() || telephone.title.trim()) {
        validateMaxLength(errors, "telephones", telephone.phoneNumber, "Telefon");
        validateMaxLength(errors, "telephones", telephone.title, "Telefon başlığı", telephoneTitleMaxLength);
      }
    });
  }

  if (step === 4) {
    requireField(errors, "il_kodu", form.ilKodu, "İl zorunludur.");
    validateMaxLength(errors, "mahalle", form.mahalle, "Mahalle");
    requireField(errors, "address_detail", form.addressDetail, "Adres detayı zorunludur.");
    validateMaxLength(errors, "address_detail", form.addressDetail, "Adres detayı");
  }

  return errors;
}

function validateAll(form: FullRegistrationForm): CustomerValidationErrors {
  return {
    ...validateStep(1, form),
    ...validateStep(2, form),
    ...validateStep(3, form),
    ...validateStep(4, form),
  };
}

function firstInvalidStep(errors: CustomerValidationErrors): 1 | 2 | 3 | 4 {
  if (errors.type || errors.cep || errors.ad || errors.soyad || errors.tc_no || errors.dogum_tarihi) {
    return 1;
  }
  if (
    errors.eposta ||
    errors.website ||
    errors.google_map_link ||
    errors.classifieds_website_link ||
    errors.vehicle_stock_count ||
    errors.branch_id
  ) {
    return 2;
  }
  if (errors.telephones) {
    return 3;
  }
  return 4;
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

function validatePhone(errors: CustomerValidationErrors, field: string, value: string): void {
  if (!turkeyMobilePhoneRegex.test(value.trim())) {
    errors[field] = "Telefon 05XXXXXXXXX formatında, toplam 11 hane olmalıdır.";
  }
}

function validateMaxLength(
  errors: CustomerValidationErrors,
  field: string,
  value: string,
  label: string,
  maxLength = customerTextMaxLength,
): void {
  if (value.trim().length > maxLength) {
    errors[field] = `${label} en fazla ${maxLength} karakter olabilir.`;
  }
}

function validateEmail(errors: CustomerValidationErrors, field: string, value: string): void {
  if (!value.trim()) {
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    errors[field] = "Geçerli bir e-posta adresi giriniz.";
  }
}

function fieldToApiField(field: keyof FullRegistrationForm): string {
  const fields: Record<keyof FullRegistrationForm, string> = {
    type: "type",
    cep: "cep",
    ad: "ad",
    soyad: "soyad",
    tcNo: "tc_no",
    dogumTarihi: "dogum_tarihi",
    eposta: "eposta",
    website: "website",
    googleMapLink: "google_map_link",
    classifiedsWebsiteLink: "classifieds_website_link",
    vehicleStockCount: "vehicle_stock_count",
    branchId: "branch_id",
    telephones: "telephones",
    ilKodu: "il_kodu",
    ilceKodu: "ilce_kodu",
    mahalle: "mahalle",
    addressDetail: "address_detail",
  };

  return fields[field];
}
