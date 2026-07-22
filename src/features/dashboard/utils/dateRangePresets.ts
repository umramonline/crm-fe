export type DateRange = {
  startDate: string;
  endDate: string;
};

export type DatePresetKey =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth";

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function createDefaultDateRange(now = new Date()): DateRange {
  const endDate = toDateInputValue(now);
  const start = new Date(now);
  start.setDate(start.getDate() - 6);

  return {
    startDate: toDateInputValue(start),
    endDate,
  };
}

export function getPresetRange(preset: DatePresetKey, now = new Date()): DateRange {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  switch (preset) {
    case "today":
      return {
        startDate: toDateInputValue(today),
        endDate: toDateInputValue(today),
      };
    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      return {
        startDate: toDateInputValue(yesterday),
        endDate: toDateInputValue(yesterday),
      };
    }
    case "thisWeek":
      return {
        startDate: toDateInputValue(startOfWeek(today)),
        endDate: toDateInputValue(today),
      };
    case "lastWeek": {
      const currentWeekStart = startOfWeek(today);
      const lastWeekEnd = new Date(currentWeekStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
      const lastWeekStart = startOfWeek(lastWeekEnd);

      return {
        startDate: toDateInputValue(lastWeekStart),
        endDate: toDateInputValue(lastWeekEnd),
      };
    }
    case "thisMonth": {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      return {
        startDate: toDateInputValue(monthStart),
        endDate: toDateInputValue(today),
      };
    }
    case "lastMonth": {
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

      return {
        startDate: toDateInputValue(lastMonthStart),
        endDate: toDateInputValue(lastMonthEnd),
      };
    }
  }
}

function startOfWeek(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);

  const day = normalized.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  normalized.setDate(normalized.getDate() + diff);

  return normalized;
}
