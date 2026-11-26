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
  'storm-rider': 'Flew the blizzard leg and lived.',
  'cargo-ace': 'Dropped the supplies within 40 ft of the mark.',
  'full-route': 'Flew all six legs of the Meridian route.',
};

/** Sky palettes, one per time of day. Winter edition, pass 2: EVERY sky is cold — a pale
 *  winter sun, steel-blue sea and snow-light ground. Each leg keeps its own time of day
 *  (dawn, day, dusk, blizzard, night, golden hour) but none of them reads warm or summery:
 *  no orange, no pink, no peach anywhere in the sky, the sea or the ground. */
export const SKIES = {
  dawn: {
    top: '#2c3a5e', mid: '#93a5c6', low: '#dbe4ee', sun: '#f4f7fa', sunX: 0.72, sunY: 0.26,
    cloud: '#dbe4ee', cloudShadow: '#7d8aa5', seaTop: '#4a6a85', seaBottom: '#24384e',
    landTop: '#dde3e9', landBottom: '#aab2bd',
    haze: 'rgba(219,228,238,0.35)', night: false,
  },
  day: {
    top: '#33577e', mid: '#7ea3c8', low: '#dbe8f2', sun: '#f8fbff', sunX: 0.22, sunY: 0.16,
    cloud: '#ffffff', cloudShadow: '#b8c8dc', seaTop: '#3a6f96', seaBottom: '#1d4258',
    landTop: '#dde3e8', landBottom: '#a9b4be',
    haze: 'rgba(219,232,242,0.3)', night: false,
  },
  dusk: {
    top: '#262a4a', mid: '#5d6a94', low: '#a9b4cc', sun: '#f2eee2', sunX: 0.28, sunY: 0.32,
    cloud: '#a9b4cc', cloudShadow: '#4d5470', seaTop: '#3f4a6e', seaBottom: '#1e2438',
    landTop: '#c9ccd8', landBottom: '#8a8fa0',
    haze: 'rgba(169,180,204,0.35)', night: false,
  },
  storm: {
    top: '#141a24', mid: '#2c3644', low: '#4c565e', sun: '#c8d2d8', sunX: 0.68, sunY: 0.14,
    cloud: '#3e4854', cloudShadow: '#1e262e', seaTop: '#3a4f60', seaBottom: '#1c2c3a',
    landTop: '#6a727c', landBottom: '#3c444e',
    haze: 'rgba(200,210,220,0.5)', night: false,
  },
  night: {
    top: '#05081a', mid: '#0d1533', low: '#1d2a52', sun: '#e8ecf7', sunX: 0.76, sunY: 0.20,
    cloud: '#2a3560', cloudShadow: '#141c38', seaTop: '#16233f', seaBottom: '#070d1d',
    landTop: '#2c3448', landBottom: '#1a2032',
    haze: 'rgba(13,21,51,0.5)', night: true,
  },
  golden: {
    top: '#3d4266', mid: '#9aa3c2', low: '#e3e8ef', sun: '#fdf3d8', sunX: 0.62, sunY: 0.30,
    cloud: '#e6ebf2', cloudShadow: '#8f96ac', seaTop: '#3a5a78', seaBottom: '#1d3248',
    landTop: '#dfe5ea', landBottom: '#aeb8c2',
    haze: 'rgba(227,232,239,0.4)', night: false,
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
