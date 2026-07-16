import type { CustomerValidationErrors } from "@/features/customers/services/customerApi";

const turkeyMobilePhoneRegex = /^05[0-9]{9}$/;

export type CustomerEntryType = "" | "bireysel" | "kurumsal";

export type NewCustomerForm = {
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

export const emptyNewCustomerForm: NewCustomerForm = {
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

export function validateNewCustomerForm(
  customerType: Exclude<CustomerEntryType, "">,
  form: NewCustomerForm,
): CustomerValidationErrors {
  const errors: CustomerValidationErrors = {};

  if (customerType === "bireysel") {
    requireField(errors, "ad", form.ad, "Ad zorunludur.");
    validateMaxLength(errors, "ad", form.ad, "Ad");
    requireField(errors, "soyad", form.soyad, "Soyad zorunludur.");
    validateMaxLength(errors, "soyad", form.soyad, "Soyad");
    validateMobilePhone(errors, "cep", form.cep);
  } else {
    requireField(errors, "unvan", form.unvan, "Ünvan zorunludur.");
    validateMaxLength(errors, "unvan", form.unvan, "Ünvan");
    requireField(
      errors,
      "yetkili_adi",
      form.yetkiliAdi,
      "Yetkili adı zorunludur.",
    );
    validateMaxLength(errors, "yetkili_adi", form.yetkiliAdi, "Yetkili adı");
    validateMobilePhone(errors, "telefon", form.telefon);
  }

  requireField(errors, "il_kodu", form.ilKodu, "İl zorunludur.");
  validateMaxLength(errors, "il_kodu", form.ilKodu, "İl");
  requireField(errors, "ilce_kodu", form.ilceKodu, "İlçe zorunludur.");
  validateMaxLength(errors, "ilce_kodu", form.ilceKodu, "İlçe");
  requireField(errors, "mahalle", form.mahalle, "Mahalle zorunludur.");
  validateMaxLength(errors, "mahalle", form.mahalle, "Mahalle");
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

function validateMaxLength(
  errors: CustomerValidationErrors,
  field: string,
  value: string,
  label: string,
): void {
  if (value.trim().length > 255) {
    errors[field] = `${label} en fazla 255 karakter olabilir.`;
  }
}
