import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GuildContext } from './api';
import { loadGuildResources } from './guild-resources';

const context: GuildContext = {
  guildId: 'a', name: 'Alpha', permissions: '8',
  channels: [{ id: 'channel-a', name: 'starboard', type: 'text' }], roles: [],
  capabilities: { channelSelectors: true, roleSelectors: true, permissionPreflight: true },
  hierarchy: { known: true }, stale: false,
};
afterEach(() => vi.useRealTimers());
describe('guild resource recovery', () => {
  it('rejects failure and permits an independent retry', async () => {
    const fetchContext = vi.fn().mockRejectedValueOnce(new Error('API 503')).mockResolvedValue(context);
    const parent = new AbortController();
    await expect(loadGuildResources(fetchContext, 'a', parent.signal)).rejects.toThrow('API 503');
    await expect(loadGuildResources(fetchContext, 'a', parent.signal)).resolves.toEqual(context);
  });
  it('rejects resources for a different guild and malformed replies', async () => {
    const parent = new AbortController();
    await expect(loadGuildResources(async () => context, 'b', parent.signal)).rejects.toThrow('context_invalid');
    await expect(loadGuildResources(async () => ({} as GuildContext), 'a', parent.signal)).rejects.toThrow('context_invalid');
  });
  it('bounds a hanging request even if the provider ignores abort', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const request = loadGuildResources(s => { signal = s; return new Promise(() => {}); }, 'a', new AbortController().signal, 100);
    const assertion = expect(request).rejects.toThrow('resource_timeout');
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels old loads on a server change without waiting for their response', async () => {
    const parent = new AbortController();
    const request = loadGuildResources(() => new Promise(() => {}), 'a', parent.signal);
    const assertion = expect(request).rejects.toMatchObject({ name: 'AbortError' });
    parent.abort();
    await assertion;
  });
});
