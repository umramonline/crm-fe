import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { listBranches } from "@/features/customers/services/customerApi";
import { dashboardTexts } from "@/features/dashboard/constants/dashboardTexts";
import { validateDashboardFilter } from "@/features/dashboard/schemas/dashboardSchemas";
import { getDashboard } from "@/features/dashboard/services/dashboardApi";
import {
  createDefaultDateRange,
  getPresetRange,
  type DatePresetKey,
  type DateRange,
} from "@/features/dashboard/utils/dateRangePresets";

type UseDashboardPageOptions = {
  canViewDashboard: boolean;
};

export function useDashboardPage({ canViewDashboard }: UseDashboardPageOptions) {
  const defaultRange = useMemo(() => createDefaultDateRange(), []);

  const [draftRange, setDraftRange] = useState<DateRange>(defaultRange);
  const [appliedRange, setAppliedRange] = useState<DateRange>(defaultRange);
  const [activePreset, setActivePreset] = useState<DatePresetKey | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [actionMessage, setActionMessage] = useState("");

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: listBranches,
    staleTime: 5 * 60 * 1000,
    enabled: canViewDashboard,
  });

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", appliedRange.startDate, appliedRange.endDate],
    queryFn: () =>
      getDashboard({
        startDate: appliedRange.startDate,
        endDate: appliedRange.endDate,
      }),
    enabled:
      canViewDashboard &&
      Boolean(appliedRange.startDate && appliedRange.endDate),
  });

  const branchLabel = useMemo(() => {
    if (branchesQuery.isError) {
      return dashboardTexts.branchesLoadFailed;
    }

    const branches = branchesQuery.data ?? [];
    if (branches.length === 0) {
      return dashboardTexts.noBranches;
    }

    return branches
      .map((branch) => branch.name || branch.title)
      .filter((name) => name.trim() !== "")
      .join(", ");
  }, [branchesQuery.data, branchesQuery.isError]);

  const errorMessage = useMemo(() => {
    if (dashboardQuery.isError) {
      return dashboardTexts.loadFailed;
    }

    return actionMessage;
  }, [actionMessage, dashboardQuery.isError]);

  function updateDraftRange(field: keyof DateRange, value: string): void {
    setDraftRange((current) => ({ ...current, [field]: value }));
    setActivePreset(null);
    setValidationErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function selectPreset(preset: DatePresetKey): void {
    setDraftRange(getPresetRange(preset));
    setActivePreset(preset);
    setValidationErrors({});
  }

  function applyFilters(): void {
    const validation = validateDashboardFilter(draftRange);
    if (!validation.success) {
      setValidationErrors(validation.errors);
      setActionMessage("");
      return;
    }

    setValidationErrors({});
    setActionMessage("");
    setAppliedRange({ ...validation.data });
    setActivePreset(null);
  }

  function resetFilters(): void {
    const nextRange = createDefaultDateRange();
    setDraftRange(nextRange);
    setAppliedRange(nextRange);
    setActivePreset(null);
    setValidationErrors({});
    setActionMessage("");
  }

  return {
    draftRange,
    appliedRange,
    activePreset,
    validationErrors,
    errorMessage,
    branchLabel,
    stats: dashboardQuery.data,
    isLoading: dashboardQuery.isFetching || branchesQuery.isFetching,
    updateDraftRange,
    selectPreset,
    applyFilters,
    resetFilters,
  };
}
