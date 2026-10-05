// Round flow: turns, throws, scoring and rules.
import * as THREE from 'three';
import { DISCS, POWER_MODES } from './sim/discs.js';
import { createThrow, stepDisc, simulate, makeWind } from './sim/flight.js';
import { mulberry32 } from './sim/rng.js';
import { WEATHER } from './render/sky.js';
import { DiscMesh, Tracer, Preview, makeMarker } from './render/actors.js';
import { Avatar, playerLook } from './render/avatar.js';
import { Controls } from './input.js';
import { feet, scoreName, relPar } from './hud.js';
import { recordThrow, sampleThrow, finishThrow, replayState, advanceReplay } from './sim/ghost.js';
import { addRounds } from './records.js';

const DEG = Math.PI / 180;
const STEP = 1 / 240;
const TAP_IN = 1.5; // metres: anything closer is a gimme
const STYLE_ORDER = ['bh', 'fh', 'oh'];
const OB_TEXT = {
  roof: 'On the roof', pond: 'In the pond', lake: 'In the lake', creek: 'In the creek', pool: 'In the pool', bounds: 'Off the course',
};
const GHOST_COLOR = '#c9d6ea';
const DUST = { grass: '#9c8f62', road: '#b9b5ad', sand: '#e6d4a0', deck: '#b08a5e' };
const _v = new THREE.Vector3();
const _wind = { x: 0, z: 0 };

export class Game {
  constructor({ scene, camera, rig, hud, audio, sky, effects, canvas }) {
    Object.assign(this, { scene, camera, rig, hud, audio, sky, effects });
    this.state = 'menu';
    this.players = [];
    this.aim = { yaw: 0, loft: 8 * DEG, nose: 0, hyzer: 0, disc: 0, style: 'bh', mode: 0 };
    this.disc = new DiscMesh(scene);
    this.tracer = new Tracer(scene);
    this.preview = new Preview(scene);
    this.clock = 0;
    this.acc = 0;
    this.frame = 0;
    this.pull = 0;
    this.mapView = false;
    this.seed = (Date.now() & 0xffff) + 1;
    this.focus = new THREE.Vector3();
    this.controls = new Controls(canvas, {
      canAim: () => this.state === 'aim' && !this.hud.scorecardOpen(),
      aim: this.aim,
      onChange: () => { this.aimDirty = true; },
      onKey: (code, down) => this.key(code, down),
      onSwingStart: () => { this.pull = 0; this.chargeStep = 0; },
      onSwing: (info) => {
        this.pull = info.pull;
        this.hud.swingPull(info.pull, info.forward);
        const step = Math.min(10, Math.floor(info.pull * 10));
        if (step > this.chargeStep) { this.chargeStep = step; this.audio.charge(step); }
      },
      onThrow: (result) => this.throw(result),
      onCancel: () => { this.pull = 0; this.hud.swingIdle(); },
    });
    canvas.addEventListener('pointerdown', () => { if (this.state === 'intro') this.timer = 0; });
  }

  setCourse(entry, scenery) {
    this.course = entry;
    this.layout = entry.layout;
    this.world = entry.world;
    this.scenery = scenery;
  }

  // Feet height of anyone standing at (x, z): the ground, or a deck.
  standY(x, z) {
    return this.world.standHeight(x, z);
  }

  // ----------------------------------------------------------------- round
  start(config) {
    this.audio.unlock();
    this.audio.music.play(this.layout.theme.music ?? 'fairway');
    this.audio.ambience(this.layout.theme.ambience ?? 'park');
    for (const p of this.players) {
      this.scene.remove(p.marker);
      p.avatar.dispose();
    }
    this.weatherKey = config.weather;
    this.weather = WEATHER[config.weather];
    this.sky.setConditions(config.weather, config.time);
    this.windCfg = config.wind;
    this.wind = makeWind(config.wind.speed, config.wind.dir, config.wind.gust);
    // what a ghost needs to put a challenger in exactly the same conditions
    this.conditions = { weather: config.weather, time: config.time, wind: { ...config.wind } };
    const roster = [...config.players];
    const g = config.ghost;
    if (g) roster.push({ name: `${g.name}'s ghost`, color: GHOST_COLOR, hand: g.hand, ghost: g });
    this.players = roster.map((p, i) => ({
      ...p, scores: [], strokes: 0, lie: { x: 0, z: 0 }, holed: false, teed: false, order: i, style: 'bh',
      rec: p.ghost ? null : { holes: [] }, throwIdx: 0,
      marker: makeMarker(this.scene, p.color),
      avatar: new Avatar(this.scene, playerLook(i, p, config.weather)),
    }));
    for (const p of this.players) if (p.ghost) p.avatar.ghostly();
    this.hud.showGame(true);
    this.hud.hideScorecard();
    this.hud.hideChoice();
    this.holeIndex = 0;
    this.beginHole();
  }

