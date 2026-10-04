// Animated water: lakes and ponds (a baked depth map gives shallows and shoreline
// foam), flowing creeks, and backyard pools.
import * as THREE from 'three';
import { U } from './shared.js';

const VERT = /* glsl */ `
varying vec3 vWorld;
varying vec2 vUv;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4( position, 1.0 );
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform sampler2D uDepth;
uniform vec4 uBounds;
uniform float uMaxDepth;
uniform float uWidth;
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uFoam;
uniform vec3 uSkyColor;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
varying vec3 vWorld;
varying vec2 vUv;
#include <common>
#include <fog_pars_fragment>
void main() {
  vec2 p = vWorld.xz;
  float t = uTime;
#if defined( CREEK )
  float across = abs( vUv.x * 2.0 - 1.0 );
  float depth = ( 1.0 - across * across ) * uMaxDepth;
  vec2 q = vec2( vUv.x * uWidth, vUv.y - t * 1.3 );
#elif defined( POOL )
  float depth = uMaxDepth;
  vec2 q = p * 1.6;
#else
  float depth = texture2D( uDepth, ( p - uBounds.xy ) / uBounds.zw ).r * uMaxDepth;
  if ( depth < 0.004 ) discard;
  vec2 q = p;
#endif
  vec2 grad = vec2(
    cos( q.x * 0.8 + t * 1.1 ) * 0.5 + cos( ( q.x + q.y ) * 1.7 - t * 1.6 ) * 0.3 + cos( q.x * 3.3 - q.y * 1.4 + t * 2.6 ) * 0.2,
    cos( q.y * 0.9 - t * 0.9 ) * 0.5 + cos( ( q.y - q.x ) * 1.5 + t * 1.3 ) * 0.3 + cos( q.y * 3.1 + q.x * 1.2 - t * 2.3 ) * 0.2 );
  vec3 n = normalize( vec3( -grad.x * 0.09, 1.0, -grad.y * 0.09 ) );
  vec3 v = normalize( cameraPosition - vWorld );
  float fres = pow( 1.0 - clamp( dot( n, v ), 0.0, 1.0 ), 4.0 );
  vec3 col = mix( uShallow, uDeep, smoothstep( 0.0, 2.2, depth ) );
  col = mix( col, uSkyColor, 0.12 + 0.6 * fres );
  vec3 h = normalize( uSunDir + v );
  col += uSunColor * pow( clamp( dot( n, h ), 0.0, 1.0 ), 220.0 ) * 2.4;
  float edge = 1.0 - smoothstep( 0.0, 0.3, depth );
  float pat = 0.5 + 0.5 * sin( p.x * 2.3 + t * 1.7 + sin( p.y * 1.9 - t ) * 1.5 ) * sin( p.y * 2.1 - t * 1.3 + sin( p.x * 1.3 ) );
#if defined( CREEK )
  edge = smoothstep( 0.62, 1.0, across );
  pat = 0.5 + 0.5 * sin( q.x * 5.0 + sin( q.y * 3.0 ) * 2.0 ) * sin( q.y * 4.0 + q.x );
#endif
  float foam = smoothstep( 0.4, 0.8, edge * ( 0.55 + 0.6 * pat ) );
  col = mix( col, uFoam, foam * 0.9 );
  float alpha = mix( 0.62, 0.94, smoothstep( 0.0, 1.2, depth ) );
  gl_FragColor = vec4( col, max( alpha, foam ) );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

function material(defines, colors, extra = {}) {
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uBounds: { value: new THREE.Vector4() }, uMaxDepth: { value: 3 }, uWidth: { value: 5 },
    uShallow: { value: new THREE.Color(colors.shallow) }, uDeep: { value: new THREE.Color(colors.deep) },
    uFoam: { value: new THREE.Color(colors.foam) },
  }]);
  Object.assign(uniforms, { uTime: U.uTime, uSunDir: U.uSunDir, uSunColor: U.uSunColor, uSkyColor: U.uSkyColor, uDepth: { value: null } });
  for (const [k, v] of Object.entries(extra)) uniforms[k].value = v;
  return new THREE.ShaderMaterial({
    defines, uniforms, vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, fog: true,
  });
}

export function buildWater(layout, world) {
  const group = new THREE.Group();
  const colors = layout.theme.water, hf = layout.heightfield;

  for (const w of layout.water) {
    if (w.kind === 'level') {
      const b = w.bbox, sx = b.maxX - b.minX, sz = b.maxZ - b.minZ, R = 2;
      const tw = Math.ceil(sx * R), th = Math.ceil(sz * R);
      const data = new Uint8Array(tw * th), maxDepth = 3;
      for (let j = 0; j < th; j++) {
        const z = b.minZ + (j + 0.5) / R;
        for (let i = 0; i < tw; i++) {
          const x = b.minX + (i + 0.5) / R;
          if (w.circle && Math.hypot(x - w.circle.x, z - w.circle.z) > w.circle.r) continue;
          const d = w.level - hf.get(x, z);
          if (d > 0) data[j * tw + i] = Math.max(1, Math.min(255, Math.round((d / maxDepth) * 255)));
        }
      }
      const tex = new THREE.DataTexture(data, tw, th, THREE.RedFormat, THREE.UnsignedByteType);
      tex.magFilter = tex.minFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      const mat = material({}, colors, { uMaxDepth: maxDepth, uBounds: new THREE.Vector4(b.minX, b.minZ, sx, sz) });
      mat.uniforms.uDepth.value = tex;
      const geo = new THREE.PlaneGeometry(sx, sz);
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((b.minX + b.maxX) / 2, w.level, (b.minZ + b.maxZ) / 2);
      mesh.renderOrder = 1;
      group.add(mesh);
    } else {
      // a ribbon down the creek that follows the falling water surface
      const path = w.path, half = w.width / 2 + 0.55;
      const pos = [], uv = [], idx = [];
      for (let k = 0; k < path.pts.length; k++) {
        const s = path.cum[k], q = path.at(s);
        const y = w.bedAt(s) + w.depth;
        pos.push(q.x + q.tz * half, y, q.z - q.tx * half, q.x - q.tz * half, y, q.z + q.tx * half);
        uv.push(0, s / 4, 1, s / 4);
        if (k) {
          const a = (k - 1) * 2;
          idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, material({ CREEK: '' }, colors, { uMaxDepth: w.depth + 0.3, uWidth: w.width }));
      mesh.renderOrder = 1;
      group.add(mesh);
    }
  }

  const poolMat = material({ POOL: '' }, { shallow: '#7fe0f0', deep: '#2fa3d8', foam: '#ffffff' }, { uMaxDepth: 1.4 });
  for (const p of layout.pools) {
    const geo = new THREE.PlaneGeometry((p.hu - 0.85) * 2, (p.hv - 0.85) * 2);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, poolMat);
    mesh.position.set(p.cx, p.top + 0.012, p.cz);
    mesh.rotation.y = -p.ang;
    mesh.renderOrder = 1;
    group.add(mesh);
  }
  return group;
}
