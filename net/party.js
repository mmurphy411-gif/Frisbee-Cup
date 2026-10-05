// Wi-Fi play: a tiny message relay that rides on the Vite server, so devices on the same
// network can play one round together. Devices listen with Server-Sent Events
// (GET /net/events) and post with plain requests (POST /net/send). Every message the round
// depends on is numbered and kept until the next round starts, so a device that drops off
// the Wi-Fi for a moment catches up from where it left off (EventSource reconnects on its
// own and sends the last number it saw).
import os from 'node:os';

export function party() {
  const devices = new Map(); // id -> { id, players, res }
  let log = []; // { seq, msg } for the current round
  let seq = 0;

  const emit = (res, ev) => res.write(`id: ${ev.seq}\ndata: ${JSON.stringify(ev.msg)}\n\n`);
  const broadcast = (msg, keep) => {
    const ev = { seq: ++seq, msg };
    if (keep) log.push(ev);
    for (const d of devices.values()) if (d.res) emit(d.res, ev);
  };
  const peers = () => broadcast({ t: 'peers', peers: [...devices.values()].map(({ id, players, res }) => ({ id, players, online: !!res })) });
  const device = (id) => {
    if (!devices.has(id)) devices.set(id, { id, players: [], res: null });
    return devices.get(id);
  };

  function lanUrls(port) {
    const urls = [];
    for (const list of Object.values(os.networkInterfaces())) {
      for (const a of list || []) if (a.family === 'IPv4' && !a.internal) urls.push(`http://${a.address}:${port}/`);
    }
    return urls;
  }

  const handler = (lan) => (req, res, next) => {
    const url = new URL(req.url, 'http://local');
    if (!url.pathname.startsWith('/net/')) return next();
    const id = url.searchParams.get('id') || '';

    if (url.pathname === '/net/info') {
      const port = Number(req.headers.host?.split(':')[1]) || 80;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ lan: lan(), urls: lan() ? lanUrls(port) : [] }));
    }

    if (url.pathname === '/net/events' && id) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write('retry: 1500\n\n');
      const d = device(id);
      if (d.res) d.res.end();
      d.res = res;
      clearTimeout(d.gone);
      // back after a dropout: send everything the round has had since
      const last = Number(req.headers['last-event-id']);
      if (last) for (const ev of log) if (ev.seq > last) emit(res, ev);
      const ping = setInterval(() => res.write(': ping\n\n'), 20000);
      req.on('close', () => {
        clearInterval(ping);
        if (d.res !== res) return;
        d.res = null;
        peers();
        // gone for good (closed, or asleep for a while): take them out of the lobby
        d.gone = setTimeout(() => { if (!d.res && devices.get(id) === d) { devices.delete(id); peers(); } }, 120000);
      });
      return peers();
    }

    if (url.pathname === '/net/send' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => { body += c; if (body.length > 2e6) req.destroy(); });
      req.on('end', () => {
        res.end('ok');
        let m;
        try { m = JSON.parse(body); } catch { return; }
        if (!m?.from || !m.msg) return;
        const msg = { ...m.msg, from: m.from };
        if (msg.t === 'hello') { device(m.from).players = msg.players || []; return peers(); }
        if (msg.t === 'leave') { devices.get(m.from)?.res?.end(); devices.delete(m.from); return peers(); }
        if (msg.t === 'start') log = []; // a new round: forget the last one
        broadcast(msg, !msg.v); // 'v' marks volatile chatter (aim updates) that needn't be replayed
      });
      return;
    }
    next();
  };

  return {
    name: 'frisbee-party',
    configureServer(server) {
      server.middlewares.use(handler(() => !!server.config.server.host));
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler(() => !!server.config.preview.host));
    },
  };
}
