// Wi-Fi play, the browser side: join the lobby on the server this page came from, send
// messages to every other device and hear theirs. See net/party.js for the relay.

const newId = () => Math.random().toString(36).slice(2, 10);

export class Net {
  constructor() {
    // one id per tab, kept across reloads so a device doesn't show up twice in the lobby
    let id = null;
    try { id = sessionStorage.getItem('fc.netId'); } catch { /* no storage */ }
    this.id = id || newId();
    try { sessionStorage.setItem('fc.netId', this.id); } catch { /* not kept */ }
    this.available = false; // is there a relay at all (the dev or preview server)?
    this.lan = false; // is the server reachable from other devices?
    this.urls = [];
    this.peers = [];
    this.joined = false;
    this.onMessage = null; // (msg) => void, for messages from other devices
    this.onPeers = null; // (peers) => void
    this.queue = Promise.resolve();
  }

  async probe() {
    try {
      const r = await fetch('net/info', { cache: 'no-store' });
      if (!r.ok) return false;
      const info = await r.json();
      Object.assign(this, { available: true, lan: info.lan, urls: info.urls });
    } catch { this.available = false; }
    return this.available;
  }

  join(players) {
    if (!this.joined) {
      this.joined = true;
      this.source = new EventSource(`net/events?id=${this.id}`);
      this.source.onmessage = (e) => {
        let msg;
        try { msg = JSON.parse(e.data); } catch { return; }
        if (msg.t === 'peers') { this.peers = msg.peers; this.onPeers?.(msg.peers); return; }
        if (msg.from !== this.id) this.onMessage?.(msg);
      };
    }
    this.send({ t: 'hello', players });
  }

  leave() {
    if (!this.joined) return;
    this.send({ t: 'leave' });
    this.source.close();
    this.joined = false;
    this.peers = [];
    this.onPeers?.([]);
  }

  // Messages go out one at a time, so everyone hears them in the order they were sent.
  send(msg) {
    if (!this.joined) return;
    const body = JSON.stringify({ from: this.id, msg });
    this.queue = this.queue.then(() => fetch('net/send', { method: 'POST', body, keepalive: body.length < 60000 }).catch(() => {}));
  }

  online(id) {
    return this.peers.find((p) => p.id === id)?.online ?? false;
  }
}
