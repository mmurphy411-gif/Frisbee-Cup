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
import quarter from './quarter.js';
import oakbrook from './oakbrook.js';
import riverbend from './riverbend.js';
import harvest from './harvest.js';
import aspen from './aspen.js';
import marina from './marina.js';
import tulip from './tulip.js';
import sandstone from './sandstone.js';
import snowcap from './snowcap.js';
import sunset from './sunset.js';
import downtown from './downtown.js';
import hilltown from './hilltown.js';
import boardwalk from './boardwalk.js';
import magnolia from './magnolia.js';
import stadium from './stadium.js';
import monterey from './monterey.js';
import oldlinks from './oldlinks.js';
import { CourseBuilder } from '../builder.js';
import { setTerrain } from '../terrain.js';
import { World } from '../world.js';

export const COURSES = [horseshoe, lakeside, ridge, pinecrest, canals, blossom, mesa, seaside, frostwood, quarter, oakbrook, riverbend, harvest, aspen, marina, tulip, sandstone, snowcap, sunset, downtown, hilltown, boardwalk, magnolia, stadium, monterey, oldlinks];
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
