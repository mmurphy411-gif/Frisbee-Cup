// Colliders for props a single course brings with it. Each course's file maps prop types to
// a function (p, { world, y, cos, sin, box }) that adds the prop's colliders, exactly like
// the cases in World.addProp. Types must not clash with world.js.
import downtown from './downtown.js';
import hilltown from './hilltown.js';
import boardwalk from './boardwalk.js';

export const PROP_COLLIDERS = { ...downtown, ...hilltown, ...boardwalk };
