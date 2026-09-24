export function formatTabulatorDate(value: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short" }).format(date);
}

export function formatTabulatorAgreement(value: boolean): string {
  return value ? "Evet" : "Hayır";
}
