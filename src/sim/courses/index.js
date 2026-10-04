// The course list, plus a cache so each course is generated only once.
import horseshoe from './horseshoe.js';
import lakeside from './lakeside.js';
import ridge from './ridge.js';
import pinecrest from './pinecrest.js';
import canals from './canals.js';
import blossom from './blossom.js';
import mesa from './mesa.js';
import seaside from './seaside.js';
import frostwood from './frostwood.js';
import { CourseBuilder } from '../builder.js';
import { setTerrain } from '../terrain.js';
import { World } from '../world.js';

export const COURSES = [horseshoe, lakeside, ridge, pinecrest, canals, blossom, mesa, seaside, frostwood];
const cache = new Map();

// Build a course (once) and make its terrain the live heightfield.
export function loadCourse(id) {
  let entry = cache.get(id);
  if (!entry) {
    const def = COURSES.find((c) => c.id === id) ?? COURSES[0];
    const b = new CourseBuilder(def);
    def.create(b);
    const layout = b.finish();
    entry = { id: def.id, def, layout, world: new World(layout) };
    cache.set(def.id, entry);
  }
  setTerrain(entry.layout.heightfield);
  return entry;
}
