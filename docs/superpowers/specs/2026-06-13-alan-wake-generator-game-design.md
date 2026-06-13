# Alan Wake Generator Mini-Game — Design Spec

## Overview

A browser-based timing game inspired by the Alan Wake generator mini-game. Players spin a needle on a dial and must tap/press when it enters a green zone. Each generator requires 2-3 successful pulls. Difficulty scales endlessly. One miss = game over.

## Core Gameplay Loop

1. A needle spins around a circular dial.
2. A green zone sits on the dial — its width shrinks and it oscillates as difficulty increases.
3. Player triggers a "pull" (tap or spacebar) when the needle is inside the green zone.
4. Each generator requires 2-3 successful pulls (randomized per generator).
5. After all pulls succeed, the generator powers up and the next level begins.
6. One miss = instant game over.
7. Score = number of generators started. No win condition — endless mode.

## Difficulty Progression

Each level increases all three difficulty factors simultaneously:

- **Speed**: Needle angular velocity increases linearly (starts at ~2 rad/s, scales up).
- **Zone width**: Green arc shrinks from ~60° down to ~15° minimum.
- **Zone oscillation**: At level 3+, the green zone moves back and forth along the dial at a frequency that increases with level.

All three scale together for a smooth, compounding difficulty curve.

## Visual Design

- **Background**: Dark (#0a0a0a).
- **Dial**: Circular with subtle tick marks.
- **Needle**: Bright white when outside green zone, glows green when inside.
- **Green zone**: Highlighted arc with subtle glow effect.
- **Success animation**: Power surge — particles radiate outward, dial briefly illuminates.
- **Failure animation**: Screen shake, red flash, "GAME OVER" overlay with score and restart button.
- **HUD**: Score counter and current level displayed in the corner.

## Input

- **Desktop**: Spacebar or mouse click.
- **Mobile**: Tap anywhere on the dial area.
- Both trigger the same "pull" action.

## Technical Approach

- **Single HTML file** with inline CSS and JavaScript.
- **HTML5 Canvas** for all rendering (needle, zone, particles, effects).
- **requestAnimationFrame** for smooth 60fps animation loop.
- **Responsive**: Canvas scales to any screen size, maintains aspect ratio.
- **Touch and keyboard event listeners** for cross-platform input.
- **No external dependencies**.

## File Structure

```
generator-game/
  index.html    (single file — HTML + CSS + JS)
```

## Success Criteria

- Works on desktop browsers (Chrome, Firefox, Safari, Edge).
- Works on mobile browsers (iOS Safari, Android Chrome).
- 60fps on modern devices.
- Intuitive — no tutorial needed; players understand the mechanic within 5 seconds.
- Satisfying feedback on success and failure.
