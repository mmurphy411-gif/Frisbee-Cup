// Colour palettes for each course's season and setting.

const HOMES = {
  walls: ['#f2e8d5', '#e8d4b8', '#c9d7e0', '#d9c7b8', '#f4f1ea', '#b8c9b0', '#e2b9a0', '#cfd4dc', '#f0dfa8'],
  roofs: ['#6b4f3f', '#4f5560', '#7a3b34', '#3f4a45', '#5b6470', '#55443a'],
  doors: ['#b5432f', '#2f5d8a', '#3d7a4a', '#5a3e2b', '#c98a1b', '#7a2f4f', '#2b4a5e'],
  shutters: ['#2f4f6f', '#3d5a40', '#6b2f2f', '#2b2b2b', '#55606b', '#7a5a2f'],
  trim: '#ffffff',
};

export const SUMMER = {
  season: 'summer',
  ground: {
    woods: '#4b8b3d', woodsMottle: ['#3c7a31', '#58993f', '#41823a', '#6a9a3e'],
    lawn: '#6cb14f', lawnMottle: ['#5fa346', '#7cc15a', '#93cf66', '#68ad4b'],
    sand: '#dcca97', mud: '#8d8a5a', bottom: '#6d7d56', deep: '#355a5c',
    dirt: '#8d7552', rock: '#8f8b84', path: '#d9d0b6', curb: '#cdc9bd', asphalt: '#5c6067',
    litter: null,
  },
  foliage: {
    broad: ['#3f9440', '#4c9f45', '#5aad4c', '#358a3c', '#67b552'],
    pine: ['#2c6b46', '#34764d', '#3d8055'],
    bush: ['#4f9f45', '#5cae4d', '#6cbf55'],
    willow: ['#8cc35a', '#9fcd65', '#84bb50'],
    birch: ['#8fc455', '#a2cf5f', '#7fb84c'],
  },
  trunk: '#7d5c3e', pineTrunk: '#6b4a33',
  ...HOMES,
  porchDecor: 'flowers',
  water: { shallow: '#62c6d6', deep: '#2b7fae', foam: '#f4fcff' },
};

export const LAKESIDE = {
  ...SUMMER,
  ground: {
    ...SUMMER.ground,
    woods: '#47873f', lawn: '#72b752', lawnMottle: ['#64a849', '#80c65d', '#97d26a', '#6cb04c'],
    sand: '#e6d4a0', bottom: '#7b8a5c', deep: '#2f5f6b',
  },
  walls: ['#f4f1ea', '#d6e4ea', '#e9dcc2', '#c8d9cf', '#f2e3c9', '#bcd0de', '#e8c9b5'],
  roofs: ['#4f5560', '#3f4a45', '#5b6470', '#6b4f3f', '#2f4858'],
  porchDecor: 'flowers',
  water: { shallow: '#5fcfd4', deep: '#1f6f9e', foam: '#f6fdff' },
};

export const AUTUMN = {
  season: 'autumn',
  ground: {
    woods: '#8a6a3c', woodsMottle: ['#7a5a2f', '#a07a40', '#94683a', '#6f5a32', '#b0823f'],
    lawn: '#8fae4b', lawnMottle: ['#86a545', '#9db857', '#a9b55a', '#7f9f42'],
    sand: '#d8c690', mud: '#7d6f4f', bottom: '#6a6a4a', deep: '#3b5257',
    dirt: '#8a6a45', rock: '#8c8780', path: '#cdbf9f', curb: '#c9c4b8', asphalt: '#575b62',
    litter: ['#e2572b', '#f08a24', '#f4b934', '#c93a2c', '#d9762b'],
  },
  foliage: {
    broad: ['#e2572b', '#f08a24', '#f4b934', '#c93a2c', '#e8a33a', '#b8452a', '#d8c23f', '#8fa83a'],
    pine: ['#2d5e40', '#356a48', '#2a5539'],
    bush: ['#b8452a', '#d9762b', '#9a3a2a', '#c4a23a'],
    willow: ['#c9b545', '#d6c25a'],
    birch: ['#f2d04b', '#f5dc63', '#e8c23a'],
  },
  trunk: '#6e5038', pineTrunk: '#5e4230',
  ...HOMES,
  walls: ['#e8d4b8', '#d9c7b8', '#f2e8d5', '#c4b49a', '#b8c0c8', '#e0c9a6', '#cfc2b0', '#a9b7a0'],
  roofs: ['#55443a', '#4f5560', '#6b3a2f', '#3f4a45', '#5d4b3c'],
  porchDecor: 'pumpkins',
  ambientLeaves: true,
  water: { shallow: '#6fb8bd', deep: '#2d6378', foam: '#eef7f7' },
};

