import { describe, expect, it } from 'vitest';

import { createLoadGuard, isAbortError } from './load-lifecycle';

describe('load lifecycle guard', () => {
  it('aborts the request and invalidates the load on cleanup', () => {
    const guard = createLoadGuard();

    expect(guard.signal.aborted).toBe(false);
    expect(guard.isCurrent()).toBe(true);

    guard.dispose();

    expect(guard.signal.aborted).toBe(true);
    expect(guard.isCurrent()).toBe(false);
  });

  it('recognises browser and fetch abort errors', () => {
    expect(isAbortError(new DOMException('The operation was aborted', 'AbortError'))).toBe(true);
    expect(isAbortError(Object.assign(new Error('aborted'), { name: 'AbortError' }))).toBe(true);
    expect(isAbortError(new Error('network failure'))).toBe(false);
  });
});
