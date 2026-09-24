/** Bootstrap Icons for CRM table row actions (AdminLTE / legacy FA parity). */
export const tableActionIcons = {
  viewDetail: "bi bi-eye-fill",
  editRecord: "bi bi-pencil-fill",
  createFollowUp: "bi bi-clipboard2-plus-fill",
  cancelRecord: "bi bi-x-circle-fill",
  convertToCustomer: "bi bi-person-plus-fill",
} as const;

export type TableActionIconKey = keyof typeof tableActionIcons;
