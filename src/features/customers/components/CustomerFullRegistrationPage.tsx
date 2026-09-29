import { Button } from "@adminlte/react";
import { useEffect, useState } from "react";

import { ContentHeader } from "@/shared/components/ContentHeader";
import {
  CrmFormFieldCol,
  CrmFormInput,
  CrmFormSelect,
  defaultCrmFormTextMaxLength,
} from "@/shared/components/CrmFormField";
import { CrmFormSection } from "@/shared/components/CrmFormSection";
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
  unvan: string;
  corporateSector: string;
  tcNo: string;
  dogumTarihi: string;
  eposta: string;
  website: string;
  googleMapLink: string;
  classifiedsWebsiteLink: string;
  vehicleStockCount: string;
  branchId: string;
  vergiNo: string;
  vergiDairesi: string;
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
  unvan: "",
  corporateSector: "",
  tcNo: "",
  dogumTarihi: "",
  eposta: "",
  website: "",
  googleMapLink: "",
  classifiedsWebsiteLink: "",
  vehicleStockCount: "",
  branchId: "",
  vergiNo: "",
  vergiDairesi: "",
  telephones: [],
  ilKodu: "",
  ilceKodu: "",
  mahalle: "",
  addressDetail: "",
};

const telephoneTitleMaxLength = 255;
const turkeyMobilePhoneRegex = /^05[0-9]{9}$/;
const corporateSectorOptions = [
  "Teknoloji",
  "İnşaat",
  "Otomotiv",
  "Gıda",
  "Tekstil",
  "Sağlık",
  "Eğitim",
  "Finans",
  "Turizm",
  "Diğer",
];

const fullRegistrationSteps = [
  { step: 1 as const, label: "Kimlik" },
  { step: 2 as const, label: "İletişim" },
  { step: 3 as const, label: "Telefonlar" },
  { step: 4 as const, label: "Adres" },
];

