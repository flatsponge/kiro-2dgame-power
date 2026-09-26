# Small browser game architecture

Keep the gameplay model independent of DOM and Canvas where practical:

```js
function initialState(seed) { /* menu, score, entities, timers, rng state */ }
function step(state, input, dt) { /* returns or updates gameplay state only */ }
function render(ctx, state, presentation) { /* draw only */ }
```

Use `requestAnimationFrame` for presentation and a fixed simulation interval (for example 1/60 s) for consistent collisions and speed. Clamp large frame gaps (for example after a hidden tab), limit the number of catch-up steps, and reset the accumulator on pause/resume. Keep the simulation in world coordinates; the render function maps world space into CSS pixels. Time-based movement uses world units per second, not pixels per rendered frame.

Example scheduler, adapted to your state ownership:

```js
const STEP = 1 / 60;
let last = 0;
let accumulator = 0;
function frame(nowMs) {
  if (last === 0) last = nowMs;
  const elapsed = Math.min((nowMs - last) / 1000, 0.10);
  last = nowMs;
  if (state.mode === "playing") {
    accumulator += elapsed;
    for (let i = 0; accumulator >= STEP && i < 6; i++) {
      state = step(state, currentInput(), STEP);
      accumulator -= STEP;
    }
  } else {
    accumulator = 0;
  }
  render(ctx, state);
  requestAnimationFrame(frame);
}
document.addEventListener("visibilitychange", () => {
  last = 0;
  accumulator = 0;
  if (document.hidden && state.mode === "playing") state.mode = "paused";
});
requestAnimationFrame(frame);
```

For a crisp Canvas, keep a stable world aspect ratio or deliberately recompute world dimensions. The CSS box defines layout; the backing store uses its measured size times `devicePixelRatio` (possibly capped for performance). Set the transform after each backing-store resize. Compute pointer positions from `getBoundingClientRect()` and map **both** axes into world space. Test after viewport resize and a touch event.

Use a seeded RNG for spawn decisions in `step` if reproducing failures matters. Store the seed, elapsed game time and a small input trace in a failing test. Handle one-time actions (jump, start, drop) on an input edge, so holding a key does not repeatedly restart or fire. End-state transitions should fire once and reset should recreate entities, timers, score, pressed inputs and RNG together.

For a tiny game, modules such as `game-state`, `input`, `render` and `main` are sufficient. Introduce an entity system only after distinct behaviors justify it.
