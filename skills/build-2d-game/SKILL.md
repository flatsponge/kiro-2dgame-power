---
name: build-2d-game
description: Build or improve a compact, playable 2D browser game. Use for HTML Canvas games, arcade prototypes, tiny web games, or turning a small game idea into a polished playable loop.
---

# Build a small 2D game

1. Inspect the existing project before choosing tools. Keep its engine and conventions if it already has them. For a new small browser game, default to HTML/CSS/JavaScript, Canvas for the playfield, and DOM for menus, score and accessible controls. Add a framework, asset pipeline, physics engine or server only when a specific mechanic needs it.
2. Define the playable loop in one paragraph: player action, immediate feedback, goal, loss condition, duration and restart. Choose one mechanic and one readable visual language. Use [game-design.md](references/game-design.md) to check scope and feedback. Produce a playable slice before adding content.
3. Separate input, state update and rendering. Use an explicit menu → playing → paused → result state machine, a fixed simulation step with a clamped frame gap, and one reset function that recreates **all** run state. See [architecture.md](references/architecture.md) for Canvas coordinates, timing, seeded randomness and input edges. Treat rendering as read only; never make scoring or spawning depend on frame rate.
4. Support the inputs the project promises. Keyboard and pointer/touch should work on the intended device; avoid an invisible keyboard-only start on mobile. Keep touch targets large, show controls before play, map pointer coordinates through the canvas bounding box and DPR, and pause or resume cleanly after tab visibility changes. Respect reduced motion for decorative animation without removing gameplay feedback.
5. Make it feel finished: legible start and result states, clear hit and miss feedback, balanced difficulty, a score or progress signal, restart, and one visual hierarchy. Prefer original simple shapes, procedural effects and licensed assets. Do not copy a brand's character art or borrow unlicensed game assets.
6. Run the app and use the [playtest-2d](../playtest-2d/SKILL.md) workflow. Verify a full run, lose/win and restart in a real browser; inspect screenshots and errors. Fix failures and repeat relevant checks. State what you actually observed and which devices remain untested.

Deliver a running game, its run command, the controls, and the result of the playtest. If the user requested a reusable component, expose a small API and avoid coupling the mechanics to a single page's global state.