  beginHole() {
    const hole = (this.hole = this.layout.holes[this.holeIndex]);
    this.basket = { x: hole.basket.x, z: hole.basket.z, y: this.standY(hole.basket.x, hole.basket.z) };
    if (this.holeIndex > 0) {
      // honours: best score on the last hole tees first
      const prev = this.holeIndex - 1;
      [...this.players]
        .sort((a, b) => a.scores[prev] - b.scores[prev] || a.order - b.order)
        .forEach((p, i) => { p.order = i; });
    }
    for (const p of this.players) {
      p.strokes = 0; p.holed = false; p.teed = false; p.throwIdx = 0;
      if (p.rec) p.rec.holes[this.holeIndex] = { throws: [], score: 0, end: null };
      p.lie = { x: hole.tee.x, z: hole.tee.z };
      p.marker.visible = false;
    }
    this.current = null;
    this.assignSpots();
    this.hud.setHole(hole);
    this.hud.banner(`Hole ${hole.number} · ${hole.name}`, `Par ${hole.par} · ${feet(hole.playLength)} ft`, 3400);
    this.preview.hide(); this.disc.hide(); this.tracer.hide();
    this.state = 'intro';
    this.timer = 3.9;
    this.audio.music.jingle('hole');
    this.rig.set('flyover', { route: hole.route, duration: 3.7 });
    this.rig.cut();
  }

  distToBasket(p) { return Math.hypot(this.basket.x - p.lie.x, this.basket.z - p.lie.z); }

  totalFor(p) {
    return p.scores.reduce((sum, s, i) => sum + (s == null ? 0 : s - this.layout.holes[i].par), 0);
  }

  nextTurn() {
    const waiting = this.players.filter((p) => !p.holed);
    if (!waiting.length) return this.endHole();
    // everyone tees off in order, then the player farthest from the basket throws
    let next = waiting.filter((p) => !p.teed).sort((a, b) => a.order - b.order)[0];
    if (!next) next = waiting.reduce((far, p) => (this.distToBasket(p) > this.distToBasket(far) ? p : far));
    this.current = next;
    next.avatar.thrown = false;
    this.assignSpots();
    this.disc.hide(); this.tracer.hide();
    for (const p of this.players) this.placeMarker(p);
    next.marker.visible = false;
    if (next.ghost) return this.ghostTurn(next);
    if (next.teed && this.distToBasket(next) < TAP_IN) {
      next.strokes++;
      return this.holeOut(next, 'Tap-in');
    }
    this.setupAim(next);
    this.state = 'aim';
    this.pull = 0;
    this.hud.swingIdle();
    if (this.players.length > 1) this.hud.toast(`${next.name}<small>throw ${next.strokes + 1}</small>`, 1500);
    this.rig.set(this.mapView ? 'map' : 'aim', {});
    this.feedCamera();
  }

  placeMarker(p) {
    p.marker.visible = p.teed && !p.holed;
    p.marker.position.set(p.lie.x, this.standY(p.lie.x, p.lie.z) + 0.04, p.lie.z);
  }

  setupAim(p) {
    const hole = this.hole, aim = this.aim;
    const d = this.distToBasket(p);
    // off the tee of a dogleg, start out aimed down the fairway rather than at the pin
    const target = !p.teed && hole.route.length > 2 ? hole.route[1] : hole.basket;
    aim.yaw = Math.atan2(target.z - p.lie.z, target.x - p.lie.x);
    // a climb plays long: pick the disc for the effective distance, and loft up the slope
    const y0 = this.standY(p.lie.x, p.lie.z);
    const dEff = d + 2.5 * Math.max(0, this.basket.y - y0);
    const slope = Math.atan2(this.standY(target.x, target.z) - y0, Math.hypot(target.x - p.lie.x, target.z - p.lie.z)) / DEG;
    aim.disc = dEff > 78 ? 0 : dEff > 52 ? 1 : 2;
    aim.mode = d > 34 ? 0 : d > 14 ? 1 : 2;
    aim.style = p.style === 'oh' ? 'bh' : p.style;
    aim.hyzer = 0; aim.nose = 0;
    aim.loft = (aim.mode === 2 ? 10 + Math.min(10, Math.max(0, slope * 0.8)) : 8 + Math.min(16, Math.max(0, slope))) * DEG;
    this.aimDirty = true;
  }

