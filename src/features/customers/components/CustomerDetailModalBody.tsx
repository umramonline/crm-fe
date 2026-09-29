import type { CustomerDetail } from "@/features/customers/services/customerApi";
import { CrmDetailGrid, type CrmDetailItem } from "@/shared/components/CrmDetailGrid";
import { CrmFormSection } from "@/shared/components/CrmFormSection";

type CustomerDetailModalBodyProps = {
  customer: CustomerDetail;
  detailLevel?: "summary" | "full";
  formatCustomerType?: (type: string) => string;
  formatDate?: (value: string) => string;
};

export function CustomerDetailModalBody({
  customer,
  detailLevel = "summary",
  formatCustomerType = (type) => type || "-",
  formatDate = formatDateOnly,
}: CustomerDetailModalBodyProps) {
  const items = buildCustomerDetailItems(
    customer,
    detailLevel,
    formatCustomerType,
    formatDate,
  );

  return (
    <CrmFormSection title="Müşteri bilgileri">
      <CrmDetailGrid items={items} />
    </CrmFormSection>
  );
}

function buildCustomerDetailItems(
  customer: CustomerDetail,
  detailLevel: "summary" | "full",
  formatCustomerType: (type: string) => string,
  formatDate: (value: string) => string,
): CrmDetailItem[] {
  const summaryItems: CrmDetailItem[] = [
    { label: "ID", value: customer.id || "-" },
    { label: "Ünvan", value: customer.unvan || "-" },
    { label: "Ad", value: customer.ad || "-" },
    { label: "Soyad", value: customer.soyad || "-" },
    { label: "Yetkili Adı", value: customer.yetkiliAdi || "-" },
    { label: "Cep", value: customer.cep || "-" },
    { label: "Telefon", value: customer.telefon || "-" },
    { label: "Mahalle", value: customer.mahalle || "-" },
    { label: "İl Kodu", value: customer.ilKodu || "-" },
    { label: "İlçe Kodu", value: customer.ilceKodu || "-" },
    { label: "Vergi No", value: customer.vergiNo || "-" },
    { label: "T.C. No", value: customer.tcNo || "-" },
    { label: "Müşteri Türü", value: formatCustomerType(customer.type) },
    { label: "Kayıt Tarihi", value: formatDate(customer.createdAt) },
  ];

  if (detailLevel === "summary") {
    return summaryItems;
  }

  return [
    { label: "Ünvan", value: customer.unvan || "-" },
    { label: "Ad", value: customer.ad || "-" },
    { label: "Soyad", value: customer.soyad || "-" },
    { label: "Yetkili Adı", value: customer.yetkiliAdi || "-" },
    { label: "Cep", value: customer.cep || "-" },
    { label: "Telefon", value: customer.telefon || "-" },
    { label: "E-posta", value: customer.eposta || "-" },
    { label: "Website", value: customer.website || "-" },
    { label: "Google Map Link", value: customer.googleMapLink || "-" },
    { label: "İlan Sitesi Link", value: customer.classifiedsWebsiteLink || "-" },
    { label: "Mahalle", value: customer.mahalle || "-" },
    { label: "Adres Detayı", value: customer.addressDetail || "-" },
    { label: "İl Kodu", value: customer.ilKodu || "-" },
    { label: "İlçe Kodu", value: customer.ilceKodu || "-" },
    { label: "Vergi No", value: customer.vergiNo || "-" },
    { label: "Vergi Dairesi", value: customer.vergiDairesi || "-" },
    { label: "T.C. No", value: customer.tcNo || "-" },
    { label: "Doğum Tarihi", value: formatDate(customer.dogumTarihi) },
    {
      label: "Araç Stok Sayısı",
      value: customer.vehicleStockCount ?? "-",
    },
    { label: "Kurumsal Sektör", value: customer.corporateSector || "-" },
    { label: "Müşteri Türü", value: formatCustomerType(customer.type) },
    { label: "Kayıt Tarihi", value: formatDate(customer.createdAt) },
    {
      label: "Telefonlar",
      value: formatCustomerTelephones(customer.telephones),
    },
  ];
}

function formatDateOnly(value: string): string {
  if (!value) {
    return "-";
  }

  return value.slice(0, 10);
}

function formatCustomerTelephones(
  telephones: CustomerDetail["telephones"],
): string {
  if (!telephones.length) {
    return "-";
  }

  return telephones
    .map((telephone) => {
      const title = telephone.title.trim();
      const phone = telephone.phoneNumber.trim();
      if (title && phone) {
        return `${title}: ${phone}`;
      }

      return phone || title || "-";
    })
    .join(", ");
}
