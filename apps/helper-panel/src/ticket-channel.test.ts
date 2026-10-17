import { describe, expect, it, vi, afterEach } from 'vitest';
afterEach(() => vi.unstubAllGlobals());
describe('ticket panel channel API', () => {
  it('creates a channel without accepting arbitrary guilds or permission overrides', async () => {
    vi.stubGlobal('window', {location:{hash:''}});
    const { api } = await import('./api');
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({guildId:'guild',channel:{id:'123',name:'tickets',type:0},reused:false}), {status:200,headers:{'Content-Type':'application/json'}}));
    vi.stubGlobal('fetch', fetch);
    const result = await api.createTicketPanelChannel('tickets');
    expect(result.channel.id).toBe('123');
    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain('/api/tickets/channel');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({name:'tickets'});
  });
});
