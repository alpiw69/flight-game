// The world: the Meridian route, one leg at a time. It owns the flight state, the rings, the
// cargo crate, the weather, the score and the feats, and it turns each fixed step into the
// events the loop announces: rings flown, cargo dropped, touchdowns, legs finished, crashes.

import { FEATS, KT, PLANE, SCORE } from './config.js';
import { LEGS } from './legs.js';
import { cityLayout, coastX, towerHeightAt, CITY } from './city.js';
import { createFlightState, stepFlight } from './flight.js';
import { createRandom } from './random.js';

const GRAVITY = 32; // ft/s^2, for the cargo crate
const RUNWAY_HALF_WIDTH = 90;
const RUNWAY_LENGTH = 2600;

export const EVENT_NONE = 0;

export function createWorld(random) {
  const world = {
    random,
    legIndex: 0,
    leg: LEGS[0],
    flight: null,
    rings: [],
    clouds: [],
    city: null,
    drop: null,
    crate: null,
    phase: 'flying',
    time: 0,
    legTime: 0,
    score: 0,
    legScore: 0,
    legStartDamage: 0,
    combo: 0,
    ringsHit: 0,
    feats: new Set(),
    legResults: [],
    message: '',
    messageUntil: 0,
    crashReason: '',
    landingVs: 0,
    landingQuality: '',
    cargoResult: '',
    lightningTimer: 5,
    lightningFlash: 0,
    bolt: null,
    rollout: 0,
    intermission: 0,
    finished: false,
    fuelWarned: false,
  };
  startLeg(world, 0);
  return world;
}

/** Begin a leg: fresh jet on the departure runway, fresh rings, fresh weather. */
export function startLeg(world, legIndex) {
  const leg = LEGS[legIndex];
  // Airframe damage carries across legs; fuel is topped up at each airport.
  const carriedDamage = world.flight ? world.flight.damage : 0;
  world.legIndex = legIndex;
  world.leg = leg;
  world.flight = createFlightState(leg);
  world.flight.damage = carriedDamage;
  world.fuelWarned = false;
  world.rings = leg.rings.map((ring) => ({ ...ring, passed: false, missed: false, done: false }));
  world.drop = leg.drop ? { ...leg.drop, dropped: false, scored: false } : null;
  world.crate = null;
  world.phase = 'flying';
  world.legTime = 0;
  world.legScore = 0;
  world.legStartDamage = world.flight.damage;
  world.combo = 0;
  world.ringsHit = 0;
  world.message = `LEG ${leg.id} — ${leg.name}: ${leg.from} to ${leg.to}`;
  world.messageUntil = 4;
  world.crashReason = '';
  world.landingVs = 0;
  world.landingQuality = '';
  world.cargoResult = '';
  world.lightningTimer = 4 + world.random() * 4;
  world.lightningFlash = 0;
  world.bolt = null;
  world.rollout = 0;
  world.intermission = 0;
  // The city under this leg: streets, river, park, stadium, downtown, and — on the
  // final leg — the tower canyon.
  world.city = cityLayout(leg);
  world.clouds = [];
  const cloudCount = leg.weather.rain > 0 ? 34 : 26;
  for (let i = 0; i < cloudCount; i += 1) {
    world.clouds.push({
      x: (world.random() * 2 - 1) * 15000,
      y: leg.weather.rain > 0 ? 1900 + world.random() * 2400 : 2600 + world.random() * 2800,
      z: world.random() * (leg.length + 6000),
      scale: 320 + world.random() * 620,
      shade: world.random(),
    });
  }
}

/**
 * Terrain height in feet at (x, z). The city is flat ground except for the named
 * towers; both runways and the approach corridor are cleared ground at 40 ft.
 */
