// Props a single course brings with it. Each course's file maps prop types to a function
// (p, { M, f, y, G, rng, theme, roof, world }) that adds the prop's shapes to the merged
// meshes, exactly like the cases in scenery.js. Types must not clash with scenery.js.
import downtown from './downtown.js';
import hilltown from './hilltown.js';
import boardwalk from './boardwalk.js';

export const PROP_RENDERERS = { ...downtown, ...hilltown, ...boardwalk };
