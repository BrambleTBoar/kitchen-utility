# Alan Wake Generator Mini-Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based timing game where players spin a needle on a dial and tap/press when it enters a green zone, with endless difficulty scaling.

**Architecture:** Single HTML file with modular JavaScript. Game logic (state, physics, collision) is pure functions testable in Node.js. Rendering (Canvas drawing, animations) is separate and runs in the browser. Input handling bridges keyboard and touch events to the same game action.

**Tech Stack:** Vanilla HTML5, CSS, JavaScript (ES6+), HTML5 Canvas, Web Audio API (optional, not required). No dependencies.

---

### Task 1: Project scaffolding

**Files:**
- Create: `generator-game/index.html`
- Create: `generator-game/game.js`
- Create: `generator-game/renderer.js`
- Create: `generator-game/input.js`
- Create: `generator-game/tests/game.test.js`

- [ ] **Step 1: Create index.html with basic structure**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Generator Mini-Game</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%; height: 100%;
      background: #0a0a0a;
      overflow: hidden;
      touch-action: none;
      -webkit-tap-highlight-color: transparent;
    }
    canvas {
      display: block;
      width: 100%; height: 100%;
    }
  </style>
</head>
<body>
  <canvas id="game"></canvas>
  <script src="game.js"></script>
  <script src="renderer.js"></script>
  <script src="input.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create game.js with initial state and core types**

```javascript
// game.js — Pure game logic, testable in Node.js

const DEFAULT_STATE = {
  phase: 'idle', // 'idle' | 'spinning' | 'success' | 'failure'
  level: 1,
  score: 0,
  pullsNeeded: 0, // 2 or 3, randomized per generator
  pullsCompleted: 0,
  needleAngle: 0, // radians, 0 = top
  needleSpeed: 2, // radians per second
  zoneStart: 0, // radians, start of green zone
  zoneWidth: Math.PI / 3, // 60 degrees in radians
  zoneOscillationSpeed: 0, // radians per second, 0 until level 3
  zoneOscillationAmp: 0, // radians, 0 until level 3
  zoneOscillationPhase: 0, // for oscillation offset
  lastTime: 0,
  particles: [], // for success animation
  shakeAmount: 0, // for failure animation
  flashAlpha: 0, // red flash on failure
  generatorActive: false,
};

function createInitialState() {
  return { ...DEFAULT_STATE };
}

function randomPullsNeeded() {
  return Math.random() < 0.5 ? 2 : 3;
}

function calculateDifficulty(level) {
  const speed = 2 + (level - 1) * 0.5;
  const zoneWidth = Math.max(Math.PI / 12, Math.PI / 3 - (level - 1) * (Math.PI / 3 - Math.PI / 12) / 10);
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
    // Zone wraps around 0
    return normalizedNeedle >= normalizedZone || normalizedNeedle <= zoneEnd;
  }
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
      state.pullsNeeded = randomPullsNeeded();
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
        state.pullsNeeded = randomPullsNeeded();
        state.pullsCompleted = 0;
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
  state.pullsNeeded = randomPullsNeeded();
  state.pullsCompleted = 0;
  state.phase = 'spinning';
  return state;
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createInitialState,
    randomPullsNeeded,
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
}
```

- [ ] **Step 3: Create renderer.js — Canvas rendering**