const fullRegistrationStepTitles: Record<1 | 2 | 3 | 4, string> = {
  1: "Kimlik bilgileri",
  2: "İletişim, bayi ve stok",
  3: "Ek cep telefonları",
  4: "Adres bilgileri",
};

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
  const [hasUoId, setHasUoId] = useState(false);

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
        setHasUoId(customer.uoId > 0);
        setForm({
          type: customer.type === "kurumsal" ? "kurumsal" : "bireysel",
          cep: customer.cep,
          ad: customer.ad,
          soyad: customer.soyad,
          unvan: customer.unvan,
          corporateSector: customer.corporateSector,
          tcNo: customer.tcNo,
          dogumTarihi: customer.dogumTarihi,
          eposta: customer.eposta,
          website: customer.website,
          googleMapLink: customer.googleMapLink,
          classifiedsWebsiteLink: customer.classifiedsWebsiteLink,
          vehicleStockCount:
            customer.vehicleStockCount === null ? "" : String(customer.vehicleStockCount),
          branchId: customer.branchId === null ? "" : String(customer.branchId),
          vergiNo: customer.vergiNo,
          vergiDairesi: customer.vergiDairesi,
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
    const stepErrors = validateStep(step, form, hasUoId);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      return;
    }

    if (step === 1 && !hasUoId) {
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

  async function handleCompleteRegistration(): Promise<void> {
    const validationErrors = validateAll(form, hasUoId);
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
        unvan: form.type === "kurumsal" ? form.unvan.trim() : "",
        corporateSector: form.type === "kurumsal" ? form.corporateSector : "",
        tcNo: form.tcNo.trim(),
        dogumTarihi: form.dogumTarihi,
        eposta: form.eposta.trim(),
        website: form.website.trim(),
        googleMapLink: form.googleMapLink.trim(),
        classifiedsWebsiteLink: form.classifiedsWebsiteLink.trim(),
        vehicleStockCount: Number(form.vehicleStockCount),
        branchId: Number(form.branchId),
        vergiNo: form.type === "kurumsal" ? form.vergiNo.trim() : "",
        vergiDairesi: form.type === "kurumsal" ? form.vergiDairesi.trim() : "",
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
    <>
      <ContentHeader
        title="Müşteri Tam Kayıt"
        breadcrumbs={[
          { label: "Ana Sayfa", href: "/home" },
          { label: "Galeri Listesi", href: "/customers" },
          { label: "Tam Kayıt", active: true },
        ]}
      />

      <div className="card mb-3">
        <div className="card-header">
          <h3 className="card-title mb-0">Tam kayıt formu</h3>
          <p className="text-muted small mb-0 mt-1">
            Backend müşteri kaydını dört aşamada tamamlayabilirsiniz.
          </p>
        </div>

        <form
          className="full-registration-form"
          onSubmit={(event) => event.preventDefault()}
          noValidate
        >
          <div className="card-body">
            {message ? (
              <div className="alert alert-info py-2" role="status">
                {message}
              </div>
            ) : null}

            <nav
              className="full-registration-stepper nav nav-pills nav-fill flex-column flex-sm-row gap-2 mb-3"
              aria-label="Tam kayıt adımları"
            >
              {fullRegistrationSteps.map(({ step: stepNumber, label }) => {
                const isActive = step === stepNumber;
                const isComplete = step > stepNumber;

                return (
                  <span
                    key={stepNumber}
                    className={`nav-link py-2 ${isActive ? "active" : ""} ${isComplete ? "full-registration-stepper-complete" : ""}`}
                    aria-current={isActive ? "step" : undefined}
                  >
                    <span className="full-registration-stepper-index">{stepNumber}</span>
                    <span className="full-registration-stepper-label">{label}</span>
                  </span>
                );
              })}
            </nav>

            <div
              className="progress full-registration-progress mb-4"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={4}
              aria-valuenow={step}
              aria-label="Form ilerlemesi"
            >
              <div
                className="progress-bar"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>

            {step === 1 ? (
              <CrmFormSection title={fullRegistrationStepTitles[1]}>
              <div className="row g-3">
                <CrmFormFieldCol>
                  <CrmFormSelect
                    formScope="full-registration"
                    field="type"
                    label="Müşteri Türü *"
                    value={form.type}
                    onChange={(value) => updateField("type", value)}
                    options={[
                      { value: "bireysel", label: "Bireysel" },
                      { value: "kurumsal", label: "Kurumsal" },
                    ]}
                    error={errors.type}
                    disabled={hasUoId}
                  />
                </CrmFormFieldCol>
                <CrmFormFieldCol>
                  <CrmFormInput
                    formScope="full-registration"
                    field="cep"
                    label="Cep *"
                    value={form.cep}
                    onChange={(value) => updateField("cep", value)}
                    error={errors.cep}
                    isPhone
                    maxLength={11}
                    disabled={hasUoId}
                  />
                </CrmFormFieldCol>
                <CrmFormFieldCol>
                  <CrmFormInput
                    formScope="full-registration"
                    field="ad"
                    label="Ad *"
                    value={form.ad}
                    onChange={(value) => updateField("ad", value)}
                    error={errors.ad}
                    disabled={hasUoId}
                  />
                </CrmFormFieldCol>
                <CrmFormFieldCol>
                  <CrmFormInput
                    formScope="full-registration"
                    field="soyad"
                    label="Soyad *"
                    value={form.soyad}
                    onChange={(value) => updateField("soyad", value)}
                    error={errors.soyad}
                    disabled={hasUoId}
                  />
                </CrmFormFieldCol>
                {form.type === "bireysel" ? (
                  <>
                    <CrmFormFieldCol>
                      <CrmFormInput
                    formScope="full-registration"
                        field="tcNo"
                        label="T.C. No"
                        value={form.tcNo}
                        onChange={(value) => updateField("tcNo", value)}
                        error={errors.tc_no}
                        disabled={hasUoId}
                      />
                    </CrmFormFieldCol>
                    <CrmFormFieldCol>
                      <CrmFormInput
                    formScope="full-registration"
                        field="dogumTarihi"
                        label="Doğum Tarihi"
                        type="date"
                        value={form.dogumTarihi}
                        onChange={(value) => updateField("dogumTarihi", value)}
                        error={errors.dogum_tarihi}
                        disabled={hasUoId}
                      />
                    </CrmFormFieldCol>
                  </>
                ) : (
                  <>
                    <CrmFormFieldCol>
                      <CrmFormInput
                    formScope="full-registration"
                        field="unvan"
                        label="Ünvan *"
                        value={form.unvan}
                        onChange={(value) => updateField("unvan", value)}
                        error={errors.unvan}
                        disabled={hasUoId}
                      />
                    </CrmFormFieldCol>
                    <CrmFormFieldCol>
                      <CrmFormSelect
                    formScope="full-registration"
                        field="corporateSector"
                        label="Sektör *"
                        value={form.corporateSector}
                        onChange={(value) => updateField("corporateSector", value)}
                        options={corporateSectorOptions.map((sector) => ({
                          value: sector,
                          label: sector,
                        }))}
                        error={errors.corporate_sector}
                      />
                    </CrmFormFieldCol>
                  </>
                )}
              </div>
              </CrmFormSection>
            ) : null}

            {step === 2 ? (
              <CrmFormSection title={fullRegistrationStepTitles[2]}>
              <div className="row g-3">
                <CrmFormFieldCol>
                  <CrmFormSelect
                    formScope="full-registration"
                    field="branchId"
                    label="Bayi *"
                    value={form.branchId}
                    onChange={(value) => updateField("branchId", value)}
                    options={branches.map((branch) => ({
                      value: String(branch.id),
                      label: branch.name,
                    }))}
                    error={errors.branch_id}
                    disabled={hasUoId}
                  />
                </CrmFormFieldCol>
                <CrmFormFieldCol>
                  <CrmFormInput
                    formScope="full-registration"
                    field="eposta"
                    label="E-posta"
                    value={form.eposta}
                    onChange={(value) => updateField("eposta", value)}
                    error={errors.eposta}
                    disabled={hasUoId}
                  />
                </CrmFormFieldCol>
                <CrmFormFieldCol>
                  <CrmFormInput
                    formScope="full-registration"
                    field="website"
                    label="Website"
                    value={form.website}
                    onChange={(value) => updateField("website", value)}
                    error={errors.website}
                  />
                </CrmFormFieldCol>
                <CrmFormFieldCol>
                  <CrmFormInput
                    formScope="full-registration"
                    field="googleMapLink"
                    label="Google Map Link"
                    value={form.googleMapLink}
                    onChange={(value) => updateField("googleMapLink", value)}
                    error={errors.google_map_link}
                  />
                </CrmFormFieldCol>
                <CrmFormFieldCol>
                  <CrmFormInput
                    formScope="full-registration"
                    field="classifiedsWebsiteLink"
                    label="İlan Sitesi Linki"
                    value={form.classifiedsWebsiteLink}
                    onChange={(value) => updateField("classifiedsWebsiteLink", value)}
                    error={errors.classifieds_website_link}
                  />
                </CrmFormFieldCol>
                <CrmFormFieldCol>
                  <CrmFormInput
                    formScope="full-registration"
                    field="vehicleStockCount"
                    label="Araç Stok Adedi *"
                    type="number"
                    value={form.vehicleStockCount}
                    onChange={(value) => updateField("vehicleStockCount", value)}
                    error={errors.vehicle_stock_count}
                  />
                </CrmFormFieldCol>
                {form.type === "kurumsal" ? (
                  <>
                    <CrmFormFieldCol>
                      <CrmFormInput
                    formScope="full-registration"
                        field="vergiNo"
                        label="Vergi No *"
                        value={form.vergiNo}
                        onChange={(value) => updateField("vergiNo", value)}
                        error={errors.vergi_no}
                        disabled={hasUoId}
                      />
                    </CrmFormFieldCol>
                    <CrmFormFieldCol>
                      <CrmFormInput
                    formScope="full-registration"
                        field="vergiDairesi"
                        label="Vergi Dairesi *"
                        value={form.vergiDairesi}
                        onChange={(value) => updateField("vergiDairesi", value)}
                        error={errors.vergi_dairesi}
                        disabled={hasUoId}
                      />
                    </CrmFormFieldCol>
                  </>
                ) : null}
              </div>
              </CrmFormSection>
            ) : null}

            {step === 3 ? (
              <CrmFormSection title={fullRegistrationStepTitles[3]}>
              <div className="full-registration-list">
                <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                  <Button
                    theme="primary"
                    size="sm"
                    type="button"
                    onClick={addTelephone}
                    disabled={hasUoId}
                  >
                    Cep Telefonu Ekle
                  </Button>
                  {form.telephones.length === 0 ? (
                    <p className="text-muted small mb-0">Ek cep telefonu yok.</p>
                  ) : null}
                </div>
                {form.telephones.map((telephone, index) => (
                  <CrmFormSection
                    key={`${index}-${telephone.id ?? 0}`}
                    nested
                    title={`Cep telefonu ${index + 1}`}
                    className="mb-2 full-registration-phone-card"
                    bodyClass="pt-2 pb-2"
                    tools={
                      <Button
                        theme="secondary"
                        size="sm"
                        type="button"
                        onClick={() => removeTelephone(index)}
                        disabled={hasUoId}
                      >
                        Sil
                      </Button>
                    }
                  >
                    <div className="row g-3">
                      <CrmFormFieldCol>
                        <CrmFormInput
                          formScope="full-registration"
                          field="telephoneTitle"
                          suffix={index}
                          label="Cep telefonu başlığı"
                          value={telephone.title}
                          onChange={(value) => updateTelephone(index, "title", value)}
                          disabled={hasUoId}
                        />
                      </CrmFormFieldCol>
                      <CrmFormFieldCol>
                        <CrmFormInput
                          formScope="full-registration"
                          field="telephonePhone"
                          suffix={index}
                          label="Cep telefonu"
                          value={telephone.phoneNumber}
                          onChange={(value) =>
                            updateTelephone(index, "phoneNumber", value)
                          }
                          isPhone
                          disabled={hasUoId}
                        />
                      </CrmFormFieldCol>
                    </div>
                  </CrmFormSection>
                ))}
                {errors.telephones ? (
                  <p className="text-danger small mb-0">{errors.telephones}</p>
                ) : null}
              </div>
              </CrmFormSection>
            ) : null}

            {step === 4 ? (
              <CrmFormSection title={fullRegistrationStepTitles[4]}>
              <div className="row g-3">
                <CrmFormFieldCol>
                  <CrmFormSelect
                    formScope="full-registration"
                    field="ilKodu"
                    label="İl *"
                    value={form.ilKodu}
                    onChange={(value) => updateField("ilKodu", value)}
                    options={cities.map((city) => ({
                      value: String(city.id),
                      label: city.title,
                    }))}
                    error={errors.il_kodu}
                    disabled={hasUoId}
                  />
                </CrmFormFieldCol>
                <CrmFormFieldCol>
                  <CrmFormSelect
                    formScope="full-registration"
                    field="ilceKodu"
                    label="İlçe"
                    value={form.ilceKodu}
                    onChange={(value) => updateField("ilceKodu", value)}
                    options={towns.map((town) => ({
                      value: String(town.id),
                      label: town.title,
                    }))}
                    error={errors.ilce_kodu}
                    disabled={hasUoId}
                  />
                </CrmFormFieldCol>
                <CrmFormFieldCol>
                  <CrmFormInput
                    formScope="full-registration"
                    field="mahalle"
                    label="Mahalle"
                    value={form.mahalle}
                    onChange={(value) => updateField("mahalle", value)}
                    error={errors.mahalle}
                    disabled={hasUoId}
                  />
                </CrmFormFieldCol>
                <CrmFormFieldCol wide>
                  <CrmFormInput
                    formScope="full-registration"
                    field="addressDetail"
                    label="Adres Detayı *"
                    value={form.addressDetail}
                    onChange={(value) => updateField("addressDetail", value)}
                    error={errors.address_detail}
                    disabled={hasUoId}
                  />
                </CrmFormFieldCol>
              </div>
              </CrmFormSection>
            ) : null}
          </div>

          <div className="card-footer d-flex flex-wrap justify-content-between gap-2">
            <Button
              theme="secondary"
              size="sm"
              type="button"
              onClick={step === 1 ? onBack : handleBack}
            >
              {step === 1 ? "Listeye Dön" : "Geri"}
            </Button>
            {step < 4 ? (
              <Button
                theme="primary"
                size="sm"
                type="button"
                onClick={() => void handleNext()}
              >
                Sonraki
              </Button>
            ) : (
              <Button
                theme="primary"
                size="sm"
                type="button"
                onClick={() => void handleCompleteRegistration()}
              >
                Tam Kaydı Tamamla
              </Button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}


function validateStep(
  step: 1 | 2 | 3 | 4,
  form: FullRegistrationForm,
  hasUoId = false,
): CustomerValidationErrors {
  const errors: CustomerValidationErrors = {};

  if (step === 1) {
    if (hasUoId) {
      if (form.type === "kurumsal") {
        requireField(errors, "corporate_sector", form.corporateSector, "Sektör zorunludur.");
        validateMaxLength(errors, "corporate_sector", form.corporateSector, "Sektör");
      }

      return errors;
    }

    requireField(errors, "type", form.type, "Müşteri türü zorunludur.");
    validatePhone(errors, "cep", form.cep);
    requireField(errors, "ad", form.ad, "Ad zorunludur.");
    validateMaxLength(errors, "ad", form.ad, "Ad");
    requireField(errors, "soyad", form.soyad, "Soyad zorunludur.");
    validateMaxLength(errors, "soyad", form.soyad, "Soyad");
    if (form.type === "bireysel") {
      validateMaxLength(errors, "tc_no", form.tcNo, "T.C. no");
    }
    if (form.type === "kurumsal") {
      requireField(errors, "unvan", form.unvan, "Ünvan zorunludur.");
      validateMaxLength(errors, "unvan", form.unvan, "Ünvan");
      requireField(errors, "corporate_sector", form.corporateSector, "Sektör zorunludur.");
      validateMaxLength(errors, "corporate_sector", form.corporateSector, "Sektör");
    }
  }

  if (step === 2) {
    validateMaxLength(errors, "website", form.website, "Website");
    validateMaxLength(errors, "google_map_link", form.googleMapLink, "Google map link");
    validateMaxLength(errors, "classifieds_website_link", form.classifiedsWebsiteLink, "İlan sitesi linki");
    if (form.vehicleStockCount === "" || Number(form.vehicleStockCount) < 0) {
      errors.vehicle_stock_count = "Araç stok adedi 0 veya daha büyük olmalıdır.";
    }

    if (hasUoId) {
      return errors;
    }

    validateMaxLength(errors, "eposta", form.eposta, "E-posta");
    validateEmail(errors, "eposta", form.eposta);
    requireField(errors, "branch_id", form.branchId, "Bayi zorunludur.");
    if (form.type === "kurumsal") {
      requireField(errors, "vergi_no", form.vergiNo, "Vergi no zorunludur.");
      validateMaxLength(errors, "vergi_no", form.vergiNo, "Vergi no");
      requireField(errors, "vergi_dairesi", form.vergiDairesi, "Vergi dairesi zorunludur.");
      validateMaxLength(errors, "vergi_dairesi", form.vergiDairesi, "Vergi dairesi");
    }
  }

  if (step === 3 && !hasUoId) {
    form.telephones.forEach((telephone) => {
      if (telephone.phoneNumber.trim() || telephone.title.trim()) {
        validateOptionalPhone(errors, "telephones", telephone.phoneNumber);
        validateMaxLength(errors, "telephones", telephone.title, "Telefon başlığı", telephoneTitleMaxLength);
      }
    });
  }

  if (step === 4 && !hasUoId) {
    requireField(errors, "il_kodu", form.ilKodu, "İl zorunludur.");
    validateMaxLength(errors, "mahalle", form.mahalle, "Mahalle");
    requireField(errors, "address_detail", form.addressDetail, "Adres detayı zorunludur.");
    validateMaxLength(errors, "address_detail", form.addressDetail, "Adres detayı");
  }

  return errors;
}

function validateAll(form: FullRegistrationForm, hasUoId = false): CustomerValidationErrors {
  return {
    ...validateStep(1, form, hasUoId),
    ...validateStep(2, form, hasUoId),
    ...validateStep(3, form, hasUoId),
    ...validateStep(4, form, hasUoId),
  };
}

function firstInvalidStep(errors: CustomerValidationErrors): 1 | 2 | 3 | 4 {
  if (
    errors.type ||
    errors.cep ||
    errors.ad ||
    errors.soyad ||
    errors.tc_no ||
    errors.dogum_tarihi ||
    errors.unvan ||
    errors.corporate_sector
  ) {
    return 1;
  }
  if (
    errors.eposta ||
    errors.website ||
    errors.google_map_link ||
    errors.classifieds_website_link ||
    errors.vehicle_stock_count ||
    errors.branch_id ||
    errors.vergi_no ||
    errors.vergi_dairesi
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

function validateOptionalPhone(errors: CustomerValidationErrors, field: string, value: string): void {
  if (value.trim() && !turkeyMobilePhoneRegex.test(value.trim())) {
    errors[field] = "Telefon 05XXXXXXXXX formatında, toplam 11 hane olmalıdır.";
  }
}

function validateMaxLength(
  errors: CustomerValidationErrors,
  field: string,
  value: string,
  label: string,
  maxLength = defaultCrmFormTextMaxLength,
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
    unvan: "unvan",
    corporateSector: "corporate_sector",
    tcNo: "tc_no",
    dogumTarihi: "dogum_tarihi",
    eposta: "eposta",
    website: "website",
    googleMapLink: "google_map_link",
    classifiedsWebsiteLink: "classifieds_website_link",
    vehicleStockCount: "vehicle_stock_count",
    branchId: "branch_id",
    vergiNo: "vergi_no",
    vergiDairesi: "vergi_dairesi",
    telephones: "telephones",
    ilKodu: "il_kodu",
    ilceKodu: "ilce_kodu",
    mahalle: "mahalle",
    addressDetail: "address_detail",
  };

  return fields[field];
}
