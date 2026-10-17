import { describe, expect, it } from 'vitest';
import { canCreateTicketCategory } from './ticket-category';
import type { GuildContext } from './api';
describe('private category prerequisites', () => {
  it('checks fresh category permissions without requiring thread permissions', () => {
    const bits = 16n | (1n << 28n) | (1n << 10n) | (1n << 11n) | (1n << 16n);
    const context = {guildId:'10',bot:{available:true,permissions:bits.toString()},stale:false} as GuildContext;
    expect(canCreateTicketCategory(context)).toBe(true);
    expect(canCreateTicketCategory({...context,stale:true})).toBe(false);
    expect(canCreateTicketCategory(null)).toBe(false);
    expect(canCreateTicketCategory({...context,bot:{available:true,permissions:'8'}})).toBe(true);
    expect(canCreateTicketCategory({...context,bot:{available:true,permissions:'bad'}})).toBe(false);
    for (const bit of [16n, 1n<<28n, 1n<<10n]) {
      expect(canCreateTicketCategory({...context,bot:{available:true,permissions:(bits & ~bit).toString()}})).toBe(false);
    }
  });
});
