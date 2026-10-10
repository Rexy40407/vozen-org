export type AutosaveState = 'saving' | 'saved' | 'error';

// One writer per form/session. New edits replace the queued draft, never the
// request already in flight; its confirmed revision feeds the next write.
export function createAutosave<D, R extends { revision?: number }>(options: {
  revision: number;
  write: (draft: D, revision: number) => Promise<R>;
  saved: (result: R, draft: D, latest: boolean) => void;
  state: (state: AutosaveState, error?: unknown) => void;
}) {
  let revision = options.revision;
  let draft: D;
  let version = 0;
  let pending = false;
  let failed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<void> | undefined;

  function drain(): Promise<void> {
    if (running) return running;
    if (!pending || failed) return Promise.resolve();
    running = (async () => {
      while (pending && !failed && !timer) {
        const sent = draft;
        const sentVersion = version;
        pending = false;
        try {
          const result = await options.write(sent, revision);
          revision = result.revision ?? revision;
          options.saved(result, sent, sentVersion === version);
        } catch (error) {
          // A failed/ambiguous request is not retried in a loop. Keep the draft
          // and its revision; never silently overwrite a revision conflict.
          failed = true;
          pending = true;
          options.state('error', error);
        }
      }
      if (!failed) options.state(pending ? 'saving' : 'saved');
    })().finally(() => { running = undefined; });
    return running;
  }

  return {
    enqueue(next: D, delay = 0) {
      draft = structuredClone(next);
      version++;
      pending = true;
      failed = false;
      if (timer) clearTimeout(timer);
      timer = undefined;
      options.state('saving');
      if (delay) timer = setTimeout(() => { timer = undefined; void drain(); }, delay);
      else void drain();
    },
    async flush() {
      if (timer) clearTimeout(timer);
      timer = undefined;
      if (running) await running;
      await drain();
      return !pending && !failed;
    },
    async retry() {
      failed = false;
      options.state('saving');
      return this.flush();
    },
    hasUnsaved() { return pending || Boolean(running); },
  };
}
