// DOM heads-up display: menus, scorecard, minimap, shot gauges and the swing meter.
import { DISCS, STYLES, POWER_MODES } from './sim/discs.js';
import { WORLD } from './sim/terrain.js';
import { WEATHER, TIMES } from './render/sky.js';
import { QUALITY } from './render/quality.js';
import { boardFor } from './records.js';

export const PLAYER_COLORS = ['#ff7a3d', '#3b82f6', '#f4c20d', '#a855f7', '#22c55e', '#ef4444', '#14b8a6', '#ec4899'];
export const WIND_LEVELS = [
  { name: 'Calm', speed: 0, gust: 0 },
  { name: 'Breezy', speed: 2.7, gust: 0.25 },
  { name: 'Windy', speed: 5.4, gust: 0.35 },
  { name: 'Gusty', speed: 8.5, gust: 0.55 },
];
// compass point the wind comes from -> heading it blows towards
const WIND_FROM = { Random: null, N: Math.PI / 2, E: Math.PI, S: -Math.PI / 2, W: 0 };
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

// "Sunny · Evening · Breezy from the NW", for a saved round's conditions.
export function describeConditions(c) {
  if (!c) return '';
  const w = c.wind || {};
  let wind = w.name || 'Calm';
  if (w.speed > 0) {
    const bearing = Math.atan2(-Math.cos(w.dir), Math.sin(w.dir)); // where it blows from; 0 = north
    wind += ` from the ${COMPASS[((Math.round(bearing / (Math.PI / 4)) % 8) + 8) % 8]}`;
  }
  return [WEATHER[c.weather]?.name, TIMES[c.time]?.name, wind].filter(Boolean).join(' · ');
}

const MAP_SCALE = 4; // map canvas pixels per metre (matches render/terrain.js)
const DEG = 180 / Math.PI;

export const feet = (m) => Math.round(m * 3.28084);
const mph = (ms) => Math.round(ms * 2.23694);
const $ = (id) => document.getElementById(id);
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function scoreName(strokes, par) {
  if (strokes === 1) return 'Ace!';
  const d = strokes - par;
  if (d <= -3) return 'Albatross!';
  if (d === -2) return 'Eagle!';
  if (d === -1) return 'Birdie!';
  if (d === 0) return 'Par';
  if (d === 1) return 'Bogey';
  if (d === 2) return 'Double bogey';
  return `+${d}`;
}

export const relPar = (n) => (n === 0 ? 'E' : n > 0 ? `+${n}` : `${n}`);

function segmented(el, options, initial, onPick) {
  el.innerHTML = '';
  let current = initial;
  options.forEach((label, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.className = i === current ? 'active' : '';
    b.onclick = () => {
      current = i;
      [...el.children].forEach((c, j) => c.classList.toggle('active', j === i));
      onPick(i);
    };
    el.appendChild(b);
  });
}

