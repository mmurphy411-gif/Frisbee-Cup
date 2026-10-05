import * as THREE from 'three';
import { COURSES, loadCourse } from './sim/courses/index.js';
import { buildTerrain } from './render/terrain.js';
import { buildScenery } from './render/scenery.js';
import { buildWater } from './render/water.js';
import { Grass } from './render/grass.js';
import { Sky } from './render/sky.js';
import { Effects } from './render/effects.js';
import { CameraRig } from './render/cameras.js';
import { QUALITY, pixelRatioFor } from './render/quality.js';
import { U, disposeTree, aimSightLine } from './render/shared.js';
import { Audio } from './audio.js';
import { Hud } from './hud.js';
import { Game } from './game.js';
import { Net } from './net.js';

// remembered menu choices; browser storage can be unavailable, so everything is optional
const store = {
  get(key, fallback) { try { return localStorage.getItem(`fc.${key}`) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(`fc.${key}`, value); } catch { /* not saved */ } },
};

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.3, 900);
const sky = new Sky(scene);
const effects = new Effects(scene);
const audio = new Audio();
audio.music.enabled = store.get('music', 'on') !== 'off';
audio.sfxOn = store.get('sfx', 'on') !== 'off';
audio.music.play('clubhouse'); // starts once the browser lets audio play
// browsers only allow sound after the first click or key press
const wake = () => audio.unlock();
window.addEventListener('pointerdown', wake, { once: true, capture: true });
window.addEventListener('keydown', wake, { once: true, capture: true });
// Pinches and ctrl-scrolls would zoom the whole page (and the browser remembers it), so
// swallow them everywhere: over the course, the menu, the scorecard, any time.
window.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(type, (e) => e.preventDefault());
// a little click for every button
document.addEventListener('click', (e) => {
  const b = e.target.closest?.('button');
  if (!b) return;
  audio.play(b.id === 'start-btn' ? 'start' : b.classList.contains('course-card') ? 'select' : 'click');
});

let qualityKey = QUALITY[store.get('quality')] ? store.get('quality') : 'high';
let quality = QUALITY[qualityKey];
renderer.setPixelRatio(pixelRatioFor(quality));
sky.setQuality(quality);

// every course's layout is cheap to generate, so build them all for the menu cards
const entries = COURSES.map((c) => loadCourse(c.id));
const rig = new CameraRig(camera, entries[0].world);
rig.set('orbit');
let course = null;
let game;

const hud = new Hud({
  courses: entries.map((e) => e.layout),
  initial: {
    course: entries.some((e) => e.id === store.get('course')) ? store.get('course') : entries[0].id,
    quality: qualityKey,
    time: store.get('time', 'midday'),
    music: audio.music.enabled,
    sfx: audio.sfxOn,
  },
  onStart: (config) => {
    store.set('time', config.time);
    if (config.net) net.send({ t: 'start', config });
    game.start(config);
  },
  onKey: (code) => game.key(code, true),
  onCourse: (id) => showCourse(id),
  onQuality: (key) => setQuality(key),
  onConditions: (weather, time) => sky.setConditions(weather, time),
  onSound: ({ music, sfx }) => {
    if (music !== undefined) { audio.setMusic(music); audio.onChange(); }
    if (sfx !== undefined) { audio.setEffects(sfx); store.set('sfx', sfx ? 'on' : 'off'); }
  },
});
audio.onChange = () => {
  store.set('music', audio.music.enabled ? 'on' : 'off');
  hud.setMusic(audio.music.enabled);
};
hud.setMusic(audio.music.enabled);
game = new Game({ scene, camera, rig, hud, audio, sky, effects, canvas });
window.__fc = game; // handy in the console

// Wi-Fi play: when another device tees off, this one joins the round on the same course.
const net = new Net();
game.net = net;
net.onMessage = (msg) => {
  if (msg.t === 'start') {
    hud.hideScorecard();
    hud.selectCourse(msg.config.course);
    showCourse(msg.config.course);
    game.start(msg.config);
  } else game.receive(msg);
};
net.probe().then((ok) => { if (ok) hud.setupNet(net); });
window.addEventListener('pagehide', () => net.leave());

function showCourse(id, force = false) {
  if (course && course.id === id && !force) return;
  if (course) {
    scene.remove(course.root);
    disposeTree(course.root);
    for (const t of course.extras) t.dispose();
  }
  const entry = loadCourse(id);
  const root = new THREE.Group();
  const terrain = buildTerrain(entry.layout, entry.world, renderer, quality);
  root.add(terrain.mesh, buildWater(entry.layout, entry.world));
  const scenery = buildScenery(entry.layout, entry.world, root);
  const grass = new Grass(entry.layout, entry.world, terrain.sampler, quality);
  root.add(grass.group);
  scene.add(root);
  course = { id: entry.id, entry, root, scenery, grass, extras: terrain.extras };
  rig.world = entry.world;
  rig.cut();
  hud.setMap(terrain.mapCanvas);
  game.setCourse(entry, scenery);
  const theme = entry.layout.theme;
  const drift = theme.ambientLeaves;
  effects.setAmbient(Array.isArray(drift) ? drift : drift ? theme.foliage.broad : null);
  store.set('course', entry.id);
}

function setQuality(key) {
  if (!QUALITY[key] || key === qualityKey) return;
  qualityKey = key;
  quality = QUALITY[key];
  store.set('quality', key);
  renderer.setPixelRatio(pixelRatioFor(quality));
  sky.setQuality(quality);
  resize();
  showCourse(course.id, true);
}

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();
showCourse(hud.selectedCourse);

const wind = { x: 0, z: 0 };
function tick(dt) {
  U.uTime.value += dt;
  if (game.state === 'menu') { wind.x = 1.4; wind.z = 0.6; } else game.windAt(wind);
  U.uWind.value.set(wind.x, wind.z);
  if (game.state === 'menu' && rig.mode !== 'orbit') { rig.set('orbit'); rig.cut(); }
  game.update(dt);
  rig.update(dt);
  // close-up views see through whatever stands between the camera and the line of play
  U.uSee.value += ((rig.seeing ? 1 : 0) - U.uSee.value) * Math.min(1, dt * 6);
  aimSightLine(camera, rig.sight, 20);
  sky.update(dt, camera, game.state === 'menu' ? rig.look : game.focus, wind);
  course.grass.group.visible = U.uSnow.value === 0; // snow buries the grass
  course.grass.update(camera);
  course.scenery.update(dt, U.uTime.value);
  effects.update(dt, camera, renderer.domElement.height, wind);
}

let last = performance.now();
function frame(now) {
  tick(Math.min(0.05, (now - last) / 1000));
  last = now;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Test hooks: run the game forward without waiting on real time, and pick a course.
window.__advance = (seconds) => {
  for (let t = 0; t < seconds; t += 1 / 60) tick(1 / 60);
  renderer.render(scene, camera);
  return game.state;
};
window.__course = (id) => { showCourse(id); return course.id; };
window.__renderer = renderer;