export function terrainHeightAt(world, x, z) {
  const leg = world.leg;
  if (Math.abs(x) < 160 && ((z >= -2600 && z <= 200) || (z >= leg.length - 200 && z <= leg.length + RUNWAY_LENGTH))) return 40;
  if (Math.abs(x) < 1200 && ((z >= -2600 && z <= 12000) || (z >= leg.length - 14000 && z <= leg.length + RUNWAY_LENGTH))) {
    return Math.min(towerHeightAt(world.city, x, z), 42);
  }
  return towerHeightAt(world.city, x, z);
}

/** What the ground is at (x, z): a tower, the water, the beach, or plain city ground. */
export function terrainKindAt(world, x, z) {
  if (towerHeightAt(world.city, x, z) > 0) return 'tower';
  const coast = coastX(world.city.bay, z);
  if (x < coast || Math.abs(z - world.city.riverZ) < 600) return 'water';
  if (x < coast + CITY.sandWidth) return 'beach';
  return 'ground';
}

/** The crash line for going down at (x, z). */
export function crashLineAt(world, x, z) {
  const kind = terrainKindAt(world, x, z);
  if (kind === 'tower') return 'Flew into a tower.';
  if (kind === 'water') return 'Ditched in the water.';
  if (kind === 'beach') return 'Came down on the beach.';
  return 'Crashed into the city streets.';
}

/** The next ring still ahead, or null when the course is done. */
export function nextRing(world) {
  for (const ring of world.rings) {
    if (!ring.done && ring.z > world.flight.z) return ring;
  }
  return null;
}

/** Where the pilot should aim next: a ring, the drop plaza, or the runway threshold. */
export function nextTarget(world) {
  const ring = nextRing(world);
  if (ring) return { kind: 'ring', x: ring.x, y: ring.y, z: ring.z };
  if (world.drop && !world.drop.dropped) return { kind: 'drop', x: world.drop.x, y: 1200, z: world.drop.z };
  return { kind: 'runway', x: 0, y: 0, z: world.leg.length };
}

export function resetWorld(world) {
  world.score = 0;
  world.feats = new Set();
  world.legResults = [];
  world.finished = false;
  startLeg(world, 0);
}

/**
 * Advance the world one fixed step. controls is the pilot's input for this step:
 * { pitch, bank, throttleDelta, flaps, gear, brake, drop }. Returns the events of this
 * step: { ring, ringMissed, landed, legDone, crashed, dropped, cargo, fuelEmpty, feat }.
 */