export const PINES = {
  ...SUMMER,
  ground: {
    ...SUMMER.ground,
    woods: '#5d6a3a', woodsMottle: ['#6e5d3c', '#4f6334', '#7d6743', '#58703b', '#86704a'],
    lawn: '#69a94b', lawnMottle: ['#5c9c42', '#78b956', '#86c060', '#62a347'],
    dirt: '#7a6145', bottom: '#5f6f4c', deep: '#2f4f4c',
    litter: ['#8a6a3a', '#a07a44', '#6b5530'],
  },
  foliage: {
    ...SUMMER.foliage,
    broad: ['#3d8a3d', '#4a9441', '#357c36', '#58a04a'],
    pine: ['#1f5233', '#265c3a', '#2d6741', '#1a4a2f'],
    bush: ['#3f8a3c', '#4c9a45', '#5aa64f'],
  },
  pineTrunk: '#5a3e2b',
  walls: ['#8a5a3a', '#a8744a', '#6f4a32', '#c9b79c', '#7d8a74', '#b5a58a', '#5f6b5a', '#d8cbb0'],
  roofs: ['#3a3f3a', '#4f3a2c', '#2f3a33', '#5a4a3a', '#6b3a2f'],
  shutters: ['#2f4f3a', '#6b2f2f', '#2b2b2b', '#4a3a2a'],
  water: { shallow: '#5aa8a0', deep: '#24606a', foam: '#eef8f4' },
};

export const SPRING = {
  ...SUMMER,
  season: 'spring',
  ground: {
    ...SUMMER.ground,
    woods: '#5a9a44', woodsMottle: ['#4f8f3c', '#68a84e', '#7ab55a', '#5f9e46'],
    lawn: '#78c255', lawnMottle: ['#6cb84c', '#88cc62', '#a0d874', '#74bd50'],
    sand: '#d9c28f', dirt: '#8f7552',
    litter: ['#f7c6d9', '#ffffff', '#f2a7c3'],
  },
  foliage: {
    broad: ['#f2a7c3', '#f7c6d9', '#ffffff', '#e889ad', '#6fb352', '#7fbf5a', '#5ea84a'],
    pine: ['#2f7048', '#367a4f', '#3f8558'],
    bush: ['#e06a9a', '#f2b134', '#ffffff', '#b46ad8', '#6cbf55'],
    willow: ['#a6d66a', '#b4dc78', '#98cc5e'],
    birch: ['#b5df6c', '#c3e57e', '#a7d65e'],
  },
  walls: ['#f4f1ea', '#f7e3e8', '#d8e8f0', '#fbf0c9', '#e3f0dc', '#efd9c7', '#e6e0f2', '#cfe3df'],
  roofs: ['#5b6470', '#4f5560', '#7a3b34', '#3f4a45', '#6b5a7a'],
  porchDecor: 'flowers',
  ambientLeaves: ['#f7c6d9', '#ffffff', '#f2a7c3', '#fbe3ec'], // drifting blossom petals
  water: { shallow: '#6ccbd4', deep: '#2c82aa', foam: '#f6fdff' },
};

