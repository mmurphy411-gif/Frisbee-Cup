"""Shared definition of the game world: a flat local frame in metres.

+x is east, +z is south (three.js convention, so north is -z), y is up.
The origin sits in the middle of the Shadesview Terrace horseshoe.
"""
LAT0 = 33.45935
LON0 = -86.80705
HALF_W = 260  # metres east/west of the origin
HALF_H = 190  # metres north/south of the origin
M_PER_DEG_LAT = 110913.0
M_PER_DEG_LON = 92964.0

BBOX = (
    LON0 - HALF_W / M_PER_DEG_LON,
    LAT0 - HALF_H / M_PER_DEG_LAT,
    LON0 + HALF_W / M_PER_DEG_LON,
    LAT0 + HALF_H / M_PER_DEG_LAT,
)


def to_local(lon, lat):
    """lon/lat -> (x, z) metres."""
    return ((lon - LON0) * M_PER_DEG_LON, -(lat - LAT0) * M_PER_DEG_LAT)
