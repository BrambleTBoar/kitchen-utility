// game-logic.js — Pure game logic, importable by Node.js tests

const DEFAULT_STATE = {
  phase: 'idle',
  level: 1,
  score: 0,
  pullsNeeded: 0,
  pullsCompleted: 0,
  needleAngle: 0,
  needleSpeed: 2,
  zoneStart: 0,
  zoneWidth: Math.PI / 3,
  zoneOscillationSpeed: 0,
  zoneOscillationAmp: 0,
  zoneOscillationPhase: 0,
  particles: [],
  shakeAmount: 0,
  flashAlpha: 0,
};

function createInitialState() {
  return { ...DEFAULT_STATE };
}

function calculatePullsNeeded(level) {
  return Math.min(5, 2 + Math.floor((level - 1) / 2));
}

function calculateDifficulty(level) {
  const speed = 2 + (level - 1) * 0.5;
  const zoneWidth = Math.max(Math.PI / 12, Math.PI / 3 - (level - 1) * (Math.PI / 3 - Math.PI / 12) / 4);
  const hasOscillation = level >= 3;
  const oscillationSpeed = hasOscillation ? 0.5 + (level - 3) * 0.3 : 0;
  const oscillationAmp = hasOscillation ? Math.min(Math.PI / 6, (level - 3) * (Math.PI / 12) / 5) : 0;
  return { speed, zoneWidth, oscillationSpeed, oscillationAmp, hasOscillation };
}

function updateNeedle(state, dt) {
  state.needleAngle += state.needleSpeed * dt;
  if (state.needleAngle >= Math.PI * 2) {
    state.needleAngle -= Math.PI * 2;
  }
  return state;
}

function updateZone(state, dt) {
  if (state.zoneOscillationSpeed > 0) {
    state.zoneOscillationPhase += state.zoneOscillationSpeed * dt;
    const baseZoneStart = Math.sin(state.zoneOscillationPhase) * state.zoneOscillationAmp;
    state.zoneStart = baseZoneStart;
  }
  return state;
}

function isNeedleInZone(needleAngle, zoneStart, zoneWidth) {
  const normalizedNeedle = ((needleAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const normalizedZone = ((zoneStart % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const zoneEnd = (normalizedZone + zoneWidth) % (Math.PI * 2);

  if (zoneEnd > normalizedZone) {
    return normalizedNeedle >= normalizedZone && normalizedNeedle <= zoneEnd;
  } else {
    return normalizedNeedle >= normalizedZone || normalizedNeedle <= zoneEnd;
  }
}

function createSuccessParticles() {
  const particles = [];
  for (let i = 0; i < 30; i++) {
    const angle = (Math.PI * 2 * i) / 30 + (Math.random() - 0.5) * 0.3;
    const speed = 100 + Math.random() * 200;
    particles.push({
      x: 0, y: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.5 + Math.random() * 0.5,
      color: `hsl(${120 + Math.random() * 40}, 100%, ${50 + Math.random() * 30}%)`,
    });
  }
  return particles;
}

function updateParticles(state, dt) {
  state.particles = state.particles.filter(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= p.decay * dt;
    return p.life > 0;
  });
  return state;
}

function updateShake(state, dt) {
  if (state.shakeAmount > 0) {
    state.shakeAmount *= 0.9;
    if (state.shakeAmount < 0.5) state.shakeAmount = 0;
  }
  if (state.flashAlpha > 0) {
    state.flashAlpha -= dt * 2;
    if (state.flashAlpha < 0) state.flashAlpha = 0;
  }
  return state;
}

function pull(state) {
  if (state.phase !== 'spinning') return state;

  const inZone = isNeedleInZone(state.needleAngle, state.zoneStart, state.zoneWidth);

  if (inZone) {
    state.pullsCompleted++;
    if (state.pullsCompleted >= state.pullsNeeded) {
      state.score++;
      state.level++;
      const diff = calculateDifficulty(state.level);
      state.pullsNeeded = calculatePullsNeeded(state.level);
      state.pullsCompleted = 0;
      state.needleSpeed = diff.speed;
      state.zoneWidth = diff.zoneWidth;
      state.zoneOscillationSpeed = diff.oscillationSpeed;
      state.zoneOscillationAmp = diff.oscillationAmp;
      state.phase = 'success';
      state.particles = createSuccessParticles();
    } else {
      state.phase = 'success';
      state.particles = createSuccessParticles();
    }
  } else {
    state.phase = 'failure';
    state.shakeAmount = 15;
    state.flashAlpha = 1;
  }
  return state;
}

function update(state, dt) {
  switch (state.phase) {
    case 'spinning':
      updateNeedle(state, dt);
      updateZone(state, dt);
      break;
    case 'success':
      updateParticles(state, dt);
      if (state.particles.length === 0) {
        const diff = calculateDifficulty(state.level);
        state.needleSpeed = diff.speed;
        state.zoneWidth = diff.zoneWidth;
        state.zoneOscillationSpeed = diff.oscillationSpeed;
        state.zoneOscillationAmp = diff.oscillationAmp;
        state.pullsNeeded = calculatePullsNeeded(state.level);
        state.phase = 'spinning';
      }
      break;
    case 'failure':
      updateShake(state, dt);
      break;
  }
  return state;
}

function resetGame() {
  const state = createInitialState();
  const diff = calculateDifficulty(state.level);
  state.needleSpeed = diff.speed;
  state.zoneWidth = diff.zoneWidth;
  state.zoneOscillationSpeed = diff.oscillationSpeed;
  state.zoneOscillationAmp = diff.oscillationAmp;
  state.pullsNeeded = calculatePullsNeeded(state.level);
  state.pullsCompleted = 0;
  state.phase = 'spinning';
  return state;
}

module.exports = {
  createInitialState,
  calculatePullsNeeded,
  calculateDifficulty,
  updateNeedle,
  updateZone,
  isNeedleInZone,
  pull,
  createSuccessParticles,
  updateParticles,
  updateShake,
  update,
  resetGame,
  DEFAULT_STATE,
};
