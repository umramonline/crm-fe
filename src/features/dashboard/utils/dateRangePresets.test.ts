import { describe, expect, it } from "vitest";

import {
  createDefaultDateRange,
  getPresetRange,
  toDateInputValue,
} from "@/features/dashboard/utils/dateRangePresets";

describe("dateRangePresets", () => {
  const fixedNow = new Date(2026, 6, 20, 12, 0, 0);

  it("creates a default range covering the last seven days including today", () => {
    const range = createDefaultDateRange(fixedNow);

    expect(range.endDate).toBe("2026-07-20");
    expect(range.startDate).toBe("2026-07-14");
  });

  it("returns the same day for the today preset", () => {
    const range = getPresetRange("today", fixedNow);

    expect(range.startDate).toBe("2026-07-20");
    expect(range.endDate).toBe("2026-07-20");
  });

  it("returns the previous day for the yesterday preset", () => {
    const range = getPresetRange("yesterday", fixedNow);

    expect(range.startDate).toBe("2026-07-19");
    expect(range.endDate).toBe("2026-07-19");
  });

  it("returns monday through today for the this week preset", () => {
    const range = getPresetRange("thisWeek", fixedNow);

    expect(range.startDate).toBe("2026-07-20");
    expect(range.endDate).toBe("2026-07-20");
  });

  it("returns the previous full week for the last week preset", () => {
    const sunday = new Date(2026, 6, 26, 12, 0, 0);
    const range = getPresetRange("lastWeek", sunday);

    expect(range.startDate).toBe("2026-07-13");
    expect(range.endDate).toBe("2026-07-19");
  });

  it("formats dates as YYYY-MM-DD", () => {
    expect(toDateInputValue(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
