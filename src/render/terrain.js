// The ground: a mesh built straight from the course heightfield, wearing a painted
// texture (lawns with mowing stripes, baked shade under trees and houses, shorelines,
// creek beds, beaches, paths and streets), plus a detail/snow shader.
import * as THREE from 'three';
import { mulberry32 } from '../sim/rng.js';
import { U } from './shared.js';

export const MAP_SCALE = 4; // minimap pixels per metre

function terrainGeometry(hf) {
  const { nx, nz, step, halfW, halfH, data } = hf;
  const pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      pos[k * 3] = -halfW + i * step;
      pos[k * 3 + 1] = data[k];
      pos[k * 3 + 2] = -halfH + j * step;
      uv[k * 2] = i / (nx - 1);
      uv[k * 2 + 1] = 1 - j / (nz - 1);
    }
  }
  // the same diagonal split per cell that Heightfield.get interpolates across
  const idx = new Uint32Array((nx - 1) * (nz - 1) * 6);
  let n = 0;
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
      idx[n++] = a; idx[n++] = d; idx[n++] = b;
      idx[n++] = a; idx[n++] = c; idx[n++] = d;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  return g;
}

// A small tileable noise texture that adds grain to the ground up close.
function detailTexture() {
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d'), rng = mulberry32(9);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) {
    const x = rng() * S, y = rng() * S, r = 1 + rng() * (i < 300 ? 14 : 4);
    g.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)';
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      if (x + ox < -r || x + ox > S + r || y + oy < -r || y + oy > S + r) continue;
      g.beginPath(); g.arc(x + ox, y + oy, r, 0, Math.PI * 2); g.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = (t) => Math.max(0, Math.min(1, t));

