import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listBranches } from "@/features/customers/services/customerApi";
import { useDashboardPage } from "@/features/dashboard/hooks/useDashboardPage";
import { getDashboard } from "@/features/dashboard/services/dashboardApi";

vi.mock("@/features/customers/services/customerApi", () => ({
  listBranches: vi.fn(),
}));

vi.mock("@/features/dashboard/services/dashboardApi", () => ({
  getDashboard: vi.fn(),
}));

const listBranchesMock = vi.mocked(listBranches);
const getDashboardMock = vi.mocked(getDashboard);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useDashboardPage", () => {
  beforeEach(() => {
    listBranchesMock.mockReset();
    getDashboardMock.mockReset();

    listBranchesMock.mockResolvedValue([
      { id: 1, name: "Merkez", title: "Merkez" },
    ]);
    getDashboardMock.mockResolvedValue({
      potentialCustomerCount: 1,
      totalCustomerCount: 2,
      customerVisitCount: 3,
      newCustomerCount: 4,
      vehicleEntryCount: 5,
      totalAmount: 6,
      loadedCreditAmount: 7,
      vehicleStockCount: 8,
      pendingTaskCount: 9,
      inProgressTaskCount: 10,
      completedTaskCount: 11,
      overdueTaskCount: 12,
    });
  });

  it("loads branches and dashboard data on mount", async () => {
    const { result } = renderHook(
      () => useDashboardPage({ canViewDashboard: true }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.stats?.potentialCustomerCount).toBe(1);
    });

    expect(listBranchesMock).toHaveBeenCalledTimes(1);
    expect(getDashboardMock).toHaveBeenCalledTimes(1);
    expect(result.current.branchLabel).toBe("Merkez");
  });

  it("does not refetch dashboard when only draft dates change", async () => {
    const { result } = renderHook(
      () => useDashboardPage({ canViewDashboard: true }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(getDashboardMock).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.updateDraftRange("startDate", "2026-01-01");
    });

    await waitFor(() => {
      expect(getDashboardMock).toHaveBeenCalledTimes(1);
    });
  });

  it("refetches dashboard when filters are applied", async () => {
    const { result } = renderHook(
      () => useDashboardPage({ canViewDashboard: true }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.stats?.potentialCustomerCount).toBe(1);
    });

    act(() => {
      result.current.updateDraftRange("startDate", "2026-01-01");
    });
    act(() => {
      result.current.updateDraftRange("endDate", "2026-01-31");
    });
    act(() => {
      result.current.applyFilters();
    });

    await waitFor(() => {
      expect(getDashboardMock).toHaveBeenCalledTimes(2);
    });

    expect(getDashboardMock).toHaveBeenLastCalledWith({
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });
  });
});
