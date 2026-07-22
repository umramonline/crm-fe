export const dashboardTexts = {
  pageTitle: "Dashboard",
  filterTitle: "Tarih Filtresi",
  startDateLabel: "Başlangıç Tarihi",
  endDateLabel: "Bitiş Tarihi",
  filterButton: "Filtrele",
  clearButton: "Temizle",
  branchesLabel: "Görüntülenen Bayiler:",
  noBranches: "Bayi bulunamadı.",
  defaultRangeHint:
    "Varsayılan olarak son 1 haftalık veriler görüntülenir. Seçilen tarih aralığına göre veriler güncellenir.",
  infoTitle: "Görüntülenen Veriler",
  loadFailed: "Dashboard verileri şu anda getirilemedi.",
  branchesLoadFailed: "Bayi listesi şu anda getirilemedi.",
  noPermission: "Dashboard görüntüleme yetkiniz bulunmuyor.",
  presets: {
    today: "Bugün",
    yesterday: "Dün",
    thisWeek: "Bu Hafta",
    lastWeek: "Geçen Hafta",
    thisMonth: "Bu Ay",
    lastMonth: "Geçen Ay",
  },
  cards: {
    potentialCustomerCount: "Potansiyel Müşteriler",
    totalCustomerCount: "Toplam Müşteriler",
    customerVisitCount: "Müşteri Ziyaretleri",
    newCustomerCount: "Yeni Müşteriler",
    vehicleEntryCount: "Araç Girişi",
    totalAmount: "Toplam Tutar",
    loadedCreditAmount: "Yüklenen Krediler",
    vehicleStockCount: "Toplam Araç Stok Adedi",
  },
  tasks: {
    pendingTaskCount: "Bekleyen Görevler",
    inProgressTaskCount: "Devam Eden Görevler",
    completedTaskCount: "Tamamlanan Görevler",
    overdueTaskCount: "Geciken Görevler",
  },
} as const;

export const dashboardPresetOrder = [
  "today",
  "yesterday",
  "thisWeek",
  "lastWeek",
  "thisMonth",
  "lastMonth",
] as const;
