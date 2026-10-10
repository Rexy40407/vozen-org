import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAutosave } from './autosave';

afterEach(() => vi.useRealTimers());
describe('automatic settings persistence', () => {
  it('does not write on load and debounces typing to the latest draft', async () => {
    vi.useFakeTimers();
    const write = vi.fn(async (draft: string, revision: number) => ({ draft, revision: revision + 1 }));
    const queue = createAutosave({ revision: 2, write, saved: vi.fn(), state: vi.fn() });
    expect(write).not.toHaveBeenCalled();
    queue.enqueue('a', 400);
    queue.enqueue('abc', 400);
    await vi.advanceTimersByTimeAsync(400);
    expect(write).toHaveBeenCalledExactlyOnceWith('abc', 2);
    expect(queue.hasUnsaved()).toBe(false);
  });
  it('serializes changes and carries the confirmed revision without replacing newer edits', async () => {
    let resolve!: (result: { revision: number }) => void;
    const write = vi.fn().mockImplementationOnce(() => new Promise(done => { resolve = done; }))
      .mockResolvedValueOnce({ revision: 9 });
    const saved = vi.fn();
    const queue = createAutosave({ revision: 7, write, saved, state: vi.fn() });
    queue.enqueue('first');
    queue.enqueue('second');
    queue.enqueue('latest');
    expect(write).toHaveBeenCalledTimes(1);
    resolve({ revision: 8 });
    expect(await queue.flush()).toBe(true);
    expect(write.mock.calls).toEqual([['first', 7], ['latest', 8]]);
    expect(saved.mock.calls.map(call => call.slice(1))).toEqual([['first', false], ['latest', true]]);
  });
  it('retains a failed draft, requires explicit retry, and does not fabricate a revision', async () => {
    const write = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ revision: 3 });
    const state = vi.fn();
    const queue = createAutosave({ revision: 2, write, saved: vi.fn(), state });
    queue.enqueue({ enabled: true });
    expect(await queue.flush()).toBe(false);
    expect(queue.hasUnsaved()).toBe(true);
    expect(write).toHaveBeenCalledTimes(1);
    expect(state).toHaveBeenLastCalledWith('error', expect.any(Error));
    expect(await queue.retry()).toBe(true);
    expect(write.mock.calls).toEqual([[{ enabled: true }, 2], [{ enabled: true }, 2]]);
  });
  it('flushes a text draft before navigation', async () => {
    const write = vi.fn(async () => ({ revision: 1 }));
    const queue = createAutosave({ revision: 0, write, saved: vi.fn(), state: vi.fn() });
    queue.enqueue('last edit', 400);
    expect(await queue.flush()).toBe(true);
    expect(write).toHaveBeenCalledExactlyOnceWith('last edit', 0);
  });
  it('snapshots nested values instead of retaining a mutable form reference', async () => {
    const write = vi.fn(async () => ({ revision: 1 }));
    const queue = createAutosave({ revision: 0, write, saved: vi.fn(), state: vi.fn() });
    const form = { roles: ['first'] };
    queue.enqueue(form, 400);
    form.roles.push('not submitted');
    await queue.flush();
    expect(write).toHaveBeenCalledExactlyOnceWith({ roles: ['first'] }, 0);
  });
  it('retains the newest queued edit when an earlier request fails', async () => {
    let reject!: (error: Error) => void;
    const write = vi.fn().mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }))
      .mockResolvedValueOnce({ revision: 1 });
    const queue = createAutosave({ revision: 0, write, saved: vi.fn(), state: vi.fn() });
    queue.enqueue('old'); queue.enqueue('latest');
    reject(new Error('offline'));
    expect(await queue.flush()).toBe(false);
    expect(await queue.retry()).toBe(true);
    expect(write.mock.calls).toEqual([['old', 0], ['latest', 0]]);
  });
});
