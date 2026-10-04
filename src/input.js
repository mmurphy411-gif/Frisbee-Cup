// Keyboard aim controls and the mouse flick swing.
//
// The swing mirrors analog-stick swings in golf games: hold the button, pull back to
// wind up, flick forward to throw. Pull length sets the power you are asking for, the
// speed of the flick decides how much of it you get, and any sideways drift during the
// flick pulls the throw off line.

const DEG = Math.PI / 180;
export const LIMITS = {
  loft: [-4 * DEG, 45 * DEG],
  hyzer: [-75 * DEG, 75 * DEG],
  nose: [-12 * DEG, 20 * DEG],
};
const clamp = (v, [lo, hi]) => Math.max(lo, Math.min(hi, v));

export class Controls {
  constructor(canvas, handlers) {
    this.canvas = canvas;
    this.h = handlers; // { canAim(), aim, onChange(), onKey(code), onSwingStart(), onSwing(info), onThrow(result), onCancel() }
    this.keys = new Set();
    this.swing = null;
    this.look = null;

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Tab') e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'Escape' && this.swing) this.cancel();
      this.h.onKey(e.code, true);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this.h.onKey(e.code, false);
    });
    window.addEventListener('blur', () => { this.keys.clear(); this.cancel(); });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointermove', (e) => this.move(e));
    canvas.addEventListener('pointerup', (e) => this.up(e));
    canvas.addEventListener('pointercancel', () => this.cancel());
    canvas.addEventListener('wheel', (e) => {
      if (!this.h.canAim()) return;
      e.preventDefault();
      const aim = this.h.aim;
      aim.hyzer = clamp(aim.hyzer - Math.sign(e.deltaY) * 1 * DEG, LIMITS.hyzer);
      this.h.onChange();
    }, { passive: false });
  }

  // Held keys nudge the aim every frame.
  update(dt) {
    if (!this.h.canAim() || this.swing) return;
    const aim = this.h.aim, k = this.keys;
    const fine = k.has('ShiftLeft') || k.has('ShiftRight') ? 0.25 : 1;
    const axis = (neg, pos) => (pos.some((c) => k.has(c)) ? 1 : 0) - (neg.some((c) => k.has(c)) ? 1 : 0);
    const turn = axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']);
    const loft = axis(['KeyS', 'ArrowDown'], ['KeyW', 'ArrowUp']);
    const tilt = axis(['KeyE'], ['KeyQ']);
    const nose = axis(['KeyF'], ['KeyR']);
    if (!turn && !loft && !tilt && !nose) { this.held = 0; return; }
    // start slow so a tap is a small nudge, then ramp up over a second of holding
    this.held = (this.held || 0) + dt;
    const ramp = fine * (0.3 + 0.7 * Math.min(1, Math.max(0, this.held - 0.15) / 0.9));
    aim.yaw += turn * 26 * DEG * ramp * dt;
    aim.loft = clamp(aim.loft + loft * 9 * DEG * ramp * dt, LIMITS.loft);
    aim.hyzer = clamp(aim.hyzer + tilt * 20 * DEG * ramp * dt, LIMITS.hyzer);
    aim.nose = clamp(aim.nose + nose * 8 * DEG * ramp * dt, LIMITS.nose);
    this.h.onChange();
  }

  down(e) {
    if (!this.h.canAim()) return;
    try { this.canvas.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    if (e.button === 2) {
      this.look = { x: e.clientX, y: e.clientY };
      return;
    }
    if (e.button !== 0) return;
    this.swing = { x0: e.clientX, y0: e.clientY, pull: 0, pullX: 0, pullT: performance.now(), forward: false, x: e.clientX, y: e.clientY };
    this.h.onSwingStart();
  }

  move(e) {
    if (this.look) {
      const aim = this.h.aim;
      aim.yaw += (e.clientX - this.look.x) * 0.0015;
      aim.loft = clamp(aim.loft - (e.clientY - this.look.y) * 0.0012, LIMITS.loft);
      this.look.x = e.clientX; this.look.y = e.clientY;
      this.h.onChange();
      return;
    }
    const s = this.swing;
    if (!s) return;
    const now = performance.now();
    const dy = e.clientY - s.y0, dx = e.clientX - s.x0;
    const full = this.fullPull();
    s.x = e.clientX; s.y = e.clientY;
    if (!s.forward) {
      if (dy > s.pull) { s.pull = dy; s.pullX = dx; s.pullT = now; }
      // the flick starts once the pointer has come forward off the deepest point
      if (s.pull > full * 0.12 && dy < s.pull - Math.max(10, full * 0.05)) s.forward = true;
    }
    this.h.onSwing({ pull: Math.min(1, s.pull / full), forward: s.forward });
    if (s.forward && dy <= 0) this.release(dx, dy, now);
  }

  up(e) {
    try { this.canvas.releasePointerCapture(e.pointerId); } catch { /* never captured */ }
    if (this.look && e.button === 2) { this.look = null; return; }
    const s = this.swing;
    if (!s || e.button !== 0) return;
    const dy = e.clientY - s.y0, dx = e.clientX - s.x0;
    // letting go mid-flick still throws, as long as it really was a flick
    if (s.forward && s.pull - dy > s.pull * 0.3) this.release(dx, dy, performance.now());
    else this.cancel();
  }

  screenH() { return Math.max(320, window.innerHeight); }

  fullPull() { return Math.max(140, this.screenH() * 0.3); }

  release(dx, dy, now) {
    const s = this.swing;
    this.swing = null;
    const full = this.fullPull();
    const travel = s.pull - dy; // pixels flicked forward
    const seconds = Math.max(0.016, (now - s.pullT) / 1000);
    const speed = travel / this.screenH() / seconds; // screen heights per second
    const pull = Math.min(1, s.pull / full);
    // tempo: a lazy push bleeds power, a crisp flick delivers it, a violent one overswings
    let tempo;
    if (speed < 1.4) tempo = 0.55 + 0.45 * Math.max(0, (speed - 0.35) / 1.05);
    else tempo = 1 + 0.08 * Math.min(1, (speed - 1.4) / 2.2);
    const over = Math.max(0, tempo - 1) / 0.08;
    const slant = Math.atan2(dx - s.pullX, Math.max(1, travel)); // + drifts right
    this.h.onThrow({
      power: Math.max(0.06, pull * tempo),
      pull, tempo, speed, over,
      slant,
      yawErr: Math.max(-0.21, Math.min(0.21, slant * 0.4)),
      rollErr: Math.max(-0.2, Math.min(0.2, slant * 0.3)) + over * 0.05,
    });
  }

  cancel() {
    if (this.swing) { this.swing = null; this.h.onCancel(); }
    this.look = null;
  }
}
