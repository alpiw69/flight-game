// The Meridian route: six legs across one coastal metropolis, dawn to night. Each leg is
// one mission with its own sky, weather, rings and runway, flown straight along +z from its
// own origin (z = 0) to its runway threshold (z = length). The city sits under the whole
// route: a street grid, a river with bridges, a park, a stadium and a downtown of towers;
// the destination airport is a district of the city. All positions are feet.
//
// Geometry note: the ring course descends from cruise altitude toward the runway, so the jet
// is already on the glide slope when the last ring is behind it.

export const AIRPORTS = {
  MHD: { code: 'MHD', name: 'Meridian Hub' },
  CBY: { code: 'CBY', name: 'Canal District' },
  PLM: { code: 'PLM', name: 'Plaza District' },
  TCV: { code: 'TCV', name: 'Tech Quarter' },
  BKR: { code: 'BKR', name: 'Beacon Hill' },
  MNB: { code: 'MNB', name: 'Marina District' },
};

/**
 * A ring: fly through it. x is feet off the centreline, y is altitude in feet, z is feet
 * along the leg, r is the ring radius in feet.
 */
export const LEGS = [
  {
    id: 1,
    name: 'Dawn Departure',
    from: 'MHD',
    to: 'CBY',
    sky: 'dawn',
    mission: 'rings',
    brief: 'Fly the dawn ring course through falling snow. Six rings, keep her smooth.',
    length: 40000,
    cruiseAlt: 1500,
    cruiseSpeed: 240,
    rings: [
      { x: 0, y: 1300, z: 12000, r: 170 },
      { x: 400, y: 1250, z: 16000, r: 170 },
      { x: -350, y: 1150, z: 20000, r: 170 },
      { x: 300, y: 1000, z: 24000, r: 160 },
      { x: -400, y: 850, z: 27000, r: 160 },
      { x: 0, y: 750, z: 30000, r: 180 },
    ],
    drop: null,
    weather: { rain: 0, snow: 1, gust: 0, lightning: 0 },
    city: {
      riverZ: 21000,
      bay: { z: 15000, depth: 6000, width: 12000 },
      park: { x: 3200, z: 14000, w: 2200, d: 1600 },
      gardens: [{ x: 5200, z: 28000, w: 2200, d: 1600 }],
      stadium: { x: -4200, z: 30000, r: 900 },
      downtown: { z0: 30000, z1: 41000 },
    },
    passengers: [
      { name: 'Maya, 34', quote: 'First time home in five years. My mum is waiting at the gate.' },
    ],
  },
  {
    id: 2,
    name: 'City Hop',
    from: 'CBY',
    to: 'PLM',
    sky: 'dusk',
    mission: 'landing',
    brief: 'A short hop at dusk over the snowy city. Bring her down soft — the landing is the score.',
    length: 42000,
    cruiseAlt: 1500,
    cruiseSpeed: 235,
    rings: [
      { x: 250, y: 1300, z: 12000, r: 180 },
      { x: -300, y: 1150, z: 18000, r: 180 },
      { x: 0, y: 950, z: 24000, r: 180 },
    ],
    drop: null,
    weather: { rain: 0, snow: 1, gust: 0.15, lightning: 0 },
    city: {
      riverZ: 19000,
      bay: { z: 26000, depth: 6500, width: 12000 },
      park: { x: -3400, z: 12000, w: 2000, d: 1500 },
      gardens: [{ x: 3600, z: 45200, w: 2000, d: 1500 }],
      stadium: { x: 4600, z: 26000, r: 850 },
      downtown: { z0: 31000, z1: 43000 },
    },
    passengers: [
      { name: 'Dimas, 41', quote: 'Tell Sari the city is ours today. She is counting the towers.' },
      { name: 'Sari, 9', quote: 'Dad, are we above the clouds yet?' },
    ],
  },
  {
    id: 3,
    name: 'Cargo Drop',
    from: 'PLM',
    to: 'TCV',
    sky: 'day',
    mission: 'cargo',
    brief: 'Supplies for Tech Quarter. Drop the crate on the marked plaza by the big Christmas tree, then land.',
    length: 42000,
    cruiseAlt: 1500,
    cruiseSpeed: 240,
    rings: [
      { x: -250, y: 1300, z: 12000, r: 180 },
      { x: 300, y: 1150, z: 19000, r: 180 },
    ],
    drop: { x: -300, y: 0, z: 26000, r: 260 },
    weather: { rain: 0, snow: 1, gust: 0.2, lightning: 0 },
    city: {
      riverZ: 22000,
      bay: { z: 18000, depth: 6000, width: 12000 },
      // The park is the drop zone: the marked plaza sits in its middle.
      park: { x: -300, z: 26000, w: 2400, d: 2000 },
      gardens: [{ x: 3800, z: 34000, w: 2200, d: 1600 }],
      stadium: { x: 4800, z: 16000, r: 900 },
      downtown: { z0: 30000, z1: 43000 },
    },
    passengers: [
      { name: 'Rani, ground crew', quote: 'Supplies on the plaza, please. The clinic is out of bandages.' },
    ],
  },
  {
    id: 4,
    name: 'Blizzard',
    from: 'TCV',
    to: 'BKR',
    sky: 'storm',
    mission: 'rings',
    brief: 'A blizzard sits on the route. Heavy snow, hard gusts, low visibility — fly the rings, do not fight the sky.',
    length: 40000,
    cruiseAlt: 1500,
    cruiseSpeed: 230,
    rings: [
      { x: 0, y: 1300, z: 12000, r: 170 },
      { x: 400, y: 1250, z: 16000, r: 160 },
      { x: -400, y: 1150, z: 20000, r: 160 },
      { x: 300, y: 1050, z: 24000, r: 160 },
      { x: 0, y: 950, z: 28000, r: 180 },
    ],
    drop: null,
    weather: { rain: 0, snow: 2, gust: 1, lightning: 0 },
    city: {
      riverZ: 24000,
      bay: { z: 19000, depth: 6500, width: 12000 },
      park: { x: 3600, z: 11000, w: 2200, d: 1600 },
      gardens: [{ x: -5200, z: 34000, w: 2000, d: 1500 }],
      stadium: { x: -4600, z: 27000, r: 850 },
      downtown: { z0: 29000, z1: 41000 },
    },
    passengers: [
      { name: 'Arif, co-pilot', quote: 'Storm cell ahead. Keep her steady, keep her level.' },
    ],
  },
  {
    id: 5,
    name: 'Night Run',
    from: 'BKR',
    to: 'MNB',
    sky: 'night',
    mission: 'landing',
    brief: 'Night over the snowy city. Follow the lit rings, land on the lights.',
    length: 42000,
    cruiseAlt: 1500,
    cruiseSpeed: 240,
    rings: [
      { x: 250, y: 1300, z: 13000, r: 180 },
      { x: -300, y: 1100, z: 20000, r: 180 },
    ],
    drop: null,
    weather: { rain: 0, snow: 1, gust: 0.1, lightning: 0 },
    city: {
      riverZ: 21000,
      bay: { z: 27000, depth: 6000, width: 12000 },
      park: { x: -3200, z: 15000, w: 2000, d: 1500 },
      gardens: [{ x: 4800, z: 36000, w: 2000, d: 1500 }],
      stadium: { x: 4200, z: 28000, r: 900 },
      downtown: { z0: 30000, z1: 43000 },
    },
    passengers: [
      { name: 'Lina, 27', quote: 'Night flights are the quiet ones. I like the lights below.' },
    ],
  },
  {
    id: 6,
    name: 'Golden Hour Finale',
    from: 'MNB',
    to: 'MHD',
    sky: 'golden',
    mission: 'finale',
    brief: 'Home to Meridian Hub through the tower canyon, the low winter sun on the snow. Four rings, then the runway.',
    length: 44000,
    cruiseAlt: 1600,
    cruiseSpeed: 245,
    rings: [
      { x: 0, y: 1400, z: 13000, r: 180 },
      { x: 600, y: 1300, z: 18000, r: 170 },
      { x: -600, y: 1200, z: 23000, r: 170 },
      { x: 0, y: 1100, z: 28000, r: 180 },
    ],
    drop: null,
    weather: { rain: 0, snow: 1, gust: 0.25, lightning: 0 },
    city: {
      riverZ: 32000,
      bay: { z: 30000, depth: 7500, width: 16000 },
      park: { x: 3400, z: 12000, w: 2200, d: 1600 },
      gardens: [
        { x: 3200, z: 31000, w: 2400, d: 1800 },
        { x: -2000, z: 35000, w: 2000, d: 1500 },
      ],
      stadium: { x: -1800, z: 36000, r: 850 },
      downtown: { z0: 22000, z1: 34000 },
      // The canyon: twin supertalls flanking the centreline, the rings thread between them.
      towers: [
        { x: -2600, z: 18000, w: 420, d: 420, h: 1050 },
        { x: 2600, z: 18000, w: 420, d: 420, h: 1000 },
        { x: -2600, z: 23000, w: 420, d: 420, h: 1100 },
        { x: 2600, z: 23000, w: 420, d: 420, h: 950 },
      ],
    },
    passengers: [
      { name: 'Budi, 58', quote: 'I have watched this city for forty years. From up here it still surprises me.' },
    ],
  },
];
