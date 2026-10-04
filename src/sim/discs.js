// The bag. Flight numbers are the usual speed / glide / turn / fade; the aerodynamic
// coefficients underneath are what the simulation actually uses.
//   CL0, CLa   lift at zero angle of attack and its slope
//   CD0, CDa   drag floor and induced drag
//   CM0, CMa   pitching moment: CM0 < 0 gives high-speed turn, CMa gives low-speed fade
export const DISCS = [
  {
    id: 'driver', name: 'Driver', flight: [11, 5, -1, 3], vmax: 27.5,
    CL0: 0.1, CLa: 1.6, CD0: 0.05, CDa: 1.0, CM0: -0.008, CMa: 0.2,
  },
  {
    id: 'mid', name: 'Midrange', flight: [5, 5, 0, 2], vmax: 24.5,
    CL0: 0.13, CLa: 1.7, CD0: 0.06, CDa: 1.1, CM0: -0.004, CMa: 0.13,
  },
  {
    id: 'putter', name: 'Putter', flight: [2, 3, 0, 1], vmax: 22,
    CL0: 0.15, CLa: 1.8, CD0: 0.075, CDa: 1.2, CM0: -0.002, CMa: 0.1,
  },
];

// How the disc leaves the hand. `adv` is the advance ratio (rim speed / forward speed).
export const STYLES = {
  bh: { name: 'Backhand', speed: 1.0, adv: 0.5, height: 1.0 },
  fh: { name: 'Forehand', speed: 0.93, adv: 0.42, height: 1.05 },
  oh: { name: 'Overhand', speed: 0.82, adv: 0.45, height: 2.1 },
};

// Shot types scale the top of the swing, like full / pitch / putt in a golf game.
export const POWER_MODES = [
  { id: 'full', name: 'Full', scale: 1.0 },
  { id: 'approach', name: 'Approach', scale: 0.75 },
  { id: 'putt', name: 'Putt', scale: 0.55 },
];
