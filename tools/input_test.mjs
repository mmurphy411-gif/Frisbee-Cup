// Keyboard focus regression checks: node tools/input_test.mjs
import assert from 'node:assert/strict';
import { Controls } from '../src/input.js';

const listeners = new Map();
globalThis.window = { addEventListener: (type, handler) => listeners.set(type, handler) };
globalThis.HTMLInputElement = class {};
const canvas = { addEventListener() {} };
const forwarded = [];
let captureTab = false;
const controls = new Controls(canvas, {
  canAim: () => false,
  captureTab: () => captureTab,
  onKey: (code, down) => forwarded.push([code, down]),
});

function key(type, { target = canvas, repeat = false } = {}) {
  const event = { code: 'Tab', target, repeat, prevented: false, preventDefault() { this.prevented = true; } };
  listeners.get(type)(event);
  return event;
}

// A menu, help sheet or end-hole card can leave Tab to native focus traversal.
assert.equal(key('keydown').prevented, false);
assert.equal(controls.keys.has('Tab'), false);
assert.deepEqual(forwarded, []);

// During aim, one press opens/closes the scorecard; held repeats never toggle it.
captureTab = true;
assert.equal(key('keydown').prevented, true);
assert.equal(controls.keys.has('Tab'), true);
assert.deepEqual(forwarded, [['Tab', true]]);
assert.equal(key('keydown', { repeat: true }).prevented, true);
assert.equal(forwarded.length, 1);

// Releasing after a UI state change still clears the held key.
captureTab = false;
key('keyup');
assert.equal(controls.keys.has('Tab'), false);
assert.deepEqual(forwarded.at(-1), ['Tab', false]);
assert.equal(key('keydown').prevented, false);

// Text inputs retain their normal keyboard behavior even when aim is active.
captureTab = true;
const count = forwarded.length;
assert.equal(key('keydown', { target: new HTMLInputElement() }).prevented, false);
assert.equal(forwarded.length, count);
assert.equal(controls.keys.has('Tab'), false);

console.log('Input focus checks passed: native Tab, aim shortcut, repeats and keyup.');
