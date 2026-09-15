type GuildStorage = Pick<Storage, 'getItem' | 'setItem'>;
const keyFor = (userId: string) => `vh_last_guild_${userId}`;
export function preferredGuild(storage: GuildStorage | null, userId: string, current: string, guilds: {id:string;canManage:boolean}[]): string {
  try {
    const saved = storage?.getItem(keyFor(userId));
    return saved && guilds.some(guild => guild.id === saved && guild.canManage) ? saved : current;
  } catch { return current; }
}
export function rememberGuild(storage: GuildStorage | null, userId: string, guildId: string): void {
  try { storage?.setItem(keyFor(userId), guildId); } catch { /* Storage is optional. */ }
}
export function guildStorage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}
