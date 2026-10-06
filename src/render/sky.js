// Lighting, sky dome, clouds, fog and falling weather. WEATHER[...].physics is what the
// flight model receives; TIMES sets where the sun sits and how the light is coloured.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../sim/rng.js';
import { U, SKY_COLOR } from './shared.js';

export const WEATHER = {
  sunny: {
    name: 'Sunny', gray: 0, clouds: 14, cloudShade: 1, sun: 1, hemi: 1, fog: [190, 640],
    physics: { keep: 1, bounce: 1, mu: 1 }, power: 1, noise: 1,
  },
  overcast: {
    name: 'Overcast', gray: 0.72, clouds: 40, cloudShade: 0.82, sun: 0.38, hemi: 1.28, fog: [140, 470],
    physics: { keep: 1, bounce: 1, mu: 1 }, power: 1, noise: 1,
  },
  rain: {
    name: 'Rain', gray: 0.86, clouds: 46, cloudShade: 0.62, sun: 0.22, hemi: 1.12, fog: [60, 280], fall: 'rain',
    physics: { keep: 0.7, bounce: 0.6, mu: 0.85 }, power: 0.93, noise: 2.2, // wet grip, soft ground
  },
  fog: {
    name: 'Fog', gray: 0.92, clouds: 0, cloudShade: 1, sun: 0.3, hemi: 1.35, fog: [8, 95], tint: '#d3dade',
    physics: { keep: 0.9, bounce: 0.9, mu: 1 }, power: 1, noise: 1.2,
  },
  snow: {
    name: 'Snow', gray: 0.78, clouds: 36, cloudShade: 0.9, sun: 0.42, hemi: 1.42, fog: [45, 250], fall: 'snow', snow: true,
    physics: { keep: 0.3, bounce: 0.25, mu: 1.5 }, power: 0.9, noise: 1.6, // discs plug where they land
  },
};

export const TIMES = {
  morning: {
    name: 'Morning', sun: [0.72, 0.36, 0.6], sunColor: '#ffd7a6', sunI: 2.5,
    zenith: '#75b6d6', horizon: '#ffe1b5', hemiSky: '#e3eff1', hemiGround: '#85906a', hemiI: 1.08, glow: 0.12,
  },
  midday: {
    name: 'Midday', sun: [-0.36, 0.84, 0.4], sunColor: '#fff4e2', sunI: 2.8,
    zenith: '#65aecb', horizon: '#e0eee2', hemiSky: '#e8f2ee', hemiGround: '#7b9065', hemiI: 1.2, glow: 0,
  },
  evening: {
    name: 'Evening', sun: [-0.8, 0.22, 0.57], sunColor: '#ffa65e', sunI: 2.9,
    zenith: '#7884b9', horizon: '#ffc18c', hemiSky: '#ffdfb9', hemiGround: '#7a6650', hemiI: 1.25, glow: 1,
  },
};

