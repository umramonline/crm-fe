import { Button } from "@adminlte/react";
import { FormEvent, useEffect, useState } from "react";

import { ControlledModal } from "@/shared/components/ControlledModal";
import { formFieldProps } from "@/shared/utils/formFieldProps";

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

    async function loadReferenceData(): Promise<void> {
      setIsReferenceLoading(true);

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
          onError(customerEntryTexts.referenceFailed);
        }
      }
    }

    void loadTowns();

    return () => {
      isActive = false;
    };
  }, [
    canListTowns,
    createStep,
    isOpen,
    newCustomerForm.ilKodu,
    onError,
  ]);

  function handleSelectCustomerEntryType(type: Exclude<CustomerEntryType, "">): void {
    setCustomerEntryType(type);
    setNewCustomerForm(emptyNewCustomerForm);
    setCreateErrors({});
    setCreateStep(2);
  }

  function updateNewCustomerField(
    field: keyof NewCustomerForm,
    value: string,
  ): void {
    setNewCustomerForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "ilKodu" ? { ilceKodu: "" } : {}),
    }));
  }

  async function handleCreateCustomerSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (customerEntryType !== "bireysel" && customerEntryType !== "kurumsal") {
      setCreateErrors({ type: "Müşteri türü seçiniz." });
      return;
    }

    const validationErrors = validateNewCustomerForm(
      customerEntryType,
      newCustomerForm,
    );
    if (Object.keys(validationErrors).length > 0) {
      setCreateErrors(validationErrors);
      return;
    }

    setIsCreatingCustomer(true);
    setCreateErrors({});

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

      onClose();
      onCreated();
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
    >
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
                    {...formFieldProps("customer-entry", "ad", { label: "Ad" })}
                    className="form-control form-control-sm"
                    maxLength={customerTextMaxLength}
                    value={newCustomerForm.ad}
                    onChange={(event) =>
                      updateNewCustomerField("ad", event.target.value)
                    }
                  />
                  {createErrors.ad ? (
                    <span className="customer-field-error">{createErrors.ad}</span>
                  ) : null}
                </label>
                <label className="field-label">
                  Soyad
                  <input
                    {...formFieldProps("customer-entry", "soyad", { label: "Soyad" })}
                    className="form-control form-control-sm"
                    maxLength={customerTextMaxLength}
                    value={newCustomerForm.soyad}
                    onChange={(event) =>
                      updateNewCustomerField("soyad", event.target.value)
                    }
                  />
                  {createErrors.soyad ? (
                    <span className="customer-field-error">
                      {createErrors.soyad}
                    </span>
                  ) : null}
                </label>
                <label className="field-label">
                  Cep
                  <input
                    {...formFieldProps("customer-entry", "cep", { label: "Cep" })}
                    className="form-control form-control-sm"
                    inputMode="numeric"
                    pattern="05[0-9]{9}"
                    maxLength={11}
                    placeholder="05XXXXXXXXX"
                    value={newCustomerForm.cep}
                    onChange={(event) =>
                      updateNewCustomerField("cep", event.target.value)
                    }
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
                    {...formFieldProps("customer-entry", "unvan", { label: "Ünvan" })}
                    className="form-control form-control-sm"
                    maxLength={customerTextMaxLength}
                    value={newCustomerForm.unvan}
                    onChange={(event) =>
                      updateNewCustomerField("unvan", event.target.value)
                    }
                  />
                  {createErrors.unvan ? (
                    <span className="customer-field-error">
                      {createErrors.unvan}
                    </span>
                  ) : null}
                </label>
                <label className="field-label">
                  Yetkili Adı
                  <input
                    {...formFieldProps("customer-entry", "yetkiliAdi", {
                      label: "Yetkili Adı",
                    })}
                    className="form-control form-control-sm"
                    maxLength={customerTextMaxLength}
                    value={newCustomerForm.yetkiliAdi}
                    onChange={(event) =>
                      updateNewCustomerField("yetkiliAdi", event.target.value)
                    }
                  />
                  {createErrors.yetkili_adi ? (
                    <span className="customer-field-error">
                      {createErrors.yetkili_adi}
                    </span>
                  ) : null}
                </label>
                <label className="field-label">
                  Telefon
                  <input
                    {...formFieldProps("customer-entry", "telefon", { label: "Telefon" })}
                    className="form-control form-control-sm"
                    inputMode="numeric"
                    pattern="05[0-9]{9}"
                    maxLength={11}
                    placeholder="05XXXXXXXXX"
                    value={newCustomerForm.telefon}
                    onChange={(event) =>
                      updateNewCustomerField("telefon", event.target.value)
                    }
                  />
                  {createErrors.telefon ? (
                    <span className="customer-field-error">
                      {createErrors.telefon}
                    </span>
                  ) : null}
                </label>
              </>
            )}

            <label className="field-label">
              İl
              <select
                {...formFieldProps("customer-entry", "ilKodu", { label: "İl" })}
                className="form-control form-control-sm"
                value={newCustomerForm.ilKodu}
                onChange={(event) =>
                  updateNewCustomerField("ilKodu", event.target.value)
                }
                disabled={isReferenceLoading || !canListCities}
              >
                <option value="">
                  {isReferenceLoading
                    ? customerEntryTexts.citiesLoading
                    : "Seçiniz"}
                </option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.title}
                  </option>
                ))}
              </select>
              {createErrors.il_kodu ? (
                <span className="customer-field-error">
                  {createErrors.il_kodu}
                </span>
              ) : null}
            </label>

            <label className="field-label">
              İlçe
              <select
                {...formFieldProps("customer-entry", "ilceKodu", { label: "İlçe" })}
                className="form-control form-control-sm"
                value={newCustomerForm.ilceKodu}
                onChange={(event) =>
                  updateNewCustomerField("ilceKodu", event.target.value)
                }
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
                <span className="customer-field-error">
                  {createErrors.ilce_kodu}
                </span>
              ) : null}
            </label>

            <label className="field-label">
              Mahalle
              <input
                {...formFieldProps("customer-entry", "mahalle", { label: "Mahalle" })}
                className="form-control form-control-sm"
                maxLength={customerTextMaxLength}
                value={newCustomerForm.mahalle}
                onChange={(event) =>
                  updateNewCustomerField("mahalle", event.target.value)
                }
              />
              {createErrors.mahalle ? (
                <span className="customer-field-error">
                  {createErrors.mahalle}
                </span>
              ) : null}
            </label>

            <label className="field-label">
              Bayi
              <select
                {...formFieldProps("customer-entry", "branchId", { label: "Bayi" })}
                className="form-control form-control-sm"
                value={newCustomerForm.branchId}
                onChange={(event) =>
                  updateNewCustomerField("branchId", event.target.value)
                }
                disabled={isReferenceLoading || !canListBranches}
              >
                <option value="">
                  {isReferenceLoading
                    ? customerEntryTexts.citiesLoading
                    : "Seçiniz"}
                </option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              {createErrors.branch_id ? (
                <span className="customer-field-error">
                  {createErrors.branch_id}
                </span>
              ) : null}
            </label>

            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button theme="secondary" size="sm" type="button" onClick={() => setCreateStep(1)}>
                Geri
              </Button>
              <Button
                theme="primary"
                size="sm"
                type="submit"
                disabled={!canCreateCustomers || isCreatingCustomer}
              >
                {isCreatingCustomer ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </form>
        )}
    </ControlledModal>
  );
}
