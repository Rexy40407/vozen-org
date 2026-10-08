import type { GuildContext } from './api';

export async function loadGuildResources(
  fetchContext: (signal: AbortSignal) => Promise<GuildContext>,
  guildId: string,
  parent: AbortSignal,
  timeoutMs = 20_000,
): Promise<GuildContext> {
  const controller = new AbortController();
  let cancel: () => void = () => {};
  const cancelled = new Promise<never>((_, reject) => {
    cancel = () => {
      controller.abort();
      reject(new DOMException('Resource load cancelled', 'AbortError'));
    };
  });
  parent.addEventListener('abort', cancel, { once: true });
  if (parent.aborted) cancel();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('discord_resource_timeout'));
    }, timeoutMs);
  });
  try {
    if (parent.aborted) return await cancelled;
    const result = await Promise.race([fetchContext(controller.signal), cancelled, deadline]);
    if (result?.guildId !== guildId || !Array.isArray(result.channels) ||
        !Array.isArray(result.roles) || typeof result.capabilities?.channelSelectors !== 'boolean' ||
        typeof result.capabilities?.roleSelectors !== 'boolean') {
      throw new Error('discord_resource_context_invalid');
    }
    return result;
  } finally {
    clearTimeout(timer);
    parent.removeEventListener('abort', cancel);
  }
}
