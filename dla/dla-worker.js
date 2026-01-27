// DLA Simulation Web Worker
// All simulation logic runs here, separate from the main thread

// ====== Constants ======
const CELL_SIZE = 8;
const PARTICLE_RADIUS = 3;
const SPAWN_MARGIN = 40;
const KILL_MARGIN = 80;
const STEP_SIZE = 2;
const STEPS_PER_BATCH = 50000;

// ====== State ======
let spatialHash = new Map();
let walker = null;
let stuckCount = 0;
let maxRadius = 0;
let running = false;

// ====== Settings (synced from main thread) ======
const settings = {
  baseAdhesion: 0.35,
  dirMult: [1,1,1,1,1,1,1,1,1,1,1,1],
};

// ====== Spatial Hash ======
function cellKey(x, y) {
  const cx = Math.floor(x / CELL_SIZE);
  const cy = Math.floor(y / CELL_SIZE);
  return cx + ',' + cy;
}

function addToSpatialHash(x, y) {
  const key = cellKey(x, y);
  if (!spatialHash.has(key)) spatialHash.set(key, []);
  spatialHash.get(key).push({ x, y });
}

function getNearbyParticles(x, y, radius) {
  const result = [];
  const cellRadius = Math.ceil(radius / CELL_SIZE) + 1;
  const cx = Math.floor(x / CELL_SIZE);
  const cy = Math.floor(y / CELL_SIZE);

  for (let dx = -cellRadius; dx <= cellRadius; dx++) {
    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      const key = (cx + dx) + ',' + (cy + dy);
      const cell = spatialHash.get(key);
      if (cell) {
        for (const p of cell) {
          const dist = Math.hypot(p.x - x, p.y - y);
          if (dist <= radius) result.push({ particle: p, dist });
        }
      }
    }
  }
  return result;
}

// ====== Simulation ======
function spawnWalker() {
  const R = maxRadius + SPAWN_MARGIN;
  const angle = Math.random() * Math.PI * 2;
  walker = {
    x: Math.cos(angle) * R,
    y: Math.sin(angle) * R
  };
}

function getDirectionIndex(angle) {
  let a = ((angle * 180 / Math.PI + 90) % 360 + 360) % 360;
  return Math.round(a / 30) % 12;
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function stickParticle(x, y) {
  addToSpatialHash(x, y);
  const index = stuckCount;
  stuckCount++;
  const dist = Math.hypot(x, y);
  maxRadius = Math.max(maxRadius, dist);
  return { x, y, index };
}

function tryStickAt(x, y) {
  const nearby = getNearbyParticles(x, y, PARTICLE_RADIUS * 2.5);
  
  for (const { particle, dist } of nearby) {
    if (dist < PARTICLE_RADIUS * 2) {
      const angle = Math.atan2(y - particle.y, x - particle.x);
      const dirIndex = getDirectionIndex(angle);
      const p = clamp01(settings.baseAdhesion * settings.dirMult[dirIndex]);
      
      if (Math.random() < p) {
        const stickDist = PARTICLE_RADIUS * 2;
        const stickX = particle.x + Math.cos(angle) * stickDist;
        const stickY = particle.y + Math.sin(angle) * stickDist;
        return stickParticle(stickX, stickY);
      }
    }
  }
  return null;
}

function resetWorld() {
  spatialHash = new Map();
  walker = null;
  stuckCount = 0;
  maxRadius = 0;
  
  // First particle at center
  const firstParticle = stickParticle(0, 0);
  self.postMessage({
    type: 'particles',
    data: [firstParticle],
    stats: { stuckCount, maxRadius }
  });
}

function runBatch() {
  if (!running) return;
  
  let steps = 0;
  const newParticles = [];
  const killR = maxRadius + KILL_MARGIN;
  
  while (steps < STEPS_PER_BATCH) {
    if (!walker) spawnWalker();
    
    // Random walk step
    const angle = Math.random() * Math.PI * 2;
    walker.x += Math.cos(angle) * STEP_SIZE;
    walker.y += Math.sin(angle) * STEP_SIZE;
    steps++;
    
    // Check if too far - respawn
    if (Math.hypot(walker.x, walker.y) > killR) {
      spawnWalker();
      continue;
    }
    
    // Try to stick
    const stuck = tryStickAt(walker.x, walker.y);
    if (stuck) {
      newParticles.push(stuck);
      walker = null;
      // Update kill radius for next iterations
      // (maxRadius was updated in stickParticle)
    }
  }
  
  // Send new particles to main thread
  if (newParticles.length > 0) {
    self.postMessage({
      type: 'particles',
      data: newParticles,
      stats: { stuckCount, maxRadius }
    });
  }
  
  // Yield to allow message processing, then continue
  setTimeout(runBatch, 0);
}

// ====== Message Handler ======
self.onmessage = function(e) {
  const { type, settings: newSettings } = e.data;
  
  switch (type) {
    case 'start':
      if (!running) {
        running = true;
        runBatch();
      }
      break;
      
    case 'stop':
      running = false;
      break;
      
    case 'reset':
      running = false;
      resetWorld();
      break;
      
    case 'updateSettings':
      if (newSettings) {
        if (newSettings.baseAdhesion !== undefined) {
          settings.baseAdhesion = newSettings.baseAdhesion;
        }
        if (newSettings.dirMult !== undefined) {
          settings.dirMult = newSettings.dirMult;
        }
      }
      break;
  }
};