  fadeSide(p = this.current) {
    return (this.aim.style === 'bh' ? -1 : 1) * (p.hand === 'L' ? -1 : 1);
  }

  throwParams(power, extra) {
    const p = this.current, aim = this.aim;
    return {
      x: p.lie.x, z: p.lie.z, y: this.standY(p.lie.x, p.lie.z), yaw: aim.yaw, loft: aim.loft, nose: aim.nose, hyzer: aim.hyzer,
      disc: DISCS[aim.disc], style: aim.style, hand: p.hand, modeScale: POWER_MODES[aim.mode].scale,
      power: power * this.weather.power, ...extra,
    };
  }

  // Dashed line: a clean full swing in still air. Trunks and walls stop it; leaves don't.
  updatePreview() {
    this.aimDirty = false;
    const s = createThrow(this.throwParams(1));
    const env = { world: this.world, basket: null, wind: null, weather: this.weather.physics, rng: mulberry32(5), canopy: false };
    const pts = simulate(s, env, { trace: true, every: 5 });
    this.landing = { x: s.p.x, z: s.p.z };
    this.preview.show(pts, this.landing, s.p.y - 0.1);
  }

  // ----------------------------------------------------------------- throw
  throw(result) {
    if (this.state !== 'aim') return;
    const p = this.current;
    const rng = mulberry32(this.seed++);
    const jitter = () => (rng() + rng() + rng() - 1.5) * 0.012 * this.weather.noise * (1 + result.over * 1.5);
    const s = createThrow(this.throwParams(Math.min(1.1, result.power), {
      yawErr: result.yawErr + jitter(), rollErr: result.rollErr + jitter(), t0: this.clock,
    }));
    this.env = { world: this.world, basket: this.basket, wind: this.wind, weather: this.weather.physics, rng };
    this.flight = s;
    this.eventIdx = 0;
    this.acc = 0;
    this.recording = recordThrow(p.lie, this.aim, s);
    p.rec.holes[this.holeIndex].throws.push(this.recording);
    p.strokes++; p.teed = true; p.style = this.aim.style;
    this.state = 'flight';
    this.disc.setColor(p.color);
    this.tracer.reset(p.color);
    this.preview.hide();
    p.avatar.startThrow();
    this.rig.set('chase', { state: s, yaw: this.aim.yaw });
    this.audio.play('throw', result.power);
    this.hud.swingResult(result);
  }

  updateFlight(dt) {
    const s = this.flight;
    if (s.replay) advanceReplay(s, dt);
    else {
      this.acc += dt;
      let n = 0;
      while (this.acc >= STEP && n++ < 24 && s.mode !== 'rest') {
        stepDisc(s, STEP, this.env);
        if (this.recording) sampleThrow(this.recording, s);
        this.acc -= STEP;
      }
    }
    for (; this.eventIdx < s.events.length; this.eventIdx++) this.react(s.events[this.eventIdx]);
    this.disc.update(s, dt, this.camera);
    if (this.frame % 2 === 0 && s.mode !== 'rest') this.tracer.push(s.p);
    this.audio.whoosh(s.mode === 'fly' ? Math.hypot(s.v.x, s.v.y, s.v.z) : 0);
    if (s.mode === 'rest') this.landed();
  }

