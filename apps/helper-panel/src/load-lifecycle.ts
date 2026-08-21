export type LoadGuard = {
  signal: AbortSignal;
  isCurrent: () => boolean;
  dispose: () => void;
};

export function createLoadGuard(): LoadGuard {
  const controller = new AbortController();
  let current = true;

  return {
    signal: controller.signal,
    isCurrent: () => current && !controller.signal.aborted,
    dispose: () => {
      current = false;
      controller.abort();
    },
  };
}

export function isAbortError(cause: unknown): boolean {
  return cause instanceof DOMException
    ? cause.name === 'AbortError'
    : cause instanceof Error && cause.name === 'AbortError';
}
