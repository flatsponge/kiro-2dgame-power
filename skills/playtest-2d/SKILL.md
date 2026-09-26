---
name: playtest-2d
description: Playtest or debug a 2D browser game using real browser input, screenshots and reproducible checks. Use for game QA, Canvas rendering bugs, touch and keyboard controls, scoring, collisions, resize, pause and restart regressions.
---

# Playtest a 2D browser game

1. Inspect its run command, controls and intended devices. Start it using the project's existing workflow. Identify the real DOM controls and one observable game-state signal, such as score, status text or a project-provided test hook. Avoid inventing selectors or claiming that a screenshot proves game rules.
2. Execute a full run on a desktop viewport: start, move or act, trigger scoring or progress, reach a win/loss, restart, then repeat one input. Assert each transition with a visible value or stable game-state API and capture menu, active play and result screenshots. Inspect screenshots, not just file existence.
3. Exercise edge cases that fit the game: held and rapid input, losing at a boundary, multiple simultaneous hits, tab hide/resume, restart while an animation is running, canvas resize and pointer coordinate mapping. For a touch game, repeat the main action at a narrow viewport. Check keyboard focus for DOM controls and pause behavior.
4. Collect page errors, console errors and failed requests; distinguish errors caused by the game from optional third-party resources. Test deterministic `step` logic separately where it exists, including scoring, collision, timeout and reset with a fixed seed. A visual snapshot of a Canvas game needs frozen time and randomness to be repeatable.
5. Use the browser tools already available in the environment. When Playwright is installed in the **game project**, the bundled [playtest.mjs](scripts/playtest.mjs) can replay a small declarative scenario and save evidence. Follow [scenario-schema.md](references/scenario-schema.md) for the config. Do not add Playwright just to run this helper if an equivalent browser tool is already available.
6. Fix the failure with the smallest coherent change, replay the failing steps, then complete one normal run. Report observed behavior, failures fixed and untested environments separately. If the user asks only for an audit, leave code as it is and give reproducible findings.

The helper is a smoke/playtest aid, not a replacement for playing the game or inspecting screenshots. A passing run does not establish that game difficulty feels fair.
