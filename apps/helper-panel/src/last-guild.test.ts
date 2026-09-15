import { describe, it, expect } from 'vitest';
import { preferredGuild, rememberGuild } from './last-guild';
describe('last server per account', () => {
  const values = new Map<string, string>();
  const storage = {getItem:(key:string) => values.get(key) ?? null,setItem:(key:string,value:string) => { values.set(key,value); }};
  const guilds = [{id:'a',canManage:true},{id:'b',canManage:true},{id:'denied',canManage:false}];
  it('restores the last successful choice only for its owner', () => {
    rememberGuild(storage,'alice','b');
    expect(preferredGuild(storage,'alice','a',guilds)).toBe('b');
    expect(preferredGuild(storage,'bob','a',guilds)).toBe('a');
  });
  it('does not restore a removed or unauthorized guild', () => {
    rememberGuild(storage,'alice','removed');
    expect(preferredGuild(storage,'alice','a',guilds)).toBe('a');
    rememberGuild(storage,'alice','denied');
    expect(preferredGuild(storage,'alice','a',guilds)).toBe('a');
  });
  it('works when browser storage is unavailable', () => {
    const blocked = {getItem:() => {throw Error('blocked');},setItem:() => {throw Error('blocked');}};
    expect(preferredGuild(blocked,'alice','a',guilds)).toBe('a');
    expect(() => rememberGuild(blocked,'alice','b')).not.toThrow();
  });
});