  // Sound, words and particles for each thing that happens to the disc.
  react(ev) {
    const fx = this.effects, foliage = this.layout.theme.foliage;
    this.audio.play(ev.type, (ev.speed || 8) / 14, ev);
    switch (ev.type) {
      case 'land':
      case 'skip':
        fx.dust(ev.x, ev.y - 0.05, ev.z, Math.min(1, ev.speed / 12),
          ev.deck ? DUST.deck : ev.sand ? DUST.sand : ev.road ? DUST.road : DUST.grass);
        break;
      case 'splash':
        fx.splash(ev.x, ev.y, ev.z, Math.min(1.5, (ev.speed || 4) / 6));
        break;
      case 'tree':
        fx.leaves(ev.x, ev.y, ev.z, foliage.broad, 12);
        this.hud.toast('Into the leaves', 900);
        break;
      case 'leaves':
        fx.leaves(ev.x, ev.y, ev.z, this.layout.theme.ground.litter ?? foliage.broad, 30);
        this.hud.toast('Leaf pile!', 900);
        break;
      case 'trunk':
        fx.leaves(ev.x, ev.y + 1.5, ev.z, foliage.broad, 6);
        this.hud.toast('Tree!', 900);
        break;
      case 'snowman':
        fx.leaves(ev.x, ev.y, ev.z, ['#ffffff', '#eef4f8', '#dfe8ee'], 24);
        this.hud.toast('Snowman!', 900);
        break;
      case 'roof':
        fx.dust(ev.x, ev.y, ev.z, 0.5, '#9a958c');
        break;
      case 'chains':
        this.scenery.shake(this.holeIndex);
        break;
      case 'spit':
        this.scenery.shake(this.holeIndex);
        this.hud.toast('Spit out!', 1100);
        break;
      case 'roll':
        this.hud.toast('Roller', 900);
        break;
      default:
        break;
    }
  }

  landed() {
    const s = this.flight, p = this.current, hole = this.hole;
    this.state = 'settle';
    this.audio.stopWhoosh();
    if (this.recording) { finishThrow(this.recording, s); this.recording = null; }
    this.timer = s.holed ? 2.4 : 1.9;
    this.rig.set('rest', { x: s.p.x, y: s.p.y, z: s.p.z, yaw: this.aim.yaw });
    if (s.holed) {
      this.hud.toast(`${scoreName(p.strokes, hole.par)}<small>${p.name} holes out in ${p.strokes}</small>`, 2400);
      const diff = p.strokes - hole.par;
      this.audio.music.jingle(p.strokes === 1 ? 'ace' : diff <= -2 ? 'eagle' : diff === -1 ? 'birdie' : diff === 0 ? 'par' : diff === 1 ? 'bogey' : 'double');
      if (p.strokes < hole.par) this.effects.confetti(this.basket.x, this.basket.y, this.basket.z);
    } else if (s.ob) {
      this.hud.toast(`Out of bounds<small>${OB_TEXT[s.ob] ?? `In the ${s.ob}`} · one penalty throw</small>`, 1900);
      this.audio.music.jingle('ob');
    } else {
      const left = Math.hypot(this.basket.x - s.p.x, this.basket.z - s.p.z);
      const flew = Math.hypot(s.p.x - s.start.x, s.p.z - s.start.z);
      this.hud.toast(`${feet(flew)} ft<small>${feet(left)} ft to the basket</small>`, 1700);
    }
  }

  resolve() {
    const s = this.flight, p = this.current, hole = this.hole;
    if (s.holed) return this.holeOut(p);
    if (s.ob) {
      // penalty throw, then play on from where it went out (or a drop zone), or re-throw
      p.strokes++;
      const spots = this.outSpots(s);
      p.lie = spots.out;
      if (!p.ghost && p.strokes < hole.par + 5) return this.offerRethrow(p, spots, s.start);
    } else {
      p.lie = this.world.relief(s.p.x, s.p.z);
    }
    // a ghost always plays its next throw from exactly where it played it before
    const nextThrow = p.ghost?.holes[this.holeIndex]?.throws[p.throwIdx];
    if (nextThrow) p.lie = { ...nextThrow.from };
    if (p.strokes >= hole.par + 5) return this.holeOut(p, 'Picked up');
    this.nextTurn();
  }

  // Where an out-of-bounds throw can play on from: the last fair ground it crossed that isn't
  // down a cliff, and the hole's drop zone when the throw was lost in its water.
  outSpots(s) {
    const hole = this.hole, last = s.safeIn ?? s.lastIn;
    const water = s.ob !== 'bounds' && s.ob !== 'roof' && s.ob !== 'pool';
    return {
      out: this.world.relief(last.x, last.z),
      drop: hole.drop && water ? this.world.relief(hole.drop.x, hole.drop.z) : null,
    };
  }