const DOME_V = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  gl_Position = p.xyww;
}`;

const DOME_F = /* glsl */ `
${SKY_COLOR}
uniform vec3 uGround;
varying vec3 vDir;
void main() {
  vec3 d = normalize( vDir );
  float h = d.y;
  vec3 col = mix( skyColor( d ), uGround, pow( clamp( -h * 3.0, 0.0, 1.0 ), 0.5 ) );
  float s = max( dot( d, uSunDir ), 0.0 );
  col += uSunColor * uSunVis * ( smoothstep( 0.9994, 0.9997, s ) * 1.6 + pow( s, 160.0 ) * 0.5 + pow( s, 10.0 ) * 0.16 );
  gl_FragColor = vec4( col, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function cloudGeometry(seed) {
  const rng = mulberry32(seed), parts = [];
  const n = 5 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i++) {
    const r = 0.45 + rng() * 0.45;
    const g = new THREE.IcosahedronGeometry(r, 1);
    g.translate((i / (n - 1) - 0.5) * 2.4 + (rng() - 0.5) * 0.4, (rng() - 0.3) * 0.35, (rng() - 0.5) * 0.9);
    parts.push(g);
  }
  const geo = mergeGeometries(parts);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0) pos.setY(i, pos.getY(i) * 0.3); // flat bottoms
  // A cool underside and warm crown read like cut-paper clouds. Baked once;
  // the original two instanced batches and geometry budget stay the same.
  const colors = new Float32Array(pos.count * 3);
  const low = new THREE.Color('#b5cbd3'), high = new THREE.Color('#fff7df'), color = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    color.copy(low).lerp(high, THREE.MathUtils.clamp((pos.getY(i) + 0.15) / 0.85, 0, 1));
    color.toArray(colors, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

const FALL_COUNT = 1800, FALL_RANGE = 34, MAX_CLOUDS = 48;
const UP = new THREE.Vector3(0, 1, 0);

export class Sky {
  constructor(scene) {
    this.scene = scene;
    this.hemi = new THREE.HemisphereLight('#dff1ff', '#6f8f58', 1.2);
    this.sun = new THREE.DirectionalLight('#ffffff', 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.5;
    this.setShadowSize(2048);
    scene.add(this.hemi, this.sun, this.sun.target);
    scene.fog = new THREE.Fog('#cfe7ff', 190, 640);
    this.sunDir = U.uSunDir.value;

    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(800, 32, 16),
      new THREE.ShaderMaterial({
        vertexShader: DOME_V, fragmentShader: DOME_F, side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: {
          uZenith: U.uZenith, uHorizon: U.uHorizon, uGround: { value: new THREE.Color() },
          uSunDir: U.uSunDir, uSunColor: U.uSunColor, uSunVis: U.uSunVis,
        },
      }),
    );
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -1;
    scene.add(this.dome);

    // puffy low-poly clouds
    this.cloudMat = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.22, vertexColors: true, flatShading: true, fog: false });
    this.cloudMeshes = [cloudGeometry(5), cloudGeometry(17)].map((g) => {
      const m = new THREE.InstancedMesh(g, this.cloudMat, MAX_CLOUDS / 2);
      m.frustumCulled = false;
      scene.add(m);
      return m;
    });
    const rng = mulberry32(42);
    this.clouds = Array.from({ length: MAX_CLOUDS }, (_, i) => {
      const a = rng() * Math.PI * 2, r = 130 + rng() * 420;
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, y: 92 + rng() * 60, s: 9 + rng() * 15, yaw: rng() * 6.3, mesh: i % 2, slot: i >> 1 };
    });
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3();

    // one pool of particles for rain streaks, another for snowflakes
    this.seeds = new Float32Array(FALL_COUNT * 3);
    for (let i = 0; i < FALL_COUNT * 3; i++) this.seeds[i] = Math.random();
    this.fallGeo = new THREE.BufferGeometry();
    this.fallGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FALL_COUNT * 6), 3));
    this.fall = new THREE.LineSegments(this.fallGeo, new THREE.LineBasicMaterial({ color: '#dfe8f2', transparent: true, opacity: 0.5, fog: false }));
    this.flakeGeo = new THREE.BufferGeometry();
    this.flakeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FALL_COUNT * 3), 3));
    const dot = document.createElement('canvas');
    dot.width = dot.height = 32;
    const dg = dot.getContext('2d'), grd = dg.createRadialGradient(16, 16, 0, 16, 16, 16);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.5, 'rgba(255,255,255,0.8)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    dg.fillStyle = grd; dg.fillRect(0, 0, 32, 32);
    this.flakes = new THREE.Points(this.flakeGeo, new THREE.PointsMaterial({
      color: '#ffffff', size: 0.11, map: new THREE.CanvasTexture(dot), transparent: true, depthWrite: false, fog: false,
    }));
    for (const o of [this.fall, this.flakes]) { o.frustumCulled = false; o.visible = false; scene.add(o); }
    this.time = 0;
    this.cloudScale = 1;
    this.setConditions('sunny', 'midday');
  }

  setShadowSize(size) {
    const sh = this.sun.shadow;
    sh.mapSize.set(size, size);
    const r = size >= 4096 ? 62 : size >= 2048 ? 70 : 80;
    Object.assign(sh.camera, { left: -r, right: r, top: r, bottom: -r, near: 10, far: 380 });
    sh.camera.updateProjectionMatrix();
    if (sh.map) { sh.map.dispose(); sh.map = null; }
  }

  setQuality(q) {
    this.setShadowSize(q.shadowSize);
    this.cloudScale = q.clouds;
    this.applyClouds();
  }

  setConditions(weatherKey, timeKey) {
    const w = WEATHER[weatherKey] ?? WEATHER.sunny, t = TIMES[timeKey] ?? TIMES.midday;
    this.kind = weatherKey;
    this.timeKey = timeKey;
    const gray = new THREE.Color(w.tint ?? (timeKey === 'evening' ? '#b9b1ac' : '#b8c0c8'));
    const zenith = new THREE.Color(t.zenith).lerp(gray.clone().multiplyScalar(0.9), w.gray);
    const horizon = new THREE.Color(t.horizon).lerp(gray, w.gray);
    if (w.fall === 'rain') { zenith.multiplyScalar(0.8); horizon.multiplyScalar(0.86); }
    const du = this.dome.material.uniforms;
    du.uZenith.value.copy(zenith);
    du.uHorizon.value.copy(horizon);
    du.uGround.value.copy(horizon).multiplyScalar(0.82);
    du.uSunVis.value = 1 - w.gray * 0.95;
    this.scene.background = horizon.clone();
    this.scene.fog.color.copy(horizon);
    this.scene.fog.near = w.fog[0];
    this.scene.fog.far = w.fog[1];

    this.sunDir.set(...t.sun).normalize();
    U.uSunColor.value.set(t.sunColor).lerp(new THREE.Color('#ffffff'), w.gray * 0.6).multiplyScalar(1 - w.gray * 0.75);
    this.sun.color.set(t.sunColor).lerp(new THREE.Color('#ffffff'), w.gray * 0.7);
    this.sun.intensity = t.sunI * w.sun;
    this.hemi.color.set(t.hemiSky).lerp(gray, w.gray * 0.5);
    this.hemi.groundColor.set(t.hemiGround);
    this.hemi.intensity = t.hemiI * w.hemi;
    // windows and street lamps come on in the evening, and on dark rainy days
    U.uGlow.value = Math.min(1, t.glow + (w.gray > 0.8 ? 0.35 : 0));
    U.uSnow.value = w.snow ? 1 : 0;

    this.cloudMat.color.setScalar(w.cloudShade);
    this.cloudMat.emissive.set(timeKey === 'evening' ? '#ffcf9e' : timeKey === 'morning' ? '#ffe6cc' : '#ffffff').multiplyScalar(w.cloudShade);
    this.cloudTarget = w.clouds;
    this.applyClouds();
    this.fall.visible = w.fall === 'rain';
    this.flakes.visible = w.fall === 'snow';
  }

  applyClouds() {
    const n = Math.round((this.cloudTarget ?? 14) * this.cloudScale);
    this.cloudMeshes[0].count = Math.min(MAX_CLOUDS / 2, Math.ceil(n / 2));
    this.cloudMeshes[1].count = Math.min(MAX_CLOUDS / 2, Math.floor(n / 2));
  }

  // Keep the shadow box, sky dome and weather centred on the action.
  update(dt, camera, focus, wind) {
    this.time += dt;
    this.sun.target.position.copy(focus);
    this.sun.position.copy(focus).addScaledVector(this.sunDir, 200);
    this.dome.position.copy(camera.position);

    const wx = wind?.x || 0, wz = wind?.z || 0;
    for (const c of this.clouds) {
      c.x += (wx * 0.6 + 0.8) * dt;
      c.z += (wz * 0.6 + 0.3) * dt;
      if (Math.hypot(c.x, c.z) > 620) { c.x = -c.x * 0.97; c.z = -c.z * 0.97; }
      const mesh = this.cloudMeshes[c.mesh];
      if (c.slot >= mesh.count) continue;
      this._m.compose(this._p.set(c.x, c.y, c.z), this._q.setFromAxisAngle(UP, c.yaw), this._s.set(c.s, c.s * 0.75, c.s));
      mesh.setMatrixAt(c.slot, this._m);
    }
    for (const m of this.cloudMeshes) m.instanceMatrix.needsUpdate = true;

    const fall = WEATHER[this.kind]?.fall;
    if (!fall) return;
    const pos = this.fallGeo.attributes.position.array, dots = this.flakeGeo.attributes.position.array;
    const speed = fall === 'rain' ? 22 : 2.2, len = 0.9;
    const fx = wx * (fall === 'rain' ? 0.6 : 1), fz = wz * (fall === 'rain' ? 0.6 : 1);
    const wrap = (v) => ((v % FALL_RANGE) + FALL_RANGE) % FALL_RANGE - FALL_RANGE / 2;
    for (let i = 0; i < FALL_COUNT; i++) {
      const sx = this.seeds[i * 3], sy = this.seeds[i * 3 + 1], sz = this.seeds[i * 3 + 2];
      const fallen = (sy * FALL_RANGE + this.time * speed * (0.8 + sx * 0.4)) % FALL_RANGE;
      const sway = fall === 'snow' ? Math.sin(this.time * 0.8 + sx * 40) * 0.6 : 0;
      const t = fallen / speed;
      const x = camera.position.x + wrap(sx * FALL_RANGE - camera.position.x + fx * t + sway);
      const z = camera.position.z + wrap(sz * FALL_RANGE - camera.position.z + fz * t);
      const y = camera.position.y + FALL_RANGE * 0.45 - fallen;
      if (fall === 'snow') {
        dots[i * 3] = x; dots[i * 3 + 1] = y; dots[i * 3 + 2] = z;
        continue;
      }
      const k = i * 6;
      pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
      pos[k + 3] = x - (fx / speed) * len; pos[k + 4] = y + len; pos[k + 5] = z - (fz / speed) * len;
    }
    this.fallGeo.attributes.position.needsUpdate = true;
    this.flakeGeo.attributes.position.needsUpdate = true;
  }
}