```javascript
// renderer.js — Canvas rendering, browser only

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let dpr = window.devicePixelRatio || 1;
let centerX, centerY, radius;

function resize() {
  dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  centerX = canvas.width / 2;
  centerY = canvas.height / 2;
  radius = Math.min(centerX, centerY) * 0.6;
}

window.addEventListener('resize', resize);
resize();

function drawDial(ctx, cx, cy, r) {
  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 3 * dpr;
  ctx.stroke();

  // Tick marks
  for (let i = 0; i < 60; i++) {
    const angle = (Math.PI * 2 * i) / 60 - Math.PI / 2;
    const isMajor = i % 5 === 0;
    const innerR = isMajor ? r - 15 * dpr : r - 8 * dpr;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
    ctx.lineTo(cx + Math.cos(angle) * (r - 3 * dpr), cy + Math.sin(angle) * (r - 3 * dpr));
    ctx.strokeStyle = isMajor ? '#555' : '#333';
    ctx.lineWidth = (isMajor ? 2 : 1) * dpr;
    ctx.stroke();
  }
}

function drawZone(ctx, cx, cy, r, zoneStart, zoneWidth) {
  const startAngle = zoneStart - Math.PI / 2;
  const endAngle = startAngle + zoneWidth;

  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.strokeStyle = '#00ff44';
  ctx.lineWidth = 12 * dpr;
  ctx.lineCap = 'round';
  ctx.shadowColor = '#00ff44';
  ctx.shadowBlur = 20 * dpr;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawNeedle(ctx, cx, cy, r, angle) {
  const needleAngle = angle - Math.PI / 2;
  const tipX = cx + Math.cos(needleAngle) * (r - 5 * dpr);
  const tipY = cy + Math.sin(needleAngle) * (r - 5 * dpr);

  // Needle line
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(tipX, tipY);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3 * dpr;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 6 * dpr, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Tip dot
  ctx.beginPath();
  ctx.arc(tipX, tipY, 5 * dpr, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

function drawParticles(ctx, cx, cy, particles) {
  for (const p of particles) {
    const px = cx + p.x;
    const py = cy + p.y;
    ctx.beginPath();
    ctx.arc(px, py, 4 * dpr * p.life, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawHUD(ctx, state) {
  const fontSize = Math.max(16, radius * 0.08);
  ctx.font = `${fontSize}px monospace`;
  ctx.fillStyle = '#888';
  ctx.textAlign = 'left';

  // Score
  ctx.fillText(`SCORE: ${state.score}`, 20 * dpr, 30 * dpr + fontSize);

  // Level
  ctx.fillText(`LEVEL: ${state.level}`, 20 * dpr, 30 * dpr + fontSize * 2);

  // Pulls remaining
  const pullsRemaining = state.pullsNeeded - state.pullsCompleted;
  ctx.fillText(`PULLS: ${pullsRemaining}`, 20 * dpr, 30 * dpr + fontSize * 3);
}

function drawGameOver(ctx, state) {
  // Dark overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const fontSize = Math.max(24, radius * 0.12);
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.fillStyle = '#ff4444';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', centerX, centerY - fontSize * 2);

  ctx.font = `${fontSize * 0.7}px monospace`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`Score: ${state.score}`, centerX, centerY + fontSize * 0.5);
  ctx.fillText(`Level: ${state.level}`, centerX, centerY + fontSize * 1.3);

  ctx.font = `${fontSize * 0.5}px monospace`;
  ctx.fillStyle = '#888';
  ctx.fillText('Tap or press Space to restart', centerX, centerY + fontSize * 2.5);
}

function render(state) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Apply shake
  let offsetX = 0, offsetY = 0;
  if (state.shakeAmount > 0) {
    offsetX = (Math.random() - 0.5) * state.shakeAmount * dpr;
    offsetY = (Math.random() - 0.5) * state.shakeAmount * dpr;
  }
  ctx.save();
  ctx.translate(offsetX, offsetY);

  // Draw dial
  drawDial(ctx, centerX, centerY, radius);

  // Draw zone
  drawZone(ctx, centerX, centerY, radius, state.zoneStart, state.zoneWidth);

  // Draw needle
  drawNeedle(ctx, centerX, centerY, radius, state.needleAngle);

  // Draw particles
  if (state.particles.length > 0) {
    drawParticles(ctx, centerX, centerY, state.particles);
  }

  // Draw HUD
  drawHUD(ctx, state);

  ctx.restore();

  // Red flash on failure
  if (state.flashAlpha > 0) {
    ctx.fillStyle = `rgba(255, 0, 0, ${state.flashAlpha * 0.3})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Game over screen
  if (state.phase === 'failure') {
    drawGameOver(ctx, state);
  }
}

