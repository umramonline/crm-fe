import { FormEvent } from "react";

import type { Permission } from "@/features/auth/services/authApi";
import {
  dashboardPresetOrder,
  dashboardTexts,
} from "@/features/dashboard/constants/dashboardTexts";
import { useDashboardPage } from "@/features/dashboard/hooks/useDashboardPage";
import type { DashboardStats } from "@/features/dashboard/services/dashboardApi";
import type { DatePresetKey } from "@/features/dashboard/utils/dateRangePresets";

type DashboardPageProps = {
  permissions: Permission[];
};

type ColorStatCard = {
  key: keyof typeof dashboardTexts.cards;
  tone:
    | "teal"
    | "amber"
    | "red"
    | "purple"
    | "blue"
    | "green"
    | "dark"
    | "mint";
  value: number;
  formattedValue: string;
};

type TaskStatCard = {
  key: keyof typeof dashboardTexts.tasks;
  tone: "pending" | "in-progress" | "completed" | "overdue";
  value: number;
};

const countFormatter = new Intl.NumberFormat("tr-TR");
const currencyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

export function DashboardPage({ permissions }: DashboardPageProps) {
  const canViewDashboard = permissions.some(
    (permission) => permission.name === "dashboard.view",
  );

  const {
    draftRange,
    activePreset,
    validationErrors,
    errorMessage,
    branchLabel,
    stats,
    isLoading,
    updateDraftRange,
    selectPreset,
    applyFilters,
    resetFilters,
  } = useDashboardPage({ canViewDashboard });

  if (!canViewDashboard) {
    return (
      <section className="panel-card permission-table-panel">
        <p className="form-message">{dashboardTexts.noPermission}</p>
      </section>
    );
  }

  const colorCards = buildColorCards(stats);
  const taskCards = buildTaskCards(stats);

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    applyFilters();
  }

  return (
    <section className="dashboard-page">
      <div className="page-title">
        <h1>{dashboardTexts.pageTitle}</h1>
      </div>

      <form className="panel-card dashboard-filter-card" onSubmit={handleFilterSubmit}>
        <div className="panel-card-title">
          <h2>{dashboardTexts.filterTitle}</h2>
        </div>

        <div className="dashboard-filter-grid">
          <label className="field-label">
            {dashboardTexts.startDateLabel}
            <input
              className="panel-input"
              type="date"
              value={draftRange.startDate}
              onChange={(event) => updateDraftRange("startDate", event.target.value)}
            />
            {validationErrors.startDate ? (
              <span className="customer-field-error">{validationErrors.startDate}</span>
            ) : null}
          </label>

          <label className="field-label">
            {dashboardTexts.endDateLabel}
            <input
              className="panel-input"
              type="date"
              min={draftRange.startDate || undefined}
              value={draftRange.endDate}
              onChange={(event) => updateDraftRange("endDate", event.target.value)}
            />
            {validationErrors.endDate ? (
              <span className="customer-field-error">{validationErrors.endDate}</span>
            ) : null}
          </label>
        </div>

        <div className="dashboard-preset-row">
          {dashboardPresetOrder.map((preset) => (
            <button
              key={preset}
              className={
                activePreset === preset
                  ? "dashboard-preset-button active"
                  : "dashboard-preset-button"
              }
              type="button"
              onClick={() => selectPreset(preset)}
            >
              {dashboardTexts.presets[preset]}
            </button>
          ))}
        </div>

        <div className="dashboard-filter-actions">
          <button className="blue-button" type="submit" disabled={isLoading}>
            {dashboardTexts.filterButton}
          </button>
          <button
            className="gray-button dashboard-clear-button"
            type="button"
            disabled={isLoading}
            onClick={resetFilters}
          >
            {dashboardTexts.clearButton}
          </button>
        </div>
      </form>

      <div className="panel-alert dashboard-info-banner">
        <strong>{dashboardTexts.infoTitle}</strong>
        <p>
          {dashboardTexts.branchesLabel} {branchLabel}
        </p>
        <p>{dashboardTexts.defaultRangeHint}</p>
      </div>

      {errorMessage ? <p className="form-message">{errorMessage}</p> : null}

      <div className="dashboard-color-stats-grid">
        {colorCards.map((card) => (
          <article
            key={card.key}
            className={`dashboard-color-card dashboard-color-card--${card.tone}`}
          >
            <strong>{card.formattedValue}</strong>
            <span>{dashboardTexts.cards[card.key]}</span>
          </article>
        ))}
      </div>

      <div className="dashboard-task-stats-grid">
        {taskCards.map((card) => (
          <article key={card.key} className="dashboard-task-card">
            <div className={`dashboard-task-icon dashboard-task-icon--${card.tone}`}>
              <span aria-hidden="true">{taskIcon(card.tone)}</span>
            </div>
            <div>
              <span>{dashboardTexts.tasks[card.key]}</span>
              <strong>{countFormatter.format(card.value)}</strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function buildColorCards(stats: DashboardStats | undefined): ColorStatCard[] {
  return [
    {
      key: "potentialCustomerCount",
      tone: "teal",
      value: stats?.potentialCustomerCount ?? 0,
      formattedValue: countFormatter.format(stats?.potentialCustomerCount ?? 0),
    },
    {
      key: "totalCustomerCount",
      tone: "amber",
      value: stats?.totalCustomerCount ?? 0,
      formattedValue: countFormatter.format(stats?.totalCustomerCount ?? 0),
    },
    {
      key: "customerVisitCount",
      tone: "red",
      value: stats?.customerVisitCount ?? 0,
      formattedValue: countFormatter.format(stats?.customerVisitCount ?? 0),
    },
    {
      key: "newCustomerCount",
      tone: "purple",
      value: stats?.newCustomerCount ?? 0,
      formattedValue: countFormatter.format(stats?.newCustomerCount ?? 0),
    },
    {
      key: "vehicleEntryCount",
      tone: "blue",
      value: stats?.vehicleEntryCount ?? 0,
      formattedValue: countFormatter.format(stats?.vehicleEntryCount ?? 0),
    },
    {
      key: "totalAmount",
      tone: "green",
      value: stats?.totalAmount ?? 0,
      formattedValue: currencyFormatter.format(stats?.totalAmount ?? 0),
    },
    {
      key: "loadedCreditAmount",
      tone: "dark",
      value: stats?.loadedCreditAmount ?? 0,
      formattedValue: countFormatter.format(stats?.loadedCreditAmount ?? 0),
    },
    {
      key: "vehicleStockCount",
      tone: "mint",
      value: stats?.vehicleStockCount ?? 0,
      formattedValue: countFormatter.format(stats?.vehicleStockCount ?? 0),
    },
  ];
}

function buildTaskCards(stats: DashboardStats | undefined): TaskStatCard[] {
  return [
    {
      key: "pendingTaskCount",
      tone: "pending",
      value: stats?.pendingTaskCount ?? 0,
    },
    {
      key: "inProgressTaskCount",
      tone: "in-progress",
      value: stats?.inProgressTaskCount ?? 0,
    },
    {
      key: "completedTaskCount",
      tone: "completed",
      value: stats?.completedTaskCount ?? 0,
    },
    {
      key: "overdueTaskCount",
      tone: "overdue",
      value: stats?.overdueTaskCount ?? 0,
    },
  ];
}

function taskIcon(tone: TaskStatCard["tone"]): string {
  switch (tone) {
    case "pending":
      return "◷";
    case "in-progress":
      return "▶";
    case "completed":
      return "✓";
    case "overdue":
      return "!";
  }
}
