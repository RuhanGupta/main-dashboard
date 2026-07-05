type BackgroundQueue = {
  current: Promise<unknown>;
};

async function assertOk(response: Response) {
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(message || response.statusText);
  }
}

function reportError(label: string, error: unknown, onError?: () => void) {
  console.error(`[${label}]`, error);
  onError?.();
}

export function persistInBackground(
  label: string,
  request: () => Promise<Response>,
  onError?: () => void
) {
  void request()
    .then(assertOk)
    .catch(error => reportError(label, error, onError));
}

export function persistQueuedInBackground(
  queue: BackgroundQueue,
  label: string,
  request: () => Promise<Response>,
  onError?: () => void
) {
  queue.current = queue.current
    .catch(() => undefined)
    .then(() => request())
    .then(assertOk)
    .catch(error => reportError(label, error, onError));
}
