import {
  Alert,
  Button,
  Card,
  InfoBox,
  Input,
  SmallBox,
  type BootstrapTheme,
} from "@adminlte/react";
import { FormEvent } from "react";

import type { Permission } from "@/features/auth/services/authApi";
import {
  dashboardPresetOrder,
  dashboardTexts,
} from "@/features/dashboard/constants/dashboardTexts";
import { useDashboardPage } from "@/features/dashboard/hooks/useDashboardPage";
import type { DashboardStats } from "@/features/dashboard/services/dashboardApi";
import { ContentHeader } from "@/shared/components/ContentHeader";

type DashboardPageProps = {
  permissions: Permission[];
};

type ColorStatCard = {
  key: keyof typeof dashboardTexts.cards;
  theme: BootstrapTheme | "teal" | "purple";
  icon: string;
  value: number;
  formattedValue: string;
};

type TaskStatCard = {
  key: keyof typeof dashboardTexts.tasks;
  theme: BootstrapTheme;
  icon: string;
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
      <Card title={dashboardTexts.pageTitle}>
        <p className="mb-0">{dashboardTexts.noPermission}</p>
      </Card>
    );
  }

  const colorCards = buildColorCards(stats);
  const taskCards = buildTaskCards(stats);

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    applyFilters();
  }

  return (
    <>
      <ContentHeader
        title={dashboardTexts.pageTitle}
        breadcrumbs={[{ label: "Ana Sayfa", href: "/home" }]}
      />

      <form className="mb-3" onSubmit={handleFilterSubmit}>
        <Card title={dashboardTexts.filterTitle}>
          <div className="row g-3">
            <div className="col-md-4">
              <Input
                id="dashboard-start-date"
                name="dashboard-start-date"
                label={dashboardTexts.startDateLabel}
                type="date"
                value={draftRange.startDate}
                error={validationErrors.startDate}
                onChange={(event) => updateDraftRange("startDate", event.target.value)}
              />
            </div>

            <div className="col-md-4">
              <Input
                id="dashboard-end-date"
                name="dashboard-end-date"
                label={dashboardTexts.endDateLabel}
                type="date"
                min={draftRange.startDate || undefined}
                value={draftRange.endDate}
                error={validationErrors.endDate}
                onChange={(event) => updateDraftRange("endDate", event.target.value)}
              />
            </div>

            <div className="col-md-4 d-flex align-items-end gap-2">
              <Button theme="primary" type="submit" disabled={isLoading}>
                {dashboardTexts.filterButton}
              </Button>
              <Button theme="secondary" type="button" disabled={isLoading} onClick={resetFilters}>
                {dashboardTexts.clearButton}
              </Button>
            </div>
          </div>

          <div className="d-flex flex-wrap gap-2 mt-3">
            {dashboardPresetOrder.map((preset) => (
              <Button
                key={preset}
                size="sm"
                theme={activePreset === preset ? "primary" : "secondary"}
                outline={activePreset !== preset}
                type="button"
                onClick={() => selectPreset(preset)}
              >
                {dashboardTexts.presets[preset]}
              </Button>
            ))}
          </div>
        </Card>
      </form>

      <Alert theme="info" title={dashboardTexts.infoTitle}>
        <p className="mb-0 mt-1">
          {dashboardTexts.branchesLabel} {branchLabel}
        </p>
        <p className="mb-0">{dashboardTexts.defaultRangeHint}</p>
      </Alert>

      {errorMessage ? <Alert theme="danger">{errorMessage}</Alert> : null}

      <div className="row">
        {colorCards.map((card) => (
          <div className="col-lg-3 col-md-4 col-sm-6 mb-3" key={card.key}>
            <SmallBox
              title={card.formattedValue}
              text={dashboardTexts.cards[card.key]}
              theme={card.theme as BootstrapTheme}
              icon={
                <div className="icon">
                  <i className={`bi ${card.icon}`} aria-hidden="true" />
                </div>
              }
            />
          </div>
        ))}
      </div>

      <div className="row">
        {taskCards.map((card) => (
          <div className="col-lg-3 col-md-6 mb-3" key={card.key}>
            <InfoBox
              text={dashboardTexts.tasks[card.key]}
              title={countFormatter.format(card.value)}
              theme={card.theme}
              icon={card.icon}
            />
          </div>
        ))}
      </div>
    </>
  );
}

function buildColorCards(stats: DashboardStats | undefined): ColorStatCard[] {
  return [
    {
      key: "potentialCustomerCount",
      theme: "teal",
      icon: "bi-person-plus",
      value: stats?.potentialCustomerCount ?? 0,
      formattedValue: countFormatter.format(stats?.potentialCustomerCount ?? 0),
    },
    {
      key: "totalCustomerCount",
      theme: "warning",
      icon: "bi-people",
      value: stats?.totalCustomerCount ?? 0,
      formattedValue: countFormatter.format(stats?.totalCustomerCount ?? 0),
    },
    {
      key: "customerVisitCount",
      theme: "danger",
      icon: "bi-clipboard-check",
      value: stats?.customerVisitCount ?? 0,
      formattedValue: countFormatter.format(stats?.customerVisitCount ?? 0),
    },
    {
      key: "newCustomerCount",
      theme: "purple",
      icon: "bi-person-check",
      value: stats?.newCustomerCount ?? 0,
      formattedValue: countFormatter.format(stats?.newCustomerCount ?? 0),
    },
    {
      key: "vehicleEntryCount",
      theme: "primary",
      icon: "bi-car-front",
      value: stats?.vehicleEntryCount ?? 0,
      formattedValue: countFormatter.format(stats?.vehicleEntryCount ?? 0),
    },
    {
      key: "totalAmount",
      theme: "success",
      icon: "bi-currency-exchange",
      value: stats?.totalAmount ?? 0,
      formattedValue: currencyFormatter.format(stats?.totalAmount ?? 0),
    },
    {
      key: "loadedCreditAmount",
      theme: "dark",
      icon: "bi-credit-card",
      value: stats?.loadedCreditAmount ?? 0,
      formattedValue: countFormatter.format(stats?.loadedCreditAmount ?? 0),
    },
    {
      key: "vehicleStockCount",
      theme: "info",
      icon: "bi-truck",
      value: stats?.vehicleStockCount ?? 0,
      formattedValue: countFormatter.format(stats?.vehicleStockCount ?? 0),
    },
  ];
}

function buildTaskCards(stats: DashboardStats | undefined): TaskStatCard[] {
  return [
    {
      key: "pendingTaskCount",
      theme: "warning",
      icon: "bi-hourglass-split",
      value: stats?.pendingTaskCount ?? 0,
    },
    {
      key: "inProgressTaskCount",
      theme: "info",
      icon: "bi-play-circle",
      value: stats?.inProgressTaskCount ?? 0,
    },
    {
      key: "completedTaskCount",
      theme: "success",
      icon: "bi-check-circle",
      value: stats?.completedTaskCount ?? 0,
    },
    {
      key: "overdueTaskCount",
      theme: "danger",
      icon: "bi-exclamation-circle",
      value: stats?.overdueTaskCount ?? 0,
    },
  ];
}