  // After a penalty: play on from where it went out, from the drop zone, or take stroke and
  // distance and re-throw from the previous lie.
  offerRethrow(p, spots, from) {
    this.state = 'obChoice';
    const toBasket = (q) => `${feet(Math.hypot(this.basket.x - q.x, this.basket.z - q.z))} ft to the basket`;
    const picks = [{ label: 'Play it from where it went out', at: spots.out }];
    if (spots.drop) picks.push({ label: 'Drop zone', at: spots.drop });
    picks.push({ label: 'Re-throw from the last lie', at: { x: from.x, z: from.z } });
    this.obPick = (i) => {
      if (this.state !== 'obChoice' || !picks[i]) return;
      this.hud.hideChoice();
      p.lie = { x: picks[i].at.x, z: picks[i].at.z };
      this.audio.play('tick');
      this.nextTurn();
    };
    this.hud.showChoice({
      title: `${p.name}: one penalty throw`,
      options: picks.map((o, i) => ({ key: String(i + 1), label: o.label, sub: toBasket(o.at), pick: () => this.obPick(i) })),
    });
  }

  holeOut(p, label) {
    p.holed = true;
    p.scores[this.holeIndex] = p.strokes;
    if (p.rec) Object.assign(p.rec.holes[this.holeIndex], { score: p.strokes, end: label ?? null });
    p.marker.visible = false;
    if (label) {
      this.hud.toast(`${label}<small>${p.name} takes ${p.strokes} · ${scoreName(p.strokes, this.hole.par)}</small>`, 1700);
      this.rig.set('rest', { x: this.basket.x, y: this.basket.y + 0.8, z: this.basket.z, yaw: this.aim.yaw });
    }
    this.assignSpots();
    this.state = 'between';
    this.timer = label ? 1.8 : 0.4;
  }

  endHole() {
    const last = this.holeIndex === this.layout.holes.length - 1;
    this.state = 'card';
    for (const p of this.players) p.avatar.hide();
    this.preview.hide();
    let title = `${this.layout.name} · Hole ${this.hole.number} complete`, notes = [];
    if (last) {
      ({ title, notes } = this.finishRound());
      this.audio.music.jingle('round');
    }
    this.hud.showScorecard({
      holes: this.layout.holes, players: this.players, played: true, title, notes,
      button: last ? 'New round' : 'Next hole',
      onAction: () => {
        this.hud.hideScorecard();
        if (last) return this.toMenu();
        this.holeIndex++;
        this.beginHole();
      },
    });
  }

  // Post the humans' rounds to the course board and sum up the round.
  finishRound() {
    const L = this.layout, humans = this.players.filter((p) => !p.ghost), ghost = this.players.find((p) => p.ghost);
    const strokes = (p) => p.scores.reduce((a, s) => a + s, 0);
    const results = addRounds(L.id, humans.map((p) => ({
      ref: p, name: p.name, color: p.color, hand: p.hand, strokes: strokes(p), toPar: this.totalFor(p),
      scores: p.scores, conditions: this.conditions, holes: p.rec.holes,
    })));
    const notes = results.map((r) => {
      const p = r.ref, score = `${strokes(p)} (${relPar(this.totalFor(p))})`;
      if (r.record) return `New course record! ${p.name} shot ${score}, and their ghost now haunts ${L.name}.`;
      if (r.place) return `${p.name}'s ${score} is #${r.place} on the ${L.name} board.`;
      return null;
    }).filter(Boolean);
    const ranked = [...humans].sort((a, b) => this.totalFor(a) - this.totalFor(b));
    const best = ranked[0];
    let title;
    if (ghost) {
      const d = this.totalFor(best) - this.totalFor(ghost);
      const who = humans.length === 1 ? 'You' : best.name;
      title = d < 0 ? `${who} beat ${ghost.name}!` : d === 0 ? `Dead heat with ${ghost.name}` : `${ghost.name} wins by ${d}`;
    } else if (ranked.length === 1) {
      title = `${L.name} complete · ${relPar(this.totalFor(best))}`;
    } else {
      const tie = this.totalFor(ranked[0]) === this.totalFor(ranked[1]);
      title = tie ? "It's a tie!" : `${best.name} wins the Frisbee Cup!`;
    }
    return { title, notes };
  }

  // The ghost lines up its next recorded throw, or finishes the hole the way it did.
  ghostTurn(p) {
    const hole = p.ghost.holes[this.holeIndex];
    const next = hole?.throws[p.throwIdx];
    if (!next) {
      p.strokes = hole ? hole.score : p.strokes;
      return this.holeOut(p, hole?.end || 'Holes out');
    }
    p.lie = { ...next.from };
    Object.assign(this.aim, next.aim);
    this.aimDirty = false;
    this.preview.hide();
    this.state = 'ghost';
    this.timer = 1.3;
    this.hud.swingIdle();
    this.hud.toast(`${p.name}<small>throw ${p.strokes + 1}</small>`, 1300);
    this.rig.set('aim', {});
    this.feedCamera();
  }

