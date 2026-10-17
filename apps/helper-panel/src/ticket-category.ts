import type { GuildContext } from './api';
export function canCreateTicketCategory(context: GuildContext | null) {
  if (!context || context.stale || !context.bot?.available) return false;
  try {
    const bits = BigInt(context.bot.permissions ?? '0');
    const required = 16n | (1n << 28n) | (1n << 10n) | (1n << 11n) | (1n << 16n);
    return (bits & 8n) !== 0n || (bits & required) === required;
  } catch { return false; }
}
