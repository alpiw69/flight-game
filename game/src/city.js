// The city: one coastal metropolis under the whole route, built to look finished, not
// boxy. The layout is generated deterministically from the leg, so the same leg always
// builds the same city: coloured-roof districts (old town terracotta, downtown glass,
// marina, garden suburbs), a street grid with diagonal avenues, a river with bridges, a
// big park and pocket gardens, a stadium, and a BAY whose beach curves into the city —
// sand, turquoise shallows, umbrellas, palms, a boardwalk and a marina. The renderer
// draws it; the world reads only the towers, the one thing tall enough to hit.

export const CITY = {
  /** The city spans x in [-halfWidth, halfWidth]; the sea is beyond the coast. */
  halfWidth: 14000,
  /** The ground runs from zMin to the leg's length + 4000. */
  zMin: -4000,
  /** Block pitch in feet (400 ft of block, 120 ft of street). */
  block: 520,
  /** No building stands within this of the flight corridor. */
  corridorHalf: 700,
  /** The coastline where there is no bay: the sea lies at x < seaX. */
  seaX: -9000,
  /** Beach widths, in feet, measured inland from the waterline. */
  sandWidth: 320,
  boardwalkWidth: 120,
};

function hash2(a, b) {
  let h = (a * 2654435761 + b * 40503) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/** Roof palettes, one per district — the colour that kills the white-box look. */
export const ROOFS = {
  oldtown: ['#b85c3f', '#a34a38', '#c27a4a', '#9c5a3a', '#b0703f', '#8a4a3a'],
  suburb: ['#6d8a56', '#5d7d99', '#c2a165', '#b85c3f', '#7a8a6a', '#a34a38'],
  marina: ['#c96f4a', '#4a7a9a', '#e8e0d0', '#b85c3f', '#5d7d99'],
  mid: ['#a34a38', '#5d7d99', '#6d8a56', '#c2a165', '#b85c3f', '#8a6a4a'],
};

/** Wall palettes — warm plaster, brick and pale glass-city tones. */
export const WALLS = ['#e8dcc8', '#e6d9b8', '#d8c8b0', '#c8b8a8', '#eef0f2', '#b0705a', '#9aa5ad', '#d8cfa8'];

/** Ground-pad palettes per district: the block floors the streets run between. */
export const PADS = {
  oldtown: ['#b8a184', '#a8936f', '#c2a87e', '#ab8f74'],
  suburb: ['#9aa87e', '#8fa078', '#a8b088', '#93a06e'],
  marina: ['#c8b896', '#bfae86', '#d0c0a0', '#b5a67e'],
  downtown: ['#9a9da2', '#8f9297', '#a3a6ab', '#878b90'],
  mid: ['#a89a7e', '#9a8f7a', '#b0a488', '#97917c'],
};

/** Car colours for the streets. */
export const CARS = ['#c0392b', '#2e6db4', '#f2c230', '#e8e8e8', '#2a2f36', '#7a9a5a', '#b85c3f'];

/** Umbrella colours for the beach. */
export const UMBRELLAS = ['#e84a4a', '#f2c230', '#3a9ad9', '#f28a2e', '#e86aa0', '#39b06a'];

/** Where the waterline is at this z: the straight coast, plus the bay's smooth bump. */
export function coastX(bay, z) {
  if (!bay) return CITY.seaX;
  const t = (z - bay.z) / bay.width;
  if (t <= -1 || t >= 1) return CITY.seaX;
  const bump = (Math.cos(t * Math.PI) + 1) / 2;
  return CITY.seaX + bay.depth * bump;
}

/** Which district a block belongs to: downtown glass, old town, marina, or garden suburb. */
function districtFor(cx, cz, leg) {
  const city = leg.city;
  const downtown = cz >= city.downtown.z0 && cz <= city.downtown.z1 && Math.abs(cx) < 6000;
  if (downtown) return 'downtown';
  if (cx < -5500) return 'marina';
  if (Math.abs(cx) < 6500 && cz < 22000) return 'oldtown';
  return 'suburb';
}

function inRect(cx, cz, r, margin) {
  return Math.abs(cx - r.x) < r.w / 2 + margin && Math.abs(cz - r.z) < r.d / 2 + margin;
}

/** The city layout for one leg: river, bay, parks and gardens, stadium, downtown and every building. */
export function cityLayout(leg) {
  const city = leg.city;
  const bay = city.bay || { z: 24000, depth: 6000, width: 12000 };
  const gardens = [...(city.gardens || [])];
  const buildings = [];
  const pads = [];
  const trees = [];
  const cars = [];
  const boats = [];
  const zMax = leg.length + 4000;

  // Seeded pocket gardens: one block each, scattered through the city.
  const pocketKeys = new Set();
  for (let i = 0; i < 12; i += 1) {
    const ix = Math.floor(hash2(leg.id * 331 + i * 7, 11) * 40) - 20;
    const iz = Math.floor(hash2(leg.id * 331 + i * 13, 23) * 62) + 2;
    if (Math.abs(ix * CITY.block) < CITY.corridorHalf + 520) continue;
    pocketKeys.add(`${ix},${iz}`);
  }

  for (let ix = -27; ix <= 27; ix += 1) {
    const cx = ix * CITY.block;
    if (Math.abs(cx) < CITY.corridorHalf) continue;
    for (let iz = -8; iz * CITY.block <= zMax; iz += 1) {
      const cz = iz * CITY.block;
      const coast = coastX(bay, cz);
      if (cx < coast + 900) continue; // In the sea, in the bay, or on the beach.
      if (Math.abs(cz - city.riverZ) < 700) continue;
      if (inRect(cx, cz, city.park, 260)) continue;
      if (gardens.some((g) => inRect(cx, cz, g, 260))) continue;
      if (pocketKeys.has(`${ix},${iz}`)) {
        gardens.push({ x: cx, z: cz, w: 520, d: 520, pocket: true });
        continue;
      }
      const sdx = cx - city.stadium.x;
      const sdz = cz - city.stadium.z;
      if (sdx * sdx + sdz * sdz < (city.stadium.r + 400) * (city.stadium.r + 400)) continue;
      if (city.towers) {
        let blocked = false;
        for (const t of city.towers) {
          if (Math.abs(cx - t.x) < t.w / 2 + 260 && Math.abs(cz - t.z) < t.d / 2 + 260) { blocked = true; break; }
        }
        if (blocked) continue;
      }
      const district = districtFor(cx, cz, leg);
      const h1 = hash2(leg.id * 7919 + ix * 131, iz * 17 + 5);
      const h2 = hash2(ix * 31 + 7, iz * 13 + leg.id);
      const h3 = hash2(ix * 17 + 3, iz * 29 + leg.id * 3);
      // Waterfront band: low houses along the shore, so the beach reads over them
      // instead of hiding behind glass towers.
      const waterfront = cx < coast + 2500;
      const padPalette = PADS[waterfront ? 'marina' : district] || PADS.mid;
      const isEmpty = h1 < 0.08;
      const padTrees = [];
      if (district === 'suburb' && isEmpty) {
        padTrees.push({ dx: -150, dz: -150 });
        padTrees.push({ dx: 150, dz: 140 });
        if (h3 > 0.6) padTrees.push({ dx: 140, dz: -140 });
      }
      pads.push({ x: cx, z: cz, w: 400, d: 400, color: padPalette[Math.floor(h2 * padPalette.length)], district, trees: padTrees });
      if (isEmpty) continue; // An empty lot: the pad shows, with its lawn trees.
      const downtown = district === 'downtown' && !waterfront;
      const mid = Math.abs(cx) < 9000;
      let h;
      if (downtown) h = 220 + h1 * 380; // 220-600 ft towers.
      else if (waterfront) h = 30 + h1 * 60; // 30-90 ft waterfront houses.
      else if (mid) h = 70 + h1 * 150; // 70-220 ft mid-rise.
      else h = 30 + h1 * 60; // 30-90 ft low blocks.
      const roofPalette = waterfront ? ROOFS.marina : (ROOFS[district] || ROOFS.mid);
      buildings.push({
        x: cx, z: cz, w: 300 + h2 * 100, d: 300 + h3 * 100, h: Math.round(h),
        roof: downtown ? '#2c4a6e' : roofPalette[Math.floor(h1 * roofPalette.length)],
        wall: WALLS[Math.floor(h3 * WALLS.length)],
        pitched: !downtown && h < 220 && h2 > 0.3,
        glass: downtown && h > 300,
        shade: h2,
        downtown,
        windows: h3 > 0.4,
      });
    }
  }
  // Far first, so near buildings paint over them.
  buildings.sort((a, b) => b.z - a.z);

  // Avenue trees: in the gaps between block columns, along the main avenues.
  for (const ax of [-2340, -1820, 1820, 2340]) {
    for (let z = 2000; z <= zMax; z += 1000) {
      if (Math.abs(z - city.riverZ) < 700) continue;
      if (inRect(ax, z, city.park, 260)) continue;
      if (gardens.some((g) => inRect(ax, z, g, 260))) continue;
      if (ax < coastX(bay, z) + 900) continue;
      trees.push({ x: ax + (hash2(ax, z) - 0.5) * 60, z, r: 12 + hash2(z, ax) * 10, kind: 'tree' });
    }
  }
  // Palm trees along the beach boulevard, where the bay curves in.
  for (let z = bay.z - bay.width; z <= bay.z + bay.width; z += 700) {
    const coast = coastX(bay, z);
    if (coast < CITY.seaX + 1500) continue;
    trees.push({ x: coast + CITY.sandWidth + 60, z, r: 14, kind: 'palm' });
  }
  // Cars parked and driving in the street gaps between block columns.
  for (let ix = -20; ix <= 20; ix += 4) {
    const cx = ix * CITY.block + 260;
    if (Math.abs(cx) < CITY.corridorHalf + 260) continue;
    for (let z = 1500; z <= zMax; z += 2500) {
      const cz = z + (hash2(ix * 7, z) - 0.5) * 900;
      if (Math.abs(cz - city.riverZ) < 700) continue;
      if (inRect(cx, cz, city.park, 260)) continue;
      if (gardens.some((g) => inRect(cx, cz, g, 260))) continue;
      if (cx < coastX(bay, cz) + 900) continue;
      cars.push({ x: cx + (hash2(ix, cz) > 0.5 ? 32 : -32), z: cz, color: CARS[Math.floor(hash2(ix * 3, cz) * CARS.length)] });
    }
  }
  // Boats in the marina bay, plus a few on the river.
  for (let i = 0; i < 12; i += 1) {
    const bz = bay.z + (hash2(i * 11 + 2, leg.id) - 0.5) * bay.width * 1.6;
    const coast = coastX(bay, bz);
    boats.push({
      x: coast - 350 - hash2(i * 7 + 5, leg.id * 3) * 1800,
      z: bz,
      sail: UMBRELLAS[Math.floor(hash2(i * 3 + 1, leg.id) * UMBRELLAS.length)],
    });
  }
  for (let i = 0; i < 3; i += 1) {
    boats.push({ x: -8000 + hash2(i * 19 + 4, leg.id) * 16000, z: city.riverZ, sail: UMBRELLAS[i % UMBRELLAS.length] });
  }

  return {
    riverZ: city.riverZ,
    park: city.park,
    gardens,
    stadium: city.stadium,
    downtown: city.downtown,
    towers: city.towers || [],
    buildings,
    pads,
    trees,
    cars,
    boats,
    bay,
    length: leg.length,
  };
}

/** The height of a named tower at (x, z), or 0 — the only city heights the sim cares about. */
export function towerHeightAt(layout, x, z) {
  for (const t of layout.towers) {
    if (Math.abs(x - t.x) < t.w / 2 && Math.abs(z - t.z) < t.d / 2) return t.h;
  }
  return 0;
}