export { render, canvas, ctx, centerX, centerY, radius, dpr, resize };
```

Wait — I need to reconsider. The spec says a single HTML file. Let me restructure to keep it as one file but with clear internal modules. Let me revise the plan.

Actually, the writing-plans skill says "Exact file paths always" and "Complete code in every step." Let me restructure to use a single HTML file with internal module separation via IIFE or ES modules in a single file. For a single-file game, the cleanest approach is one HTML file with `<script>` tags containing the logic.

Let me rewrite the plan with a single HTML file approach.

---

### Task 1: Project scaffolding — Single HTML file

**Files:**
- Create: `generator-game/index.html`

- [ ] **Step 1: Create the complete single-file game**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Generator Mini-Game</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%; height: 100%;
      background: #0a0a0a;
      overflow: hidden;
      touch-action: none;
      -webkit-tap-highlight-color: transparent;
    }
    canvas {
      display: block;
      width: 100%; height: 100%;
    }
  </style>
</head>
<body>
  <canvas id="game"></canvas>
  <script>
    // ============================================================
    // GAME LOGIC — Pure functions, testable in Node.js
    // ============================================================

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

    function randomPullsNeeded() {
      return Math.random() < 0.5 ? 2 : 3;
    }

    function calculateDifficulty(level) {
      const speed = 2 + (level - 1) * 0.5;
      const zoneWidth = Math.max(Math.PI / 12, Math.PI / 3 - (level - 1) * (Math.PI / 3 - Math.PI / 12) / 10);
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
          state.pullsNeeded = randomPullsNeeded();
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
            state.pullsNeeded = randomPullsNeeded();
            state.pullsCompleted = 0;
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
      state.pullsNeeded = randomPullsNeeded();
      state.pullsCompleted = 0;
      state.phase = 'spinning';
      return state;
    }

    // ============================================================
    // RENDERER — Canvas drawing, browser only
    // ============================================================

    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    let dpr = window.devicePixelRatio || 1;
    let centerX, centerY, radius;

    function resize() {
      dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      centerX = canvas.width / 2;
      centerY = canvas.height / 2;
      radius = Math.min(centerX, centerY) * 0.6;
    }

    window.addEventListener('resize', resize);
    resize();

    function drawDial(cx, cy, r) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 3 * dpr;
      ctx.stroke();

      for (let i = 0; i < 60; i++) {
        const angle = (Math.PI * 2 * i) / 60 - Math.PI / 2;
        const isMajor = i % 5 === 0;
        const innerR = isMajor ? r - 15 * dpr : r - 8 * dpr;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
        ctx.lineTo(cx + Math.cos(angle) * (r - 3 * dpr), cy + Math.sin(angle) * (r - 3 * dpr));
        ctx.strokeStyle = isMajor ? '#555' : '#333';
        ctx.lineWidth = (isMajor ? 2 : 1) * dpr;
        ctx.stroke();
      }
    }

    function drawZone(cx, cy, r, zoneStart, zoneWidth) {
      const startAngle = zoneStart - Math.PI / 2;
      const endAngle = startAngle + zoneWidth;

      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.strokeStyle = '#00ff44';
      ctx.lineWidth = 12 * dpr;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#00ff44';
      ctx.shadowBlur = 20 * dpr;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    function drawNeedle(cx, cy, r, angle) {
      const needleAngle = angle - Math.PI / 2;
      const tipX = cx + Math.cos(needleAngle) * (r - 5 * dpr);
      const tipY = cy + Math.sin(needleAngle) * (r - 5 * dpr);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tipX, tipY);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3 * dpr;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 6 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(tipX, tipY, 5 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }

    function drawParticles(cx, cy, particles) {
      for (const p of particles) {
        const px = cx + p.x;
        const py = cy + p.y;
        ctx.beginPath();
        ctx.arc(px, py, 4 * dpr * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    function drawHUD(state) {
      const fontSize = Math.max(16, radius * 0.08);
      ctx.font = `${fontSize}px monospace`;
      ctx.fillStyle = '#888';
      ctx.textAlign = 'left';

      ctx.fillText(`SCORE: ${state.score}`, 20 * dpr, 30 * dpr + fontSize);
      ctx.fillText(`LEVEL: ${state.level}`, 20 * dpr, 30 * dpr + fontSize * 2);

      const pullsRemaining = state.pullsNeeded - state.pullsCompleted;
      ctx.fillText(`PULLS: ${pullsRemaining}`, 20 * dpr, 30 * dpr + fontSize * 3);
    }

    function drawGameOver(state) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const fontSize = Math.max(24, radius * 0.12);
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.fillStyle = '#ff4444';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', centerX, centerY - fontSize * 2);

      ctx.font = `${fontSize * 0.7}px monospace`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`Score: ${state.score}`, centerX, centerY + fontSize * 0.5);
      ctx.fillText(`Level: ${state.level}`, centerX, centerY + fontSize * 1.3);

      ctx.font = `${fontSize * 0.5}px monospace`;
      ctx.fillStyle = '#888';
      ctx.fillText('Tap or press Space to restart', centerX, centerY + fontSize * 2.5);
    }

    function render(state) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let offsetX = 0, offsetY = 0;
      if (state.shakeAmount > 0) {
        offsetX = (Math.random() - 0.5) * state.shakeAmount * dpr;
        offsetY = (Math.random() - 0.5) * state.shakeAmount * dpr;
      }
      ctx.save();
      ctx.translate(offsetX, offsetY);

      drawDial(centerX, centerY, radius);
      drawZone(centerX, centerY, radius, state.zoneStart, state.zoneWidth);
      drawNeedle(centerX, centerY, radius, state.needleAngle);

      if (state.particles.length > 0) {
        drawParticles(centerX, centerY, state.particles);
      }

      drawHUD(state);
      ctx.restore();

      if (state.flashAlpha > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${state.flashAlpha * 0.3})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (state.phase === 'failure') {
        drawGameOver(state);
      }
    }

    // ============================================================
    // INPUT HANDLING
    // ============================================================

    function handleInput() {
      if (gameState.phase === 'failure') {
        gameState = resetGame();
        return;
      }
      gameState = pull(gameState);
    }

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleInput();
      }
    });

    // Touch / Click
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleInput();
    }, { passive: false });

    canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      handleInput();
    });

    // ============================================================
    // GAME LOOP
    // ============================================================

    let gameState = resetGame();
    let lastTime = 0;

    function gameLoop(timestamp) {
      if (!lastTime) lastTime = timestamp;
      const dt = Math.min((timestamp - lastTime) / 1000, 0.1); // Cap at 100ms
      lastTime = timestamp;

      gameState = update(gameState, dt);
      render(gameState);

      requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
  </script>
</body>
</html>
```

