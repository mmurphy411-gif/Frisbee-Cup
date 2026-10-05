// Background music: a small orchestra synthesized live with Web Audio, so no audio files
// are needed. Ensemble strings, horns, trumpets, woodwinds, harp, pizzicato, celesta and
// timpani each sit at their own place on the stage and share one concert-hall reverb.
//
// A song is a chord chart plus a melody. Each loop plays the tune twice: a lighter first
// pass, then a fuller second pass that hands the melody to the violins (or brass) and
// adds horns, low strings and timpani.

// ------------------------------------------------------------------ theory
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const QUALITY = {
  '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10],
  6: [0, 4, 7, 9], m6: [0, 3, 7, 9], dim7: [0, 3, 6, 9], 9: [0, 4, 7, 10, 14],
};

// 'C5', 'Eb4', 'F#5' -> MIDI number
function midi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

// 'Bbmaj7' -> { root: pitch class, tones: intervals }
function chord(name) {
  const m = /^([A-G])([#b]?)(.*)$/.exec(name);
  const root = (NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  const tones = QUALITY[m[3]];
  if (!tones) throw new Error(`bad chord ${name}`);
  return { root, tones };
}

const hz = (m) => 440 * 2 ** ((m - 69) / 12);

// ------------------------------------------------------------------- songs
// Melody tokens are 'note:eighths' ('-' is a rest). Each bar of the chart may hold one
// chord or two (split across the bar). `lead`, `double` and `comp` give the first and
// second pass; a double is [instrument, semitone shift, level].
export const SONGS = {
  // the clubhouse: flute over harp, then violins with horns
  clubhouse: {
    bpm: 104, swing: 0.1, meter: 4,
    lead: ['flute', 'violins'], double: [null, ['clarinet', -12, 0.5]],
    bass: 'pizz', comp: ['harp', 'harp'], horns: true, perc: 'light',
    chords: ['C6', 'Am7', 'Dm7', 'G7', 'C6', 'A7', 'Dm7', 'G7', 'Fmaj7', 'Fm6', 'Em7', 'A7', 'Dm7', 'G7', 'C6', 'G7'],
    melody: `E5:1 G5:1 A5:2 G5:1 E5:1 C5:2 | -:1 E5:1 D5:1 C5:1 A4:2 C5:2 | D5:1 F5:1 A5:2 G5:1 F5:1 D5:2 | B4:2 D5:1 F5:1 G5:3 -:1 |
      E5:1 G5:1 C6:2 B5:1 A5:1 G5:2 | C#6:1 A5:1 G5:1 E5:1 C#5:2 E5:2 | F5:2 E5:1 D5:1 A5:2 F5:2 | G5:3 F5:1 D5:1 B4:1 G4:2 |
      A5:1 C6:1 A5:1 F5:1 E5:2 F5:2 | Ab5:1 C6:1 Ab5:1 F5:1 D5:4 | G5:1 E5:1 B4:1 D5:1 E5:2 G5:2 | A5:1 G5:1 E5:1 C#5:1 A4:2 -:2 |
      D5:1 E5:1 F5:1 A5:1 C6:2 A5:2 | B5:1 A5:1 G5:1 F5:1 D5:2 B4:2 | C5:1 E5:1 G5:1 A5:1 C6:3 -:1 | -:2 G4:1 A4:1 B4:1 D5:1 F5:1 G5:1`,
  },
  // pastoral: oboe and harp, then violins and horns over driving strings
  fairway: {
    bpm: 104, swing: 0.08, meter: 4,
    lead: ['oboe', 'violins'], double: [['clarinet', -12, 0.4], ['horn', -12, 0.55]],
    bass: 'pizz', comp: ['harp', 'spicc'], perc: 'timp',
    chords: ['F', 'Dm7', 'Gm7', 'C7', 'F', 'F7', 'Bb', 'Bbm6', 'Am7', 'D7', 'Gm7', 'C7', 'F', 'D7', 'Gm7 C7', 'F'],
    melody: `C5:2 F5:1 G5:1 A5:2 F5:2 | A5:1 G5:1 F5:1 D5:1 F5:4 | Bb5:2 A5:1 G5:1 D5:2 G5:2 | E5:1 F5:1 G5:1 Bb5:1 A5:2 G5:2 |
      A5:3 C6:1 A5:2 F5:2 | Eb5:1 F5:1 A5:1 C6:1 Eb6:2 C6:2 | D6:2 C6:1 Bb5:1 F5:2 D5:2 | Db5:1 F5:1 G5:1 Bb5:1 Db6:4 |
      C6:2 A5:1 G5:1 E5:2 C5:2 | F#5:1 A5:1 C6:1 A5:1 F#5:2 D5:2 | G5:1 A5:1 Bb5:1 D6:1 C6:2 Bb5:2 | A5:1 G5:1 E5:1 C5:1 G5:2 Bb5:2 |
      A5:2 F5:2 C5:2 F5:2 | F#5:1 G5:1 A5:1 C6:1 -:2 D6:2 | Bb5:1 A5:1 G5:2 E5:1 F5:1 G5:2 | F5:4 -:2 C5:1 E5:1`,
  },
  // autumn woods: a lilting clarinet over walking pizzicato
  autumn: {
    bpm: 92, swing: 0.22, meter: 4,
    lead: ['clarinet', 'violins'], double: [null, ['flute', 0, 0.35]],
    bass: 'walk', comp: ['harp', 'harp'], horns: true, perc: 'light',
    chords: ['Bbmaj7', 'Gm7', 'Cm7', 'F7', 'Dm7', 'G7', 'Cm7', 'F7', 'Ebmaj7', 'Edim7', 'Bbmaj7', 'G7', 'Cm7', 'F7', 'Bb6', 'F7'],
    melody: `D5:2 F5:1 A5:1 -:1 F5:1 D5:2 | Bb5:3 A5:1 G5:2 D5:2 | Eb5:1 G5:1 Bb5:1 C6:1 Bb5:2 G5:2 | A5:1 G5:1 F5:1 Eb5:1 C5:4 |
      F5:2 A5:1 C6:1 -:1 A5:1 F5:2 | B5:3 A5:1 G5:2 F5:2 | Eb5:1 D5:1 C5:1 G5:1 Bb5:2 G5:2 | A5:2 F5:2 Eb5:2 C5:2 |
      G5:1 Bb5:1 D6:2 C6:1 Bb5:1 G5:2 | E5:1 G5:1 Bb5:1 Db6:1 Bb5:4 | D6:2 C6:1 Bb5:1 A5:2 F5:2 | B5:1 D6:1 B5:1 G5:1 F5:2 D5:2 |
      C5:1 Eb5:1 G5:1 Bb5:1 D6:2 C6:2 | A5:1 C6:1 Eb6:1 C6:1 A5:2 F5:2 | Bb5:4 G5:2 F5:2 | -:2 F5:1 G5:1 A5:1 C6:1 Eb5:1 C5:1`,
  },
  // seaside: flute and marimba over a calypso pizzicato bass
  island: {
    bpm: 112, swing: 0, meter: 4,
    lead: ['flute', 'violins'], double: [['marimba', 0, 0.5], ['marimba', 0, 0.45]],
    bass: 'calypso', comp: ['calypso', 'calypso'], horns: true, perc: 'calypso',
    chords: ['G', 'C', 'D7', 'G', 'G', 'Em', 'A7', 'D7', 'C', 'G', 'Am7', 'D7', 'G', 'E7', 'Am7 D7', 'G'],
    melody: `B4:1 D5:1 G5:1.5 F#5:0.5 G5:1 B5:2 -:1 | C6:1.5 B5:0.5 A5:1 G5:1 E5:2 G5:2 | F#5:1 A5:1 C6:1.5 B5:0.5 A5:2 F#5:2 | G5:3 D5:1 B4:2 -:2 |
      B4:1 D5:1 G5:1.5 A5:0.5 B5:1 D6:2 -:1 | E6:1.5 D6:0.5 B5:1 G5:1 E5:2 G5:2 | C#6:1 A5:1 G5:1.5 E5:0.5 C#5:2 E5:2 | D5:2 F#5:1 A5:1 C6:2 A5:2 |
      E6:1.5 D6:0.5 C6:1 G5:1 E5:2 C5:2 | D5:1 G5:1 B5:1.5 A5:0.5 G5:2 D5:2 | C5:1 E5:1 G5:1 A5:1 C6:2 B5:1 A5:1 | F#5:1.5 G5:0.5 A5:1 D5:1 F#5:2 -:2 |
      B5:1 D6:1 G6:2 F#6:1 D6:1 B5:2 | G#5:1 B5:1 D6:1.5 B5:0.5 G#5:2 E5:2 | A5:1 C6:1 E6:2 D6:1 C6:1 A5:1 F#5:1 | G5:4 -:2 D5:1 F#5:1`,
  },
  // western: a horn call over galloping strings, then trumpet and violins
  desert: {
    bpm: 100, swing: 0, meter: 4,
    lead: ['horn', 'trumpet'], double: [null, ['violins', 0, 0.5]],
    bass: 'pizz', comp: ['gallop', 'gallop'], perc: 'western',
    chords: ['D', 'D', 'C', 'D', 'G', 'G', 'A7', 'A7', 'D', 'D', 'C', 'G', 'A7', 'G', 'C G', 'D'],
    melody: `A4:1 D5:1 F#5:1 A5:1 -:1 A5:1 G5:1 F#5:1 | E5:2 D5:2 A4:4 | G5:1 E5:1 C5:1 E5:1 G5:2 C6:2 | A5:3 F#5:1 D5:4 |
      B5:1 G5:1 D5:1 G5:1 B5:2 D6:2 | C6:1 B5:1 A5:1 G5:1 D5:4 | C#5:1 E5:1 G5:1 A5:1 C#6:2 A5:2 | B5:1 A5:1 G5:1 E5:1 C#5:2 -:2 |
      D6:2 A5:1 F#5:1 D5:2 F#5:2 | A5:3 G5:1 F#5:2 E5:2 | E5:1 G5:1 C6:2 G5:1 E5:1 C5:2 | D5:1 G5:1 B5:2 A5:1 G5:1 D5:2 |
      E5:1 A5:1 C#6:2 B5:1 A5:1 G5:2 | B5:2 G5:2 D5:2 B4:2 | C5:1 E5:1 G5:2 D5:1 G5:1 B5:2 | A5:4 F#5:2 D5:2`,
  },
  // city streets: a brass-band strut, trumpet and clarinet over walking pizzicato
  jazz: {
    bpm: 132, swing: 0.25, meter: 4,
    lead: ['trumpet', 'violins'], double: [['clarinet', 0, 0.5], ['trumpet', 0, 0.6]],
    bass: 'walk', comp: ['offbeat', 'offbeat'], horns: true, perc: 'march',
    chords: ['F', 'F', 'C7', 'C7', 'C7', 'C7', 'F', 'F7', 'Bb', 'Bbm6', 'F', 'D7', 'G7', 'C7', 'F D7', 'G7 C7'],
    melody: `A4:1 C5:1 F5:2 A5:2 F5:2 | G5:1 F5:1 D5:1 C5:1 A4:4 | G4:1 Bb4:1 C5:1 E5:1 G5:2 E5:2 | F5:1 E5:1 D5:1 C5:1 Bb4:4 |
      E5:2 G5:1 Bb5:1 -:1 G5:1 E5:2 | D5:1 E5:1 C5:2 -:2 C5:1 E5:1 | F5:3 A5:1 C6:2 A5:2 | Eb5:1 F5:1 A5:1 C6:1 Eb6:2 C6:2 |
      D6:2 Bb5:1 F5:1 D5:2 F5:2 | Db6:2 Bb5:1 F5:1 Db5:4 | C5:1 F5:1 A5:1 C6:1 A5:2 F5:2 | F#5:1 A5:1 C6:1 D6:1 C6:2 A5:2 |
      B5:2 G5:1 F5:1 D5:2 B4:2 | C5:1 E5:1 G5:1 Bb5:1 A5:2 G5:2 | F5:2 A5:2 F#5:2 D5:2 | G5:2 F5:1 D5:1 E5:2 C5:2`,
  },
  // winter: a celesta waltz with sleigh bells
  snowfall: {
    bpm: 138, swing: 0, meter: 3,
    lead: ['celesta', 'violins'], double: [['flute', 0, 0.35], ['flute', 0, 0.4]],
    bass: 'waltz', comp: ['waltz', 'waltz'], horns: true, perc: 'sleigh',
    chords: ['Eb', 'Eb', 'Cm', 'Cm', 'Ab', 'Bb7', 'Eb', 'Bb7', 'Eb', 'G7', 'Cm', 'Cm', 'Ab', 'Abm', 'Eb', 'Bb7'],
    melody: `G5:2 Bb5:2 Eb6:2 | D6:2 C6:1 Bb5:1 G5:2 | C6:4 Bb5:2 | G5:4 Eb5:2 | Ab5:2 C6:2 Eb6:2 | D6:2 C6:2 Ab5:2 | G5:4 Bb5:2 | F5:4 -:2 |
      G5:2 Bb5:2 Eb6:2 | F6:2 D6:2 B5:2 | C6:4 G5:2 | Eb6:2 D6:2 C6:2 | C6:2 Ab5:2 Eb5:2 | B5:2 Ab5:2 Eb5:2 | Bb5:4 G5:2 | F5:2 G5:2 Ab5:2`,
  },
};

// ------------------------------------------------------------------ fanfares
// Each part is [instrument, level, notes]; a note is [name, start beat, length in beats,
// level]. Unpitched percussion takes null for the name.
const roll = (note, from, to, v0 = 0.25, v1 = 0.9) => {
  const out = [], step = 1 / 6, n = Math.round((to - from) / step);
  for (let i = 0; i < n; i++) out.push([note, from + i * step, 0.2, v0 + ((v1 - v0) * i) / n]);
  return out;
};
const gliss = (names, from, step, len) => names.map((n, i) => [n, from + i * step, len]);
const stack = (names, at, len) => names.map((n) => [n, at, len]);

const JINGLES = {
  hole: {
    bpm: 120,
    parts: [
      ['harp', 1, gliss(['C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6'], 0, 0.125, 2.5)],
      ['celesta', 0.8, stack(['C6', 'E6', 'G6'], 0.875, 2)],
      ['strings', 0.6, stack(['C4', 'G4', 'C5', 'E5'], 0, 2.6)],
    ],
  },
  ace: {
    bpm: 132, applause: 3,
    parts: [
      ['trumpet', 1, [['G4', 0, 0.33], ['C5', 0.33, 0.33], ['E5', 0.66, 0.33], ['G5', 1, 1], ['E5', 2, 0.33], ['G5', 2.33, 0.33], ['C6', 2.66, 2.6]]],
      ['violins', 0.6, [['G5', 0, 0.33], ['C6', 0.33, 0.33], ['E6', 0.66, 0.33], ['G6', 1, 1], ['E6', 2, 0.33], ['G6', 2.33, 0.33], ['C7', 2.66, 2.6]]],
      ['horn', 0.8, [['E4', 1, 1], ['G4', 2.66, 2.6], ['E4', 2.66, 2.6]]],
      ['lowbrass', 0.8, [['G2', 1, 1], ['C3', 2.66, 2.6], ['C2', 2.66, 2.6]]],
      ['strings', 1, stack(['C4', 'G4', 'C5', 'E5', 'G5'], 2.66, 2.8)],
      ['harp', 0.7, gliss(['C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6', 'E6'], 2, 0.083, 2)],
      ['timp', 1, [...roll('G2', 0, 2.66), ['C3', 2.66, 1, 1]]],
      ['crash', 1, [[null, 2.66, 3]]],
      ['triangle', 1, [[null, 2.66, 1]]],
    ],
  },
  eagle: {
    bpm: 132, applause: 2.4,
    parts: [
      ['trumpet', 1, [['C4', 0, 0.33], ['E4', 0.33, 0.33], ['G4', 0.66, 0.33], ['C5', 1, 0.5], ['A4', 1.5, 0.5], ['C5', 2, 0.33], ['D5', 2.33, 0.33], ['E5', 2.66, 2]]],
      ['violins', 0.55, [['C5', 0, 0.33], ['E5', 0.33, 0.33], ['G5', 0.66, 0.33], ['C6', 1, 0.5], ['A5', 1.5, 0.5], ['C6', 2, 0.33], ['D6', 2.33, 0.33], ['E6', 2.66, 2]]],
      ['horn', 0.8, stack(['G3', 'C4'], 2.66, 2)],
      ['strings', 0.9, stack(['C4', 'G4', 'C5', 'E5'], 2.66, 2.2)],
      ['lowbrass', 0.7, [['C3', 2.66, 2]]],
      ['timp', 1, [...roll('G2', 1, 2.66, 0.2, 0.7), ['C3', 2.66, 1, 0.9]]],
      ['crash', 0.7, [[null, 2.66, 2.5]]],
    ],
  },
  birdie: {
    bpm: 132, applause: 1.8,
    parts: [
      ['trumpet', 0.9, [['E4', 0, 0.5], ['G4', 0.5, 0.5], ['C5', 1, 0.5], ['B4', 1.5, 0.25], ['C5', 1.75, 0.25], ['E5', 2, 1.6]]],
      ['flute', 0.7, [['E5', 0, 0.5], ['G5', 0.5, 0.5], ['C6', 1, 0.5], ['B5', 1.5, 0.25], ['C6', 1.75, 0.25], ['E6', 2, 1.6]]],
      ['horn', 0.7, stack(['C4', 'G4'], 2, 1.6)],
      ['strings', 0.8, stack(['C4', 'G4', 'C5'], 2, 1.8)],
      ['timp', 0.8, [['C3', 2, 1]]],
      ['crash', 0.45, [[null, 2, 2]]],
    ],
  },
  par: {
    bpm: 120, applause: 0.7,
    parts: [
      ['horn', 0.9, [['G4', 0, 0.5], ['E4', 0.5, 0.5], ['C5', 1, 1.4]]],
      ['flute', 0.4, [['G5', 0, 0.5], ['E5', 0.5, 0.5], ['C6', 1, 1.4]]],
      ['strings', 0.7, stack(['C4', 'E4', 'G4'], 1, 1.6)],
      ['harp', 0.6, gliss(['C3', 'G3', 'E4'], 1, 0.1, 2)],
    ],
  },
  bogey: {
    bpm: 108,
    parts: [
      ['clarinet', 2, [['E4', 0, 0.5], ['D4', 0.5, 0.5], ['C4', 1, 1.5]]],
      ['bassoon', 2, [['G3', 0, 0.5], ['F3', 0.5, 0.5], ['E3', 1, 1.5]]],
      ['pizz', 0.8, [['C3', 1, 1]]],
    ],
  },
  double: {
    bpm: 84,
    parts: [
      ['lowbrass', 1, [['G2', 0, 0.75], ['F#2', 0.75, 0.75], ['F2', 1.5, 0.75], ['E2', 2.25, 2]]],
      ['bassoon', 0.8, [['G3', 0, 0.75], ['F#3', 0.75, 0.75], ['F3', 1.5, 0.75], ['E3', 2.25, 2]]],
      ['timp', 0.6, [['E2', 2.25, 1]]],
    ],
  },
  ob: {
    bpm: 120,
    parts: [
      ['pizz', 2.8, [['A4', 0, 0.4], ['Eb4', 0.5, 1]]],
      ['bassoon', 2.2, [['A3', 0, 0.4], ['Eb3', 0.5, 1]]],
    ],
  },
  round: {
    bpm: 120, applause: 3.5,
    parts: [
      ['trumpet', 1, [['C5', 0, 0.5], ['C5', 0.5, 0.25], ['C5', 0.75, 0.25], ['G5', 1, 1], ['F5', 2, 0.33], ['G5', 2.33, 0.33], ['A5', 2.66, 0.33],
        ['G5', 3, 0.5], ['E5', 3.5, 0.5], ['C6', 4, 2.8]]],
      ['horn', 0.8, [['C4', 0, 0.5], ['C4', 0.5, 0.25], ['C4', 0.75, 0.25], ['E4', 1, 1], ['F4', 2, 1], ['G4', 3, 1], ['E4', 4, 2.8], ['G4', 4, 2.8]]],
      ['violins', 0.5, [['F5', 2, 0.33], ['G5', 2.33, 0.33], ['A5', 2.66, 0.33], ['G5', 3, 0.5], ['E5', 3.5, 0.5], ['C6', 4, 2.8], ['G6', 4, 2.8]]],
      ['lowbrass', 0.9, [['C3', 0, 1], ['G2', 1, 1], ['F2', 2, 1], ['G2', 3, 1], ['C2', 4, 2.8]]],
      ['strings', 1, [...stack(['F3', 'C4', 'A4'], 2, 1), ...stack(['G3', 'D4', 'B4'], 3, 1), ...stack(['C4', 'G4', 'C5', 'E5'], 4, 3)]],
      ['timp', 1, [['C3', 0, 1, 0.8], ['G2', 1, 1, 0.7], ...roll('G2', 3, 4, 0.3, 0.9), ['C3', 4, 1, 1]]],
      ['bassdrum', 0.8, [[null, 4, 1]]],
      ['crash', 1, [[null, 4, 3]]],
    ],
  },
};

// ------------------------------------------------------------- arranging
// the first note of pitch class `pc` at or above `low`
const place = (pc, low) => low + (((pc - low) % 12) + 12) % 12;
const voicing = (c, low) => c.tones.map((i) => place(c.root + i, low)).sort((a, b) => a - b);
// bass notes sit between E2 and D#3; the fifth is taken below the root
const bassNote = (c, interval = 0) => place(c.root + interval, 40);
const fifthBelow = (c) => bassNote(c, 7) - (bassNote(c, 7) > bassNote(c) ? 12 : 0);

function arrange(song) {
  const meter = song.meter, events = [];
  const bars = song.chords.map((c) => c.split(' ').map(chord));
  const total = bars.length * meter;
  const chordAt = (beat) => {
    const bar = bars[Math.floor(beat / meter) % bars.length];
    return bar[Math.min(bar.length - 1, Math.floor(((beat % meter) / meter) * bar.length))];
  };
  const segs = [];
  bars.forEach((bar, i) => bar.forEach((c, k) => segs.push({ t: i * meter + (k * meter) / bar.length, dur: meter / bar.length, c })));

  const melody = [];
  let t = 0;
  for (const tok of song.melody.replace(/\|/g, ' ').trim().split(/\s+/)) {
    const [n, d] = tok.split(':');
    const len = Number(d) / 2;
    if (n !== '-') melody.push({ t, dur: len, note: midi(n) });
    t += len;
  }
  if (Math.abs(t - total) > 1e-6) console.warn(`melody is ${t} beats, chart is ${total}`);

  for (const pass of [0, 1]) {
    const o = pass * total, full = pass === 1;
    const add = (inst, at, dur, note = 0, vel = 1, straight = false) => events.push({ inst, t: o + at, dur, note, vel, straight });

    // melody, slightly legato
    const lead = song.lead[pass], dbl = song.double?.[pass];
    for (const n of melody) {
      add(lead, n.t, n.dur * 1.05, n.note, 1);
      if (dbl) add(dbl[0], n.t, n.dur * 1.05, n.note + dbl[1], dbl[2]);
    }

    // sustained strings under everything; the second pass adds cellos and horns
    for (const s of segs) {
      for (const n of voicing(s.c, 55)) add('strings', s.t, s.dur, n, full ? 0.85 : 0.6);
      if (full) add('celli', s.t, s.dur, bassNote(s.c), 0.6);
      if (full && song.horns) for (const i of s.c.tones.slice(1, 3)) add('horn', s.t, s.dur, place(s.c.root + i, 53), 0.3);
    }

    for (let bar = 0; bar < bars.length; bar++) {
      const b0 = bar * meter;
      // bass line, pizzicato
      for (let k = 0; k < meter; k++) {
        const c = chordAt(b0 + k);
        if (song.bass === 'pizz') add('pizz', b0 + k, 0.5, k % 2 ? fifthBelow(c) : bassNote(c), k === 0 ? 1 : 0.75);
        else if (song.bass === 'walk') {
          const next = chordAt(b0 + meter);
          const line = [bassNote(c), bassNote(c, c.tones[1]), bassNote(c, 7), bassNote(next) + (bar % 2 ? -1 : 1)];
          add('pizz', b0 + k, 0.9, line[k], k === 0 ? 0.95 : 0.75);
        } else if (song.bass === 'waltz' && k === 0) add('pizz', b0, 1, bar % 2 ? fifthBelow(c) : bassNote(c), 1);
      }
      if (song.bass === 'calypso') {
        for (const [at, five] of [[0, false], [1.5, false], [2, true], [3.5, false]]) {
          const c = chordAt(b0 + at);
          add('pizz', b0 + at, 0.5, five ? fifthBelow(c) : bassNote(c), at === 0 ? 1 : 0.75);
        }
      }

      // accompaniment figure
      const comp = song.comp[pass];
      if (comp === 'harp') {
        // broken chords rising from the root, an eighth apart, left to ring
        const pattern = meter === 3 ? [0, 1, 2, 3, 4, 2] : [0, 1, 2, 3, 4, 5, 4, 2];
        pattern.forEach((p, i) => {
          const c = chordAt(b0 + i / 2), r = place(c.root, 48), notes = [];
          for (let n = r; notes.length < 6; n++) if (c.tones.some((iv) => (n - r - iv) % 12 === 0)) notes.push(n);
          add('harp', b0 + i / 2, 1.5, notes[p], i === 0 ? 0.9 : 0.65);
        });
      } else if (comp === 'spicc') {
        // a bouncing string ostinato on root, fifth and octave
        const vels = [1, 0.55, 0.8, 0.55, 0.9, 0.55, 0.8, 0.55];
        ['r', 'f', 'o', 'f', 'r', 'f', 't', 'f'].forEach((s, i) => {
          const c = chordAt(b0 + i / 2), r = place(c.root, 48);
          add('spicc', b0 + i / 2, 0.4, { r, f: r + c.tones[2], o: r + 12, t: r + 12 + c.tones[1] }[s], vels[i]);
        });
      } else if (comp === 'gallop') {
        for (let k = 0; k < meter; k++) {
          const c = chordAt(b0 + k), r = place(c.root, 50);
          for (const [at, n, v] of [[0, r, 0.9], [0.5, r, 0.5], [0.75, r + c.tones[2], 0.65]]) add('spicc', b0 + k + at, 0.25, n, v * (full ? 1 : 0.75));
        }
      } else if (comp === 'waltz') {
        for (const k of [1, 2]) for (const n of voicing(chordAt(b0 + k), 57)) add('pizz', b0 + k, 0.5, n, 0.4);
      } else if (comp === 'calypso') {
        for (const at of [0.5, 1.5, 2, 2.5, 3.5]) for (const n of voicing(chordAt(b0 + at), 62).slice(-3)) add('marimba', b0 + at, 0.3, n, 0.35);
      } else if (comp === 'offbeat') {
        // short brass-section stabs on the off-beats
        for (const at of [1, 3]) for (const n of voicing(chordAt(b0 + at), 55).slice(-3)) add('horn', b0 + at, 0.35, n, full ? 0.55 : 0.4);
      }

      // percussion
      const root = bassNote(chordAt(b0)), fifth = bassNote(chordAt(b0 + 2), 7);
      const phrase = bar % 4 === 0;
      switch (song.perc) {
        case 'light':
          if (phrase) add('triangle', b0, 1, 0, 0.5);
          if (full && phrase) add('timp', b0, 1, root, 0.55);
          break;
        case 'timp':
          if (full) { add('timp', b0, 1, root, phrase ? 0.8 : 0.45); if (bar % 2) add('timp', b0 + 2, 1, fifth, 0.35); }
          else if (phrase) add('timp', b0, 1, root, 0.45);
          if (full && bar % 8 === 0) add('bassdrum', b0, 1, 0, 0.5);
          break;
        case 'western':
          if (full || bar % 2 === 0) add('timp', b0, 1, root, phrase ? 0.75 : 0.5);
          if (full) add('timp', b0 + 2, 1, fifth, 0.4);
          break;
        case 'march':
          add('bassdrum', b0, 1, 0, 0.45);
          add('bassdrum', b0 + 2, 1, 0, 0.35);
          if (full) for (const [at, v] of [[1, 0.6], [2.75, 0.3], [3, 0.6], [3.75, 0.25]]) add('snare', b0 + at, 0.2, 0, v);
          if (phrase) add('crash', b0, 1.5, 0, full ? 0.4 : 0.25);
          break;
        case 'calypso':
          for (let k = 0; k < 16; k++) add('shaker', b0 + k / 4, 0.1, 0, k % 2 ? 0.3 : 0.55);
          if (full) { add('tamb', b0 + 1, 0.2, 0, 0.6); add('tamb', b0 + 3, 0.2, 0, 0.6); add('bassdrum', b0, 1, 0, 0.35); }
          break;
        case 'sleigh':
          for (let k = 0; k < meter; k++) add('sleigh', b0 + k, 0.2, 0, k === 0 ? 0.7 : 0.4);
          if (phrase) add('triangle', b0, 1, 0, 0.45);
          if (full && phrase) add('timp', b0, 1, root, 0.5);
          break;
        default: break;
      }
    }

    // the first pass builds into the second: a timpani roll and a cymbal swell, then a crash
    if (!full) {
      const dom = bassNote(chordAt(total - 1));
      for (const [, at, , v] of roll(null, total - 2, total, 0.15, 0.7)) add('timp', at, 0.3, dom, v, true);
      add('swell', total - 2, 2, 0, 0.8, true);
    } else {
      add('crash', 0, 3, 0, 0.7);
      add('timp', 0, 1, bassNote(chordAt(0)), 0.9);
    }
  }
  events.sort((a, b) => a.t - b.t);
  return { events, length: total * 2 };
}

// Shift off-beat eighths (and the sixteenths between) later for a lilting feel.
function swingTime(beat, swing) {
  if (!swing) return beat;
  const whole = Math.floor(beat), f = beat - whole, mid = 0.5 + swing;
  return whole + (f < 0.5 ? (f / 0.5) * mid : mid + ((f - 0.5) / 0.5) * (1 - mid));
}

// ------------------------------------------------------------- the orchestra
// Seating on the stage: [pan, reverb send].
const SECTIONS = {
  strings0: [-0.45, 0.6], strings1: [0.45, 0.6], violins: [-0.3, 0.4], celli: [0.35, 0.5],
  pizz: [0.25, 0.4], spicc: [-0.15, 0.4], harp: [-0.5, 0.5], celesta: [-0.3, 0.55], mallets: [0.3, 0.4],
  winds: [0, 0.4], horn: [0.35, 0.6], trumpet: [0.15, 0.4], lowbrass: [0.3, 0.45],
  timp: [0.1, 0.5], perc: [0, 0.4],
};

// Oscillators are [wave, detune in cents, level, frequency ratio]; several slightly
// detuned saws make an ensemble. `cutoff` is [multiple of the pitch, ceiling in Hz] for a
// low-pass, and `bloom` opens that filter from a darker start ([start multiple, seconds,
// settle fraction]) the way brass speaks. `sustain: 0` makes a plucked or struck note
// that rings out with time constant `decay`.
const INSTRUMENTS = {
  violins: { section: 'violins', oscs: [['sawtooth', -9], ['sawtooth', 0], ['sawtooth', 8], ['sawtooth', 15, 0.5]], peak: 0.08, attack: 0.07, release: 0.3, legato: true, cutoff: [6, 5200], vibrato: [5.4, 14, 0.2] },
  strings: { section: 'strings', oscs: [['sawtooth', -12], ['sawtooth', -4], ['sawtooth', 5], ['sawtooth', 13]], peak: 0.016, attack: 0.45, release: 0.9, legato: true, cutoff: [4, 2600], vibrato: [4.8, 8, 0.4] },
  celli: { section: 'celli', oscs: [['sawtooth', -8], ['sawtooth', 0], ['sawtooth', 9]], peak: 0.045, attack: 0.2, release: 0.6, legato: true, cutoff: [5, 1100], vibrato: [4.6, 8, 0.4] },
  spicc: { section: 'spicc', oscs: [['sawtooth', -7], ['sawtooth', 7]], peak: 0.045, attack: 0.01, sustain: 0, decay: 0.06, cutoff: [5, 3000], bloom: [2, 0.02] },
  pizz: { section: 'pizz', oscs: [['triangle', 0], ['sawtooth', 4, 0.35]], peak: 0.14, attack: 0.004, sustain: 0, decay: 0.16, cutoff: [5, 2400], bloom: [8, 0, 0.35] },
  harp: { section: 'harp', oscs: [['triangle', 0], ['sine', 0, 0.5, 2], ['sine', 0, 0.12, 3]], peak: 0.07, attack: 0.003, sustain: 0, decay: 0.45, cutoff: [6, 4000] },
  celesta: { section: 'celesta', oscs: [['sine', 0], ['sine', 0, 0.25, 4], ['sine', 3, 0.08, 2]], peak: 0.12, attack: 0.002, sustain: 0, decay: 0.35 },
  marimba: { section: 'mallets', oscs: [['sine', 0], ['sine', 0, 0.12, 4]], peak: 0.11, attack: 0.002, sustain: 0, decay: 0.12 },
  flute: { section: 'winds', oscs: [['sine', 0], ['triangle', 0, 0.12, 2]], peak: 0.09, attack: 0.05, release: 0.15, legato: true, vibrato: [5, 12, 0.18], breath: 0.03 },
  oboe: { section: 'winds', oscs: [['sawtooth', 0], ['sawtooth', 4, 0.4]], peak: 0.09, attack: 0.04, release: 0.12, legato: true, cutoff: [3.5, 2800], q: 2.5, vibrato: [5.3, 10, 0.2] },
  clarinet: { section: 'winds', oscs: [['square', 0], ['square', 5, 0.4]], peak: 0.05, attack: 0.04, release: 0.12, legato: true, cutoff: [3, 2200], vibrato: [5, 4, 0.3] },
  bassoon: { section: 'winds', oscs: [['sawtooth', 0], ['square', 5, 0.5]], peak: 0.05, attack: 0.04, release: 0.12, legato: true, cutoff: [3, 900], q: 2 },
  horn: { section: 'horn', oscs: [['sawtooth', -4], ['sawtooth', 5, 0.8]], peak: 0.075, attack: 0.09, release: 0.3, legato: true, cutoff: [3, 1500], bloom: [1.1, 0.12, 0.8], vibrato: [4.8, 5, 0.35] },
  trumpet: { section: 'trumpet', oscs: [['sawtooth', -3], ['sawtooth', 4]], peak: 0.09, attack: 0.03, release: 0.18, legato: true, cutoff: [7, 5500], bloom: [1.4, 0.05, 0.6], vibrato: [5.5, 7, 0.3] },
  lowbrass: { section: 'lowbrass', oscs: [['sawtooth', -4], ['sawtooth', 4]], peak: 0.07, attack: 0.06, release: 0.25, legato: true, cutoff: [3, 800], bloom: [1, 0.1, 0.75] },
};
const PERCUSSION = new Set(['timp', 'crash', 'swell', 'bassdrum', 'snare', 'triangle', 'shaker', 'tamb', 'sleigh']);

export class Music {
  constructor(audio) {
    this.audio = audio;
    this.song = null;
    this.timer = null;
    this.compiled = {};
    this.enabled = true;
  }

  get ctx() { return this.audio.ctx; }

  setEnabled(on) {
    this.enabled = on;
    if (!this.ctx) return;
    const g = this.audio.musicBus.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(on ? this.audio.musicLevel : 0, t, 0.15);
  }

  // A shared hall: a convolution reverb built from decaying, darkening noise.
  hall() {
    if (this.reverb) return this.reverb;
    const ctx = this.ctx, rate = ctx.sampleRate, len = Math.floor(rate * 3.2);
    const ir = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const s = i / rate;
        const a = 0.2 + 0.72 * Math.min(1, s / 2.4); // the tail loses its highs as it fades
        lp = lp * a + (Math.random() * 2 - 1) * (1 - a);
        d[i] = s < 0.015 ? 0 : lp * Math.exp((-s * 6.9) / 2.6);
      }
    }
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = ir;
    const ret = ctx.createGain();
    ret.gain.value = 0.7;
    this.reverb.connect(ret).connect(this.audio.musicBus);
    return this.reverb;
  }

  // A fader pair (dry and reverb send) with a panned bus per section.
  mixer(dest) {
    const ctx = this.ctx, out = ctx.createGain(), wet = ctx.createGain(), buses = {};
    out.connect(dest);
    wet.connect(this.hall());
    return {
      out, wet,
      bus(name) {
        if (buses[name]) return buses[name];
        const [pan, send] = SECTIONS[name] ?? [0, 0.4];
        const g = ctx.createGain(), p = ctx.createStereoPanner(), s = ctx.createGain();
        g.gain.value = 1.5; p.pan.value = pan; s.gain.value = send;
        g.connect(p); p.connect(out); p.connect(s).connect(wet);
        return (buses[name] = g);
      },
      fade(value, t, tc) {
        for (const n of [out, wet]) { n.gain.cancelScheduledValues(t); n.gain.setTargetAtTime(value, t, tc); }
      },
    };
  }

  // Start a song (cross-fading from the current one). Unknown names stop the music.
  play(name) {
    if (!this.ctx) { this.pending = name; return; }
    if (this.song && this.song.name === name) return;
    this.stopSong(0.8);
    const def = SONGS[name];
    if (!def) return;
    if (!this.compiled[name]) this.compiled[name] = arrange(def);
    const mix = this.mixer(this.audio.musicBus);
    mix.out.gain.value = mix.wet.gain.value = 0;
    mix.fade(1, this.ctx.currentTime + 0.3, 0.4);
    this.song = { name, def, ...this.compiled[name], mix, spb: 60 / def.bpm, start: this.ctx.currentTime + 0.4, idx: 0, loop: 0 };
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 40);
    this.schedule();
  }

  stopSong(fade = 0.5) {
    if (!this.song) return;
    const { mix } = this.song;
    mix.fade(0, this.ctx.currentTime, fade / 3);
    setTimeout(() => { mix.out.disconnect(); mix.wet.disconnect(); }, fade * 1000 + 3500);
    this.song = null;
  }

  // Called once audio is allowed to start.
  resume() {
    if (this.pending) { const p = this.pending; this.pending = null; this.play(p); }
  }

  schedule() {
    const s = this.song;
    if (!s || !this.ctx) return;
    const now = this.ctx.currentTime, ahead = now + 0.3;
    for (;;) {
      const ev = s.events[s.idx];
      const loopStart = s.start + s.loop * s.length * s.spb;
      const beat = (b) => (ev.straight ? b : swingTime(b, s.def.swing));
      const at = loopStart + beat(ev.t) * s.spb;
      if (at > ahead) break;
      if (at > now - 0.05) {
        const end = loopStart + beat(ev.t + ev.dur) * s.spb;
        // players are never perfectly together: a few milliseconds and a little dynamics
        const human = PERCUSSION.has(ev.inst) ? 0 : (Math.random() - 0.5) * 0.014;
        this.note(ev.inst, ev.note, Math.max(now, at + human), Math.max(0.05, end - at), s.mix, ev.vel * (0.9 + Math.random() * 0.2));
      }
      s.idx++;
      if (s.idx >= s.events.length) { s.idx = 0; s.loop++; }
    }
  }

  // Duck the song under a fanfare, then bring it back.
  jingle(name) {
    const j = JINGLES[name];
    if (!j || !this.ctx) return;
    const t = this.ctx.currentTime + 0.03, spb = 60 / j.bpm;
    let len = 0;
    for (const [, , notes] of j.parts) for (const [, s, d] of notes) len = Math.max(len, (s + d) * spb);
    if (this.song && this.enabled) {
      const { mix } = this.song;
      mix.fade(0.15, t, 0.05);
      for (const n of [mix.out, mix.wet]) n.gain.setTargetAtTime(1, t + len, 0.5);
    }
    if (this.enabled) {
      this.jmix ??= this.mixer(this.audio.jingleBus);
      for (const [inst, level, notes] of j.parts) {
        for (const [n, s, d, v = 1] of notes) this.note(inst, n ? midi(n) : 0, t + s * spb, d * spb, this.jmix, 0.6 * level * v);
      }
    }
    if (j.applause) this.audio.applause(j.applause);
  }

  // One note on one instrument, routed to its section of `mix`.
  note(inst, m, t, dur, mix, vel = 1) {
    if (PERCUSSION.has(inst)) return this.perc(inst, m, t, dur, mix, vel);
    const spec = INSTRUMENTS[inst];
    if (!spec) return;
    const ctx = this.ctx, f = hz(m);
    const bus = mix.bus(spec.section === 'strings' ? `strings${m % 2}` : spec.section);
    const g = ctx.createGain(), oscs = [];
    let input = g;
    if (spec.cutoff) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.Q.value = spec.q ?? 0.7;
      const top = Math.min(spec.cutoff[1], f * spec.cutoff[0]) * (0.7 + 0.3 * Math.min(1, vel));
      if (spec.bloom) {
        const [from, time, settle] = spec.bloom;
        lp.frequency.setValueAtTime(Math.min(top, f * from), t);
        lp.frequency.linearRampToValueAtTime(top, t + time + 0.001);
        if (settle) lp.frequency.setTargetAtTime(top * settle, t + time + 0.001, 0.2);
      } else lp.frequency.value = top;
      lp.connect(g);
      input = lp;
    }
    for (const [type, cents = 0, level = 1, ratio = 1] of spec.oscs) {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = type; o.frequency.value = f * ratio; o.detune.value = cents + (Math.random() - 0.5) * 4;
      og.gain.value = level;
      o.connect(og).connect(input);
      oscs.push(o);
    }

    const attack = spec.legato ? Math.min(spec.attack, Math.max(0.02, dur * 0.6)) : spec.attack;
    const peak = spec.peak * vel, env = g.gain;
    env.setValueAtTime(0, t);
    env.linearRampToValueAtTime(peak, t + attack);
    let end;
    if (spec.sustain === 0) {
      env.setTargetAtTime(0, t + attack, spec.decay);
      end = t + attack + spec.decay * 7;
    } else {
      const off = t + Math.max(dur, attack);
      env.setTargetAtTime(0, off, spec.release / 4);
      end = off + spec.release * 1.5;
    }
    if (spec.vibrato && dur > 0.3) {
      const [rate, cents, delay] = spec.vibrato;
      const lfo = ctx.createOscillator(), depth = ctx.createGain();
      lfo.frequency.value = rate * (0.93 + Math.random() * 0.14);
      depth.gain.setValueAtTime(0, t + delay);
      depth.gain.linearRampToValueAtTime(cents, t + delay + 0.3);
      lfo.connect(depth);
      for (const o of oscs) depth.connect(o.detune);
      lfo.start(t); lfo.stop(end);
    }
    if (spec.breath) this.noise(t, 0.09, spec.breath * vel, 'bandpass', Math.min(7000, f * 2), bus, 1.2);
    g.connect(bus);
    for (const o of oscs) { o.start(t); o.stop(end); }
  }

  perc(inst, m, t, dur, mix, vel) {
    const ctx = this.ctx;
    const bus = mix.bus(inst === 'timp' ? 'timp' : 'perc');
    const partial = (freq, from, level, decay, len) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(freq * from, t);
      if (from !== 1) o.frequency.exponentialRampToValueAtTime(freq, t + 0.08);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(level, t + 0.004);
      g.gain.setTargetAtTime(0, t + 0.004, decay);
      o.connect(g).connect(bus);
      o.start(t); o.stop(t + len);
    };
    switch (inst) {
      case 'timp': {
        // a tuned drum: slightly sharp at the strike, with the drum's inharmonic overtones
        const f = hz(m);
        for (const [ratio, level, decay] of [[1, 1, 0.55], [1.5, 0.4, 0.35], [1.98, 0.22, 0.25], [2.44, 0.1, 0.18]]) partial(f * ratio, 1.05, 0.22 * level * vel, decay, decay * 7);
        this.noise(t, 0.08, 0.12 * vel, 'lowpass', 500, bus);
        break;
      }
      case 'bassdrum':
        partial(42, 1.5, 0.4 * vel, 0.3, 2.2);
        this.noise(t, 0.12, 0.1 * vel, 'lowpass', 220, bus);
        break;
      case 'snare':
        this.noise(t, 0.18, 0.09 * vel, 'bandpass', 2600, bus, 0.7);
        partial(185, 1.2, 0.08 * vel, 0.04, 0.3);
        break;
      case 'triangle':
        for (const [freq, level] of [[4200, 1], [6050, 0.6], [8900, 0.35]]) partial(freq, 1, 0.03 * level * vel, 0.45, 3);
        break;
      case 'crash': this.noise(t, dur, 0.06 * vel, 'highpass', 3500, bus, 0.5, 'ring'); break;
      case 'swell': this.noise(t, dur, 0.05 * vel, 'highpass', 3000, bus, 0.5, 'swell'); break;
      case 'shaker': this.noise(t, 0.05, 0.035 * vel, 'highpass', 6000, bus, 0.8); break;
      case 'tamb':
        this.noise(t, 0.16, 0.04 * vel, 'highpass', 7000, bus, 0.8);
        for (const freq of [5800, 7100]) partial(freq * (0.98 + Math.random() * 0.04), 1, 0.012 * vel, 0.03, 0.2);
        break;
      case 'sleigh':
        this.noise(t, 0.14, 0.035 * vel, 'highpass', 8000, bus, 1.5);
        for (const freq of [5200, 6100, 7300]) partial(freq * (0.98 + Math.random() * 0.04), 1, 0.02 * vel, 0.035, 0.25);
        break;
      default: break;
    }
  }

  // Filtered noise. `shape` is 'hit' (fast decay), 'ring' (long decay) or 'swell' (crescendo).
  noise(t, dur, gain, type, freq, out, q = 1, shape = 'hit') {
    const ctx = this.ctx, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.audio.noise;
    src.loop = true;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    let end;
    g.gain.setValueAtTime(0, t);
    if (shape === 'swell') {
      g.gain.linearRampToValueAtTime(gain, t + dur);
      g.gain.setTargetAtTime(0, t + dur, 0.06);
      end = t + dur + 0.4;
    } else if (shape === 'ring') {
      g.gain.linearRampToValueAtTime(gain, t + 0.005);
      g.gain.setTargetAtTime(0, t + 0.005, dur / 4);
      end = t + dur * 1.8;
    } else {
      g.gain.linearRampToValueAtTime(gain, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      end = t + dur + 0.02;
    }
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 1.5);
    src.stop(end);
  }
}