function paintGround(L, world, ppm) {
  const T = L.theme.ground, rng = mulberry32(77), hf = L.heightfield;
  const { halfW, halfH } = L.world;
  const W = Math.round(halfW * 2 * ppm), H = Math.round(halfH * 2 * ppm);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  const X = (x) => (x + halfW) * ppm, Z = (z) => (z + halfH) * ppm;
  const P = (p) => [X(p[0] ?? p.x), Z(p[1] ?? p.z)];
  const trace = (ctx, pts, s = ppm, close = false) => {
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = ((p[0] ?? p.x) + halfW) * s, z = ((p[1] ?? p.z) + halfH) * s;
      if (i) ctx.lineTo(x, z); else ctx.moveTo(x, z);
    });
    if (close) ctx.closePath();
  };
  const blobs = (ctx, colors, count, rMin, rMax, aMin, aMax, s = ppm) => {
    for (let i = 0; i < count; i++) {
      ctx.globalAlpha = aMin + rng() * (aMax - aMin);
      ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
      ctx.beginPath();
      ctx.arc(rng() * halfW * 2 * s, rng() * halfH * 2 * s, (rMin + rng() * (rMax - rMin)) * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  const soft = () => {
    const c = document.createElement('canvas');
    c.width = halfW * 2; c.height = halfH * 2;
    const ctx = c.getContext('2d');
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    return [c, ctx];
  };
  g.lineCap = 'round'; g.lineJoin = 'round';

  // ---- woods floor
  g.fillStyle = T.woods;
  g.fillRect(0, 0, W, H);
  blobs(g, T.woodsMottle, (halfW * halfH) / 7, 0.6, 5, 0.12, 0.3);

  // ---- lawns, drawn coarse and scaled up so their edges are soft
  const [lawn, lg] = soft();
  lg.strokeStyle = lg.fillStyle = T.lawn;
  for (const road of L.roads) {
    if (!road.lawn) continue;
    trace(lg, road.pts, 1);
    lg.lineWidth = road.lawn * 2;
    lg.stroke();
  }
  for (const a of L.lawnAreas) { trace(lg, a, 1, true); lg.fill(); }
  lg.globalCompositeOperation = 'source-atop';
  blobs(lg, T.lawnMottle, (halfW * halfH) / 9, 1, 6, 0.15, 0.4, 1);
  g.imageSmoothingEnabled = true;
  g.drawImage(lawn, 0, 0, W, H);

  // ---- mowing stripes, each yard mown parallel to its street
  const stripes = (u0, u1, w0, w1, band) => {
    const lo = Math.min(w0, w1), hi = Math.max(w0, w1);
    g.save();
    g.beginPath(); g.rect(u0 * ppm, lo * ppm, (u1 - u0) * ppm, (hi - lo) * ppm); g.clip();
    for (let w = lo, k = 0; w < hi; w += band, k++) {
      g.fillStyle = k % 2 ? 'rgba(255,255,230,0.075)' : 'rgba(0,30,0,0.06)';
      g.fillRect(u0 * ppm, w * ppm, (u1 - u0) * ppm, band * ppm);
    }
    g.restore();
  };
  for (const h of L.houses) {
    if (h.kind !== 'house') continue;
    g.save();
    g.translate(X(h.cx), Z(h.cz));
    g.rotate(h.ang);
    stripes(-h.hu - 5, h.hu + 5, h.front * h.hv, h.front * (h.hv + h.setback), 1.6);
    stripes(-h.hu - 5, h.hu + 5, -h.front * h.hv, -h.front * (h.hv + 15), 1.6);
    g.restore();
  }
  for (const a of L.lawnAreas) {
    g.save();
    trace(g, a, ppm, true); g.clip();
    g.translate(X(a[0][0]), Z(a[0][1])); g.rotate(0.45);
    for (let k = -80; k < 80; k++) {
      g.fillStyle = k % 2 ? 'rgba(255,255,230,0.06)' : 'rgba(0,30,0,0.05)';
      g.fillRect(-400 * ppm, k * 2.2 * ppm, 800 * ppm, 2.2 * ppm);
    }
    g.restore();
  }

  // ---- heights: lake and pond beds, shorelines, creek beds and steep banks
  const S = 2, hw = halfW * 2 * S, hh = halfH * 2 * S;
  const hc = document.createElement('canvas');
  hc.width = hw; hc.height = hh;
  const hx = hc.getContext('2d');
  const img = hx.createImageData(hw, hh), px = img.data;
  const waterC = document.createElement('canvas');
  waterC.width = hw; waterC.height = hh;
  const wx = waterC.getContext('2d');
  const wimg = wx.createImageData(hw, hh), wpx = wimg.data;
  const cSand = hex(T.sand), cMud = hex(T.mud), cBottom = hex(T.bottom), cDeep = hex(T.deep), cDirt = hex(T.dirt), cRock = hex(T.rock);
  const wet = hex(L.theme.water.deep);
  for (let j = 0; j < hh; j++) {
    const z = -halfH + (j + 0.5) / S;
    for (let i = 0; i < hw; i++) {
      const x = -halfW + (i + 0.5) / S;
      const h = hf.get(x, z);
      let col = null, a = 0;
      for (const w of L.water) {
        const b = w.bbox;
        if (x < b.minX - 2 || x > b.maxX + 2 || z < b.minZ - 2 || z > b.maxZ + 2) continue;
        if (w.kind === 'level') {
          if (w.circle && Math.hypot(x - w.circle.x, z - w.circle.z) > w.circle.r + 2) continue;
          const depth = w.level - h;
          if (depth > 0) {
            col = mix3(cBottom, cDeep, clamp01(depth / 2.6)); a = 1;
            const k = (j * hw + i) * 4;
            wpx[k] = wet[0]; wpx[k + 1] = wet[1]; wpx[k + 2] = wet[2]; wpx[k + 3] = 255;
          } else if (depth > -0.55) {
            col = mix3(cSand, cMud, clamp01(1 + depth / 0.25) * 0.5); a = clamp01(1 + depth / 0.55);
          }
        } else {
          const q = w.sAt(x, z, w.width * 3);
          if (q && q.d < w.width / 2 + 0.6) {
            col = mix3(cRock, cMud, 0.4); a = 1;
            const k = (j * hw + i) * 4;
            wpx[k] = wet[0]; wpx[k + 1] = wet[1]; wpx[k + 2] = wet[2]; wpx[k + 3] = 255;
          } else if (q && q.d < w.width / 2 + 2.2) {
            col = mix3(cRock, cDirt, 0.5); a = 0.85;
          }
        }
        if (col) break;
      }
      if (!col) {
        const gx = hf.get(x + 0.5, z) - hf.get(x - 0.5, z), gz = hf.get(x, z + 0.5) - hf.get(x, z - 0.5);
        const slope = Math.hypot(gx, gz);
        if (slope > 0.42) { col = mix3(cDirt, cRock, clamp01((slope - 0.6) * 2)); a = clamp01((slope - 0.42) / 0.4) * 0.8; }
      }
      if (col) {
        const k = (j * hw + i) * 4;
        px[k] = col[0]; px[k + 1] = col[1]; px[k + 2] = col[2]; px[k + 3] = a * 255;
      }
    }
  }
  hx.putImageData(img, 0, 0);
  wx.putImageData(wimg, 0, 0);
  g.drawImage(hc, 0, 0, W, H);

  // ---- beaches
  const [sand, sg] = soft();
  sg.fillStyle = T.sand;
  for (const s of L.sand) { trace(sg, s.poly.pts, 1, true); sg.fill(); }
  g.drawImage(sand, 0, 0, W, H);
  if (L.sand.length) {
    g.save();
    for (const s of L.sand) { trace(g, s.poly.pts, ppm, true); }
    g.clip();
    blobs(g, ['#c9b582', '#efe0b4', '#d8c48f'], 900, 0.2, 1.2, 0.2, 0.4);
    g.restore();
  }

  // ---- flower beds along the house fronts
  if (L.theme.porchDecor === 'flowers') {
    const petals = ['#e94f6a', '#f2b134', '#ffffff', '#b46ad8', '#ff8a5c'];
    for (const h of L.houses) {
      if (h.kind !== 'house') continue;
      g.save();
      g.translate(X(h.cx), Z(h.cz)); g.rotate(h.ang);
      const w0 = h.front * h.hv, w1 = h.front * (h.hv + 1.1);
      g.fillStyle = '#5b4030';
      g.fillRect(-h.hu * ppm, Math.min(w0, w1) * ppm, h.hu * 2 * ppm, 1.1 * ppm);
      for (let k = 0; k < 26; k++) {
        g.fillStyle = petals[Math.floor(rng() * petals.length)];
        g.beginPath();
        g.arc((-h.hu + rng() * h.hu * 2) * ppm, (w0 + (w1 - w0) * rng()) * ppm, (0.12 + rng() * 0.14) * ppm, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }
  }

  // ---- paved bits: lots, footpaths, driveways, front walks
  for (const p of L.paved) {
    trace(g, p.pts, ppm, true);
    g.fillStyle = p.color ?? T.asphalt; g.fill();
    g.strokeStyle = T.curb; g.lineWidth = 0.4 * ppm; g.stroke();
  }
  for (const path of L.footpaths) {
    trace(g, path.pts);
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = (path.width + 0.4) * ppm; g.stroke();
    g.strokeStyle = path.color; g.lineWidth = path.width * ppm; g.stroke();
  }
  g.fillStyle = '#d2cdc0'; g.strokeStyle = '#b6b0a2'; g.lineWidth = 0.15 * ppm;
  for (const d of L.driveways) { trace(g, d, ppm, true); g.fill(); g.stroke(); }
  g.strokeStyle = '#d8d3c6'; g.lineWidth = 1.1 * ppm; g.lineCap = 'butt';
  for (const h of L.houses) {
    if (h.kind !== 'house') continue;
    const w0 = h.front * (h.hv + (h.porch ? h.porch.depth : 0.6)), w1 = h.front * (h.hv + h.setback + 0.5);
    g.beginPath();
    g.moveTo(X(h.cx + h.doorU * h.cos - w0 * h.sin), Z(h.cz + h.doorU * h.sin + w0 * h.cos));
    g.lineTo(X(h.cx + h.doorU * h.cos - w1 * h.sin), Z(h.cz + h.doorU * h.sin + w1 * h.cos));
    g.stroke();
  }
  g.lineCap = 'round';

  // ---- streets
  for (const road of L.roads) { trace(g, road.pts); g.strokeStyle = T.curb; g.lineWidth = (road.width + 1) * ppm; g.stroke(); }
  for (const road of L.roads) { trace(g, road.pts); g.strokeStyle = T.asphalt; g.lineWidth = road.width * ppm; g.stroke(); }
  for (let i = 0; i < 9000; i++) {
    const road = L.roads[i % L.roads.length];
    const p = road.offset(rng() * road.length, (rng() - 0.5) * (road.width - 0.6));
    g.globalAlpha = 0.14;
    g.fillStyle = rng() < 0.5 ? '#3f4349' : '#80858d';
    g.fillRect(X(p.x), Z(p.z), (0.15 + rng() * 0.4) * ppm, (0.15 + rng() * 0.4) * ppm);
  }
  g.globalAlpha = 1;
  g.setLineDash([3 * ppm, 3 * ppm]);
  g.strokeStyle = '#e9c84a'; g.lineWidth = 0.16 * ppm;
  for (const road of L.roads) if (road.lines) { trace(g, road.pts); g.stroke(); }
  g.setLineDash([]);

  // ---- wear under baskets and around tees
  for (const hole of L.holes) {
    for (const [p, r] of [[hole.basket, 1.7], [hole.tee, 2.6]]) {
      if (world.platformAt(p.x, p.z)) continue;
      const grd = g.createRadialGradient(X(p.x), Z(p.z), 0, X(p.x), Z(p.z), r * ppm);
      grd.addColorStop(0, 'rgba(140,116,78,0.55)'); grd.addColorStop(1, 'rgba(140,116,78,0)');
      g.fillStyle = grd;
      g.beginPath(); g.arc(X(p.x), Z(p.z), r * ppm, 0, Math.PI * 2); g.fill();
    }
  }

  // ---- fallen leaves under autumn trees
  if (T.litter) {
    for (const t of L.trees) {
      if (t.kind === 'pine') continue;
      const n = Math.round(t.r * 9);
      for (let k = 0; k < n; k++) {
        const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * t.r * 1.5;
        g.fillStyle = T.litter[Math.floor(rng() * T.litter.length)];
        g.globalAlpha = 0.55 + rng() * 0.4;
        g.beginPath();
        g.arc(X(t.x + Math.cos(a) * d), Z(t.z + Math.sin(a) * d), (0.1 + rng() * 0.16) * ppm, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.globalAlpha = 1;
  }

  // ---- baked shade: soft contact shadow under trees, houses, cars and walls
  const ao = document.createElement('canvas');
  ao.width = hw; ao.height = hh;
  const ag = ao.getContext('2d');
  ag.fillStyle = '#ffffff'; ag.fillRect(0, 0, hw, hh);
  const A = (x) => (x + halfW) * S, B = (z) => (z + halfH) * S;
  for (const t of L.trees) {
    const r = (t.kind === 'pine' ? t.r * 0.8 : t.r * 1.15) * S;
    const grd = ag.createRadialGradient(A(t.x), B(t.z), 0, A(t.x), B(t.z), r);
    grd.addColorStop(0, 'rgba(20,30,10,0.42)'); grd.addColorStop(1, 'rgba(20,30,10,0)');
    ag.fillStyle = grd;
    ag.beginPath(); ag.arc(A(t.x), B(t.z), r, 0, Math.PI * 2); ag.fill();
  }
  const rect = (o, pad, alpha) => {
    ag.save();
    ag.translate(A(o.cx), B(o.cz)); ag.rotate(o.ang);
    ag.fillStyle = `rgba(20,25,20,${alpha})`;
    ag.fillRect(-(o.hu + pad) * S, -(o.hv + pad) * S, (o.hu + pad) * 2 * S, (o.hv + pad) * 2 * S);
    ag.restore();
  };
  for (const h of L.houses) rect(h, 0.9, 0.5);
  for (const c of L.cars) rect(c, 0.25, 0.5);
  ag.strokeStyle = 'rgba(20,25,20,0.32)'; ag.lineWidth = 1.6 * S;
  for (const f of [...L.hedges, ...L.fences]) {
    ag.beginPath(); ag.moveTo(A(f.ax), B(f.az)); ag.lineTo(A(f.bx), B(f.bz)); ag.stroke();
  }
  const blurred = document.createElement('canvas');
  blurred.width = hw; blurred.height = hh;
  const bg = blurred.getContext('2d');
  bg.filter = 'blur(2px)';
  bg.drawImage(ao, 0, 0);
  g.globalCompositeOperation = 'multiply';
  g.drawImage(bg.filter === 'blur(2px)' ? blurred : ao, 0, 0, W, H);
  g.globalCompositeOperation = 'source-over';

  return { canvas, waterMask: waterC };
}

// Flat top-down picture for the minimap and the overhead view.
function paintMap(ground, waterMask, L) {
  const s = MAP_SCALE, { halfW, halfH } = L.world;
  const c = document.createElement('canvas');
  c.width = halfW * 2 * s; c.height = halfH * 2 * s;
  const g = c.getContext('2d');
  g.drawImage(ground, 0, 0, c.width, c.height);
  g.globalAlpha = 0.85;
  g.drawImage(waterMask, 0, 0, c.width, c.height);
  g.globalAlpha = 1;
  const X = (x) => (x + halfW) * s, Z = (z) => (z + halfH) * s;
  const rect = (o, fill, stroke) => {
    g.save(); g.translate(X(o.cx), Z(o.cz)); g.rotate(o.ang);
    g.fillStyle = fill; g.fillRect(-o.hu * s, -o.hv * s, o.hu * 2 * s, o.hv * 2 * s);
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1; g.strokeRect(-o.hu * s, -o.hv * s, o.hu * 2 * s, o.hv * 2 * s); }
    g.restore();
  };
  for (const p of L.pools) { rect(p, '#e4e0d5'); rect({ ...p, hu: p.hu - 0.9, hv: p.hv - 0.9 }, '#4cb8e6'); }
  for (const p of L.platforms) rect(p, '#b98b5a', 'rgba(0,0,0,0.35)');
  for (const h of L.houses) rect(h, h.roofColor, 'rgba(0,0,0,0.35)');
  for (const c2 of L.cars) rect(c2, '#e8e8ee', 'rgba(0,0,0,0.4)');
  g.lineCap = 'butt';
  g.strokeStyle = '#2f6d2c'; g.lineWidth = 1.1 * s;
  for (const hd of L.hedges) { g.beginPath(); g.moveTo(X(hd.ax), Z(hd.az)); g.lineTo(X(hd.bx), Z(hd.bz)); g.stroke(); }
  g.strokeStyle = '#8a6a48'; g.lineWidth = 0.35 * s;
  for (const f of L.fences) { g.beginPath(); g.moveTo(X(f.ax), Z(f.az)); g.lineTo(X(f.bx), Z(f.bz)); g.stroke(); }
  for (const t of L.trees) {
    g.fillStyle = t.color + (t.kind === 'pine' ? 'b0' : '90');
    g.beginPath(); g.arc(X(t.x), Z(t.z), (t.kind === 'pine' ? t.r * 0.62 : t.r) * s, 0, Math.PI * 2); g.fill();
  }
  return c;
}

export function buildTerrain(layout, world, renderer, quality) {
  const hf = layout.heightfield;
  const { canvas, waterMask } = paintGround(layout, world, quality.ppm);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // pavement mask so snow settles less on streets
  const { halfW, halfH } = layout.world;
  const mw = halfW * 2, mh = halfH * 2, mask = new Uint8Array(mw * mh);
  for (let i = 0; i < mask.length; i++) mask[i] = world.mask[i] === 1 ? 255 : 0;
  const maskTex = new THREE.DataTexture(mask, mw, mh, THREE.RedFormat, THREE.UnsignedByteType);
  maskTex.magFilter = maskTex.minFilter = THREE.LinearFilter;
  maskTex.needsUpdate = true;
  const detail = detailTexture();

  const material = new THREE.MeshLambertMaterial({ map: tex });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uDetail: { value: detail }, uMask: { value: maskTex }, uSnow: U.uSnow,
      uBounds: { value: new THREE.Vector4(halfW, halfH, mw, mh) },
    });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGround;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGround = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGround;\nuniform sampler2D uDetail;\nuniform sampler2D uMask;\nuniform float uSnow;\nuniform vec4 uBounds;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float grain = texture2D( uDetail, vGround.xz * 0.19 ).r * 0.6 + texture2D( uDetail, vGround.xz * 0.83 ).r * 0.4;
        diffuseColor.rgb *= 0.84 + 0.32 * grain;
        if ( uSnow > 0.0 ) {
          float paved = texture2D( uMask, ( vGround.xz + uBounds.xy ) / uBounds.zw ).r;
          float cover = uSnow * ( 1.0 - 0.55 * paved ) * ( 0.8 + 0.2 * grain );
          diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.92, 0.94, 0.98 ), cover );
        }`);
  };
  material.customProgramCacheKey = () => 'terrain';
  const mesh = new THREE.Mesh(terrainGeometry(hf), material);
  mesh.receiveShadow = true;

  // a small copy of the painted ground tells the grass what colour to be
  const sw = halfW * 2 * 2, sh = halfH * 2 * 2;
  const sc = document.createElement('canvas');
  sc.width = sw; sc.height = sh;
  const sx = sc.getContext('2d', { willReadFrequently: true });
  sx.drawImage(canvas, 0, 0, sw, sh);
  const sampler = { data: sx.getImageData(0, 0, sw, sh).data, w: sw, h: sh, scale: 2, halfW, halfH };

  return {
    mesh,
    mapCanvas: paintMap(canvas, waterMask, layout),
    sampler,
    extras: [detail, maskTex],
  };
}
