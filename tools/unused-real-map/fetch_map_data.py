"""Download the raw public map data for the Shadesview Terrace course.

Sources (all public, no API key):
  - USGS NAIP aerial imagery (public domain)
  - USGS 3DEP elevation (public domain)
  - FEMA USA Structures building footprints (public domain)
  - OpenStreetMap roads (ODbL)

Raw files land in tools/raw/. Run tools/build_map.py afterwards.
"""
import json
import os
import sys
import urllib.parse
import urllib.request

from world import BBOX, HALF_H, HALF_W

RAW = os.path.join(os.path.dirname(__file__), "raw")
UA = {"User-Agent": "FrisbeeCupPrototype/0.1 (local dev)"}


def fetch(url, params, dest, force=False):
    path = os.path.join(RAW, dest)
    if os.path.exists(path) and not force:
        print(f"cached   {dest}")
        return
    full = url + ("?" + urllib.parse.urlencode(params) if params else "")
    req = urllib.request.Request(full, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r:
        data = r.read()
    with open(path, "wb") as f:
        f.write(data)
    print(f"fetched  {dest}  ({len(data) / 1024:.0f} KB)")


def main():
    os.makedirs(RAW, exist_ok=True)
    force = "--force" in sys.argv
    w, s, e, n = BBOX
    bbox = f"{w},{s},{e},{n}"
    naip = "https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage"
    common = {"bbox": bbox, "bboxSR": 4326, "imageSR": 4326, "f": "image"}

    # 0.2 m/px natural colour for the ground texture
    fetch(naip, {**common, "size": f"{HALF_W * 10},{HALF_H * 10}", "format": "jpg",
                 "renderingRule": json.dumps({"rasterFunction": "NaturalColor"}),
                 "interpolation": "RSP_BilinearInterpolation"}, "aerial.jpg", force)
    # 0.4 m/px NIR/R/G composite, used to separate tree canopy from lawn
    fetch(naip, {**common, "size": f"{HALF_W * 5},{HALF_H * 5}", "format": "png",
                 "bandIds": "3,0,1", "renderingRule": json.dumps({"rasterFunction": "None"}),
                 "interpolation": "RSP_BilinearInterpolation"}, "nir.png", force)
    # 1 m bare-earth elevation
    fetch("https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage",
          {**common, "size": f"{HALF_W * 2 + 1},{HALF_H * 2 + 1}", "format": "tiff", "pixelType": "F32",
           "interpolation": "RSP_BilinearInterpolation"}, "elevation.tif", force)
    # building footprints
    fetch("https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/USA_Structures_View/FeatureServer/0/query",
          {"geometry": bbox, "geometryType": "esriGeometryEnvelope", "inSR": 4326, "outSR": 4326,
           "spatialRel": "esriSpatialRelIntersects", "outFields": "OCC_CLS,HEIGHT,SQMETERS",
           "f": "geojson"}, "structures.geojson", force)
    # roads
    fetch(f"https://api.openstreetmap.org/api/0.6/map.json?bbox={bbox}", None, "osm.json", force)


if __name__ == "__main__":
    main()