- [ ] **Step 2: Verify the file opens in a browser**

Open `generator-game/index.html` in a browser. Verify:
- Canvas fills the viewport
- Needle spins around a dial with tick marks
- Green zone is visible
- Pressing spacebar or clicking/tapping triggers a pull
- Successful pulls show particle effects
- A miss shows red flash and screen shake
- Game over screen shows score and restart option

- [ ] **Step 3: Test on mobile**

Open the file on a mobile device (or use Chrome DevTools device emulation). Verify:
- Touch input works
- Canvas scales correctly
- No zoom or scroll interference
- `touch-action: none` prevents scroll interference

---

### Task 2: Unit tests for game logic

**Files:**
- Create: `generator-game/tests/game.test.js`

- [ ] **Step 1: Write tests for core game logic**

```javascript
// tests/game.test.js — Unit tests for game logic (Node.js)

// Import game functions (copy from game.js for Node.js testing)
const {
  createInitialState,
  randomPullsNeeded,
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

// --- Test: randomPullsNeeded returns 2 or 3 ---
for (let i = 0; i < 100; i++) {
  const n = randomPullsNeeded();
  assert(n === 2 || n === 3, `randomPullsNeeded should return 2 or 3, got ${n}`);
}

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

// --- Summary ---
console.log(`\nTests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
```

- [ ] **Step 2: Create a separate game-logic.js for Node.js testing**

Extract the pure game logic functions into a separate file that can be required by Node.js tests, while keeping the browser-specific code (Canvas, DOM) in index.html.

```javascript
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

function randomPullsNeeded() {
  return Math.random() < 0.5 ? 2 : 3;
}

function calculateDifficulty(level) {
  const speed = 2 + (level - 1) * 0.5;
  const zoneWidth = Math.max(Math.PI / 12, Math.PI / 3 - (level - 1) * (Math.PI / 3 - Math.PI / 12) / 10);
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
      state.pullsNeeded = randomPullsNeeded();
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
        state.pullsNeeded = randomPullsNeeded();
        state.pullsCompleted = 0;
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
  state.pullsNeeded = randomPullsNeeded();
  state.pullsCompleted = 0;
  state.phase = 'spinning';
  return state;
}

