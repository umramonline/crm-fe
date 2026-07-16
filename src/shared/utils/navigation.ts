export function navigateToFullRegistration(customerId: number): void {
  window.history.pushState(
    null,
    "",
    `/customers/full-registration/${customerId}`,
  );
  window.dispatchEvent(new PopStateEvent("popstate"));
}
