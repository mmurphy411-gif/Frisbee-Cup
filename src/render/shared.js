// Uniforms shared by many materials (updated once per frame), and shader patches that
// add wind sway and snow cover to three.js's built-in materials.
import * as THREE from 'three';

export const U = {
  uTime: { value: 0 },
  uWind: { value: new THREE.Vector2(0.6, 0.25) }, // m/s across the ground
  uSnow: { value: 0 },
  uSunDir: { value: new THREE.Vector3(-0.4, 0.85, 0.4).normalize() },
  uSunColor: { value: new THREE.Color('#fff4e0') },
  uZenith: { value: new THREE.Color() },
  uHorizon: { value: new THREE.Color() },
  uSunVis: { value: 1 },
  uGlow: { value: 0 }, // lit windows and lamps towards evening
  // see-through: scenery between the camera and what it looks at is dithered away
  uSee: { value: 0 }, // strength, 0 (off) to 1
  uSeeTo: { value: new THREE.Vector3(0, 0, -1) }, // end of the sight line, in view space (it starts at the camera)
  uSeeUp: { value: new THREE.Vector3(0, 1, 0) }, // world up, in view space
};

// The sky and its water reflection use the same palette; no reflection texture or pass.
export const SKY_COLOR = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunVis;
vec3 skyColor( vec3 d ) {
  float facing = clamp( dot( d.xz, uSunDir.xz ) * 0.5 + 0.5, 0.0, 1.0 );
  float warmth = facing * facing * ( 1.0 - uSunDir.y ) * uSunVis * 0.3;
  vec3 horizon = mix( uHorizon, uSunColor, warmth );
  return mix( horizon, uZenith, pow( max( d.y, 0.0 ), 0.48 ) );
}
`;

// Point the sight line from the camera towards `target`, at most `reach` metres long.
const _to = new THREE.Vector3();
export function aimSightLine(camera, target, reach) {
  camera.updateMatrixWorld();
  _to.copy(target).applyMatrix4(camera.matrixWorldInverse);
  if (_to.length() > reach) _to.setLength(reach);
  U.uSeeTo.value.copy(_to);
  U.uSeeUp.value.set(0, 1, 0).transformDirection(camera.matrixWorldInverse);
}

// Fragments inside a capsule along the sight line are dropped in an ordered-dither
// pattern, so whatever stands in the way turns mostly see-through without any sorting.
// The capsule is squashed vertically so the ground and things low down stay solid.
const SEE = /* glsl */ `
if ( uSee > 0.0 ) {
  vec3 seeP = - vViewPosition;
  float seeT = clamp( dot( seeP, uSeeTo ) / max( dot( uSeeTo, uSeeTo ), 1e-3 ), 0.0, 1.0 );
  vec3 seeOff = seeP - uSeeTo * seeT;
  seeOff += uSeeUp * dot( seeOff, uSeeUp ) * 0.35;
  float seeR = mix( 1.8, 3.2, seeT );
  float seeK = uSee * ( 1.0 - smoothstep( seeR * 0.7, seeR, length( seeOff ) ) );
  if ( seeK > 0.0 ) {
    const float bayer[16] = float[16]( 0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0 );
    ivec2 seeI = ivec2( mod( gl_FragCoord.xy, 4.0 ) );
    if ( 1.0 - 0.8 * seeK < ( bayer[ seeI.x + seeI.y * 4 ] + 0.5 ) / 16.0 ) discard;
  }
}
`;

// Sway grows towards the top of the shape (local y from -1 to 1) and follows the wind.
const SWAY = /* glsl */ `
vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
  vec3 swayRoot = instanceMatrix[3].xyz;
#else
  vec3 swayRoot = modelMatrix[3].xyz;
#endif
float swayK = uSway * clamp( position.y * 0.5 + 0.5, 0.0, 1.0 );
float swayPh = dot( swayRoot.xz, vec2( 0.13, 0.09 ) );
vec2 swayW = uWind * ( 0.55 + 0.45 * sin( uTime * 1.4 + swayPh ) ) * 0.08;
swayW += vec2( sin( uTime * 1.1 + swayPh * 3.1 ), cos( uTime * 0.9 + swayPh * 2.3 ) ) * 0.05;
mvPosition.xz += swayW * swayK;
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;
`;

// Upward-facing surfaces turn white as snow settles.
const SNOW = /* glsl */ `
vec3 snowN = ( vec4( normal, 0.0 ) * viewMatrix ).xyz;
diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.93, 0.95, 0.99 ), uSnow * smoothstep( 0.25, 0.65, snowN.y ) );
`;

export function enhance(material, { sway = 0, snow = false, see = false } = {}) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uTime: U.uTime, uWind: U.uWind, uSnow: U.uSnow, uSway: { value: sway }, uSee: U.uSee, uSeeTo: U.uSeeTo, uSeeUp: U.uSeeUp,
    });
    if (sway) {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform vec2 uWind;\nuniform float uSway;')
        .replace('#include <project_vertex>', SWAY);
    }
    if (snow) {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uSnow;')
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${SNOW}`);
    }
    if (see) {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uSee;\nuniform vec3 uSeeTo;\nuniform vec3 uSeeUp;')
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${SEE}`);
    }
  };
  material.customProgramCacheKey = () => `enhance-${sway ? 1 : 0}-${snow ? 1 : 0}-${see ? 1 : 0}`;
  return material;
}

export const lambert = (opts) => new THREE.MeshLambertMaterial(opts);

// Free every geometry, material and texture under an object.
export function disposeTree(root) {
  root.traverse((o) => {
    o.geometry?.dispose?.();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      for (const v of Object.values(m)) if (v && v.isTexture) v.dispose();
      if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u?.value?.isTexture) u.value.dispose();
      m.dispose();
    }
  });
}
