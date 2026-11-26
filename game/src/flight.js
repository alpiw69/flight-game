// The flight model: one modern regional jet, flown by pitch, bank and throttle. All speeds in
// knots, altitudes in feet, angles in degrees. The world calls stepFlight once per fixed step
// with the pilot's controls; the plane answers with how it actually flies, including the
// stall, the flare and the fuel burn.

import { KT, PLANE } from './config.js';

const DEG = Math.PI / 180;

/** A fresh jet, sitting on the departure runway ready to roll. */
export function createFlightState(leg) {
  return {
    x: 0,
    y: 40,
    z: -2600,
    heading: 0,
    pitch: 0,
    roll: 0,
    speed: 0,
    throttle: 0,
    vs: 0,
    fuel: PLANE.fuelStart,
    damage: 0,
    flaps: false,
    gear: true,
    brake: false,
    onGround: true,
    airborne: false,
    // True once the wheels leave the runway; used for the rotate cue.
    rotated: false,
  };
}

/**
 * Advance the jet one step. controls: { pitch (-1..1, + is climb), bank (-1..1),
 * throttleDelta (-1..1), gustPitch, gustBank } in degrees of disturbance. weather is the
 * leg's weather (only its gust strength is read here). Returns nothing; the state is updated.
 */
export function stepFlight(state, controls, dt, weather) {
  // Throttle answers the lever; an empty tank answers nothing.
  if (state.fuel > 0) {
    state.throttle = clamp(state.throttle + controls.throttleDelta * dt * 0.55, 0, 1);
  } else {
    state.throttle = 0;
  }

  // Speed chases the throttle, slower with flaps and gear out, slower still in a climb.
  const drag = (state.flaps ? 0.8 : 1) * (state.gear ? 0.88 : 1);
  const target = PLANE.stallSpeed + state.throttle * (PLANE.maxSpeed - PLANE.stallSpeed) * drag;
  let speed = state.speed + (target - state.speed) * Math.min(1, dt * 0.35);
  speed += (state.pitch < 0 ? 16 : 0) * dt;
  speed -= (state.pitch > 0 ? 9 : 0) * dt;
  state.speed = Math.max(0, speed);

  const stalled = state.speed < PLANE.stallSpeed && !state.onGround;

  // Pitch and bank chase the stick, with the gust shaking them. A stalled wing drops the nose.
  const pitchTarget = stalled
    ? -6
    : controls.pitch * PLANE.maxPitch + (controls.gustPitch || 0);
  const bankTarget = controls.bank * PLANE.maxBank + (controls.gustBank || 0);
  state.pitch = approach(state.pitch, clamp(pitchTarget, -PLANE.maxPitch - 4, PLANE.maxPitch + 4), 26 * dt);
  state.roll = approach(state.roll, clamp(bankTarget, -PLANE.maxBank - 6, PLANE.maxBank + 6), 65 * dt);

  // A banked wing turns the nose: heading follows the roll.
  const turnRate = state.roll * 0.32 * (state.speed / 240);
  state.heading += turnRate * DEG * dt;

  // Vertical speed is the speed times the climb angle.
  state.vs = state.speed * KT * Math.sin(state.pitch * DEG) * 60;

  if (state.onGround) {
    // On the runway the jet rolls: it lifts off past rotation speed with the nose up.
    state.vs = 0;
    if (state.speed > 125 && state.pitch > 4) {
      state.onGround = false;
      state.airborne = true;
      state.rotated = true;
    }
  } else {
    state.y += (state.vs / 60) * dt;
  }

  // Forward motion, along the heading.
  const forward = state.speed * KT * Math.cos(state.pitch * DEG);
  state.x += forward * Math.sin(state.heading) * dt;
  state.z += forward * Math.cos(state.heading) * dt;

  // Fuel burns with the throttle; flaps cost a little more.
  const burn = PLANE.burnIdle + state.throttle * (PLANE.burnFull - PLANE.burnIdle);
  state.fuel = Math.max(0, state.fuel - burn * (state.flaps ? 1.12 : 1) * dt);
}

function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

function approach(value, target, step) {
  if (value < target) return Math.min(target, value + step);
  if (value > target) return Math.max(target, value - step);
  return value;
}
