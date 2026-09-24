export function customerRowClass(situation: string | undefined): string {
  switch (situation) {
    case "Aktif Müşteri":
    case "Yarı Aktif Müşteri":
      return "table-success";
    case "Pasif Müşteri":
      return "table-warning";
    case "Kayıp Müşteri":
      return "table-danger";
    default:
      return "";
  }
}