export const DESERT = {
  ...SUMMER,
  season: 'summer',
  ground: {
    woods: '#c7a676', woodsMottle: ['#b8946a', '#d4b585', '#a8865c', '#c99f6e', '#9c8a62'],
    lawn: '#8fb25a', lawnMottle: ['#84a852', '#9cbc66', '#a8c070', '#7f9f4c'],
    sand: '#e4cb94', mud: '#9a7d58', bottom: '#7d8a6a', deep: '#2f6f80',
    dirt: '#a8724a', rock: '#9a5c3e', path: '#e0c9a0', curb: '#d9cdb8', asphalt: '#5a5650',
    litter: ['#8a9a55', '#a3a87a', '#c9b56a'],
  },
  foliage: {
    broad: ['#7a8f4a', '#8a9a55', '#6f8445', '#9aa860'],
    pine: ['#4f6b45', '#5a7550', '#45603e'],
    bush: ['#8a9a6a', '#a3a87a', '#7f8f5f', '#b0a46a'],
    willow: ['#9fae5c', '#b2bd6a'],
    birch: ['#a9b85a', '#bcc46a'],
  },
  trunk: '#6b5340', pineTrunk: '#5e4a38',
  ...HOMES,
  walls: ['#e8cfa8', '#d9b48a', '#f0e0c4', '#c98f6a', '#e6c7a0', '#f2e6d0', '#d6a77a'],
  roofs: ['#b5533a', '#a8472f', '#c2643f', '#9a4a35', '#b86a48'],
  doors: ['#5a3e2b', '#2f5d6a', '#7a2f2f', '#3d6a5a', '#8a5a2b'],
  shutters: ['#3d6a6a', '#6b3a2a', '#4a5a3a'],
  porchDecor: null,
  water: { shallow: '#5fd0d8', deep: '#1f7f9e', foam: '#f4feff' },
};

export const SEASIDE = {
  ...SUMMER,
  ground: {
    ...SUMMER.ground,
    woods: '#8f9f5a', woodsMottle: ['#a2a868', '#7f914e', '#b3ad74', '#869a52'],
    lawn: '#74b653', lawnMottle: ['#68a94a', '#80c15c', '#8fca66', '#6caf4d'],
    sand: '#ecdcae', mud: '#b8a57a', bottom: '#8fb3a0', deep: '#2a6f8a', dirt: '#a8916a', rock: '#9a9286',
  },
  foliage: {
    ...SUMMER.foliage,
    broad: ['#4f8f45', '#5a9a4c', '#447f3c', '#66a252'],
    pine: ['#2f5f48', '#386a50', '#2a5540'],
    bush: ['#5f8f4a', '#6f9a52', '#7aa65a', '#8a9a55'],
  },
  walls: ['#a7a9a3', '#d8d2c4', '#7d8f9a', '#e8e2d2', '#c9b79c', '#f4f1ea', '#9fb8c8', '#b8b2a4'],
  roofs: ['#5b6470', '#4f5560', '#6b6f72', '#3f4a45', '#7a3b34'],
  shutters: ['#2f4f6f', '#2f5d8a', '#3d5a40', '#ffffff', '#55606b'],
  water: { shallow: '#59c2cf', deep: '#1f5f8e', foam: '#ffffff' },
};

export const WINTER = {
  ...SUMMER,
  season: 'winter',
  ground: {
    woods: '#e9eff3', woodsMottle: ['#dfe7ed', '#f4f7f9', '#d3dde5', '#e6ecef'],
    lawn: '#f1f5f7', lawnMottle: ['#e8eef2', '#f7fafb', '#dde6ec'],
    sand: '#dfe6ea', mud: '#9aa3a8', bottom: '#9fb3bf', deep: '#6f8fa3',
    dirt: '#a0a6aa', rock: '#8b8f93', path: '#cfd8de', curb: '#c9cfd4', asphalt: '#4b5057',
    litter: ['#ffffff', '#eef4f8'],
  },
  foliage: {
    broad: ['#e3ebf0', '#d6e1e8', '#eef3f6', '#c9d6de'], // laden with snow
    pine: ['#2b5a42', '#305f47', '#264f3b', '#355f4a'],
    bush: ['#dde6ec', '#cfdbe3', '#e8eef2'],
    willow: ['#dbe4ea', '#e6edf1'],
    birch: ['#e7eef2', '#d9e3e9'],
  },
  trunk: '#5e4a3a', pineTrunk: '#4f3a2c',
  walls: ['#b5452f', '#2f5d8a', '#e8d4b8', '#3d6a5a', '#f2e8d5', '#7a3b34', '#c9b79c', '#5a6b7a'],
  roofs: ['#eef3f6', '#e6edf1', '#f4f7f9', '#dfe7ec'], // snow on every roof
  porchDecor: null,
  ambientLeaves: ['#ffffff', '#f4f8ff', '#e8f0f6'], // light snowfall
  water: { shallow: '#8fb8c8', deep: '#4f7f98', foam: '#f4f9fb' },
};