  ghostThrow() {
    const p = this.current, rec = p.ghost.holes[this.holeIndex].throws[p.throwIdx++];
    this.flight = replayState(rec);
    this.eventIdx = 0;
    this.recording = null;
    p.strokes++; p.teed = true; p.style = rec.aim.style;
    this.state = 'flight';
    this.disc.setColor(p.color);
    this.tracer.reset(p.color);
    p.avatar.startThrow();
    this.rig.set('chase', { state: this.flight, yaw: this.aim.yaw });
    this.audio.play('throw', 0.8);
  }

  toMenu() {
    this.state = 'menu';
    this.hud.hideChoice();
    this.audio.music.play('clubhouse');
    this.audio.ambience(null);
    this.audio.stopWhoosh();
    for (const p of this.players) { p.marker.visible = false; p.avatar.hide(); }
    this.disc.hide(); this.tracer.hide(); this.preview.hide();
    this.hud.showGame(false);
  }

  // ------------------------------------------------------------------ input
  key(code, down = true) {
    if (!down) return;
    if (code === 'KeyH') return this.hud.toggleHelp();
    if (code === 'KeyN') return this.audio.toggleMusic();
    if (this.state === 'intro' && (code === 'Space' || code === 'Enter')) { this.timer = 0; return; }
    if (this.state === 'card' && code === 'Enter') return this.hud.scoreAction?.();
    if (this.state === 'obChoice') {
      const n = code === 'Enter' ? 1 : Number(code.replace(/^(Digit|Numpad)/, ''));
      if (n >= 1) this.obPick(n - 1);
      return;
    }
    if (this.state !== 'aim') return;
    const aim = this.aim;
    if (code === 'Tab') {
      if (this.hud.scorecardOpen()) return this.hud.hideScorecard();
      return this.hud.showScorecard({
        holes: this.layout.holes, players: this.players, played: true, current: this.current,
        title: `${this.layout.name} · Scorecard`, button: 'Back to the throw', onAction: () => this.hud.hideScorecard(),
      });
    }
    if (code === 'Digit1' || code === 'Digit2' || code === 'Digit3') aim.disc = Number(code.slice(5)) - 1;
    else if (code === 'KeyT') {
      aim.style = STYLE_ORDER[(STYLE_ORDER.indexOf(aim.style) + 1) % STYLE_ORDER.length];
      aim.loft = (aim.style === 'oh' ? 28 : 8) * DEG;
      aim.hyzer = 0;
    } else if (code === 'KeyG') aim.mode = (aim.mode + 1) % POWER_MODES.length;
    else if (code === 'KeyM') {
      this.mapView = !this.mapView;
      this.rig.set(this.mapView ? 'map' : 'aim', {});
      this.feedCamera();
    } else return;
    this.audio.play('tick');
    this.aimDirty = true;
  }

  feedCamera() {
    const p = this.current, aim = this.aim;
    const side = p.hand === 'L' ? -1 : 1;
    if (this.mapView) {
      const t = this.landing || this.basket;
      const far = this.distToBasket(p) > Math.hypot(t.x - p.lie.x, t.z - p.lie.z) ? this.basket : t;
      this.rig.data = { x: p.lie.x, z: p.lie.z, tx: far.x, tz: far.z, yaw: Math.atan2(this.basket.z - p.lie.z, this.basket.x - p.lie.x) };
    } else {
      this.rig.data = { x: p.lie.x, z: p.lie.z, y: this.standY(p.lie.x, p.lie.z), yaw: aim.yaw, loft: aim.loft, side };
    }
  }