module.exports = {
  createInitialState,
  randomPullsNeeded,
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
```

- [ ] **Step 3: Run the tests**

```bash
cd generator-game
node tests/game.test.js
```

Expected output: All tests pass, showing `X passed, 0 failed`.

---

### Task 3: Polish and edge cases

**Files:**
- Modify: `generator-game/index.html`

- [ ] **Step 1: Add visual polish — needle color changes**

Update `drawNeedle` to show green glow when needle is inside the green zone:

```javascript
function drawNeedle(cx, cy, r, angle, zoneStart, zoneWidth) {
  const needleAngle = angle - Math.PI / 2;
  const tipX = cx + Math.cos(needleAngle) * (r - 5 * dpr);
  const tipY = cy + Math.sin(needleAngle) * (r - 5 * dpr);

  const inZone = isNeedleInZone(angle, zoneStart, zoneWidth);
  const needleColor = inZone ? '#00ff44' : '#ffffff';
  const glowColor = inZone ? '#00ff44' : 'transparent';

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(tipX, tipY);
  ctx.strokeStyle = needleColor;
  ctx.lineWidth = 3 * dpr;
  ctx.lineCap = 'round';
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = inZone ? 15 * dpr : 0;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.arc(cx, cy, 6 * dpr, 0, Math.PI * 2);
  ctx.fillStyle = needleColor;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(tipX, tipY, 5 * dpr, 0, Math.PI * 2);
  ctx.fillStyle = needleColor;
  ctx.fill();
}
```

- [ ] **Step 2: Add a subtle background grid**

Add to `drawDial`:

```javascript
// Inner decorative ring
ctx.beginPath();
ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
ctx.strokeStyle = '#1a1a1a';
ctx.lineWidth = 1 * dpr;
ctx.stroke();

// Cross lines
for (let i = 0; i < 4; i++) {
  const angle = (Math.PI / 2) * i;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(angle) * r * 0.3, cy + Math.sin(angle) * r * 0.3);
  ctx.lineTo(cx + Math.cos(angle) * r * 0.95, cy + Math.sin(angle) * r * 0.95);
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1 * dpr;
  ctx.stroke();
}
```

- [ ] **Step 3: Ensure mobile viewport is correct**

Verify the meta viewport tag prevents zooming and scaling:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

- [ ] **Step 4: Test the complete game**

Play through 5+ levels manually. Verify:
- Needle gets faster each level
- Green zone gets narrower
- Zone starts oscillating at level 3+
- Particle effects look good
- Screen shake and red flash on miss
- Game over screen shows correct score
- Restart works correctly
- No visual glitches or rendering artifacts

---

### Task 4: Final review and deployment

**Files:**
- `generator-game/index.html` (final)

- [ ] **Step 1: Code review**

Check for:
- No console errors in browser DevTools
- No memory leaks (particles are properly garbage collected)
- Smooth 60fps on desktop and mobile
- No input lag
- Touch events don't trigger double-firing with mouse events

- [ ] **Step 2: Cross-browser testing**

Test in:
- Chrome (desktop)
- Firefox (desktop)
- Safari (desktop)
- Chrome (mobile, Android)
- Safari (mobile, iOS)

- [ ] **Step 3: Final commit**

```bash
cd generator-game
git init
git add .
git commit -m "feat: Alan Wake generator mini-game"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ Core gameplay loop (needle, zone, pulls) — Task 1
- ✅ Difficulty progression (speed + zone shrink + oscillation) — Task 1
- ✅ Visual design (minimalist, dark, green zone, particles) — Task 1
- ✅ Input (keyboard + touch) — Task 1
- ✅ Technical (single HTML, Canvas, responsive) — Task 1
- ✅ Success/failure animations — Task 1
- ✅ Game over screen with score and restart — Task 1
- ✅ Unit tests for game logic — Task 2
- ✅ Visual polish — Task 3

**2. Placeholder scan:** No "TBD", "TODO", "implement later", or "similar to" references. Every step has complete code.

**3. Type consistency:** All functions use consistent naming (`state`, `dt`, `cx`, `cy`, `r`). State shape is consistent across all functions.

**4. Scope check:** Single game, single file (with optional test file). No backend, no assets, no dependencies. Fits a single implementation.
