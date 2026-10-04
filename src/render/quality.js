// Graphics presets. High looks best; Low keeps older laptops smooth.
export const QUALITY = {
  low: {
    name: 'Low', pixelRatio: [1, 1], shadowSize: 1024, ppm: 8,
    grass: 0, grassSpacing: 1, grassFade: [0, 0], clouds: 0.5,
  },
  medium: {
    name: 'Medium', pixelRatio: [1.25, 2], shadowSize: 2048, ppm: 10,
    grass: 1, grassSpacing: 0.62, grassFade: [24, 32], clouds: 0.8,
  },
  high: {
    name: 'High', pixelRatio: [1.5, 2.5], shadowSize: 4096, ppm: 12,
    grass: 1, grassSpacing: 0.48, grassFade: [34, 46], clouds: 1,
  },
};

export function pixelRatioFor(q) {
  const dpr = window.devicePixelRatio || 1;
  return Math.min(Math.max(dpr, q.pixelRatio[0]), q.pixelRatio[1]);
}