export function stepWorld(world, controls, dt) {
  const events = { ring: false, ringMissed: false, landed: false, legDone: false, crashed: false, dropped: false, cargo: false, fuelEmpty: false, feat: '' };
  const flight = world.flight;
  const leg = world.leg;
  world.time += dt;
  world.legTime += dt;
  if (world.message && world.legTime > world.messageUntil) world.message = '';

  // Lightning in the storm: a flash every few seconds, then it fades.
  if (leg.weather.lightning > 0) {
    world.lightningTimer -= dt;
    if (world.lightningTimer <= 0) {
      world.lightningFlash = 1;
      world.lightningTimer = 4 + world.random() * 5;
      const bx = (world.random() * 2 - 1) * 400;
      world.bolt = { x: 640 + bx, top: 60 + world.random() * 60, bottom: 300 + world.random() * 80 };
    }
    world.lightningFlash = Math.max(0, world.lightningFlash - dt * 1.8);
    if (world.lightningFlash <= 0) world.bolt = null;
  }

  if (world.phase === 'legDone') {
    world.intermission -= dt;
    if (world.intermission <= 0) {
      if (world.legIndex + 1 >= LEGS.length) {
        world.finished = true;
        world.phase = 'finished';
      } else {
        startLeg(world, world.legIndex + 1);
      }
    }
    return events;
  }
  if (world.phase === 'crashed' || world.phase === 'finished') return events;

  // Gusts shake the stick in rough weather.
  const gust = leg.weather.gust;
  const gustBank = gust > 0 ? (world.random() * 2 - 1) * gust * 7 : 0;
  const gustPitch = gust > 0 ? (world.random() * 2 - 1) * gust * 3 : 0;

  // Flaps and gear are toggles the pilot flips; brake and drop are held or pressed.
  if (controls.flaps) { flight.flaps = !flight.flaps; }
  if (controls.gear) { flight.gear = !flight.gear; }
  flight.brake = !!controls.brake;

  const prevZ = flight.z;
  const prevY = flight.y;
  stepFlight(flight, { pitch: controls.pitch, bank: controls.bank, throttleDelta: controls.throttleDelta, gustPitch, gustBank }, dt, leg.weather);

  if (flight.fuel <= 0 && !world.fuelWarned) {
    world.fuelWarned = true;
    events.fuelEmpty = true;
    world.message = 'LOW FUEL — glide to the runway';
    world.messageUntil = world.legTime + 4;
  }

  // Rings: crossing a ring's plane scores it, or misses it.
  for (const ring of world.rings) {
    if (ring.done) continue;
    if (prevZ < ring.z && flight.z >= ring.z) {
      ring.done = true;
      const dist = Math.hypot(flight.x - ring.x, flight.y - ring.y);
      if (dist <= ring.r) {
        ring.passed = true;
        world.ringsHit += 1;
        world.combo += 1;
        const points = SCORE.ring + (world.combo - 1) * SCORE.ringComboStep;
        world.score += points;
        world.legScore += points;
        events.ring = true;
        world.message = `RING +${points}${world.combo > 1 ? `  COMBO x${world.combo}` : ''}`;
        world.messageUntil = world.legTime + 2.5;
      } else {
        ring.missed = true;
        world.combo = 0;
        events.ringMissed = true;
        world.message = 'RING MISSED';
        world.messageUntil = world.legTime + 2;
      }
    }
  }

  // Cargo: one crate, dropped over the plaza, scored where it lands.
  if (world.drop && !world.drop.dropped && controls.drop && flight.airborne && !flight.onGround) {
    world.drop.dropped = true;
    world.crate = { x: flight.x, y: flight.y, z: flight.z, vy: 0, vx: flight.speed * KT * Math.sin(flight.heading), vz: flight.speed * KT * Math.cos(flight.heading), landed: false, timer: 0 };
    events.dropped = true;
    world.message = 'SUPPLIES AWAY';
    world.messageUntil = world.legTime + 2;
  }
  if (world.crate && !world.crate.landed) {
    const crate = world.crate;
    crate.vy -= GRAVITY * dt;
    crate.y += crate.vy * dt;
    crate.x += crate.vx * dt;
    crate.z += crate.vz * dt;
    const ground = terrainHeightAt(world, crate.x, crate.z);
    if (crate.y <= ground + 4) {
      crate.y = ground + 4;
      crate.landed = true;
      crate.timer = 1.2;
      const dist = Math.hypot(crate.x - world.drop.x, crate.z - world.drop.z);
      let points = 0;
      let label = 'CARGO OFF TARGET';
      if (dist <= 40) { points = SCORE.cargoPerfect; label = 'CARGO DEAD ON +300'; awardFeat(world, FEATS.CARGO_ACE, events); }
      else if (dist <= 120) { points = SCORE.cargoGood; label = `CARGO GOOD +180 (${Math.round(dist)} ft)`; }
      else if (dist <= world.drop.r) { points = SCORE.cargoOk; label = `CARGO IN THE ZONE +80 (${Math.round(dist)} ft)`; }
      world.score += points;
      world.legScore += points;
      world.cargoResult = label;
      events.cargo = true;
      world.message = label;
      world.messageUntil = world.legTime + 3;
    }
  }
  if (world.crate && world.crate.landed) world.crate.timer -= dt;

  // Touchdown, or the ground deciding for us.
  const runwayZone = Math.abs(flight.x) < RUNWAY_HALF_WIDTH && flight.z >= leg.length - 100 && flight.z <= leg.length + RUNWAY_LENGTH;
  if (!flight.onGround && flight.y <= 42 && prevY > 42) {
    if (runwayZone) {
      if (!flight.gear) {
        return crash(world, events, 'Belly landing — the gear was up.');
      }
      const vs = Math.abs(flight.vs);
      flight.onGround = true;
      flight.y = 40;
      flight.vs = 0;
      world.landingVs = vs;
      events.landed = true;
      if (vs < 950) {
        let points = SCORE.landingOk;
        let quality = 'Firm';
        if (vs <= PLANE.perfectVs) { points = SCORE.landingPerfect; quality = 'Perfect'; awardFeat(world, FEATS.PERFECT_LANDING, events); }
        else if (vs <= 350) { points = SCORE.landingGood; quality = 'Smooth'; }
        if (vs > PLANE.hardLandingVs) {
          flight.damage += PLANE.hardLandingDamage;
          world.message = `HARD LANDING ${quality} +${points}  DAMAGE +${PLANE.hardLandingDamage}%`;
        } else {
          world.message = `${quality.toUpperCase()} LANDING +${points}`;
        }
        world.landingQuality = quality;
        world.score += points;
        world.legScore += points;
        world.messageUntil = world.legTime + 3;
        world.phase = 'rollout';
        world.rollout = 0;
        if (flight.damage >= 100) return crash(world, events, 'The airframe gave out after the hard landing.');
      } else {
        return crash(world, events, 'The gear collapsed on a hard touchdown.');
      }
    } else {
      const ground = terrainHeightAt(world, flight.x, flight.z);
      if (flight.y <= ground + 20) {
        return crash(world, events, crashLineAt(world, flight.x, flight.z));
      }
    }
  }
  // Terrain or water at any other moment: only when the jet actually goes below the surface.
  if (!flight.onGround) {
    const ground = terrainHeightAt(world, flight.x, flight.z);
    if (flight.y < ground) {
      return crash(world, events, crashLineAt(world, flight.x, flight.z));
    }
  }

  // Rollout: the jet slows, brakes help, then the leg is done.
  if (world.phase === 'rollout') {
    world.rollout += dt;
    flight.speed = Math.max(0, flight.speed - (flight.brake ? 26 : 9) * dt);
    flight.z += flight.speed * KT * dt;
    if (flight.speed < 25 || world.rollout > 14) {
      finishLeg(world, events);
    }
  }

  // Out of fuel and still falling: the water or the ground ends it.
  if (flight.fuel <= 0 && !flight.onGround && flight.speed < 110 && flight.y < 300) {
    return crash(world, events, 'Out of fuel — she glided down short of the runway.');
  }

  return events;
}

