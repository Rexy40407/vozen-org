import { describe, expect, it } from 'vitest';
import { canCreateStarboard, moderatorRoles, validStarboardName } from './starboard-channel';
import type { GuildContext } from './api';

const context = {
  guildId:'guild',stale:false,bot:{available:true,permissions:'8'},roles:[
    {id:'guild',name:'everyone',permissions:'8'},
    {id:'member',name:'Member',permissions:'2048'},
    {id:'mod',name:'Moderator',permissions:'8192'},
    {id:'bot',name:'Bot',managed:true,permissions:'8'},
    {id:'unknown',name:'Unknown',permissions:'bad'},
  ],
} as GuildContext;

describe('Starboard channel creation', () => {
  it('only lists verified moderator roles, not everyone or integrations', () => {
    expect(moderatorRoles(context).map(role => role.id)).toEqual(['mod']);
    expect(moderatorRoles(null)).toEqual([]);
  });
  it('requires fresh bot permissions', () => {
    expect(canCreateStarboard(context)).toBe(true);
    expect(canCreateStarboard({...context,stale:true})).toBe(false);
    expect(canCreateStarboard({...context,bot:{available:true,permissions:'2048'}})).toBe(false);
    expect(canCreateStarboard(null)).toBe(false);
  });
  it('validates channel names without silently rewriting invalid input', () => {
    expect(validStarboardName(' Starboard ')).toBe(true);
    for (const name of ['', 'a', 'star board', '../starboard', '@everyone', 'a'.repeat(81)]) {
      expect(validStarboardName(name)).toBe(false);
    }
  });
  it('supports a non-admin bot without TTS but requires the thread overwrite permissions', () => {
    const bits = 16n | (1n << 6n) | (1n << 28n) | (1n << 10n) | (1n << 11n) | (1n << 14n) | (1n << 15n) | (1n << 16n) | (1n << 35n) | (1n << 36n) | (1n << 38n);
    expect(canCreateStarboard({...context,bot:{available:true,permissions:bits.toString()}})).toBe(true);
    for (const bit of [35n,36n,38n]) expect(canCreateStarboard({...context,bot:{available:true,permissions:(bits & ~(1n << bit)).toString()}})).toBe(false);
  });
});
