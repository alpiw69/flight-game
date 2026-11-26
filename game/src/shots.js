// The screenshot scenes behind ?shot=play|landing|storm|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple autopilot that
// aims at the next ring, the drop plaza or the runway, so the frame is what a real flight
// looks like and the same seed always gives the same frame.

import { STEP } from './config.js';
import { nextTarget, resetWorld, startLeg, stepWorld, terrainHeightAt } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_RESULTS, SCREEN_TITLE } from './render.js';

/** The autopilot's own memory: which toggles it has already flipped this leg. */
export function createAutopilot() {
  return { gearSet: false, flapsSet: false, gearRetracted: false, legIndex: -1 };
}

function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * The controls for one step, as the world expects them: { pitch, bank, throttleDelta,
 * flaps, gear, brake, drop }. The pilot aims at the next ring, then the plaza, then the
 * runway, and flies a gentle descent with a flare for the touchdown.
 */
export function autopilotControls(world, pilot) {
  const flight = world.flight;
  const leg = world.leg;
  const out = { pitch: 0, bank: 0, throttleDelta: 0, flaps: false, gear: false, brake: false, drop: false };

  if (pilot.legIndex !== world.legIndex) {
    pilot.legIndex = world.legIndex;
    pilot.gearSet = false;
    pilot.flapsSet = false;
    pilot.gearRetracted = false;
  }

  if (world.phase === 'rollout') {
    out.throttleDelta = -1;
    out.brake = true;
    return out;
  }
  if (world.phase !== 'flying') return out;

  const target = nextTarget(world);
  const distToTarget = target.z - flight.z;

  // Takeoff: full throttle, rotate past 115 kt, climb away.
  if (!flight.airborne) {
    out.throttleDelta = 1;
    out.pitch = flight.speed > 110 ? 0.8 : 0;
    return out;
  }

  // Gear up once the climb is established; it comes back out on final.
  if (!pilot.gearRetracted && flight.speed > 160 && flight.gear) {
    out.gear = true;
    pilot.gearRetracted = true;
  }

  // Bank toward the target: the heading the target wants, corrected for the heading we have.
  const desiredHeading = Math.atan2(target.x - flight.x, Math.max(200, distToTarget));
  const headingError = angleDiff(desiredHeading, flight.heading);
  out.bank = clamp(headingError * 2.2, -1, 1);

  // Throttle: cruise speed on the way, approach speed on final.
  const onFinal = target.kind === 'runway' && distToTarget < 8000;
  const wantSpeed = onFinal ? 138 : leg.cruiseSpeed;
  out.throttleDelta = flight.speed < wantSpeed - 4 ? 1 : flight.speed > wantSpeed + 4 ? -1 : 0;

  // Altitude: hold the ring's height, the drop height, or fly the descent profile.
  let desiredVs = 0;
  if (target.kind === 'ring') {
    desiredVs = clamp((target.y - flight.y) * 4.0, -3000, 3000);
  } else if (target.kind === 'drop') {
    desiredVs = clamp((1200 - flight.y) * 1.0, -1500, 1500);
    // The crate keeps flying forward as it falls: drop where its landing point, not the
    // jet, is over the plaza. It lands on the plaza, at ground level.
    const plaza = terrainHeightAt(world, world.drop.x, world.drop.z);
    const fallTime = Math.sqrt(Math.max(0, flight.y - plaza) / 16);
    const landX = flight.x + flight.speed * 1.68781 * Math.sin(flight.heading) * fallTime;
    const landZ = flight.z + flight.speed * 1.68781 * Math.cos(flight.heading) * fallTime;
    if (Math.abs(landX - world.drop.x) < 120 && Math.abs(landZ - world.drop.z) < 120) {
      out.drop = true;
    }
  } else {
    // Runway: join the 4-degree glide line and hold it down. The line itself falls as the
    // jet advances, so the command feeds that fall rate forward and corrects the error.
    const slope = 0.07;
    const glideAlt = 40 + distToTarget * slope;
    const lineRate = slope * flight.speed * 1.68781 * 60;
    if (distToTarget > 300) {
      desiredVs = clamp(-lineRate + (glideAlt - flight.y) * 6.0, -1800, 800);
    } else {
      desiredVs = -400;
    }
  }
  // Pitch from the vertical speed we want: vs = speed * KT * sin(pitch) * 60.
  const vsPerSin = Math.max(3000, flight.speed * 1.68781 * 60);
  const sinPitch = clamp(desiredVs / vsPerSin, -0.24, 0.24);
  out.pitch = clamp(Math.asin(sinPitch) / (14 * (Math.PI / 180)), -1, 1);

  // Gear and flaps come out on final, once each.
  if (target.kind === 'runway' && distToTarget < 6000 && flight.y < 1600 && !pilot.gearSet && !flight.gear) {
    out.gear = true;
    pilot.gearSet = true;
  }
  if (target.kind === 'runway' && distToTarget < 4000 && flight.y < 1300 && !pilot.flapsSet && !flight.flaps) {
    out.flaps = true;
    pilot.flapsSet = true;
  }
  return out;
}

const PLAY_STOP_Z = 27000; // stop 1000 ft short of leg 6's last ring, so the ring reads big above the jet
const STORM_STOP_Z = 19000; // stop mid-storm, by the third ring
const END_LIMIT_SECONDS = 900;

/**
 * Set `world` to the named scene (play, landing, storm or end; any other name is the title)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  const pilot = createAutopilot();

  if (name !== 'play' && name !== 'landing' && name !== 'storm' && name !== 'end') {
    return { screen: SCREEN_TITLE, best: 0 };
  }

  if (name === 'play') {
    // Golden-hour finale: fly leg 6 until the last ring is close, banking through the tower canyon.
    resetWorld(world);
    startLeg(world, 5);
    for (let i = 0; i < 60000; i += 1) {
      const events = stepWorld(world, autopilotControls(world, pilot), STEP);
      if (events.crashed || events.legDone) break;
      if (world.flight.z >= PLAY_STOP_Z) break;
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }

  if (name === 'landing') {
    // Dusk city hop: fly leg 2 all the way to the runway, and catch the jet just past the
    // threshold on rollout — gear down, flaps down, the runway filling the lower frame.
    resetWorld(world);
    startLeg(world, 1);
    for (let i = 0; i < 60000; i += 1) {
      const events = stepWorld(world, autopilotControls(world, pilot), STEP);
      if (events.crashed || events.legDone) break;
      const f = world.flight;
      if (world.phase === 'rollout' && f.z >= world.leg.length + 300) break;
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }

  if (name === 'storm') {
    // Storm front: fly leg 4 into the weather, rings and lightning around the jet.
    resetWorld(world);
    startLeg(world, 3);
    for (let i = 0; i < 60000; i += 1) {
      const events = stepWorld(world, autopilotControls(world, pilot), STEP);
      if (events.crashed || events.legDone) break;
      if (world.flight.z >= STORM_STOP_Z) break;
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }

  // The flight log: fly the whole route, leg by leg, and show what it added up to.
  resetWorld(world);
  for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
    const events = stepWorld(world, autopilotControls(world, pilot), STEP);
    if (world.finished || events.crashed) break;
  }
  return { screen: world.finished ? SCREEN_RESULTS : SCREEN_OVER, best: world.score };
}