  // ----------------------------------------------------------------- frame
  update(dt) {
    this.clock += dt;
    this.frame++;
    this.controls.update(dt);
    const p = this.current;

    if (this.state === 'intro') {
      this.timer -= dt;
      if (this.timer <= 0) this.nextTurn();
    } else if (this.state === 'aim') {
      if (this.aimDirty) this.updatePreview();
      this.feedCamera();
      this.focus.set(p.lie.x, this.standY(p.lie.x, p.lie.z), p.lie.z);
    } else if (this.state === 'ghost') {
      this.feedCamera();
      this.focus.set(p.lie.x, this.standY(p.lie.x, p.lie.z), p.lie.z);
      this.timer -= dt;
      if (this.timer <= 0) this.ghostThrow();
    } else if (this.state === 'flight') {
      this.updateFlight(dt);
      this.focus.set(this.flight.p.x, this.flight.p.y, this.flight.p.z);
    } else if (this.state === 'settle') {
      this.disc.update(this.flight, 0, this.camera);
      this.timer -= dt;
      if (this.timer <= 0) this.resolve();
    } else if (this.state === 'between') {
      this.timer -= dt;
      if (this.timer <= 0) this.nextTurn();
    }

    if (this.state === 'menu' || this.state === 'card') return;
    this.poseAll(dt);
    this.updateHud();
  }

  // ---------------------------------------------------------------- players
  // Where each player stands while someone else throws: waiting at the tee, next to
  // their disc, or off to one side of the basket once they've holed out.
  assignSpots() {
    const hole = this.hole, route = hole.route;
    const tee = { x: Math.cos(hole.teeYaw), z: Math.sin(hole.teeYaw) };
    const prev = route[route.length - 2], bl = Math.hypot(prev.x - this.basket.x, prev.z - this.basket.z) || 1;
    const back = { x: (prev.x - this.basket.x) / bl, z: (prev.z - this.basket.z) / bl };
    let waiting = 0, done = 0;
    const cur = this.current && !this.current.holed ? this.current : null;
    const taken = cur ? [cur.lie] : []; // nobody stands on top of the thrower or each other
    for (const p of [...this.players].sort((a, b) => a.order - b.order)) {
      if (p === cur) { p.spot = null; continue; }
      if (p.holed) {
        const k = done++;
        p.spot = this.safeSpot(this.basket, back, [[1.6, 2.6 + k * 1.1], [1.6, -2.6 - k * 1.1], [3.2, 1.6 + k], [3.2, -1.6 - k], [-2.4, 2.2], [0, 3.2], [2.4, 3.6], [2.4, -3.6]], taken);
      } else if (!p.teed) {
        const k = waiting++;
        // wait on the side away from the thrower's camera
        const m = this.current?.hand === 'L' ? -1 : 1;
        p.spot = this.safeSpot(hole.tee, tee, [[-1.6 - k * 0.4, m * (2.4 + k * 1.2)], [-2.6 - k * 0.5, m * (1.4 + k * 1.1)], [-1.2, -m * (2.6 + k)], [-3.8 - k * 0.6, m * 0.9], [-3, -m * 1.8], [-1.2, 0]], taken);
      } else {
        const dx = this.basket.x - p.lie.x, dz = this.basket.z - p.lie.z, l = Math.hypot(dx, dz) || 1;
        p.spot = this.safeSpot(p.lie, { x: dx / l, z: dz / l }, [[-0.8, 0.7], [-0.8, -0.7], [-1.2, 0], [0.3, 0.9], [0.3, -0.9], [-1.6, 1.2], [-1.6, -1.2], [0.6, 1.6], [0.6, -1.6]], taken);
      }
      taken.push(p.spot);
    }
  }

  // The first offset (along f, then to its right) that is dry, open, level ground.
  safeSpot(anchor, f, offsets, taken = []) {
    const w = this.world, y0 = this.standY(anchor.x, anchor.z);
    for (const [a, b] of offsets) {
      const x = anchor.x + f.x * a - f.z * b, z = anchor.z + f.z * a + f.x * b, y = this.standY(x, z);
      if (Math.abs(y - y0) > 0.8 || w.outOfBounds(x, z, y + 0.1)) continue;
      if (taken.some((t) => Math.hypot(t.x - x, t.z - z) < 0.95)) continue;
      const blocked = w.near(x, z).some((c) => {
        if (c.t === 'cyl' || c.t === 'sphere') return Math.hypot(x - c.x, z - c.z) < c.r + 0.35;
        if ((c.t !== 'box' && c.t !== 'house') || c.platform || c.open) return false;
        const dx = x - c.cx, dz = z - c.cz;
        return Math.abs(dx * c.cos + dz * c.sin) < c.hu + 0.3 && Math.abs(-dx * c.sin + dz * c.cos) < c.hv + 0.3;
      });
      if (!blocked) return { x, z };
    }
    return { x: anchor.x, z: anchor.z };
  }

