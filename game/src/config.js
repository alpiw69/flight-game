// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on screen size.
// Distances in the world are feet, speeds in knots, altitudes in feet.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display rate. */
export const STEP = 1 / 60;

/** Perspective focal length, in screen pixels, for the chase camera. */
export const FOCAL = 900;
/** Screen height of the horizon line in chase view. */
export const HORIZON_Y = 330;

/** Feet per knot per second. */
export const KT = 1.68781;

export const PLANE = {
  /** Knots below which the wing stops flying. */
  stallSpeed: 95,
  /** Knots at full throttle, level flight. */
  maxSpeed: 330,
  /** Knots on a normal approach. */
  approachSpeed: 135,
  /** Degrees of bank per second at full stick. */
  bankRate: 55,
  /** Max bank, degrees. */
  maxBank: 38,
  /** Max pitch, degrees. */
  maxPitch: 14,
  /** Feet per second of climb at full throttle, level attitude. */
  climbRate: 2600,
  /** Fuel burn at full throttle, percent per second. */
  burnFull: 0.16,
  /** Fuel burn at idle, percent per second. */
  burnIdle: 0.03,
  /** Fuel at the start of every leg (topped up at each airport). */
  fuelStart: 100,
  /** Damage taken from a hard touchdown. */
  hardLandingDamage: 22,
  /** Vertical speed, ft/min, above which a touchdown counts as hard. */
  hardLandingVs: 620,
  /** Vertical speed, ft/min, below which a touchdown counts as perfect. */
  perfectVs: 170,
};

export const SCORE = {
  ring: 100,
  ringComboStep: 25,
  legComplete: 200,
  landingPerfect: 500,
  landingGood: 250,
  landingOk: 100,
  cargoPerfect: 300,
  cargoGood: 180,
  cargoOk: 80,
};

/** Feat ids, in the order the flight log shows them. */
export const FEATS = {
  PERFECT_LANDING: 'perfect-landing',
  ALL_RINGS: 'all-rings',
  SMOOTH_OPERATOR: 'smooth-operator',
  STORM_RIDER: 'storm-rider',
  CARGO_ACE: 'cargo-ace',
  FULL_ROUTE: 'full-route',
};

export const FEAT_LABELS = {
  'perfect-landing': 'Perfect Landing',
  'all-rings': 'All Rings',
  'smooth-operator': 'Smooth Operator',
  'storm-rider': 'Storm Rider',
  'cargo-ace': 'Cargo Ace',
  'full-route': 'Full Route',
};

export const FEAT_DESCRIPTIONS = {
  'perfect-landing': 'Touched down softer than 170 ft/min.',
  'all-rings': 'Flew every ring on a leg.',
  'smooth-operator': 'Finished a leg with no damage.',
  'storm-rider': 'Flew the storm leg and lived.',
  'cargo-ace': 'Dropped the supplies within 40 ft of the mark.',
  'full-route': 'Flew all six legs of the Meridian route.',
};

/** Sky palettes, one per time of day. Every leg picks one. */
export const SKIES = {
  dawn: {
    top: '#2c3a6e', mid: '#e08a7a', low: '#f7c489', sun: '#ffd9a0', sunX: 0.72, sunY: 0.30,
    cloud: '#ffd9c2', cloudShadow: '#b98a9e', seaTop: '#5a7fa8', seaBottom: '#2c4a6e',
    landTop: '#8a7480', landBottom: '#4e5a50',
    haze: 'rgba(247,196,137,0.35)', night: false,
  },
  day: {
    top: '#2f6fd0', mid: '#7db3e8', low: '#cfe8f7', sun: '#fff3c4', sunX: 0.22, sunY: 0.18,
    cloud: '#ffffff', cloudShadow: '#c8d8ea', seaTop: '#3f8fbf', seaBottom: '#1d5a86',
    landTop: '#a8a89a', landBottom: '#7a7f6e',
    haze: 'rgba(207,232,247,0.25)', night: false,
  },
  dusk: {
    top: '#3a2a5e', mid: '#c65f6e', low: '#f7a45c', sun: '#ffb347', sunX: 0.28, sunY: 0.34,
    cloud: '#f2a58c', cloudShadow: '#8a5a7a', seaTop: '#5e5a8e', seaBottom: '#2c2a52',
    landTop: '#8a6a72', landBottom: '#54485a',
    haze: 'rgba(247,164,92,0.35)', night: false,
  },
  storm: {
    top: '#1c2430', mid: '#3a4757', low: '#5a6a72', sun: '#c8d2d8', sunX: 0.68, sunY: 0.16,
    cloud: '#4a5560', cloudShadow: '#232c36', seaTop: '#3d5566', seaBottom: '#1d2f3e',
    landTop: '#5a6672', landBottom: '#333e48',
    haze: 'rgba(90,106,114,0.4)', night: false,
  },
  night: {
    top: '#060a1c', mid: '#0d1533', low: '#1d2a52', sun: '#e8ecf7', sunX: 0.76, sunY: 0.20,
    cloud: '#2a3560', cloudShadow: '#141c38', seaTop: '#16233f', seaBottom: '#070d1d',
    landTop: '#232c44', landBottom: '#121828',
    haze: 'rgba(13,21,51,0.5)', night: true,
  },
  golden: {
    top: '#4a3a7a', mid: '#e08a4a', low: '#ffd27a', sun: '#ffe9a8', sunX: 0.62, sunY: 0.32,
    cloud: '#ffd9a8', cloudShadow: '#a87a68', seaTop: '#3f7fb0', seaBottom: '#1e4a72',
    landTop: '#8f7a6a', landBottom: '#5c4f47',
    haze: 'rgba(255,210,122,0.4)', night: false,
  },
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'meridian-sky.best';

/** Airline livery: deep teal cheatline, warm gold sun mark. */
export const LIVERY = {
  fuselageTop: '#f4f7fa',
  fuselageMid: '#d7e2ea',
  fuselageBelly: '#8fa3b3',
  cheatline: '#0f7d8c',
  cheatlineGold: '#f2b23e',
  tail: '#0f5f6e',
  tailMark: '#f2b23e',
  engine: '#c8d4dd',
  engineIntake: '#1c2733',
  window: '#16222e',
};
