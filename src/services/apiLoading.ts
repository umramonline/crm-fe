type ApiLoadingListener = (isLoading: boolean) => void;

let pendingRequestCount = 0;
const listeners = new Set<ApiLoadingListener>();

export function startApiLoading(): void {
  pendingRequestCount += 1;
  notifyApiLoadingListeners();
}

export function stopApiLoading(): void {
  pendingRequestCount = Math.max(pendingRequestCount - 1, 0);
  notifyApiLoadingListeners();
}

export function subscribeApiLoading(listener: ApiLoadingListener): () => void {
  listeners.add(listener);
  listener(pendingRequestCount > 0);

  return () => {
    listeners.delete(listener);
  };
}

function notifyApiLoadingListeners(): void {
  const isLoading = pendingRequestCount > 0;
  listeners.forEach((listener) => listener(isLoading));
}
