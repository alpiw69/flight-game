// The chase camera: a hand-rolled perspective projection from the world (feet, +z along the
// route) to the screen. The camera sits behind and above the jet, looks along the heading,
// and never fights the pilot — it follows the jet's position and heading, smoothed.

import { FIELD, FOCAL, HORIZON_Y } from './config.js';

const DEG = Math.PI / 180;

/** Camera state, kept between frames so it glides instead of snapping. */
export function createCamera() {
  return { x: 0, y: 0, z: 0, heading: 0, shake: 0 };
}

/**
 * Chase the jet: the camera trails behind it by `distance` feet and `height` feet above it,
 * easing toward the jet's heading so a turn sweeps the view around smoothly.
 */
export function updateCamera(camera, flight, dt, distance, height) {
  const behind = distance;
  const targetX = flight.x - Math.sin(flight.heading) * behind;
  const targetZ = flight.z - Math.cos(flight.heading) * behind;
  const targetY = flight.y + height;
  const ease = Math.min(1, dt * 4.5);
  camera.x += (targetX - camera.x) * ease;
  camera.y += (targetY - camera.y) * ease;
  camera.z += (targetZ - camera.z) * ease;
  // Heading eases slower than position: the camera lags a turn, then settles behind the jet.
  let diff = flight.heading - camera.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  camera.heading += diff * Math.min(1, dt * 2.2);
}

/**
 * Project a world point to screen space. Returns { x, y, scale, depth } or null when the
 * point is behind the camera. scale is FOCAL / depth: multiply a world size in feet by it
 * to get its size in pixels.
 */
export function project(camera, px, py, pz) {
  const dx = px - camera.x;
  const dy = py - camera.y;
  const dz = pz - camera.z;
  const sin = Math.sin(camera.heading);
  const cos = Math.cos(camera.heading);
  const depth = dx * sin + dz * cos;
  if (depth < 60) return null;
  const lateral = dx * cos - dz * sin;
  const scale = FOCAL / depth;
  return {
    x: FIELD.width / 2 + lateral * scale + (camera.shake ? (Math.sin(camera.shake * 91) * 1.5) : 0),
    y: HORIZON_Y - dy * scale,
    scale,
    depth,
  };
}

/** Project a flat ground point (y = 0) — the ground, a river, a runway strip. */
export function projectGround(camera, px, pz) {
  return project(camera, px, 0, pz);
}

/** The screen position of the sun or moon for this sky, as a fraction of the field. */
export function skyBodyPosition(sky) {
  return { x: FIELD.width * sky.sunX, y: FIELD.height * sky.sunY };
}

export { DEG };
