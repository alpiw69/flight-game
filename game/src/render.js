// The renderer: every pixel of MERIDIAN SKY. A hand-rolled chase view — sky, a coastal
// city, runway and rings projected from the world, a vector-drawn modern regional jet, and a
// glass-cockpit HUD — plus the title, pause, flight-log and game-over screens.

import { FIELD, FONT, FOCAL, HORIZON_Y, LIVERY, SKIES } from './config.js';
import { CITY, coastX } from './city.js';
import { AIRPORTS } from './legs.js';
import { createCamera, project, skyBodyPosition, updateCamera } from './project.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;
export const SCREEN_RESULTS = 4;

const W = FIELD.width;
const H = FIELD.height;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const camera = createCamera();
  let snapped = false;

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = canvas.clientWidth || W;
    const ch = canvas.clientHeight || H;
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
    }
    ctx.setTransform((canvas.width / W), 0, 0, (canvas.height / H), 0, 0);
  }

  /** Put the camera straight behind the jet (used before a screenshot paint). */
  function snapCamera(world) {
    const f = world.flight;
    camera.x = f.x - Math.sin(f.heading) * 800;
    camera.z = f.z - Math.cos(f.heading) * 800;
    camera.y = f.y + 160;
    camera.heading = f.heading;
    camera.shake = 0;
    snapped = true;
  }

  function draw(world, screen, best, dt) {
    fit();
    CTX = ctx;
    CAMERA = camera;
    if (!snapped) { snapCamera(world); snapped = true; }
    if (screen === SCREEN_PLAY || screen === SCREEN_TITLE) {
      updateCamera(camera, world.flight, dt, 800, 160);
    }
    drawSky(world);
    drawGround(world);
    drawBlockPads(world);
    drawStreets(world);
    drawCityBlocks(world);
    drawClouds(world);
    drawSun(world);
    drawRunways(world);
    drawDropTarget(world);
    drawCrate(world);
    drawRings(world);
    drawJetShadow(world);
    drawJet(world);
    drawWeather(world);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(world, best);
    if (screen === SCREEN_TITLE) drawTitle(world, best);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawGameOver(world, best);
    else if (screen === SCREEN_RESULTS) drawFlightLog(world, best);
  }

  return { draw, snapCamera };
}

