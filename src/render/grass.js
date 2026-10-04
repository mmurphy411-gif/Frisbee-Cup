// Swaying grass: tufts of blades instanced in chunks over the lawns near each hole,
// coloured to match the painted ground underneath and shrunk away with distance.
import * as THREE from 'three';
import { mulberry32 } from '../sim/rng.js';
import { groundHeight } from '../sim/terrain.js';
import { segDist } from '../sim/path.js';
import { U } from './shared.js';

const CHUNK = 20;

function tuftGeometry() {
  const rng = mulberry32(3);
  const pos = [], col = [], nrm = [];
  for (let i = 0; i < 4; i++) {
    const a = rng() * Math.PI * 2, r = rng() * 0.09;
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
    const yaw = rng() * Math.PI, w = 0.035 + rng() * 0.025, h = 0.17 + rng() * 0.15;
    const lean = (rng() - 0.5) * 0.14;
    const dx = Math.cos(yaw) * w, dz = Math.sin(yaw) * w;
    const lx = -Math.sin(yaw) * lean, lz = Math.cos(yaw) * lean;
    const A = [cx - dx, 0, cz - dz], B = [cx + dx, 0, cz + dz], C = [cx + lx, h, cz + lz];
    // both windings, all normals up, so blades light like the lawn from either side
    for (const tri of [[A, B, C], [B, A, C]]) {
      for (const v of tri) pos.push(...v);
      col.push(0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.2, 1.2, 1.12);
      for (let k = 0; k < 3; k++) nrm.push(0, 1, 0);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

const BLADES = /* glsl */ `
vec4 mvPosition = instanceMatrix * vec4( transformed, 1.0 );
vec3 root = instanceMatrix[3].xyz;
float fade = 1.0 - smoothstep( uFade.x, uFade.y, distance( root, cameraPosition ) );
mvPosition.xyz = root + ( mvPosition.xyz - root ) * fade;
float bend = position.y * position.y * 9.0;
float ph = dot( root.xz, vec2( 0.21, 0.17 ) );
vec2 gust = uWind * ( 0.45 + 0.55 * sin( uTime * 1.7 + ph ) );
vec2 flutter = vec2( sin( uTime * 4.1 + ph * 5.0 ), cos( uTime * 3.7 + ph * 4.0 ) ) * ( 0.03 + 0.012 * length( uWind ) );
mvPosition.xz += ( gust * 0.03 + flutter ) * bend * fade;
mvPosition.y -= length( gust ) * 0.008 * bend * fade;
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;
`;

export class Grass {
  constructor(layout, world, sampler, quality) {
    this.group = new THREE.Group();
    this.chunks = [];
    this.reach = quality.grassFade[1] + CHUNK * 0.75;
    if (!quality.grass) return;

    const fade = new THREE.Vector2(quality.grassFade[0], quality.grassFade[1]);
    const material = new THREE.MeshLambertMaterial({ vertexColors: true });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, { uTime: U.uTime, uWind: U.uWind, uFade: { value: fade } });
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform vec2 uWind;\nuniform vec2 uFade;')
        .replace('#include <project_vertex>', BLADES);
    };
    material.customProgramCacheKey = () => 'grass';
    this.material = material;
    const geo = (this.geometry = tuftGeometry());

    // grass only grows where a player might be looking: near the holes
    const segs = [];
    for (const h of layout.holes) for (let k = 1; k < h.route.length; k++) segs.push([h.route[k - 1], h.route[k]]);
    const nearPlay = (x, z) => segs.some(([a, b]) => segDist(x, z, a.x, a.z, b.x, b.z) < 80);

    const { halfW, halfH } = layout.world, S = sampler.scale, data = sampler.data;
    const rng = mulberry32(11), spacing = quality.grassSpacing;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
    const mats = [], cols = [];
    for (let cx = -halfW; cx < halfW; cx += CHUNK) {
      for (let cz = -halfH; cz < halfH; cz += CHUNK) {
        if (!nearPlay(cx + CHUNK / 2, cz + CHUNK / 2)) continue;
        mats.length = 0; cols.length = 0;
        for (let x = cx; x < cx + CHUNK; x += spacing) {
          for (let z = cz; z < cz + CHUNK; z += spacing) {
            const tx = x + rng() * spacing, tz = z + rng() * spacing;
            const i = Math.floor((tx + halfW) * S), j = Math.floor((tz + halfH) * S);
            if (i < 0 || j < 0 || i >= sampler.w || j >= sampler.h) continue;
            const k = (j * sampler.w + i) * 4, r = data[k], g = data[k + 1], b = data[k + 2];
            if (!(g > r + 4 && g > b + 16)) continue; // only on green ground
            if (world.waterAt(tx, tz) || world.houseAt(tx, tz) || world.poolAt(tx, tz) || world.platformAt(tx, tz)) continue;
            const sc = 0.85 + rng() * 0.5;
            m.compose(p.set(tx, groundHeight(tx, tz) - 0.01, tz), q.setFromAxisAngle(up, rng() * 6.283), s.set(sc, sc * (0.75 + rng() * 0.6), sc));
            for (let e = 0; e < 16; e++) mats.push(m.elements[e]);
            c.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace).multiplyScalar(0.98 + rng() * 0.16);
            cols.push(c.r, c.g, c.b);
          }
        }
        if (!mats.length) continue;
        const mesh = new THREE.InstancedMesh(geo, material, mats.length / 16);
        mesh.instanceMatrix.array.set(mats);
        mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cols), 3);
        const center = new THREE.Vector3(cx + CHUNK / 2, groundHeight(cx + CHUNK / 2, cz + CHUNK / 2), cz + CHUNK / 2);
        mesh.boundingSphere = new THREE.Sphere(center, CHUNK * 0.75 + 6);
        mesh.receiveShadow = true;
        mesh.visible = false;
        this.group.add(mesh);
        this.chunks.push({ mesh, center });
      }
    }
  }

  update(camera) {
    for (const ch of this.chunks) ch.mesh.visible = camera.position.distanceTo(ch.center) < this.reach;
  }

  get count() {
    return this.chunks.reduce((n, c) => n + c.mesh.count, 0);
  }
}
