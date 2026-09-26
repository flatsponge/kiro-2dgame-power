# Kiro 2D Game Power

A small Kiro Power for making **playable, polished 2D browser games** and testing the actual game loop. It covers idea → implementation → real browser playtest, with special attention to input, timing, resize, game over and restart.

## Install

Unzip the archive, then in Kiro IDE open **Powers → Add Custom Power → Import power from a folder**. Select the extracted directory that contains `plugin.json` at its top level.

If you publish the extracted contents in the root of a public GitHub repository, others can instead use **Import power from GitHub** with that repository's URL. Update the manifest's `repository` and `homepage` fields to your actual URL if you add them.

This is an [Agent Plugins 1.0](https://agent-plugins.org/specification) Power and has no login, API key or MCP server to configure. It bundles skills and local resources. A new project can be plain HTML/CSS/JS; an existing project can keep its engine.

Try these in Kiro:

> Build a one-screen 2D game where I can dodge falling objects. Keep it playable on desktop and touch, and use the build-2d-game and playtest-2d skills.

> Playtest this 2D game. Verify start, scoring, loss, restart, pointer scaling after resize and mobile controls. Show screenshots and fix reproducible failures.

## What it bundles

| Path | Purpose |
| --- | --- |
| [`plugin.json`](plugin.json) | Power identity and activation keywords. |
| [`skills/build-2d-game/SKILL.md`](skills/build-2d-game/SKILL.md) | Scope, implement and polish a compact game. |
| [`skills/build-2d-game/references/game-design.md`](skills/build-2d-game/references/game-design.md) | One-screen game brief and feel check. |
| [`skills/build-2d-game/references/architecture.md`](skills/build-2d-game/references/architecture.md) | Fixed step loop, input, state and Canvas scaling guidance. |
| [`skills/playtest-2d/SKILL.md`](skills/playtest-2d/SKILL.md) | Browser and game logic playtest protocol. |
| [`skills/playtest-2d/references/scenario-schema.md`](skills/playtest-2d/references/scenario-schema.md) | How to adapt a repeatable scenario to your game. |
| [`skills/playtest-2d/scripts/playtest.mjs`](skills/playtest-2d/scripts/playtest.mjs) | Optional Playwright scenario runner for screenshots and assertions. |

An MCP server is intentionally omitted. Kiro can use browser tooling available in the environment; the helper script only runs when you choose to invoke it and have Playwright available in the game project.

## Playtest helper

Run from the **game project's directory**, with Playwright installed there. A server URL is best for module-based games. Adjust the [scenario example](tests/example-scenario.json) to the game's actual controls, then run:

```sh
node /path/to/kiro-2d-game-power/skills/playtest-2d/scripts/playtest.mjs \
  --url http://localhost:5173 --config ./playtest.json --out ./playtest-report
```

The helper records screenshots, assertions and browser errors in `report.json`. Without `--config`, it checks only that a page loads. A real playtest must include input, an observed result and restart, plus screenshot inspection and manual gameplay. See the [scenario guide](skills/playtest-2d/references/scenario-schema.md).

## Validation

From this repository run `node --test tests/*.test.mjs` and `node --check skills/playtest-2d/scripts/playtest.mjs`. The browser test needs Playwright and its Chromium binary; if absent, it reports a skip. Then import this repository as a Power in Kiro and ask one of the prompts above to confirm activation. These checks cannot establish gameplay feel by themselves.

## Privacy and support

The Power has no telemetry and does not request credentials. Its optional script launches a browser against the URL or local file you provide and writes screenshots and a report to a local output directory. It does not upload them. The page you test may itself make network requests according to that game's code.

Support and ownership: [flatsponge on GitHub](https://github.com/flatsponge). If you publish this Power in a repository, enable Issues there for bug reports.

License: [MIT](LICENSE).