// A little top-down sketch of a course for its menu card.
function drawThumb(canvas, L) {
  const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height, T = L.theme;
  const s = Math.min(W / (L.world.halfW * 2), H / (L.world.halfH * 2));
  const X = (x) => W / 2 + x * s, Z = (z) => H / 2 + z * s;
  const trace = (pts, close) => {
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(X(p[0] ?? p.x), Z(p[1] ?? p.z)) : g.moveTo(X(p[0] ?? p.x), Z(p[1] ?? p.z))));
    if (close) g.closePath();
  };
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.fillStyle = T.ground.woods; g.fillRect(0, 0, W, H);
  g.strokeStyle = g.fillStyle = T.ground.lawn;
  for (const r of L.roads) if (r.lawn) { trace(r.pts); g.lineWidth = r.lawn * 2 * s; g.stroke(); }
  for (const a of L.lawnAreas) { trace(a, true); g.fill(); }
  g.fillStyle = T.ground.sand;
  for (const a of L.sand) { trace(a.poly.pts, true); g.fill(); }
  g.fillStyle = T.ground.green ?? T.ground.lawn;
  for (const a of L.greens || []) { trace(a, true); g.fill(); }
  for (const t of L.trees) {
    g.fillStyle = t.color;
    g.globalAlpha = 0.55;
    g.beginPath(); g.arc(X(t.x), Z(t.z), Math.max(0.8, t.r * s * 0.8), 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  g.fillStyle = g.strokeStyle = T.water.deep;
  for (const w of L.water) {
    if (w.kind === 'creek') { trace(w.path.pts); g.lineWidth = Math.max(1.5, w.width * s * 1.6); g.stroke(); }
    else if (w.poly) { trace(w.poly.pts, true); g.fill(); }
    else { g.beginPath(); g.arc(X(w.circle.x), Z(w.circle.z), 12 * s, 0, Math.PI * 2); g.fill(); }
  }
  g.strokeStyle = '#4d5157';
  for (const r of L.roads) { trace(r.pts); g.lineWidth = Math.max(1.5, r.width * s); g.stroke(); }
  for (const h of L.houses) {
    g.save(); g.translate(X(h.cx), Z(h.cz)); g.rotate(h.ang);
    g.fillStyle = h.roofColor; g.fillRect(-h.hu * s, -h.hv * s, h.hu * 2 * s, h.hv * 2 * s);
    g.restore();
  }
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 1.6;
  for (const hole of L.holes) { trace(hole.route); g.stroke(); }
  g.font = 'bold 9px Trebuchet MS, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const hole of L.holes) {
    const x = X(hole.tee.x), z = Z(hole.tee.z);
    g.fillStyle = '#ff7a3d'; g.beginPath(); g.arc(x, z, 5.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.fillText(String(hole.number), x, z + 0.5);
  }
}

export class Hud {
  constructor(handlers) {
    this.map = null;
    this.h = handlers;
    // back the HUD canvases with enough pixels to stay sharp on high-DPI screens
    this.dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    for (const id of ['minimap', 'angles']) {
      const c = $(id);
      c.width *= this.dpr; c.height *= this.dpr;
    }
    this.mini = $('minimap').getContext('2d');
    this.angles = $('angles').getContext('2d');
    this.cache = {};
    this.buildMenu();
    this.buildBag();
    $('help-btn').onclick = () => this.toggleHelp();
    $('music-btn').onclick = () => this.h.onKey('KeyN');
    $('help-close').onclick = () => this.toggleHelp(false);
    $('map-btn').onclick = () => this.h.onKey('KeyM');
    $('style-btn').onclick = () => this.h.onKey('KeyT');
    $('mode-btn').onclick = () => this.h.onKey('KeyG');
    $('score-btn').onclick = () => this.scoreAction?.();
  }

  set(id, value) {
    if (this.cache[id] === value) return;
    this.cache[id] = value;
    $(id).textContent = value;
  }

  setMap(canvas) {
    this.map = canvas;
  }

  get selectedCourse() {
    return this.cfg.course;
  }

  // ------------------------------------------------------------------ menu
  buildMenu() {
    const init = this.h.initial;
    const timeKeys = Object.keys(TIMES), qualityKeys = Object.keys(QUALITY);
    const cfg = (this.cfg = {
      count: 2, names: ['Player 1', 'Player 2', 'Player 3', 'Player 4'], hands: ['R', 'R', 'R', 'R'],
      weather: 0, wind: 1, from: 0, time: Math.max(0, timeKeys.indexOf(init.time)), course: init.course,
    });
    const weatherKeys = Object.keys(WEATHER);
    const preview = () => this.h.onConditions(weatherKeys[cfg.weather], timeKeys[cfg.time]);

    const allCards = () => [...$('course-cards').children, ...$('champ-cards').children];
    for (const L of this.h.courses) {
      const cards = L.tier === 'championship' ? $('champ-cards') : $('course-cards');
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'course-card';
      card.dataset.id = L.id;
      const par = L.holes.reduce((a, h) => a + h.par, 0);
      const len = L.holes.reduce((a, h) => a + h.playLength, 0);
      const thumb = document.createElement('canvas');
      thumb.width = 300; thumb.height = 220;
      drawThumb(thumb, L);
      card.append(thumb);
      card.insertAdjacentHTML('beforeend', `<div class="course-name">${esc(L.name)}${L.holes.length > 9 ? ` <span class="tag">${L.holes.length} holes</span>` : ''}</div><div class="course-meta">Par ${par} · ${feet(len).toLocaleString()} ft</div><div class="course-blurb">${esc(L.blurb)}</div><div class="course-record"></div>`);
      card.onclick = () => {
        if (cfg.course === L.id) return;
        cfg.course = L.id;
        allCards().forEach((c) => c.classList.toggle('active', c.dataset.id === L.id));
        this.renderBoard();
        card.classList.add('loading');
        // let the highlight paint before the course is built
        setTimeout(() => { this.h.onCourse(L.id); card.classList.remove('loading'); }, 30);
      };
      card.classList.toggle('active', L.id === cfg.course);
      cards.append(card);
    }
    const list = $('player-list');
    const renderPlayers = () => {
      list.innerHTML = '';
      for (let i = 0; i < cfg.count; i++) {
        const row = document.createElement('div');
        row.className = 'player-row';
        row.innerHTML = `<div class="swatch" style="background:${PLAYER_COLORS[i]}"></div>`;
        const input = document.createElement('input');
        input.value = cfg.names[i]; input.maxLength = 14; input.setAttribute('aria-label', `Player ${i + 1} name`);
        input.oninput = () => { cfg.names[i] = input.value; this.playersChanged(); };
        const hand = document.createElement('div');
        hand.className = 'seg';
        segmented(hand, ['Right', 'Left'], cfg.hands[i] === 'R' ? 0 : 1, (k) => { cfg.hands[i] = k ? 'L' : 'R'; this.playersChanged(); });
        row.append(input, hand);
        list.appendChild(row);
      }
    };
    segmented($('player-count'), ['1', '2', '3', '4'], cfg.count - 1, (i) => { cfg.count = i + 1; renderPlayers(); this.playersChanged(); });
    segmented($('weather-seg'), weatherKeys.map((k) => WEATHER[k].name), 0, (i) => { cfg.weather = i; preview(); });
    segmented($('time-seg'), timeKeys.map((k) => TIMES[k].name), cfg.time, (i) => { cfg.time = i; preview(); });
    segmented($('sfx-seg'), ['On', 'Off'], init.sfx ? 0 : 1, (i) => this.h.onSound({ sfx: i === 0 }));
    this.renderMusicSeg = (on) => segmented($('music-seg'), ['On', 'Off'], on ? 0 : 1, (i) => this.h.onSound({ music: i === 0 }));
    this.renderMusicSeg(init.music);
    segmented($('quality-seg'), qualityKeys.map((k) => QUALITY[k].name), Math.max(0, qualityKeys.indexOf(init.quality)), (i) => {
      const btns = [...$('quality-seg').children];
      btns[i].classList.add('loading');
      setTimeout(() => { this.h.onQuality(qualityKeys[i]); btns[i].classList.remove('loading'); }, 30);
    });
    preview();
    segmented($('wind-seg'), WIND_LEVELS.map((w) => w.name), cfg.wind, (i) => { cfg.wind = i; });
    segmented($('winddir-seg'), Object.keys(WIND_FROM), 0, (i) => { cfg.from = i; });
    renderPlayers();
    this.players = () => Array.from({ length: cfg.count }, (_, i) => ({
      name: cfg.names[i].trim() || `Player ${i + 1}`, color: PLAYER_COLORS[i], hand: cfg.hands[i],
    }));
    this.refreshRecords();
    $('start-btn').onclick = () => {
      const from = Object.values(WIND_FROM)[cfg.from];
      const config = {
        players: this.players(),
        weather: weatherKeys[cfg.weather],
        time: timeKeys[cfg.time],
        wind: { ...WIND_LEVELS[cfg.wind], dir: from ?? Math.random() * Math.PI * 2 },
      };
      const net = this.net;
      if (net?.joined) {
        // everyone online in the lobby, device by device, each player in their own colour
        const roster = net.peers.filter((d) => d.online).flatMap((d) => d.players.map((pl) => ({ ...pl, owner: d.id })));
        if (roster.length) {
          config.players = roster.map((pl, i) => ({ ...pl, color: PLAYER_COLORS[i % PLAYER_COLORS.length] }));
          Object.assign(config, { net: true, course: cfg.course });
        }
      }
      this.h.onStart(config);
    };
  }

  // ------------------------------------------------------------- Wi-Fi play
  // Shown when the game is served by its own dev server: join the lobby, see who else is
  // in it, and the address other devices should open.
  setupNet(net) {
    this.net = net;
    $('net-section').classList.remove('hidden');
    segmented($('net-seg'), ['Off', 'On'], 0, (i) => {
      if (i) net.join(this.players()); else net.leave();
      this.renderNet();
    });
    net.onPeers = () => this.renderNet();
  }

  playersChanged() {
    if (!this.net?.joined) return;
    clearTimeout(this.helloTimer);
    this.helloTimer = setTimeout(() => this.net.join(this.players()), 300);
  }

  renderNet() {
    const net = this.net, el = $('net-panel');
    el.classList.toggle('hidden', !net.joined);
    if (!net.joined) return;
    let html = net.lan && net.urls.length
      ? `<div>Other devices on this Wi-Fi can join at</div>${net.urls.map((u) => `<div class="net-url">${esc(u)}</div>`).join('')}`
      : '<div>To let other devices join, start the game with <b>npm run party</b>.</div>';
    html += '<ul>';
    for (const d of net.peers) {
      if (!d.players.length) continue;
      const names = d.players.map((pl) => esc(pl.name)).join(', ') || 'no players';
      html += `<li class="${d.online ? '' : 'off'}"><span class="dot"></span><span>${names}${d.id === net.id ? ' <small>(this device)</small>' : d.online ? '' : ' <small>(offline)</small>'}</span></li>`;
    }
    html += '</ul><small>Anyone can press Tee off to start everyone on this course.</small>';
    el.innerHTML = html;
  }

  // A round started on another device: show its course as the selected one.
  selectCourse(id) {
    this.cfg.course = id;
    for (const c of [...$('course-cards').children, ...$('champ-cards').children]) c.classList.toggle('active', c.dataset.id === id);
  }

  // Reflect the music switch after it was flipped from the keyboard.
  setMusic(on) {
    this.renderMusicSeg(on);
    $('music-btn').classList.toggle('off', !on);
  }

  // The record line on every course card, and the board for the selected course.
  refreshRecords() {
    for (const card of [...$('course-cards').children, ...$('champ-cards').children]) {
      const best = boardFor(card.dataset.id).entries[0];
      card.querySelector('.course-record').textContent = best
        ? `Record ${best.strokes} (${relPar(best.toPar)}) · ${best.name}`
        : 'No record yet';
    }
    this.renderBoard();
  }

  renderBoard() {
    const L = this.h.courses.find((c) => c.id === this.cfg.course) ?? this.h.courses[0];
    const board = boardFor(L.id), el = $('board');
    const day = (iso) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    let html = `<div class="board-head"><b>Best rounds</b> · ${esc(L.name)}</div>`;
    if (!board.entries.length) {
      html += '<p class="board-empty">No rounds on the board yet. Finish a round here to set the course record, and your ghost will be waiting for the next challenger.</p>';
    } else {
      html += '<table class="board-table">' + board.entries.map((e, i) => `<tr class="${i === 0 ? 'top' : ''}"><td class="rank">${i + 1}</td><td class="who">${esc(e.name)}</td><td class="num">${e.strokes}</td><td class="num">${relPar(e.toPar)}</td><td class="cond">${esc(describeConditions(e.conditions))}</td><td class="when">${day(e.date)}</td></tr>`).join('') + '</table>';
    }
    const g = board.ghost;
    if (g) {
      html += `<button type="button" id="ghost-btn" class="ghost-btn">Face the ghost of ${esc(g.name)} · ${g.strokes} (${relPar(g.toPar)})<small>Same course, same conditions: ${esc(describeConditions(g.conditions))}</small></button>`;
    }
    el.innerHTML = html;
    if (g) {
      $('ghost-btn').onclick = () => this.h.onStart({
        players: this.players(), weather: g.conditions.weather, time: g.conditions.time, wind: { ...g.conditions.wind }, ghost: g,
      });
    }
  }

  showGame(on) {
    if (!on) this.refreshRecords();
    $('menu').classList.toggle('hidden', on);
    $('hud').classList.toggle('hidden', !on);
  }

  // ------------------------------------------------------------- shot panel
  buildBag() {
    const row = $('disc-row');
    DISCS.forEach((d, i) => {
      const b = document.createElement('button');
      b.className = 'disc-btn';
      b.title = `${d.name} (${i + 1})`;
      b.innerHTML = `<span>${i + 1} · ${d.name}</span><span class="nums">${d.flight.join(' / ')}</span>`;
      b.onclick = () => this.h.onKey(`Digit${i + 1}`);
      row.appendChild(b);
    });
  }

  setShot(aim, fadeSide) {
    const key = `${aim.disc}|${aim.style}|${aim.mode}`;
    if (this.cache.shot !== key) {
      this.cache.shot = key;
      [...$('disc-row').children].forEach((c, i) => c.classList.toggle('active', i === aim.disc));
      $('style-btn').textContent = `T · ${STYLES[aim.style].name}`;
      $('mode-btn').textContent = `G · ${POWER_MODES[aim.mode].name}`;
    }
    this.drawAngles(aim, fadeSide);
  }

  drawAngles(aim, fadeSide) {
    const key = `${aim.hyzer.toFixed(3)}|${aim.nose.toFixed(3)}|${aim.loft.toFixed(3)}|${aim.style}|${fadeSide}`;
    if (this.cache.angles === key) return;
    this.cache.angles = key;
    const g = this.angles, W = 250, H = 96;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.lineCap = 'round';
    g.font = 'bold 12px Trebuchet MS, sans-serif'; g.textAlign = 'center';

    // view from behind the thrower: how the disc is banked
    const bank = aim.style === 'oh' ? -fadeSide * (Math.PI / 2 - aim.hyzer) : fadeSide * aim.hyzer;
    g.save(); g.translate(62, 42);
    g.strokeStyle = 'rgba(23,50,74,0.18)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-46, 0); g.lineTo(46, 0); g.stroke();
    g.rotate(bank);
    g.strokeStyle = '#ff7a3d'; g.lineWidth = 7;
    g.beginPath(); g.moveTo(-34, 0); g.lineTo(34, 0); g.stroke();
    g.restore();
    const hz = Math.round(aim.hyzer * DEG);
    g.fillStyle = '#17324a';
    const tilt = aim.style === 'oh' ? `Overhand ${hz >= 0 ? '+' : ''}${hz}°` : hz === 0 ? 'Flat' : hz > 0 ? `Hyzer ${hz}°` : `Anhyzer ${-hz}°`;
    g.fillText(tilt, 62, 88);

    // side view: launch line and nose angle
    g.save(); g.translate(150, 62);
    g.strokeStyle = 'rgba(23,50,74,0.18)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-10, 0); g.lineTo(84, 0); g.stroke();
    g.rotate(-aim.loft);
    g.strokeStyle = '#17324a'; g.lineWidth = 2; g.setLineDash([5, 5]);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(78, 0); g.stroke();
    g.setLineDash([]);
    g.beginPath(); g.moveTo(78, 0); g.lineTo(70, -5); g.moveTo(78, 0); g.lineTo(70, 5); g.stroke();
    g.translate(30, 0); g.rotate(-aim.nose);
    g.strokeStyle = '#ff7a3d'; g.lineWidth = 7;
    g.beginPath(); g.moveTo(-18, 0); g.lineTo(18, 0); g.stroke();
    g.restore();
    const nose = Math.round(aim.nose * DEG);
    g.fillText(`Loft ${Math.round(aim.loft * DEG)}° · Nose ${nose > 0 ? '+' : ''}${nose}°`, 186, 88);
  }

  // ------------------------------------------------------------- status bits
  setHole(hole) {
    this.set('hole-number', String(hole.number));
    this.set('hole-name', hole.name);
    this.set('hole-par', String(hole.par));
    this.set('hole-length', String(feet(hole.playLength)));
  }

  setPlayer(player, throwNo, total) {
    this.set('player-name', player.name);
    this.set('player-throw', String(throwNo));
    this.set('player-total', total);
    if (this.cache.swatch !== player.color) {
      this.cache.swatch = player.color;
      $('player-swatch').style.background = player.color;
    }
  }

  setDistance(m) { this.set('to-pin', String(feet(m))); }

  setWind(speed, towards, viewYaw, weatherName) {
    this.set('wind-speed', speed < 0.3 ? 'Calm' : `${mph(speed)} mph`);
    this.set('weather-name', weatherName);
    // needle points up the screen when the wind is at your back
    const rot = speed < 0.3 ? 0 : Math.round((towards - viewYaw) * DEG);
    if (this.cache.windRot !== rot) {
      this.cache.windRot = rot;
      $('wind-needle').style.transform = `rotate(${rot}deg)`;
      $('wind-needle').style.opacity = speed < 0.3 ? 0.25 : 1;
    }
  }

  pin(x, y, visible, text) {
    const el = $('pin-marker');
    el.style.display = visible ? 'flex' : 'none';
    if (!visible) return;
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    if (this.cache.pinText !== text) { this.cache.pinText = text; el.firstElementChild.textContent = text; }
  }

  // ------------------------------------------------------------ swing meter
  swingIdle() {
    $('swing-fill').style.height = '0%';
    $('swing-tick').style.opacity = 0;
    $('swing-label').innerHTML = 'Hold, pull back,<br />flick forward';
  }

  swingPull(pull, forward) {
    $('swing-fill').style.height = `${Math.round(pull * 100)}%`;
    $('swing-label').innerHTML = forward ? 'Flick!' : `${Math.round(pull * 100)}%<small>pull back for power</small>`;
  }

  swingResult(r) {
    $('swing-fill').style.height = `${Math.round(r.pull * 100)}%`;
    const tick = $('swing-tick');
    tick.style.opacity = 1;
    tick.style.bottom = `${Math.min(100, Math.round(r.power * 100))}%`;
    const tempo = r.over > 0.5 ? 'Overswung' : r.tempo >= 0.97 ? 'Crisp' : r.tempo > 0.8 ? 'Smooth' : 'Lazy';
    const off = Math.round(Math.abs(r.yawErr) * DEG);
    const line = off < 1 ? 'on line' : `${off}° ${r.yawErr > 0 ? 'right' : 'left'}`;
    $('swing-label').innerHTML = `${Math.round(r.power * 100)}% power<small>${tempo} · ${line}</small>`;
  }

  // ----------------------------------------------------------------- toasts
  toast(html, ms = 1800) {
    const el = $('toast');
    el.innerHTML = html;
    el.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  banner(big, small, ms = 3000) {
    const el = $('banner');
    el.innerHTML = `<div class="big">${big}</div><div class="small">${small}</div>`;
    el.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  // A short list of choices over the course, e.g. how to play on after going out of bounds.
  // Each option is { key, label, sub, pick }; the game handles the keys itself.
  showChoice({ title, options }) {
    const el = $('choice');
    el.innerHTML = `<div class="choice-title">${esc(title)}</div>`;
    for (const o of options) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice-btn';
      btn.innerHTML = `<kbd>${esc(o.key)}</kbd><span>${esc(o.label)}<small>${esc(o.sub)}</small></span>`;
      btn.onclick = o.pick;
      el.append(btn);
    }
    el.classList.remove('hidden');
  }

  hideChoice() { $('choice').classList.add('hidden'); }

  toggleHelp(on) {
    const el = $('help');
    el.classList.toggle('hidden', on === undefined ? !el.classList.contains('hidden') : !on);
  }

  // ---------------------------------------------------------------- minimap
  drawMinimap({ hole, players, current, aim, landing }) {
    if (!this.map) return;
    const g = this.mini, W = 220, H = 260;
    const mx = (hole.tee.x + hole.basket.x) / 2, mz = (hole.tee.z + hole.basket.z) / 2;
    const yaw = Math.atan2(hole.basket.z - hole.tee.z, hole.basket.x - hole.tee.x);
    const k = Math.min(3.2, (H - 64) / (hole.length + 14)); // screen px per metre
    const phi = -Math.PI / 2 - yaw, cos = Math.cos(phi), sin = Math.sin(phi);
    const P = (x, z) => [W / 2 + ((x - mx) * cos - (z - mz) * sin) * k, H / 2 + ((x - mx) * sin + (z - mz) * cos) * k];

    g.save();
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.beginPath(); g.roundRect(0, 0, W, H, 14); g.clip();
    g.translate(W / 2, H / 2); g.rotate(phi); g.scale(k / MAP_SCALE, k / MAP_SCALE);
    g.drawImage(this.map, -(mx + WORLD.halfW) * MAP_SCALE, -(mz + WORLD.halfH) * MAP_SCALE);
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const [tx, tz] = P(hole.tee.x, hole.tee.z);
    g.fillStyle = '#ffffff'; g.strokeStyle = '#17324a'; g.lineWidth = 1.5;
    g.fillRect(tx - 4, tz - 4, 8, 8); g.strokeRect(tx - 4, tz - 4, 8, 8);
    const [bx, bz] = P(hole.basket.x, hole.basket.z);
    g.fillStyle = '#ff7a3d'; g.strokeStyle = '#ffffff'; g.lineWidth = 2;
    g.beginPath(); g.arc(bx, bz, 6, 0, Math.PI * 2); g.fill(); g.stroke();

    if (aim && current) {
      const [ax, az] = P(current.lie.x, current.lie.z);
      const end = landing ? P(landing.x, landing.z) : P(current.lie.x + Math.cos(aim.yaw) * 40, current.lie.z + Math.sin(aim.yaw) * 40);
      g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2; g.setLineDash([5, 4]);
      g.beginPath(); g.moveTo(ax, az); g.lineTo(end[0], end[1]); g.stroke();
      g.setLineDash([]);
      if (landing) { g.beginPath(); g.arc(end[0], end[1], 4, 0, Math.PI * 2); g.stroke(); }
    }
    for (const p of players) {
      if (p.holed) continue;
      const [x, z] = P(p.lie.x, p.lie.z);
      g.fillStyle = p.color; g.strokeStyle = p === current ? '#ffffff' : '#17324a'; g.lineWidth = p === current ? 2.5 : 1.2;
      g.beginPath(); g.arc(x, z, p === current ? 5.5 : 4, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    g.restore();
  }

  // -------------------------------------------------------------- scorecard
  showScorecard({ holes, players, played, current, title, button, onAction, notes = [] }) {
    // eighteen holes split into Out and In, like a golf scorecard
    const halves = holes.length > 9 ? [[0, 9, 'Out'], [9, holes.length, 'In']] : [[0, holes.length, null]];
    const sum = (list) => list.reduce((a, v) => a + (v ?? 0), 0);
    const tables = halves.map(([a, b, label], k) => {
      const part = holes.slice(a, b), last = k === halves.length - 1;
      const head = `<tr><th></th>${part.map((h) => `<th>${h.number}</th>`).join('')}${label ? `<th>${label}</th>` : ''}${last ? '<th>Total</th><th>±</th>' : ''}</tr>`;
      const parTotal = sum(holes.map((h) => h.par));
      const parRow = `<tr><td class="name">Par</td>${part.map((h) => `<td>${h.par}</td>`).join('')}${label ? `<td class="total">${sum(part.map((h) => h.par))}</td>` : ''}${last ? `<td class="total">${parTotal}</td><td></td>` : ''}</tr>`;
      const rows = players.map((p) => {
        const cells = part.map((h, i) => {
          const s = p.scores[a + i];
          if (s == null) return '<td></td>';
          return `<td class="${s < h.par ? 'under' : s > h.par ? 'over' : ''}">${s}</td>`;
        }).join('');
        const done = holes.map((h, i) => (p.scores[i] == null ? null : p.scores[i]));
        const total = sum(done), rel = sum(done.map((s, i) => (s == null ? null : s - holes[i].par)));
        const half = sum(p.scores.slice(a, b));
        return `<tr class="${p === current ? 'current' : ''}"><td class="name"><span class="swatch" style="background:${p.color}"></span>${esc(p.name)}</td>${cells}${label ? `<td class="total">${played && half ? half : ''}</td>` : ''}${last ? `<td class="total">${played ? total : ''}</td><td class="total">${played ? relPar(rel) : ''}</td>` : ''}</tr>`;
      }).join('');
      return `<table class="card">${head}${parRow}${rows}</table>`;
    });
    $('score-table').innerHTML = tables.join('');
    $('score-title').textContent = title;
    $('score-notes').innerHTML = notes.map((n) => `<p>${esc(n)}</p>`).join('');
    $('score-btn').textContent = button;
    this.scoreAction = onAction;
    $('scorecard').classList.remove('hidden');
  }

  hideScorecard() { $('scorecard').classList.add('hidden'); }

  scorecardOpen() { return !$('scorecard').classList.contains('hidden'); }
}