  // Feet height, lifted onto the rubber tee pad when standing on it.
  heightAt = (x, z) => {
    const h = this.hole, dx = x - h.tee.x, dz = z - h.tee.z, c = Math.cos(h.teeYaw), s = Math.sin(h.teeYaw);
    const onPad = Math.abs(dx * c + dz * s) < 1.8 && Math.abs(-dx * s + dz * c) < 0.85;
    return this.standY(x, z) + (onPad ? 0.1 : 0);
  };

  poseAll(dt) {
    const cur = this.current, flying = this.state === 'flight' || this.state === 'settle';
    const disc = flying && this.flight ? this.flight.p : null;
    const route = this.hole.route;
    for (const p of this.players) {
      const av = p.avatar;
      if (p === cur && (this.state === 'aim' || this.state === 'ghost' || flying)) {
        const aim = this.aim, x = p.lie.x - Math.cos(aim.yaw) * 0.25, z = p.lie.z - Math.sin(aim.yaw) * 0.25;
        const ahead = { x: p.lie.x + Math.cos(aim.yaw) * 25, y: this.standY(p.lie.x, p.lie.z) + 1.4, z: p.lie.z + Math.sin(aim.yaw) * 25 };
        av.held.visible = !av.thrown;
        av.pose({
          x, z, yaw: aim.yaw, kind: aim.mode === 2 && aim.style === 'bh' ? 'putt' : aim.style,
          phase: av.thrown ? 'throw' : 'aim', pull: this.pull, tilt: this.fadeSide() * aim.hyzer,
          look: disc ?? ahead, heightAt: this.heightAt,
        }, dt);
      } else {
        const s = p.spot ?? p.lie;
        // watch the thrower, or the fairway while the hole is introduced
        const watch = cur && cur !== p ? cur.lie : route[1];
        av.held.visible = !p.teed || p.holed;
        av.pose({
          x: s.x, z: s.z, yaw: Math.atan2(watch.z - s.z, watch.x - s.x), kind: 'idle', phase: 'idle',
          look: disc ?? { x: watch.x, y: this.standY(watch.x, watch.z) + 1.3, z: watch.z }, heightAt: this.heightAt,
        }, dt);
      }
    }
  }

  updateHud() {
    // during the flyover nobody is up yet, so show whoever has the tee
    const p = this.current || this.players.find((q) => q.order === 0), hud = this.hud;
    this.camera.getWorldDirection(_v);
    const viewYaw = Math.atan2(_v.z, _v.x);
    hud.setWind(this.windCfg.speed, this.windCfg.dir, viewYaw, this.weather.name);
    hud.setPlayer(p, p.strokes + (this.state === 'aim' || this.state === 'ghost' ? 1 : 0), relPar(this.totalFor(p)));
    const flying = this.state === 'flight' || this.state === 'settle';
    const from = flying ? this.flight.p : p.lie;
    const dist = Math.hypot(this.basket.x - from.x, this.basket.z - from.z);
    hud.setDistance(dist);
    if (this.state === 'aim' || this.state === 'intro') hud.setShot(this.aim, this.fadeSide(p));

    // floating pin marker over the basket
    _v.set(this.basket.x, this.basket.y + 2.6, this.basket.z).project(this.camera);
    const onScreen = _v.z < 1 && Math.abs(_v.x) < 1.05 && Math.abs(_v.y) < 1.05 && this.state !== 'card' && this.state !== 'intro';
    hud.pin((_v.x * 0.5 + 0.5) * window.innerWidth, (-_v.y * 0.5 + 0.5) * window.innerHeight, onScreen, `${feet(dist)} ft`);

    if (this.frame % 4 === 0) {
      hud.drawMinimap({
        hole: this.hole, players: this.players, current: p,
        aim: this.state === 'aim' ? this.aim : null, landing: this.state === 'aim' ? this.landing : null,
      });
    }
  }

  windAt(out) {
    if (this.wind) this.wind(this.clock, 8, out);
    else { out.x = 0; out.z = 0; }
    return out;
  }

  get windVector() { return this.windAt(_wind); }

  // Test hook: throw without the mouse, e.g. __fc.debugThrow(0.9).
  debugThrow(power = 1, extra = {}) {
    this.throw({ power, pull: power, tempo: 1, speed: 1.5, over: 0, slant: 0, yawErr: 0, rollErr: 0, ...extra });
  }
}