function awardFeat(world, feat, events) {
  if (!world.feats.has(feat)) {
    world.feats.add(feat);
    if (!events.feat) events.feat = feat;
  }
}

function finishLeg(world, events) {
  const leg = world.leg;
  world.score += SCORE.legComplete;
  world.legScore += SCORE.legComplete;
  const ringsTotal = world.rings.length;
  const allRings = ringsTotal > 0 && world.ringsHit === ringsTotal;
  if (allRings) awardFeat(world, FEATS.ALL_RINGS, events);
  if (world.flight.damage - world.legStartDamage <= 0) awardFeat(world, FEATS.SMOOTH_OPERATOR, events);
  if (leg.id === 4) awardFeat(world, FEATS.STORM_RIDER, events);
  world.legResults.push({
    name: leg.name,
    from: leg.from,
    to: leg.to,
    score: world.legScore,
    rings: `${world.ringsHit}/${ringsTotal}`,
    landing: world.landingQuality || '—',
    cargo: world.cargoResult || '—',
    status: 'Landed',
  });
  world.message = `LEG ${leg.id} COMPLETE — ${leg.name}  +${SCORE.legComplete}`;
  world.messageUntil = world.legTime + 3;
  world.phase = 'legDone';
  world.intermission = 3;
  events.legDone = true;
  if (world.legIndex + 1 >= LEGS.length) awardFeat(world, FEATS.FULL_ROUTE, events);
}

function crash(world, events, reason) {
  world.phase = 'crashed';
  world.crashReason = reason;
  world.message = reason;
  events.crashed = true;
  return events;
}
