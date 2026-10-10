import type { GuildContext } from './api';

export function moderatorRoles(context: GuildContext | null) {
  const mask = 8n | 32n | 2n | 4n | (1n << 13n) | (1n << 40n);
  return (context?.roles ?? []).filter(role => {
    if (role.managed || role.id === context?.guildId || !role.permissions) return false;
    try { return (BigInt(role.permissions) & mask) !== 0n; } catch { return false; }
  });
}

export function validStarboardName(name: string) {
  return /^[a-z0-9_-]{2,80}$/.test(name.trim().toLowerCase());
}

export function canCreateStarboard(context: GuildContext | null) {
  if (!context || context.stale || !context.bot?.available) return false;
  try {
    const bot = BigInt(context.bot.permissions ?? '0');
    const required = 16n | (1n << 6n) | (1n << 28n) | (1n << 10n) | (1n << 11n) | (1n << 14n) | (1n << 15n) | (1n << 16n);
    return (bot & 8n) !== 0n || (bot & required) === required;
  } catch { return false; }
}