// ---------- helpers ----------

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, w, h) {
  rr(ctx, x, y, w, h, 8);
  ctx.fillStyle = 'rgba(6,14,24,0.58)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = 600) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

/** Text with a dark outline, so it reads over bright sky or sea. */
function outlineText(ctx, str, x, y, size, color, align = 'left', weight = 600) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(4,10,20,0.65)';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function hash(n) {
  let h = (n * 2654435761) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/** Darken (f < 1) or lighten (f > 1) a #rrggbb colour. */
function shade(hex, f) {
  const r = Math.min(255, Math.round(parseInt(hex.slice(1, 3), 16) * f));
  const g = Math.min(255, Math.round(parseInt(hex.slice(3, 5), 16) * f));
  const b = Math.min(255, Math.round(parseInt(hex.slice(5, 7), 16) * f));
  return `rgb(${r},${g},${b})`;
}

/** How bright the scenery's colours are for this sky: night and storm mute them. */
function toneFor(skyName) {
  if (skyName === 'night') return 0.45;
  if (skyName === 'storm') return 0.72;
  return 1;
}

/** Fill a ground-level quad from four (x, z) world corners. */
function groundQuad(x1, z1, x2, z2, x3, z3, x4, z4, fill) {
  const ctx = CTX;
  const p1 = projectGround(CAMERA, x1, z1);
  const p2 = projectGround(CAMERA, x2, z2);
  const p3 = projectGround(CAMERA, x3, z3);
  const p4 = projectGround(CAMERA, x4, z4);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
  ctx.closePath(); ctx.fill();
}

// ---------- sky, sea, clouds ----------

function drawSky(world) {
  const sky = SKIES[world.leg.sky];
  const g = ctx2().createLinearGradient(0, 0, 0, HORIZON_Y + 40);
  g.addColorStop(0, sky.top);
  g.addColorStop(0.55, sky.mid);
  g.addColorStop(1, sky.low);
  ctx2().fillStyle = g;
  ctx2().fillRect(0, 0, W, HORIZON_Y + 40);
  // Stars at night.
  if (sky.night) {
    ctx2().fillStyle = '#ffffff';
    for (let i = 0; i < 90; i += 1) {
      const x = hash(i * 7 + 1) * W;
      const y = hash(i * 13 + 2) * HORIZON_Y * 0.8;
      ctx2().globalAlpha = 0.35 + hash(i * 3 + 5) * 0.6;
      ctx2().fillRect(x, y, 1.6, 1.6);
    }
    ctx2().globalAlpha = 1;
  }
  // Haze band at the horizon.
  ctx2().fillStyle = sky.haze;
  ctx2().fillRect(0, HORIZON_Y - 26, W, 52);
}

// The sun (or moon) draws after the clouds, so no cloud can smudge it.
function drawSun(world) {
  const ctx = CTX;
  const sky = SKIES[world.leg.sky];
  const body = skyBodyPosition(sky);
  const glow = ctx.createRadialGradient(body.x, body.y, 4, body.x, body.y, 120);
  glow.addColorStop(0, sky.sun);
  glow.addColorStop(0.25, sky.sun + '55');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(body.x - 130, body.y - 130, 260, 260);
  ctx.fillStyle = sky.sun;
  ctx.beginPath();
  ctx.arc(body.x, body.y, sky.night ? 22 : 30, 0, Math.PI * 2);
  ctx.fill();
}

// The renderer's context is kept on the module so the small draw functions stay short.
let CTX = null;
function ctx2() {
  return CTX;
}

/** Depth of a world point in front of the camera (negative means behind it). */
function groundDepth(cam, x, z) {
  return (x - cam.x) * Math.sin(cam.heading) + (z - cam.z) * Math.cos(cam.heading);
}

/**
 * Project a ground point (y = 0). Points behind the camera are pulled to just in front of
 * it along the view direction, so ground that runs under the camera — the sea, the streets
 * — fills to the bottom of the frame instead of vanishing. Callers skip quads that lie
 * entirely behind the camera first.
 */
function projectGround(cam, x, z) {
  let dx = x - cam.x;
  let dz = z - cam.z;
  const sin = Math.sin(cam.heading);
  const cos = Math.cos(cam.heading);
  let depth = dx * sin + dz * cos;
  if (depth < 60) {
    const push = 60 - depth;
    dx += sin * push;
    dz += cos * push;
    depth = 60;
  }
  const lateral = dx * cos - dz * sin;
  const scale = FOCAL / depth;
  return { x: W / 2 + lateral * scale, y: HORIZON_Y + cam.y * scale, scale, depth };
}

/**
 * The ground: the city land, the sea along the left coast, and the river with its bridges.
 * Water is always blue with a sun glint — never a flat brown fill.
 */
function drawGround(world) {
  const ctx = CTX;
  const sky = SKIES[world.leg.sky];
  const layout = world.city;
  const cam = CAMERA;
  // The land itself: a hazy gradient from the horizon down to the camera.
  const g = ctx.createLinearGradient(0, HORIZON_Y, 0, H);
  g.addColorStop(0, sky.landTop);
  g.addColorStop(1, sky.landBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, HORIZON_Y, W, H - HORIZON_Y);
  // The coast: the sea, turquoise shallows, wet and dry sand, a boardwalk and wave foam —
  // all following the bay as it curves into the city, in strips so they follow the ground.
  const seaGrad = ctx.createLinearGradient(0, HORIZON_Y, 0, H);
  seaGrad.addColorStop(0, sky.seaTop);
  seaGrad.addColorStop(1, sky.seaBottom);
  const tone = toneFor(world.leg.sky);
  const bay = layout.bay;
  const zStart = Math.floor((cam.z - 1000) / 1000) * 1000;
  for (let z = zStart; z < layout.length + 4000; z += 1000) {
    if (groundDepth(cam, 0, z + 1000) < 60) continue;
    const c0 = coastX(bay, z);
    const c1 = coastX(bay, z + 1000);
    // Deep sea, out to the horizon.
    groundQuad(-22000, z, c0 - 700, z, c1 - 700, z + 1000, -22000, z + 1000, seaGrad);
    // Turquoise shallows hugging the shore.
    groundQuad(c0 - 700, z, c0, z, c1, z + 1000, c0 - 700, z + 1000, shade(sky.seaTop, 1.45 * tone));
    // Wet sand, then dry sand.
    groundQuad(c0, z, c0 + 90, z, c1 + 90, z + 1000, c0, z + 1000, shade('#b89a6a', tone));
    groundQuad(c0 + 90, z, c0 + CITY.sandWidth, z, c1 + CITY.sandWidth, z + 1000, c0 + 90, z + 1000, shade('#e0c896', tone));
    // Boardwalk where the bay curves in.
    if (c0 > CITY.seaX + 1500 || c1 > CITY.seaX + 1500) {
      groundQuad(c0 + CITY.sandWidth, z, c0 + CITY.sandWidth + CITY.boardwalkWidth, z, c1 + CITY.sandWidth + CITY.boardwalkWidth, z + 1000, c0 + CITY.sandWidth, z + 1000, shade('#8a6a4a', tone));
    }
    // Wave foam along the waterline.
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    for (const off of [-120, 10]) {
      const f1 = projectGround(cam, c0 + off, z + 120);
      const f2 = projectGround(cam, c1 + off, z + 880);
      ctx.beginPath();
      ctx.moveTo(f1.x, f1.y);
      ctx.lineTo(f2.x, f2.y);
      ctx.stroke();
    }
  }
  // Beach umbrellas: small coloured dots on the sand where the bay is wide.
  for (let z = bay.z - bay.width; z <= bay.z + bay.width; z += 350) {
    const coast = coastX(bay, z);
    if (coast < CITY.seaX + 1500) continue;
    for (let i = 0; i < 3; i += 1) {
      const ux = coast + 130 + hash(i * 7 + z) * 170;
      const uz = z + hash(i * 11 + z * 3) * 300;
      const p = projectGround(cam, ux, uz);
      if (p.y < HORIZON_Y || p.x < -10 || p.x > W + 10) continue;
      ctx.fillStyle = shade(['#e84a4a', '#f2c230', '#3a9ad9', '#f28a2e'][Math.floor(hash(i * 5 + z) * 4)], tone);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Marina: a wooden pier reaching into the bay, and the boats moored in it.
  const pz = bay.z;
  const pc = coastX(bay, pz);
  groundQuad(pc - 900, pz - 60, pc, pz - 60, pc, pz + 60, pc - 900, pz + 60, shade('#8a6a4a', tone));
  for (const boat of layout.boats) {
    const p = project(CAMERA, boat.x, 0, boat.z);
    if (!p) continue;
    const s = Math.max(0.5, 60 * p.scale);
    if (s < 2) continue;
    ctx.fillStyle = shade('#f4f7fa', tone);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, s, s * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = shade('#5a6068', tone);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, p.y - s * 1.6);
    ctx.stroke();
    ctx.fillStyle = shade(boat.sail, tone);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - s * 1.6);
    ctx.lineTo(p.x + s * 0.9, p.y);
    ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fill();
  }
  // The river: a blue band across the route, with a sun glint and wave strokes.
  const rz = layout.riverZ;
  if (groundDepth(cam, 0, rz + 600) >= 60) {
    const r1 = projectGround(cam, -22000, rz - 600);
    const r2 = projectGround(cam, 14000, rz - 600);
    const r3 = projectGround(cam, 14000, rz + 600);
    const r4 = projectGround(cam, -22000, rz + 600);
    ctx.fillStyle = seaGrad;
    ctx.beginPath();
    ctx.moveTo(r1.x, r1.y); ctx.lineTo(r2.x, r2.y); ctx.lineTo(r3.x, r3.y); ctx.lineTo(r4.x, r4.y);
    ctx.closePath(); ctx.fill();
    // Sun glint on the river, clipped to the water.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(r1.x, r1.y); ctx.lineTo(r2.x, r2.y); ctx.lineTo(r3.x, r3.y); ctx.lineTo(r4.x, r4.y);
    ctx.closePath(); ctx.clip();
    const body = skyBodyPosition(sky);
    const glint = ctx.createLinearGradient(0, HORIZON_Y, 0, H);
    glint.addColorStop(0, 'rgba(255,240,200,0.4)');
    glint.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = glint;
    ctx.beginPath();
    ctx.moveTo(body.x - 26, HORIZON_Y);
    ctx.lineTo(body.x + 26, HORIZON_Y);
    ctx.lineTo(body.x + 130, H);
    ctx.lineTo(body.x - 130, H);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // Wave strokes on the river.
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 10; i += 1) {
      const wx = -12000 + hash(i * 7 + 2) * 24000;
      const wz = rz - 400 + hash(i * 11 + 4) * 800;
      const p = projectGround(cam, wx, wz);
      ctx.beginPath();
      ctx.moveTo(p.x - 22, p.y);
      ctx.lineTo(p.x + 22, p.y);
      ctx.stroke();
    }
    // Bridges: two road decks over the river.
    for (const bx of [-2600, 2600]) {
      const b1 = project(CAMERA, bx - 110, 60, rz - 700);
      const b2 = project(CAMERA, bx + 110, 60, rz - 700);
      const b3 = project(CAMERA, bx + 110, 60, rz + 700);
      const b4 = project(CAMERA, bx - 110, 60, rz + 700);
      if (!b1 || !b2 || !b3 || !b4) continue;
      ctx.fillStyle = sky.night ? '#2c3340' : '#4a5058';
      ctx.beginPath();
      ctx.moveTo(b1.x, b1.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(b3.x, b3.y); ctx.lineTo(b4.x, b4.y);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = sky.night ? '#ffd27a' : '#e8ecf0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo((b1.x + b4.x) / 2, (b1.y + b4.y) / 2);
      ctx.lineTo((b2.x + b3.x) / 2, (b2.y + b3.y) / 2);
      ctx.stroke();
    }
  }
}

/** The block floors: every city block gets a tinted pad the streets run between, so no
 *  bare ground shows anywhere in the city. */
function drawBlockPads(world) {
  const ctx = CTX;
  const cam = CAMERA;
  const layout = world.city;
  const tone = toneFor(world.leg.sky);
  const sin = Math.sin(cam.heading);
  const cos = Math.cos(cam.heading);
  for (const pad of layout.pads) {
    const dx = pad.x - cam.x;
    const dz = pad.z - cam.z;
    const depth = dx * sin + dz * cos;
    if (depth < 200 || depth > 26000) continue;
    const lateral = dx * cos - dz * sin;
    if (Math.abs(lateral) > depth * 0.85 + 600) continue;
    if (pad.w * (FOCAL / depth) < 3) continue;
    const x0 = pad.x - pad.w / 2;
    const x1 = pad.x + pad.w / 2;
    const z0 = pad.z - pad.d / 2;
    const z1 = pad.z + pad.d / 2;
    const p1 = projectGround(cam, x0, z0);
    const p2 = projectGround(cam, x1, z0);
    const p3 = projectGround(cam, x1, z1);
    const p4 = projectGround(cam, x0, z1);
    ctx.fillStyle = shade(pad.color, tone);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
    ctx.closePath(); ctx.fill();
  }
}

function drawClouds(world) {
  const ctx = CTX;
  const sky = SKIES[world.leg.sky];
  const sorted = [...world.clouds].sort((a, b) => b.z - a.z);
  for (const cloud of sorted) {
    const p = project(currentCamera(), cloud.x, cloud.y, cloud.z);
    if (!p) continue;
    const s = cloud.scale * p.scale;
    if (s < 4) continue;
    const shade = cloud.shade;
    ctx.fillStyle = shade > 0.6 ? sky.cloudShadow : sky.cloud;
    ctx.globalAlpha = sky.night ? 0.55 : 0.85;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, s, s * 0.34, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x - s * 0.55, p.y + s * 0.08, s * 0.6, s * 0.26, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x + s * 0.55, p.y + s * 0.08, s * 0.6, s * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// The camera the projection uses; set by draw() before any world drawing.
let CAMERA = null;
function currentCamera() {
  return CAMERA;
}

/** The street network: dark asphalt lines in the gaps between block pads, cross streets
 *  every second block, and two diagonal avenues so the city is not one rigid square.
 *  Every line breaks where the bay or the river cuts in. */
function drawStreets(world) {
  const ctx = CTX;
  const layout = world.city;
  const cam = CAMERA;
  const night = SKIES[world.leg.sky].night;
  const bay = layout.bay;
  ctx.strokeStyle = night ? 'rgba(255,200,110,0.20)' : 'rgba(30,32,38,0.45)';
  ctx.lineWidth = 2;
  // Longitudinal streets, running the length of the route.
  for (let k = -27; k <= 27; k += 1) {
    const x = k * CITY.block;
    if (Math.abs(x) < CITY.corridorHalf) continue;
    ctx.beginPath();
    let started = false;
    for (let z = Math.max(CITY.zMin, Math.floor(cam.z / 1000) * 1000); z <= layout.length + 4000; z += 1000) {
      if (x < coastX(bay, z) + 100) { started = false; continue; }
      const p = projectGround(cam, x, z);
      if (!started) { ctx.moveTo(p.x, p.y); started = true; }
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  // Cross streets, one line across the city every second block.
  for (let z = 0; z <= layout.length + 4000; z += CITY.block * 2) {
    if (groundDepth(cam, 0, z) < 60) continue;
    ctx.beginPath();
    let started = false;
    for (let x = -CITY.halfWidth; x <= CITY.halfWidth; x += 2000) {
      if (x < coastX(bay, z) + 100) { started = false; continue; }
      const p = project(CAMERA, x, 0, z);
      if (!p) continue;
      if (!started) { ctx.moveTo(p.x, p.y); started = true; }
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  // Two diagonal avenues, crossing the grid.
  ctx.lineWidth = 3;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    let started = false;
    for (let t = 0; t <= 1.001; t += 0.05) {
      const x = dir * (-8000 + t * 16000);
      const z = 6000 + t * 30000;
      if (x < coastX(bay, z) + 100 || Math.abs(z - layout.riverZ) < 700) { started = false; continue; }
      const p = projectGround(cam, x, z);
      if (!started) { ctx.moveTo(p.x, p.y); started = true; }
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
}

/** One building, drawn as a solid: ground shadow, coloured walls with windows, a side wall
 *  on the camera's side, and a roof that is coloured, pitched or glass — never a plain
 *  white box. */
function drawBuilding(b, night, tone, sunLeft) {
  const ctx = CTX;
  const cam = CAMERA;
  const fz = b.z - b.d / 2;
  const bz = b.z + b.d / 2;
  const a = project(cam, b.x - b.w / 2, 0, fz);
  const c = project(cam, b.x + b.w / 2, b.h, fz);
  if (!a || !c) return;
  const wpx = c.x - a.x;
  const hpx = a.y - c.y;
  if (wpx < 2.5 || hpx < 2) return;
  const wall = shade(b.wall, tone);
  const wallDark = shade(b.wall, tone * 0.72);
  const roof = shade(b.roof, tone);
  const roofDark = shade(b.roof, tone * 0.7);
  // Ground shadow, offset down-right, longer for taller buildings.
  if (b.h > 90 && wpx > 8) {
    const sx = 60 + b.h * 0.35;
    const sz = 40 + b.h * 0.25;
    const s1 = projectGround(cam, b.x - b.w / 2 + sx, fz + sz);
    const s2 = projectGround(cam, b.x + b.w / 2 + sx, fz + sz);
    const s3 = projectGround(cam, b.x + b.w / 2 + sx, bz + sz);
    const s4 = projectGround(cam, b.x - b.w / 2 + sx, bz + sz);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y); ctx.lineTo(s3.x, s3.y); ctx.lineTo(s4.x, s4.y);
    ctx.closePath(); ctx.fill();
  }
  // Side wall: the face on the camera's side of the building, so it reads as a solid.
  const sideX = cam.x < b.x ? b.x - b.w / 2 : b.x + b.w / 2;
  if (wpx > 6 && hpx > 6) {
    const q1 = project(cam, sideX, 0, fz);
    const q2 = project(cam, sideX, 0, bz);
    const q3 = project(cam, sideX, b.h, bz);
    const q4 = project(cam, sideX, b.h, fz);
    if (q1 && q2 && q3 && q4 && Math.abs(q2.x - q1.x) > 6) {
      const sideFacesSun = (sideX < b.x) === sunLeft;
      ctx.fillStyle = sideFacesSun ? wall : wallDark;
      ctx.beginPath();
      ctx.moveTo(q1.x, q1.y); ctx.lineTo(q2.x, q2.y); ctx.lineTo(q3.x, q3.y); ctx.lineTo(q4.x, q4.y);
      ctx.closePath(); ctx.fill();
      // Windows on the side wall, when it is big enough to read.
      if (hpx > 30) {
        const cols = Math.max(2, Math.min(6, Math.floor(Math.abs(q2.x - q1.x) / 14)));
        const rows = Math.max(2, Math.min(8, Math.floor(hpx / 18)));
        for (let i = 0; i < cols; i += 1) {
          for (let j = 0; j < rows; j += 1) {
            if (hash(b.x * 7 + b.z * 13 + i * 3 + j * 11) < (night ? 0.65 : 0.5)) continue;
            const t = (i + 0.5) / cols;
            const u = (j + 0.5) / rows;
            const wx = (1 - t) * (1 - u) * q1.x + t * (1 - u) * q2.x + t * u * q3.x + (1 - t) * u * q4.x;
            const wy = (1 - t) * (1 - u) * q1.y + t * (1 - u) * q2.y + t * u * q3.y + (1 - t) * u * q4.y;
            ctx.fillStyle = night ? '#ffd27a' : 'rgba(40,60,80,0.55)';
            ctx.fillRect(wx - 1.5, wy - 1.5, 3, 3);
          }
        }
      }
    }
  }
  // Front face.
  if (b.glass) {
    const g = ctx.createLinearGradient(a.x, c.y, a.x, a.y);
    g.addColorStop(0, shade('#7db8d9', tone));
    g.addColorStop(1, shade('#2c5a7a', tone));
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = wall;
  }
  ctx.fillRect(a.x, c.y, wpx, hpx);
  // Windows on the front face.
  if (wpx > 20 && hpx > 28) {
    const cols = Math.max(2, Math.min(8, Math.floor(wpx / 16)));
    const rows = Math.max(2, Math.min(10, Math.floor(hpx / 16)));
    for (let i = 0; i < cols; i += 1) {
      for (let j = 0; j < rows; j += 1) {
        const lit = hash(b.x * 5 + b.z * 7 + i * 3 + j * 13) > 0.45;
        if (!lit && !b.glass) continue;
        const px = a.x + 4 + ((i + 0.5) * (wpx - 8)) / cols;
        const py = c.y + 5 + ((j + 0.5) * (hpx - 10)) / rows;
        if (night || b.glass) {
          ctx.fillStyle = night ? '#ffd27a' : 'rgba(220,240,255,0.75)';
          ctx.globalAlpha = night ? 0.5 + hash(b.x + i * 5 + j * 7) * 0.5 : 0.8;
          ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = 'rgba(40,60,80,0.5)';
          ctx.fillRect(px - 1.5, py - 2, 3, 4);
        }
      }
    }
  }
  // Glass towers: vertical mullion stripes.
  if (b.glass && wpx > 12) {
    ctx.strokeStyle = 'rgba(220,240,255,0.35)';
    ctx.lineWidth = 1;
    for (let x = a.x + 8; x < a.x + wpx - 4; x += 10) {
      ctx.beginPath(); ctx.moveTo(x, c.y); ctx.lineTo(x, a.y); ctx.stroke();
    }
  }
  // Roof: pitched, flat with a parapet, or glass.
  const ridgeH = b.pitched ? Math.min(55, b.w * 0.16) : 0;
  if (b.pitched) {
    const apex = project(cam, b.x, b.h + ridgeH, fz);
    const ap = project(cam, b.x, b.h + ridgeH, bz);
    const t1 = project(cam, b.x - b.w / 2, b.h, fz);
    const t2 = project(cam, b.x + b.w / 2, b.h, fz);
    const t3 = project(cam, b.x + b.w / 2, b.h, bz);
    const t4 = project(cam, b.x - b.w / 2, b.h, bz);
    if (t1 && t2 && t3 && t4 && apex && ap) {
      // Two slopes, the sunlit one brighter; the gable triangle on the front face.
      ctx.fillStyle = sunLeft ? roof : roofDark;
      ctx.beginPath(); ctx.moveTo(t1.x, t1.y); ctx.lineTo(apex.x, apex.y); ctx.lineTo(ap.x, ap.y); ctx.lineTo(t4.x, t4.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = sunLeft ? roofDark : roof;
      ctx.beginPath(); ctx.moveTo(apex.x, apex.y); ctx.lineTo(t2.x, t2.y); ctx.lineTo(t3.x, t3.y); ctx.lineTo(ap.x, ap.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = wallDark;
      ctx.beginPath(); ctx.moveTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y); ctx.lineTo(apex.x, apex.y); ctx.closePath(); ctx.fill();
    }
  } else if (hpx > 8) {
    const t1 = project(cam, b.x - b.w / 2, b.h, fz);
    const t2 = project(cam, b.x + b.w / 2, b.h, fz);
    const t3 = project(cam, b.x + b.w / 2, b.h, bz);
    const t4 = project(cam, b.x - b.w / 2, b.h, bz);
    if (t1 && t2 && t3 && t4) {
      ctx.fillStyle = b.glass ? shade('#1d3a52', tone) : roof;
      ctx.beginPath();
      ctx.moveTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y); ctx.lineTo(t3.x, t3.y); ctx.lineTo(t4.x, t4.y);
      ctx.closePath(); ctx.fill();
      // Parapet edge, and a roof detail or two on big flat roofs.
      ctx.strokeStyle = roofDark;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (wpx > 40 && hpx > 20) {
        ctx.fillStyle = roofDark;
        const ac = project(cam, b.x - b.w * 0.2, b.h, b.z);
        if (ac) ctx.fillRect(ac.x - 4, ac.y - 3, 8, 6);
      }
    }
  }
  if (b.cab) {
    ctx.fillStyle = night ? '#9fd8ff' : '#bfe3f2';
    ctx.fillRect(a.x, c.y, wpx, Math.max(2, hpx * 0.14));
  }
}

/** Terminal buildings and the control tower at both airports. */
function terminalBoxes(world) {
  const L = world.leg.length;
  return [
    { x: -450, z: L + 900, w: 520, d: 300, h: 90, roof: '#5d7d99', wall: '#d8d2c4', shade: 0.4, downtown: false, windows: false },
    { x: 450, z: L + 900, w: 520, d: 300, h: 90, roof: '#b85c3f', wall: '#d8d2c4', shade: 0.55, downtown: false, windows: false },
    { x: -450, z: L + 1500, w: 420, d: 250, h: 70, roof: '#5d7d99', wall: '#c8c2b4', shade: 0.5, downtown: false, windows: false },
    { x: 350, z: L + 1200, w: 70, d: 70, h: 300, roof: '#2c4a6e', wall: '#b8c4cc', shade: 0.6, downtown: false, windows: false, cab: true },
    { x: -450, z: -1400, w: 420, d: 260, h: 80, roof: '#5d7d99', wall: '#d8d2c4', shade: 0.45, downtown: false, windows: false },
    { x: 450, z: -1400, w: 420, d: 260, h: 80, roof: '#b85c3f', wall: '#d8d2c4', shade: 0.5, downtown: false, windows: false },
  ];
}

/** The buildings, far first so near ones paint over them. */
function drawBuildings(world, layout) {
  const cam = CAMERA;
  const sky = SKIES[world.leg.sky];
  const night = sky.night;
  const tone = toneFor(world.leg.sky);
  const sunLeft = sky.sunX < 0.5;
  const sin = Math.sin(cam.heading);
  const cos = Math.cos(cam.heading);
  for (const b of layout.buildings) {
    const dx = b.x - cam.x;
    const dz = b.z - cam.z;
    const depth = dx * sin + dz * cos;
    if (depth < 200 || depth > 26000) continue;
    const lateral = dx * cos - dz * sin;
    if (Math.abs(lateral) > depth * 0.85 + 600) continue;
    if (b.w * (FOCAL / depth) < 2.5) continue;
    drawBuilding(b, night, tone, sunLeft);
  }
  // The named towers (twin supertalls on the final leg) draw as glass towers too.
  for (const t of layout.towers) {
    drawBuilding({ x: t.x, z: t.z, w: t.w, d: t.d, h: t.h, roof: '#2c4a6e', wall: '#3a5a7a', glass: true, downtown: true, windows: true, pitched: false }, night, tone, sunLeft);
  }
}

/**
 * One garden: lawn patches, a pond, flower beds, a bandstand, paths and trees — a garden,
 * never a bare ellipse. Pocket gardens are the small version of the same thing.
 */
function drawGarden(world, g, tone) {
  const ctx = CTX;
  const sky = SKIES[world.leg.sky];
  const cam = CAMERA;
  if (groundDepth(cam, g.x, g.z + g.d / 2) < 60) return;
  const p1 = projectGround(cam, g.x - g.w / 2, g.z - g.d / 2);
  const p2 = projectGround(cam, g.x + g.w / 2, g.z - g.d / 2);
  const p3 = projectGround(cam, g.x + g.w / 2, g.z + g.d / 2);
  const p4 = projectGround(cam, g.x - g.w / 2, g.z + g.d / 2);
  // Lawn.
  ctx.fillStyle = shade(sky.night ? '#16241a' : '#4d8a48', tone);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
  ctx.closePath(); ctx.fill();
  // Lighter lawn patches.
  ctx.fillStyle = shade(sky.night ? '#1d3320' : '#5da254', tone);
  for (let i = 0; i < 4; i += 1) {
    const px = g.x - g.w / 2 + hash(i * 7 + 1 + Math.round(g.x / 100)) * g.w;
    const pz = g.z - g.d / 2 + hash(i * 11 + 3 + Math.round(g.z / 100)) * g.d;
    const pp = project(cam, px, 0, pz);
    if (!pp) continue;
    const r = 160 * pp.scale;
    if (r < 2) continue;
    ctx.beginPath(); ctx.ellipse(pp.x, pp.y, r, r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (!g.pocket) {
    // Pond, with a pale rim.
    const pond = project(cam, g.x + g.w * 0.22, 0, g.z - g.d * 0.2);
    if (pond) {
      const rx = 260 * pond.scale;
      if (rx >= 3) {
        ctx.fillStyle = shade(sky.night ? '#16283a' : '#4a9ac2', tone);
        ctx.beginPath(); ctx.ellipse(pond.x, pond.y, rx, rx * 0.42, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    // Flower beds: clusters of tiny coloured dots.
    const bedColors = ['#e85a5a', '#f2a0c0', '#ffd24a', '#e86aa0'];
    for (let i = 0; i < 36; i += 1) {
      const bx = g.x - g.w / 2 + hash(i * 13 + 2 + Math.round(g.x / 100)) * g.w;
      const bz = g.z - g.d / 2 + hash(i * 17 + 5 + Math.round(g.z / 100)) * g.d;
      const bp = project(cam, bx, 0, bz);
      if (!bp) continue;
      ctx.fillStyle = shade(bedColors[i % bedColors.length], tone);
      ctx.beginPath(); ctx.arc(bp.x, bp.y, 2, 0, Math.PI * 2); ctx.fill();
    }
    // Rotunda: a white bandstand with a terracotta roof at the centre.
    const rp = project(cam, g.x, 0, g.z);
    if (rp) {
      const rr = 90 * rp.scale;
      if (rr >= 3) {
        ctx.fillStyle = shade('#e8e2d4', tone);
        ctx.beginPath(); ctx.ellipse(rp.x, rp.y, rr, rr * 0.42, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = shade('#b85c3f', tone);
        ctx.beginPath(); ctx.ellipse(rp.x, rp.y - rr * 0.25, rr * 0.8, rr * 0.34, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  // Paths: a diagonal and a cross.
  ctx.strokeStyle = shade(sky.night ? '#3a3a30' : '#c9b183', tone);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y); ctx.lineTo(p3.x, p3.y);
  ctx.moveTo(p2.x, p2.y); ctx.lineTo(p4.x, p4.y);
  ctx.stroke();
  // Trees.
  const count = g.pocket ? 8 : 60;
  ctx.fillStyle = shade(sky.night ? '#0e1a10' : '#2a5a2a', tone);
  for (let i = 0; i < count; i += 1) {
    const tx = g.x - g.w / 2 + hash(i * 13 + 2 + Math.round(g.x / 100)) * g.w;
    const tz = g.z - g.d / 2 + hash(i * 17 + 5 + Math.round(g.z / 100)) * g.d;
    const tp = project(cam, tx, 0, tz);
    if (!tp) continue;
    const tr = 14 * tp.scale;
    if (tr < 1) continue;
    ctx.beginPath();
    ctx.arc(tp.x, tp.y, Math.min(tr, 4), 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * The city itself: the park and gardens, the stadium, the terminals and tower, the trees
 * and cars, the buildings, and the city's ground lights at night. No bare green ellipses
 * anywhere — every garden is a rectangle with paths, a pond, flower beds and trees, the
 * stadium is a concrete oval with a track and a field.
 */
function drawCityBlocks(world) {
  const ctx = CTX;
  const sky = SKIES[world.leg.sky];
  const layout = world.city;
  const cam = CAMERA;
  const tone = toneFor(world.leg.sky);
  // The park and every garden.
  for (const g of [layout.park, ...layout.gardens]) drawGarden(world, g, tone);
  // The stadium: a concrete oval with a running track and a green field.
  const st = layout.stadium;
  const sp = project(cam, st.x, 0, st.z);
  if (sp && groundDepth(cam, st.x, st.z) >= 60) {
    const rx = st.r * sp.scale;
    const rz = rx * 0.42;
    if (rx >= 4) {
      ctx.fillStyle = sky.night ? '#3a3f47' : '#d8dce0';
      ctx.beginPath(); ctx.ellipse(sp.x, sp.y, rx, rz, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = sky.night ? '#5a4632' : '#b08050';
      ctx.beginPath(); ctx.ellipse(sp.x, sp.y, rx * 0.8, rz * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = sky.night ? '#1d3a24' : '#3f7a3f';
      ctx.beginPath(); ctx.ellipse(sp.x, sp.y, rx * 0.6, rz * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(sp.x, sp.y, rx * 0.6, rz * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
  // Terminals and the control tower at the destination airport.
  for (const t of terminalBoxes(world)) drawBuilding(t, sky.night, toneFor(world.leg.sky), SKIES[world.leg.sky].sunX < 0.5);
  // Avenue trees and beach palms.
  for (const t of layout.trees) {
    const p = project(cam, t.x, 0, t.z);
    if (!p) continue;
    const r = t.r * p.scale;
    if (r < 1) continue;
    if (t.kind === 'palm') {
      ctx.fillStyle = shade('#8a6a4a', tone);
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, r * 0.25), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = shade('#2a7a3a', tone);
      ctx.beginPath(); ctx.arc(p.x, p.y - r * 0.4, Math.min(r, 5), 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = shade('#2a5a2a', tone);
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.min(r, 4.5), 0, Math.PI * 2); ctx.fill();
    }
  }
  // Lawn trees on the empty lots of the garden suburbs.
  for (const pad of layout.pads) {
    for (const t of pad.trees) {
      const p = project(cam, pad.x + t.dx, 0, pad.z + t.dz);
      if (!p) continue;
      const r = 12 * p.scale;
      if (r < 1) continue;
      ctx.fillStyle = shade('#2a5a2a', tone);
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.min(r, 4), 0, Math.PI * 2); ctx.fill();
    }
  }
  // Cars in the street gaps.
  for (const car of layout.cars) {
    const p = project(cam, car.x, 0, car.z);
    if (!p) continue;
    const s = 14 * p.scale;
    if (s < 2) continue;
    ctx.fillStyle = shade(car.color, tone);
    ctx.fillRect(p.x - s * 0.22, p.y - s / 2, s * 0.44, s);
    ctx.fillStyle = shade('#1c2733', tone);
    ctx.fillRect(p.x - s * 0.14, p.y - s * 0.2, s * 0.28, s * 0.4);
  }
  // The buildings.
  drawBuildings(world, layout);
  // Night: the city's ground lights.
  if (sky.night) {
    for (let i = 0; i < 42; i += 1) {
      const lx = -12000 + hash(i * 19 + 3) * 24000;
      const lz = Math.max(0, cam.z) + hash(i * 23 + 7) * 30000;
      const lp = project(cam, lx, 0, lz);
      if (!lp) continue;
      ctx.fillStyle = hash(i * 29 + 2) > 0.5 ? '#ffd27a' : '#fff3c4';
      ctx.globalAlpha = 0.4 + hash(i * 31 + 6) * 0.5;
      ctx.fillRect(lp.x, lp.y, 2.2, 2.2);
    }
    ctx.globalAlpha = 1;
  }
}

function drawRunwayStrip(ctx, z0, z1, night) {
  const half = 90;
  const corners = [
    project(CAMERA, -half, 40, z0),
    project(CAMERA, half, 40, z0),
    project(CAMERA, half, 40, z1),
    project(CAMERA, -half, 40, z1),
  ];
  if (corners.some((c) => c === null)) return;
  ctx.fillStyle = '#262a31';
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  ctx.lineTo(corners[1].x, corners[1].y);
  ctx.lineTo(corners[2].x, corners[2].y);
  ctx.lineTo(corners[3].x, corners[3].y);
  ctx.closePath();
  ctx.fill();
  // Edge lines and centreline dashes, segment by segment along the strip.
  ctx.strokeStyle = '#e8ecf0';
  ctx.lineWidth = 1.5;
  for (const side of [-half, half]) {
    ctx.beginPath();
    const a = project(CAMERA, side, 40, z0);
    const b = project(CAMERA, side, 40, z1);
    if (a && b) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
    ctx.stroke();
  }
  ctx.fillStyle = '#f4f7fa';
  for (let z = z0 + 200; z < z1 - 100; z += 400) {
    const a = project(CAMERA, -4, 40, z);
    const b = project(CAMERA, 4, 40, z + 220);
    if (!a || !b) continue;
    ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x) + 3, Math.abs(b.y - a.y) + 3);
  }
  // Threshold bars at the near end.
  for (let i = -3; i <= 3; i += 1) {
    const a = project(CAMERA, i * 22 - 8, 40, z0 + 40);
    const b = project(CAMERA, i * 22 + 8, 40, z0 + 220);
    if (!a || !b) continue;
    ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x) + 2, Math.abs(b.y - a.y) + 2);
  }
  // Runway numbers, painted to read from the approaching aircraft. Each digit is about
  // 30 ft tall, so the size follows the projection; too small to read, they are skipped.
  const numNear = project(CAMERA, 0, 42, z0 + 1200);
  if (numNear) {
    const size = 30 * numNear.scale;
    if (size >= 8) {
      ctx.save();
      ctx.translate(numNear.x, numNear.y);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#f4f7fa';
      ctx.font = `700 ${Math.min(size, 40)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('36', 0, 0);
      ctx.restore();
    }
  }
  const numFar = project(CAMERA, 0, 42, z1 - 600);
  if (numFar) {
    const size = 30 * numFar.scale;
    if (size >= 8) {
      ctx.save();
      ctx.translate(numFar.x, numFar.y);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#f4f7fa';
      ctx.font = `700 ${Math.min(size, 40)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('18', 0, 0);
      ctx.restore();
    }
  }
  // Edge lights: amber dots that glow after dark.
  for (let z = z0; z <= z1; z += 400) {
    for (const side of [-half - 8, half + 8]) {
      const p = project(CAMERA, side, 42, z);
      if (!p) continue;
      ctx.fillStyle = night ? '#ffb347' : '#8a94a0';
      if (night) {
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      }
    }
  }
}

function drawRunways(world) {
  const ctx = CTX;
  const night = SKIES[world.leg.sky].night;
  // Departure runway, behind the start line.
  drawRunwayStrip(ctx, -2600, 0, night);
  // Destination runway.
  drawRunwayStrip(ctx, world.leg.length, world.leg.length + 2600, night);
  // Approach lights reaching out before the threshold.
  for (let z = world.leg.length - 600; z < world.leg.length; z += 150) {
    const p = project(CAMERA, 0, 42, z);
    if (!p) continue;
    ctx.fillStyle = night ? '#ffffff' : '#dfe6ec';
    ctx.globalAlpha = night ? 0.95 : 0.6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, night ? 3 : 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // PAPI: four lights beside the threshold, two white two red on the glidepath.
  for (let i = 0; i < 4; i += 1) {
    const p = project(CAMERA, -130 - i * 22, 44, world.leg.length + 300);
    if (!p) continue;
    ctx.fillStyle = i < 2 ? '#ffffff' : '#ff3b30';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Taxiways: grey strips parallel to the destination runway.
  for (const side of [-1, 1]) {
    const corners = [
      project(CAMERA, side * 200, 41, world.leg.length),
      project(CAMERA, side * 280, 41, world.leg.length),
      project(CAMERA, side * 280, 41, world.leg.length + 700),
      project(CAMERA, side * 200, 41, world.leg.length + 700),
    ];
    if (corners.some((c) => c === null)) continue;
    ctx.fillStyle = '#3a3f46';
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    ctx.lineTo(corners[1].x, corners[1].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.lineTo(corners[3].x, corners[3].y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawDropTarget(world) {
  const ctx = CTX;
  const drop = world.drop;
  if (!drop || drop.scored) return;
  // A square plaza, drawn from its four corners so it lies flat on the ground.
  const r = drop.r;
  const corners = [
    project(CAMERA, drop.x - r, 4, drop.z - r),
    project(CAMERA, drop.x + r, 4, drop.z - r),
    project(CAMERA, drop.x + r, 4, drop.z + r),
    project(CAMERA, drop.x - r, 4, drop.z + r),
  ];
  if (corners.some((c) => c === null)) return;
  const p = project(CAMERA, drop.x, 4, drop.z);
  if (!p) return;
  const cx = p.x;
  const cy = p.y;
  const pulse = 1 + 0.12 * Math.sin(world.time * 3);
  ctx.strokeStyle = '#ff9a3d';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  corners.forEach((c, i) => {
    const x = cx + (c.x - cx) * pulse;
    const y = cy + (c.y - cy) * pulse;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy - 6);
  ctx.lineTo(cx + 10, cy + 6);
  ctx.moveTo(cx + 10, cy - 6);
  ctx.lineTo(cx - 10, cy + 6);
  ctx.stroke();
  const topY = Math.min(...corners.map((c) => c.y));
  text(ctx, 'DROP ZONE', cx, topY - 10, 15, '#ff9a3d', 'center', 700);
}

function drawCrate(world) {
  const ctx = CTX;
  const crate = world.crate;
  if (!crate || crate.timer <= 0) return;
  const p = project(CAMERA, crate.x, crate.y, crate.z);
  if (!p) return;
  const s = Math.max(0.4, 700 * p.scale / 100);
  if (!crate.landed) {
    // Orange parachute above the falling crate.
    ctx.fillStyle = '#ff7a2d';
    ctx.beginPath();
    ctx.arc(p.x, p.y - 16 * s, 14 * s, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x - 14 * s, p.y - 16 * s);
    ctx.lineTo(p.x, p.y);
    ctx.moveTo(p.x + 14 * s, p.y - 16 * s);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  ctx.fillStyle = '#b07a3d';
  ctx.fillRect(p.x - 7 * s, p.y - 6 * s, 14 * s, 12 * s);
  ctx.strokeStyle = '#6e4a1e';
  ctx.strokeRect(p.x - 7 * s, p.y - 6 * s, 14 * s, 12 * s);
}

function drawRings(world) {
  const ctx = CTX;
  for (const ring of world.rings) {
    const p = project(CAMERA, ring.x, ring.y, ring.z);
    if (!p) continue;
    const rx = ring.r * p.scale;
    const ry = rx * 0.92;
    if (rx < 12) continue;
    // Distant rings fade hard, so the next one reads clearly and the far ones stay quiet.
    const fade = Math.max(0.12, Math.min(1, 1.1 - p.depth / 7000));
    const color = ring.passed ? '#39d98a' : ring.missed ? '#ff6a5a' : '#37e0ff';
    ctx.globalAlpha = (ring.passed ? 0.55 : 0.95) * fade;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, rx * 0.08);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.35 * fade;
    ctx.lineWidth = Math.max(4, rx * 0.2);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = fade;
    // Chevrons pointing into the ring.
    ctx.fillStyle = '#ffffff';
    for (const a of [0.5, 2.6, 4.7]) {
      const cx = p.x + Math.cos(a) * rx * 0.72;
      const cy = p.y + Math.sin(a) * ry * 0.72;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 5);
      ctx.lineTo(cx + 5, cy + 4);
      ctx.lineTo(cx - 5, cy + 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawJetShadow(world) {
  const ctx = CTX;
  const f = world.flight;
  if (f.onGround) return;
  const ground = 0;
  const p = project(CAMERA, f.x, ground + 4, f.z);
  if (!p) return;
  const alt = Math.max(200, f.y);
  const s = Math.max(6, 32000 / alt);
  ctx.fillStyle = `rgba(0,0,0,${Math.min(0.3, 900 / alt)})`;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, s, s * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- the jet ----------

/**
 * The aircraft itself: a modern regional jet drawn in vector art — long sleek fuselage with
 * a metallic gradient, swept wings with winglets, a liveried tail fin, twin rear-mounted
 * engines with heat glow, a window row, nav lights and landing gear. It banks with the roll
 * and pitches with the climb, so it reads as a built aircraft, not a blob.
 */
function drawJet(world) {
  const ctx = CTX;
  const f = world.flight;
  const cx = W / 2;
  const cy = 560;
  const speedK = Math.min(1, Math.max(0, f.speed / 300));
  const size = 0.92 + speedK * 0.06;
  const blink = (world.time * 1.6) % 1 < 0.12;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((f.roll * Math.PI) / 180);
  ctx.rotate((-f.pitch * 0.35 * Math.PI) / 180);
  ctx.scale(size, size);

  // Contrails: soft, fading trails off the wingtips, never hard lines.
  for (const side of [-1, 1]) {
    const trails = [
      { alpha: 0.22, width: 2.5, dx: 52, dy: 88 },
      { alpha: 0.12, width: 5, dx: 58, dy: 96 },
      { alpha: 0.05, width: 9, dx: 64, dy: 104 },
    ];
    for (const t of trails) {
      ctx.strokeStyle = `rgba(255,255,255,${t.alpha})`;
      ctx.lineWidth = t.width;
      ctx.beginPath();
      ctx.moveTo(side * 148, 40);
      ctx.quadraticCurveTo(side * (148 + t.dx * 0.5), 40 + t.dy * 0.5, side * (148 + t.dx), 40 + t.dy);
      ctx.stroke();
    }
  }

  // Wings: swept back, metallic top, darker trailing edge.
  for (const side of [-1, 1]) {
    const wing = ctx.createLinearGradient(0, -30, 0, 60);
    wing.addColorStop(0, '#eef3f7');
    wing.addColorStop(1, '#aebdc9');
    ctx.fillStyle = wing;
    ctx.beginPath();
    ctx.moveTo(side * 12, -28);
    ctx.lineTo(side * 152, 26);
    ctx.lineTo(side * 152, 52);
    ctx.lineTo(side * 14, 46);
    ctx.closePath();
    ctx.fill();
    // Winglet rising at the tip.
    ctx.fillStyle = '#0f7d8c';
    ctx.beginPath();
    ctx.moveTo(side * 148, 28);
    ctx.lineTo(side * 156, 30);
    ctx.lineTo(side * 150, 6);
    ctx.lineTo(side * 144, 8);
    ctx.closePath();
    ctx.fill();
    // Flaps, extended on approach.
    if (f.flaps) {
      ctx.fillStyle = '#8fa3b3';
      ctx.fillRect(side > 0 ? 20 : -72, 46, 52, 9);
    }
  }

  // Horizontal stabilisers at the tail.
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#c3d0da';
    ctx.beginPath();
    ctx.moveTo(side * 10, 66);
    ctx.lineTo(side * 66, 84);
    ctx.lineTo(side * 66, 96);
    ctx.lineTo(side * 12, 88);
    ctx.closePath();
    ctx.fill();
  }

  // Fuselage: a long tapered body, bright on top, darker underneath.
  const body = ctx.createLinearGradient(0, -118, 0, 100);
  body.addColorStop(0, LIVERY.fuselageTop);
  body.addColorStop(0.55, LIVERY.fuselageMid);
  body.addColorStop(1, LIVERY.fuselageBelly);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -118);
  ctx.bezierCurveTo(9, -110, 14, -88, 16, -52);
  ctx.bezierCurveTo(18, -10, 18, 40, 15, 78);
  ctx.bezierCurveTo(13, 94, 7, 100, 0, 100);
  ctx.bezierCurveTo(-7, 100, -13, 94, -15, 78);
  ctx.bezierCurveTo(-18, 40, -18, -10, -16, -52);
  ctx.bezierCurveTo(-14, -88, -9, -110, 0, -118);
  ctx.fill();

  // Cheatline: teal stripe with a gold pinstripe, running nose to tail.
  ctx.strokeStyle = LIVERY.cheatline;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-15, -58);
  ctx.quadraticCurveTo(-17, 10, -14, 72);
  ctx.moveTo(15, -58);
  ctx.quadraticCurveTo(17, 10, 14, 72);
  ctx.stroke();
  ctx.strokeStyle = LIVERY.cheatlineGold;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-15, -52);
  ctx.quadraticCurveTo(-17, 10, -14, 68);
  ctx.moveTo(15, -52);
  ctx.quadraticCurveTo(17, 10, 14, 68);
  ctx.stroke();

  // Cockpit windows at the nose, passenger windows along the sides.
  ctx.fillStyle = LIVERY.window;
  ctx.beginPath();
  ctx.moveTo(-8, -102);
  ctx.quadraticCurveTo(0, -108, 8, -102);
  ctx.lineTo(6, -92);
  ctx.quadraticCurveTo(0, -95, -6, -92);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 9; i += 1) {
    const y = -64 + i * 13;
    ctx.fillRect(-14.5, y, 3.4, 5);
    ctx.fillRect(11.1, y, 3.4, 5);
  }

  // Tail fin, liveried, rising above the fuselage.
  const fin = ctx.createLinearGradient(0, 20, 0, 95);
  fin.addColorStop(0, '#17808f');
  fin.addColorStop(1, LIVERY.tail);
  ctx.fillStyle = fin;
  ctx.beginPath();
  ctx.moveTo(-13, 92);
  ctx.lineTo(13, 92);
  ctx.lineTo(10, 52);
  ctx.lineTo(-3, 16);
  ctx.lineTo(-11, 54);
  ctx.closePath();
  ctx.fill();
  // Gold sun mark on the fin.
  ctx.fillStyle = LIVERY.tailMark;
  ctx.beginPath();
  ctx.arc(0, 62, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = LIVERY.tailMark;
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 9, 62 + Math.sin(a) * 9);
    ctx.lineTo(Math.cos(a) * 13, 62 + Math.sin(a) * 13);
    ctx.stroke();
  }

  // Twin rear-mounted engines, with heat glow at high throttle.
  for (const side of [-1, 1]) {
    const ex = side * 26;
    const ey = 58;
    if (f.throttle > 0.55) {
      const glow = ctx.createRadialGradient(ex, ey + 20, 2, ex, ey + 20, 22);
      glow.addColorStop(0, `rgba(255,140,40,${0.25 + f.throttle * 0.45})`);
      glow.addColorStop(1, 'rgba(255,140,40,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(ex, ey + 20, 22, 0, Math.PI * 2);
      ctx.fill();
    }
    const eng = ctx.createLinearGradient(ex - 9, ey - 20, ex + 9, ey + 20);
    eng.addColorStop(0, '#e6edf2');
    eng.addColorStop(1, LIVERY.engine);
    ctx.fillStyle = eng;
    ctx.beginPath();
    ctx.ellipse(ex, ey, 9, 22, side * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = LIVERY.engineIntake;
    ctx.beginPath();
    ctx.ellipse(ex, ey - 19, 6.5, 4.5, side * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a343f';
    ctx.beginPath();
    ctx.ellipse(ex, ey + 20, 6, 3.5, side * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  // Landing gear, down on approach.
  if (f.gear) {
    ctx.strokeStyle = '#3a4550';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 74);
    ctx.lineTo(0, 96);
    ctx.moveTo(-20, 62);
    ctx.lineTo(-26, 88);
    ctx.moveTo(20, 62);
    ctx.lineTo(26, 88);
    ctx.stroke();
    ctx.fillStyle = '#141a20';
    ctx.beginPath();
    ctx.arc(0, 98, 4.5, 0, Math.PI * 2);
    ctx.arc(-27, 90, 4.5, 0, Math.PI * 2);
    ctx.arc(27, 90, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nav lights: red port, green starboard, white strobe at the tail.
  ctx.fillStyle = '#ff3b30';
  ctx.beginPath();
  ctx.arc(-152, 40, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2fd95a';
  ctx.beginPath();
  ctx.arc(152, 40, 3.4, 0, Math.PI * 2);
  ctx.fill();
  if (blink) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 100, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ---------- weather ----------

function drawWeather(world) {
  const ctx = CTX;
  const leg = world.leg;
  // Rain: deterministic streaks, seeded by the frame number.
  if (leg.weather.rain > 0) {
    const frame = Math.floor(world.time * 60);
    const count = 90;
    ctx.strokeStyle = 'rgba(200,220,235,0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < count; i += 1) {
      const x = hash(i * 31 + frame * 7) * W;
      const y = ((hash(i * 17 + 2) * H + frame * 14 + i * 3) % H) | 0;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 4, y + 22);
    }
    ctx.stroke();
  }
  // Lightning: a jagged bolt and a white flash over the sky.
  if (world.lightningFlash > 0 && world.bolt) {
    const b = world.bolt;
    ctx.strokeStyle = `rgba(255,255,230,${world.lightningFlash})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(b.x, b.top);
    const steps = 5;
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      ctx.lineTo(b.x + (hash(i * 41 + Math.floor(world.time * 4)) - 0.5) * 46, b.top + (b.bottom - b.top) * t);
    }
    ctx.stroke();
    ctx.fillStyle = `rgba(255,255,240,${world.lightningFlash * 0.18})`;
    ctx.fillRect(0, 0, W, HORIZON_Y + 40);
  }
  // Turbulence shake: the camera trembles a little in the storm.
  if (leg.weather.gust > 0.5) {
    const cam = currentCamera();
    cam.shake = world.time;
  } else {
    currentCamera().shake = 0;
  }
}

// ---------- HUD ----------

function drawHud(world, best) {
  const ctx = CTX;
  const f = world.flight;
  const leg = world.leg;
  const sky = SKIES[leg.sky];
  const hdg = ((Math.round(((-f.heading * 180) / Math.PI) % 360) + 360) % 360);

  // Top-left: altitude and vertical speed.
  panel(ctx, 18, 16, 190, 86);
  text(ctx, 'ALT', 32, 40, 13, '#8fb8d8', 'left', 700);
  text(ctx, `${Math.max(0, Math.round(f.y)).toLocaleString('en-US')} FT`, 32, 72, 26, '#eef4f8', 'left', 700);
  text(ctx, `VS ${f.vs >= 0 ? '+' : ''}${Math.round(f.vs)} FPM`, 32, 94, 14, f.vs < -800 ? '#ff6a5a' : '#bfefff', 'left', 600);

  // Top-right: speed and throttle.
  panel(ctx, W - 208, 16, 190, 86);
  text(ctx, 'SPD', W - 32, 40, 13, '#8fb8d8', 'right', 700);
  text(ctx, `${Math.round(f.speed)} KT`, W - 32, 72, 26, '#eef4f8', 'right', 700);
  text(ctx, `THR ${Math.round(f.throttle * 100)}%`, W - 32, 94, 14, '#bfefff', 'right', 600);

  // Top-centre: heading tape, drawn from the absolute heading grid so the
  // labels stay correct at any heading, not only at multiples of 15.
  panel(ctx, W / 2 - 190, 16, 380, 56);
  ctx.save();
  ctx.beginPath();
  rr(ctx, W / 2 - 190, 16, 380, 56, 8);
  ctx.clip();
  for (let H = Math.floor((hdg - 90) / 15) * 15; H <= hdg + 90; H += 15) {
    const h = ((H % 360) + 360) % 360;
    const d = ((H - hdg + 540) % 360) - 180;
    const x = W / 2 + d * 2.1;
    if (x < W / 2 - 165 || x > W / 2 + 165) continue;
    const major = h % 30 === 0;
    ctx.strokeStyle = major ? '#eef4f8' : 'rgba(238,244,248,0.4)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, 58);
    ctx.lineTo(x, major ? 40 : 48);
    ctx.stroke();
    if (major) text(ctx, String(h).padStart(3, '0'), x, 34, 12, '#bfefff', 'center', 600);
  }
  ctx.restore();
  text(ctx, `HDG ${String(hdg).padStart(3, '0')}`, W / 2, 96, 15, '#eef4f8', 'center', 700);
  outlineText(ctx, `LEG ${leg.id}/6 — ${leg.name.toUpperCase()}  ·  ${AIRPORTS[leg.from].code} → ${AIRPORTS[leg.to].code}`, W / 2, 118, 13, '#eef4f8', 'center', 600);

  // Fuel gauge, left edge; throttle gauge, right edge.
  gauge(ctx, 24, 200, 16, 220, f.fuel / 100, 'FUEL', fuelColor(f.fuel));
  gauge(ctx, W - 40, 200, 16, 220, f.throttle, 'THR', '#7fe7ff');

  // Bottom-left: gear, flaps, brake.
  panel(ctx, 18, H - 66, 272, 48);
  text(ctx, `GEAR ${f.gear ? 'DOWN' : 'UP'}`, 32, H - 38, 14, f.gear ? '#39d98a' : '#ffb347', 'left', 700);
  text(ctx, `FLAPS ${f.flaps ? 'DOWN' : 'UP'}`, 128, H - 38, 14, f.flaps ? '#ffb347' : '#8fb8d8', 'left', 700);
  text(ctx, `BRK ${f.brake ? 'ON' : '—'}`, 230, H - 38, 14, f.brake ? '#ff6a5a' : '#8fb8d8', 'left', 700);

  // Bottom-right: score and combo.
  panel(ctx, W - 268, H - 66, 250, 48);
  text(ctx, `SCORE ${world.score.toLocaleString('en-US')}`, W - 32, H - 38, 16, '#eef4f8', 'right', 700);
  if (world.combo > 1) text(ctx, `COMBO x${world.combo}`, W - 140, H - 38, 14, '#ffd27a', 'right', 700);

  // Centre flight-path marker.
  ctx.strokeStyle = 'rgba(238,244,248,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(W / 2, 380, 12, 0, Math.PI * 2);
  ctx.moveTo(W / 2 - 20, 380);
  ctx.lineTo(W / 2 - 13, 380);
  ctx.moveTo(W / 2 + 13, 380);
  ctx.lineTo(W / 2 + 20, 380);
  ctx.moveTo(W / 2, 360);
  ctx.lineTo(W / 2, 367);
  ctx.stroke();
  ctx.fillStyle = '#eef4f8';
  ctx.beginPath();
  ctx.arc(W / 2, 380, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Next-target marker: a diamond on the ring, runway or drop zone, with distance.
  // Skipped once the target is behind the jet (on rollout, past the threshold).
  const target = nextTargetOf(world);
  if (target && target.z > f.z) {
    const p = project(currentCamera(), target.x, target.y, target.z);
    if (p && p.x > 40 && p.x < W - 40 && p.y > 130 && p.y < H - 90) {
      ctx.strokeStyle = '#ffd27a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 14);
      ctx.lineTo(p.x + 14, p.y);
      ctx.lineTo(p.x, p.y + 14);
      ctx.lineTo(p.x - 14, p.y);
      ctx.closePath();
      ctx.stroke();
      const nm = Math.max(0, (target.z - f.z) / 6076);
      // The label sits above the ring's top edge, never on the ring itself.
      const labelY = target.r ? Math.max(130, p.y - target.r * p.scale * 0.92 - 14) : p.y - 22;
      text(ctx, `${target.label} ${nm.toFixed(1)} NM`, p.x, labelY, 14, '#ffd27a', 'center', 700);
    }
  }

  // Mission banner and passenger quote, early in the leg.
  if (world.legTime < 6) {
    const a = world.legTime < 5 ? 1 : 6 - world.legTime;
    ctx.globalAlpha = a;
    outlineText(ctx, leg.brief, W / 2, 150, 18, '#eef4f8', 'center', 600);
    ctx.globalAlpha = 1;
  }
  if (world.legTime < 9 && leg.passengers.length > 0) {
    const q = leg.passengers[0];
    const a = world.legTime < 8 ? 1 : 9 - world.legTime;
    ctx.globalAlpha = a;
    text(ctx, `“${q.quote}” — ${q.name}`, W / 2, H - 84, 15, '#d8e6f2', 'center', 500);
    ctx.globalAlpha = 1;
  }

  // Message banner.
  if (world.message) {
    panel(ctx, W / 2 - 260, 178, 520, 40);
    text(ctx, world.message, W / 2, 205, 17, '#ffd27a', 'center', 700);
  }

  // Warnings.
  const stalled = f.speed < 95 && !f.onGround;
  if (stalled) {
    const on = Math.floor(world.time * 4) % 2 === 0;
    if (on) text(ctx, 'STALL — NOSE DOWN, THROTTLE UP', W / 2, 250, 22, '#ff5a4a', 'center', 800);
  }
  if (f.fuel < 20 && f.fuel > 0) {
    text(ctx, `LOW FUEL ${Math.round(f.fuel)}%`, W / 2, 278, 16, '#ffb347', 'center', 700);
  }
  if (f.damage >= 40) {
    text(ctx, `AIRFRAME DAMAGE ${Math.round(f.damage)}%`, W / 2, 302, 16, '#ff6a5a', 'center', 700);
  }
  // Night: the HUD reads lit, with a soft glow behind the panels.
  if (sky.night) {
    ctx.fillStyle = 'rgba(120,180,255,0.05)';
    ctx.fillRect(0, 0, W, H);
  }
  if (best > 0) text(ctx, `BEST ${best.toLocaleString('en-US')}`, W - 32, H - 78, 12, '#8fb8d8', 'right', 600);
}

function fuelColor(fuel) {
  if (fuel < 20) return '#ff5a4a';
  if (fuel < 45) return '#ffb347';
  return '#39d98a';
}

function gauge(ctx, x, y, w, h, frac, label, color) {
  panel(ctx, x - 8, y - 30, w + 16, h + 56);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x, y, w, h);
  const fh = Math.max(0, Math.min(1, frac)) * h;
  ctx.fillStyle = color;
  ctx.fillRect(x, y + h - fh, w, fh);
  text(ctx, label, x + w / 2, y + h + 22, 12, '#8fb8d8', 'center', 700);
}

function nextTargetOf(world) {
  for (const ring of world.rings) {
    if (!ring.done && ring.z > world.flight.z) return { x: ring.x, y: ring.y, z: ring.z, label: 'RING', r: ring.r };
  }
  if (world.drop && !world.drop.dropped) return { x: world.drop.x, y: 1200, z: world.drop.z, label: 'DROP', r: 0 };
  return { x: 0, y: 60, z: world.leg.length, label: 'RWY', r: 0 };
}

// ---------- screens ----------

function drawTitle(world, best) {
  const ctx = CTX;
  ctx.fillStyle = 'rgba(4,10,20,0.55)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'MERIDIAN SKY', W / 2, 168, 74, '#f4f7fa', 'center', 800);
  text(ctx, 'Six legs. One jet. Dawn to night across Meridian City.', W / 2, 206, 20, '#bfefff', 'center', 500);
  // Route map: six airports joined by one line.
  const mapY = 300;
  const stops = [
    ['MHD', 0], ['CBY', 1], ['PLM', 2], ['TCV', 3], ['BKR', 4], ['MNB', 5], ['MHD', 6],
  ];
  const x0 = 300;
  const x1 = 980;
  ctx.strokeStyle = '#7fe7ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < stops.length; i += 1) {
    const x = x0 + (i / 6) * (x1 - x0);
    const y = mapY - Math.sin((i / 6) * Math.PI) * 42;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  for (let i = 0; i < stops.length; i += 1) {
    const x = x0 + (i / 6) * (x1 - x0);
    const y = mapY - Math.sin((i / 6) * Math.PI) * 42;
    ctx.fillStyle = i === 0 || i === 6 ? '#f2b23e' : '#0f7d8c';
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, stops[i][0], x, y + 30, 13, '#eef4f8', 'center', 700);
  }
  text(ctx, 'ARROWS fly · SHIFT / CTRL throttle · F flaps · G gear · B brake · SPACE drop cargo', W / 2, 400, 16, '#d8e6f2', 'center', 600);
  text(ctx, 'Fly the rings, land her soft, mind the fuel. Six legs, one flight log.', W / 2, 428, 16, '#d8e6f2', 'center', 500);
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.globalAlpha = pulse;
  text(ctx, 'PRESS SPACE OR CLICK TO FLY', W / 2, 500, 24, '#ffd27a', 'center', 800);
  ctx.globalAlpha = 1;
  if (best > 0) text(ctx, `BEST SCORE ${best.toLocaleString('en-US')}`, W / 2, 540, 15, '#8fb8d8', 'center', 600);
  text(ctx, 'A make.fun entry — built for the best flight game bounty', W / 2, 690, 13, '#6a7d8f', 'center', 500);
}

function drawPaused() {
  const ctx = CTX;
  ctx.fillStyle = 'rgba(4,10,20,0.6)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'PAUSED', W / 2, 340, 52, '#eef4f8', 'center', 800);
  text(ctx, 'Press P or Space to keep flying', W / 2, 388, 18, '#bfefff', 'center', 500);
}

function drawGameOver(world, best) {
  const ctx = CTX;
  ctx.fillStyle = 'rgba(10,4,6,0.62)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'FLIGHT ENDED', W / 2, 260, 56, '#ff6a5a', 'center', 800);
  text(ctx, world.crashReason, W / 2, 310, 20, '#eef4f8', 'center', 600);
  text(ctx, `Leg ${world.legIndex + 1} of 6 — ${world.leg.name}`, W / 2, 350, 17, '#bfefff', 'center', 500);
  text(ctx, `SCORE ${world.score.toLocaleString('en-US')}`, W / 2, 400, 26, '#ffd27a', 'center', 700);
  if (best > 0) text(ctx, `BEST ${best.toLocaleString('en-US')}`, W / 2, 436, 15, '#8fb8d8', 'center', 600);
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.globalAlpha = pulse;
  text(ctx, 'PRESS SPACE TO FLY AGAIN', W / 2, 500, 22, '#ffd27a', 'center', 800);
  ctx.globalAlpha = 1;
}

function drawFlightLog(world, best) {
  const ctx = CTX;
  ctx.fillStyle = 'rgba(4,10,20,0.72)';
  ctx.fillRect(0, 0, W, H);
  panel(ctx, W / 2 - 380, 70, 760, 560);
  text(ctx, 'FLIGHT LOG — MERIDIAN SKY', W / 2, 122, 30, '#f4f7fa', 'center', 800);
  text(ctx, 'All six legs flown, dawn to night.', W / 2, 150, 16, '#bfefff', 'center', 500);
  let y = 196;
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.moveTo(W / 2 - 340, y - 12);
  ctx.lineTo(W / 2 + 340, y - 12);
  ctx.stroke();
  for (const row of world.legResults) {
    text(ctx, `${row.name}`, W / 2 - 340, y, 17, '#eef4f8', 'left', 700);
    text(ctx, `${row.from} → ${row.to}`, W / 2 - 340, y + 20, 13, '#8fb8d8', 'left', 500);
    text(ctx, `RINGS ${row.rings}`, W / 2 + 60, y, 14, '#bfefff', 'left', 600);
    text(ctx, `${row.landing} landing`, W / 2 + 60, y + 20, 13, '#8fb8d8', 'left', 500);
    text(ctx, `${row.score.toLocaleString('en-US')}`, W / 2 + 340, y + 6, 19, '#ffd27a', 'right', 700);
    y += 42;
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.moveTo(W / 2 - 340, y - 8);
  ctx.lineTo(W / 2 + 340, y - 8);
  ctx.stroke();
  text(ctx, `TOTAL SCORE  ${world.score.toLocaleString('en-US')}`, W / 2, y + 26, 26, '#ffd27a', 'center', 800);
  y += 62;
  const feats = [...world.feats];
  if (feats.length > 0) {
    text(ctx, 'FEATS EARNED', W / 2, y, 14, '#8fb8d8', 'center', 700);
    y += 24;
    const labels = {
      'perfect-landing': 'Perfect Landing',
      'all-rings': 'All Rings',
      'smooth-operator': 'Smooth Operator',
      'storm-rider': 'Storm Rider',
      'cargo-ace': 'Cargo Ace',
      'full-route': 'Full Route',
    };
    text(ctx, feats.map((f) => `★ ${labels[f] || f}`).join('   '), W / 2, y, 15, '#f2b23e', 'center', 600);
    y += 28;
  }
  if (best > 0) {
    text(ctx, `BEST ${best.toLocaleString('en-US')}`, W / 2, y, 14, '#8fb8d8', 'center', 600);
    y += 24;
  }
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.globalAlpha = pulse;
  text(ctx, 'PRESS SPACE TO FLY THE ROUTE AGAIN', W / 2, y + 8, 20, '#ffd27a', 'center', 800);
  ctx.globalAlpha = 1;
}
