import { Button } from "@adminlte/react";
import { FormEvent, useEffect, useState } from "react";

import {
  customerEntryTexts,
  customerTextMaxLength,
} from "@/features/customers/constants/customerEntryTexts";
import {
  createCustomer,
  listBranches,
  listCities,
  listTowns,
  CustomerValidationError,
  type Branch,
  type City,
  type CustomerValidationErrors,
  type Town,
} from "@/features/customers/services/customerApi";
import {
  emptyNewCustomerForm,
  validateNewCustomerForm,
  type CustomerEntryType,
  type NewCustomerForm,
} from "@/features/customers/utils/customerEntryValidation";
import { ControlledModal } from "@/shared/components/ControlledModal";
import {
  CrmFormFieldCol,
  CrmFormInput,
  CrmFormSelect,
} from "@/shared/components/CrmFormField";
import { CrmFormSection } from "@/shared/components/CrmFormSection";

type CustomerEntryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  onError: (message: string) => void;
  canCreateCustomers: boolean;
  canListCities: boolean;
  canListTowns: boolean;
  canListBranches: boolean;
};

const customerEntryFormId = "customer-entry-form";

export function CustomerEntryModal({
  isOpen,
  onClose,
  onCreated,
  onError,
  canCreateCustomers,
  canListCities,
  canListTowns,
  canListBranches,
}: CustomerEntryModalProps) {
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [customerEntryType, setCustomerEntryType] =
    useState<CustomerEntryType>("");
  const [newCustomerForm, setNewCustomerForm] =
    useState<NewCustomerForm>(emptyNewCustomerForm);
  const [createErrors, setCreateErrors] = useState<CustomerValidationErrors>({});
  const [cities, setCities] = useState<City[]>([]);
  const [towns, setTowns] = useState<Town[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isReferenceLoading, setIsReferenceLoading] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCreateStep(1);
      setCustomerEntryType("");
      setNewCustomerForm(emptyNewCustomerForm);
      setCreateErrors({});
      setCities([]);
      setTowns([]);
      setBranches([]);
      setIsReferenceLoading(false);
      setIsCreatingCustomer(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || createStep !== 2 || (!canListCities && !canListBranches)) {
      return;
    }

    let isActive = true;
    setIsReferenceLoading(true);

    async function loadReferenceData(): Promise<void> {
      try {
        const [nextCities, nextBranches] = await Promise.all([
          canListCities ? listCities() : Promise.resolve([]),
          canListBranches ? listBranches() : Promise.resolve([]),
        ]);
        if (!isActive) {
          return;
        }
        setCities(nextCities);
        setBranches(nextBranches);
      } catch {
        if (isActive) {
          onError(customerEntryTexts.referenceFailed);
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
  }, [canListBranches, canListCities, createStep, isOpen, onError]);

  useEffect(() => {
    if (!isOpen || createStep !== 2 || !newCustomerForm.ilKodu || !canListTowns) {
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
        }
      }
    }

    void loadTowns();

    return () => {
      isActive = false;
    };
  }, [canListTowns, createStep, isOpen, newCustomerForm.ilKodu]);

  function updateNewCustomerField(field: keyof NewCustomerForm, value: string): void {
    setNewCustomerForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "ilKodu" ? { ilceKodu: "" } : {}),
    }));
    setCreateErrors((current) => ({ ...current, [field]: "" }));
  }

  function handleSelectCustomerEntryType(type: Exclude<CustomerEntryType, "">): void {
    setCustomerEntryType(type);
    setNewCustomerForm(emptyNewCustomerForm);
    setCreateErrors({});
    setCreateStep(2);
  }

  async function handleCreateCustomerSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const errors = validateNewCustomerForm(
      customerEntryType as Exclude<CustomerEntryType, "">,
      newCustomerForm,
    );
    setCreateErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsCreatingCustomer(true);

    try {
      await createCustomer({
        type: customerEntryType as Exclude<CustomerEntryType, "">,
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
      onCreated();
      onClose();
    } catch (error: unknown) {
      if (error instanceof CustomerValidationError) {
        setCreateErrors(error.errors);
      } else {
        onError(customerEntryTexts.createFailed);
      }
    } finally {
      setIsCreatingCustomer(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <ControlledModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        createStep === 1
          ? customerEntryTexts.typeStepTitle
          : customerEntryTexts.formStepTitle
      }
      size="xl"
      footer={
        createStep === 2 ? (
          <>
            <Button
              theme="secondary"
              size="sm"
              type="button"
              onClick={() => setCreateStep(1)}
            >
              Geri
            </Button>
            <Button
              theme="primary"
              size="sm"
              type="submit"
              form={customerEntryFormId}
              disabled={!canCreateCustomers || isCreatingCustomer}
            >
              {isCreatingCustomer ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </>
        ) : undefined
      }
    >
      {createStep === 1 ? (
        <CrmFormSection title={customerEntryTexts.typeStepTitle}>
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
        </CrmFormSection>
      ) : (
        <form
          id={customerEntryFormId}
          className="customer-entry-form"
          onSubmit={(event) => void handleCreateCustomerSubmit(event)}
          noValidate
        >
          <CrmFormSection
            title={
              customerEntryType === "bireysel" ? "Bireysel müşteri" : "Kurumsal müşteri"
            }
          >
            <div className="row g-3">
              {customerEntryType === "bireysel" ? (
                <>
                  <CrmFormFieldCol>
                    <CrmFormInput
                      formScope="customer-entry"
                      field="ad"
                      label="Ad"
                      value={newCustomerForm.ad}
                      maxLength={customerTextMaxLength}
                      onChange={(value) => updateNewCustomerField("ad", value)}
                      error={createErrors.ad}
                    />
                  </CrmFormFieldCol>
                  <CrmFormFieldCol>
                    <CrmFormInput
                      formScope="customer-entry"
                      field="soyad"
                      label="Soyad"
                      value={newCustomerForm.soyad}
                      maxLength={customerTextMaxLength}
                      onChange={(value) => updateNewCustomerField("soyad", value)}
                      error={createErrors.soyad}
                    />
                  </CrmFormFieldCol>
                  <CrmFormFieldCol>
                    <CrmFormInput
                      formScope="customer-entry"
                      field="cep"
                      label="Cep"
                      value={newCustomerForm.cep}
                      isPhone
                      onChange={(value) => updateNewCustomerField("cep", value)}
                      error={createErrors.cep}
                    />
                  </CrmFormFieldCol>
                </>
              ) : (
                <>
                  <CrmFormFieldCol>
                    <CrmFormInput
                      formScope="customer-entry"
                      field="unvan"
                      label="Ünvan"
                      value={newCustomerForm.unvan}
                      maxLength={customerTextMaxLength}
                      onChange={(value) => updateNewCustomerField("unvan", value)}
                      error={createErrors.unvan}
                    />
                  </CrmFormFieldCol>
                  <CrmFormFieldCol>
                    <CrmFormInput
                      formScope="customer-entry"
                      field="yetkiliAdi"
                      label="Yetkili Adı"
                      value={newCustomerForm.yetkiliAdi}
                      maxLength={customerTextMaxLength}
                      onChange={(value) => updateNewCustomerField("yetkiliAdi", value)}
                      error={createErrors.yetkili_adi}
                    />
                  </CrmFormFieldCol>
                  <CrmFormFieldCol>
                    <CrmFormInput
                      formScope="customer-entry"
                      field="telefon"
                      label="Telefon"
                      value={newCustomerForm.telefon}
                      isPhone
                      onChange={(value) => updateNewCustomerField("telefon", value)}
                      error={createErrors.telefon}
                    />
                  </CrmFormFieldCol>
                </>
              )}
            </div>
          </CrmFormSection>

          <CrmFormSection title="Konum ve bayi">
            <div className="row g-3">
              <CrmFormFieldCol>
                <CrmFormSelect
                  formScope="customer-entry"
                  field="ilKodu"
                  label="İl"
                  value={newCustomerForm.ilKodu}
                  disabled={isReferenceLoading || !canListCities}
                  placeholderOption={
                    isReferenceLoading
                      ? customerEntryTexts.citiesLoading
                      : "Seçiniz"
                  }
                  options={cities.map((city) => ({
                    value: String(city.id),
                    label: city.title,
                  }))}
                  onChange={(value) => updateNewCustomerField("ilKodu", value)}
                  error={createErrors.il_kodu}
                />
              </CrmFormFieldCol>
              <CrmFormFieldCol>
                <CrmFormSelect
                  formScope="customer-entry"
                  field="ilceKodu"
                  label="İlçe"
                  value={newCustomerForm.ilceKodu}
                  disabled={!newCustomerForm.ilKodu || !canListTowns}
                  options={towns.map((town) => ({
                    value: String(town.id),
                    label: town.title,
                  }))}
                  onChange={(value) => updateNewCustomerField("ilceKodu", value)}
                  error={createErrors.ilce_kodu}
                />
              </CrmFormFieldCol>
              <CrmFormFieldCol>
                <CrmFormInput
                  formScope="customer-entry"
                  field="mahalle"
                  label="Mahalle"
                  value={newCustomerForm.mahalle}
                  maxLength={customerTextMaxLength}
                  onChange={(value) => updateNewCustomerField("mahalle", value)}
                  error={createErrors.mahalle}
                />
              </CrmFormFieldCol>
              <CrmFormFieldCol>
                <CrmFormSelect
                  formScope="customer-entry"
                  field="branchId"
                  label="Bayi"
                  value={newCustomerForm.branchId}
                  disabled={isReferenceLoading || !canListBranches}
                  placeholderOption={
                    isReferenceLoading
                      ? customerEntryTexts.citiesLoading
                      : "Seçiniz"
                  }
                  options={branches.map((branch) => ({
                    value: String(branch.id),
                    label: branch.name,
                  }))}
                  onChange={(value) => updateNewCustomerField("branchId", value)}
                  error={createErrors.branch_id}
                />
              </CrmFormFieldCol>
            </div>
          </CrmFormSection>
        </form>
      )}
    </ControlledModal>
  );
}
