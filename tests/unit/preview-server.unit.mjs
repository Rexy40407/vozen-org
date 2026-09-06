import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { once } from 'node:events';
import { createSiteServer, closeSiteServer } from '../../tools/serve-site.mjs';

test('preview shutdown closes unfinished browser connections', async (t) => {
  const { server, origin } = await createSiteServer();
  const socket = net.connect(Number(new URL(origin).port), '127.0.0.1');
  t.after(() => { socket.destroy(); server.closeAllConnections(); server.close(); });
  await once(socket, 'connect');
  socket.write('GET / HTTP/1.1\r\nHost: localhost\r\n');
  await Promise.race([
    closeSiteServer(server),
    new Promise((_, reject) => {
      const timeout = setTimeout(() => reject(new Error('preview shutdown hung')), 1_000);
      timeout.unref();
    }),
  ]);
  assert.equal(server.listening, false);
});
