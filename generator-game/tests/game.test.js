// tests/game.test.js — Unit tests for game logic (Node.js)

const {
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
} = require('../game-logic.js');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${message}`);
  }
}

function assertClose(a, b, epsilon = 0.001, message) {
  assert(Math.abs(a - b) < epsilon, message || `Expected ${a} to be close to ${b}`);
}

// --- Test: Initial state ---
const state = createInitialState();
assert(state.phase === 'idle', 'Initial phase should be idle');
assert(state.level === 1, 'Initial level should be 1');
assert(state.score === 0, 'Initial score should be 0');
assert(state.needleAngle === 0, 'Initial needle angle should be 0');
assert(state.needleSpeed === 2, 'Initial needle speed should be 2');

// --- Test: calculatePullsNeeded returns increasing values ---
assert(calculatePullsNeeded(1) === 2, 'Level 1 should need 2 pulls');
assert(calculatePullsNeeded(2) === 2, 'Level 2 should need 2 pulls');
assert(calculatePullsNeeded(3) === 3, 'Level 3 should need 3 pulls');
assert(calculatePullsNeeded(4) === 3, 'Level 4 should need 3 pulls');
assert(calculatePullsNeeded(5) === 4, 'Level 5 should need 4 pulls');
assert(calculatePullsNeeded(10) === 5, 'Level 10+ should cap at 5 pulls');

// --- Test: calculateDifficulty ---
const diff1 = calculateDifficulty(1);
assertClose(diff1.speed, 2, 0.01, 'Level 1 speed should be 2');
assert(diff1.zoneWidth > Math.PI / 4, 'Level 1 zone should be wide');
assert(diff1.oscillationSpeed === 0, 'Level 1 should have no oscillation');

const diff5 = calculateDifficulty(5);
assert(diff5.speed > diff1.speed, 'Level 5 speed should be higher');
assert(diff5.zoneWidth < diff1.zoneWidth, 'Level 5 zone should be narrower');
assert(diff5.hasOscillation, 'Level 5 should have oscillation');

const diff10 = calculateDifficulty(10);
assertClose(diff10.zoneWidth, Math.PI / 12, 0.01, 'Level 10 zone should be near minimum');
assert(diff10.oscillationSpeed > 0, 'Level 10 should have oscillation');

// --- Test: updateNeedle ---
let s = { ...DEFAULT_STATE, phase: 'spinning', needleAngle: 0, needleSpeed: 2 };
s = updateNeedle(s, 1);
assertClose(s.needleAngle, 2, 0.01, 'Needle should advance by speed * dt');

// Test wrapping
s = { ...DEFAULT_STATE, phase: 'spinning', needleAngle: Math.PI * 1.8, needleSpeed: 2 };
s = updateNeedle(s, 1);
assert(s.needleAngle < Math.PI * 2, 'Needle should wrap around 2π');

// --- Test: isNeedleInZone ---
assert(isNeedleInZone(0, 0, Math.PI / 3), 'Needle at 0 should be in zone [0, π/3]');
assert(isNeedleInZone(Math.PI / 6, 0, Math.PI / 3), 'Needle at π/6 should be in zone [0, π/3]');
assert(!isNeedleInZone(Math.PI / 2, 0, Math.PI / 3), 'Needle at π/2 should NOT be in zone [0, π/3]');

// Test zone wrapping around 0
assert(isNeedleInZone(0, Math.PI * 1.9, Math.PI / 3), 'Needle at 0 should be in wrapping zone');
assert(isNeedleInZone(Math.PI * 0.1, Math.PI * 1.9, Math.PI / 3), 'Needle near 0 should be in wrapping zone');
assert(!isNeedleInZone(Math.PI, Math.PI * 1.9, Math.PI / 3), 'Needle at π should NOT be in wrapping zone');

// --- Test: pull — successful pull ---
s = {
  ...DEFAULT_STATE,
  phase: 'spinning',
  needleAngle: 0,
  zoneStart: 0,
  zoneWidth: Math.PI / 3,
  pullsNeeded: 2,
  pullsCompleted: 0,
  particles: [],
};
s = pull(s);
assert(s.phase === 'success', 'Successful pull should set phase to success');
assert(s.pullsCompleted === 1, 'Pulls completed should increment');
assert(s.particles.length > 0, 'Success should create particles');

// --- Test: pull — failure ---
s = {
  ...DEFAULT_STATE,
  phase: 'spinning',
  needleAngle: Math.PI,
  zoneStart: 0,
  zoneWidth: Math.PI / 3,
  pullsNeeded: 2,
  pullsCompleted: 0,
  particles: [],
};
s = pull(s);
assert(s.phase === 'failure', 'Miss should set phase to failure');
assert(s.shakeAmount > 0, 'Failure should set shake amount');
assert(s.flashAlpha > 0, 'Failure should set flash alpha');

// --- Test: pull — completing a generator ---
s = {
  ...DEFAULT_STATE,
  phase: 'spinning',
  needleAngle: 0,
  zoneStart: 0,
  zoneWidth: Math.PI / 3,
  pullsNeeded: 2,
  pullsCompleted: 1,
  particles: [],
};
s = pull(s);
assert(s.score === 1, 'Completing a generator should increment score');
assert(s.level === 2, 'Completing a generator should increment level');
assert(s.pullsCompleted === 0, 'Pulls should reset after generator completion');

// --- Test: updateParticles ---
s = { particles: createSuccessParticles() };
s = updateParticles(s, 2);
assert(s.particles.length < 30, 'Particles should decay over time');
assert(s.particles.every(p => p.life >= 0), 'Particle life should not go negative');

// --- Test: updateShake ---
s = { shakeAmount: 15, flashAlpha: 1 };
s = updateShake(s, 1);
assert(s.shakeAmount < 15, 'Shake should decay');
assert(s.flashAlpha < 1, 'Flash should fade');

// --- Test: resetGame ---
s = { ...DEFAULT_STATE, phase: 'failure', score: 5, level: 10 };
s = resetGame();
assert(s.phase === 'spinning', 'Reset should start spinning');
assert(s.score === 0, 'Reset should clear score');
assert(s.level === 1, 'Reset should reset level');

// --- Test: full update loop ---
s = resetGame();
for (let i = 0; i < 100; i++) {
  s = update(s, 0.016); // ~60fps
}
assert(s.phase === 'spinning' || s.phase === 'success', 'State should be spinning or success after updates');

// --- Test: updateZone with oscillation ---
s = {
  ...DEFAULT_STATE,
  phase: 'spinning',
  zoneOscillationSpeed: 1,
  zoneOscillationAmp: Math.PI / 6,
  zoneOscillationPhase: 0,
  zoneStart: 0,
};
s = updateZone(s, 1);
assert(Math.abs(s.zoneStart) > 0, 'Zone should oscillate when speed > 0');

// --- Test: pull on non-spinning phase does nothing ---
s = { ...DEFAULT_STATE, phase: 'idle' };
s = pull(s);
assert(s.phase === 'idle', 'Pull on idle should do nothing');

s = { ...DEFAULT_STATE, phase: 'success', particles: [] };
s = pull(s);
assert(s.phase === 'success', 'Pull on success should do nothing');

s = { ...DEFAULT_STATE, phase: 'failure', shakeAmount: 15, flashAlpha: 1 };
s = pull(s);
assert(s.phase === 'failure', 'Pull on failure should do nothing');

// --- Summary ---
console.log(`\nTests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
