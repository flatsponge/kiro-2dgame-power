# Browser scenario

The optional `scripts/playtest.mjs` runs a local Playwright scenario against a game page. Invoke it from the **game project's directory** so it can use that project's `playwright` package. A server URL is appropriate for Vite, ESM modules and pages with relative assets; `--file` is only for a self-contained HTML page that works with `file://` origin rules.

```sh
node /path/to/kiro-2d-game-power/skills/playtest-2d/scripts/playtest.mjs \
  --url http://localhost:5173 --config ./playtest.json --out ./playtest-report
```

If Playwright/Chromium is missing, install it in the game project (`npm install -D playwright` and `npx playwright install chromium`) or use available browser tools instead. No configuration means a **load-only smoke check**, not a gameplay pass.

Adapt this scenario to the game's actual selectors and reachable end condition:

```json
{
  "viewport": { "width": 960, "height": 540 },
  "readySelector": "#game",
  "steps": [
    { "name": "start", "action": "click", "selector": "#start" },
    { "name": "playing", "action": "expect", "selector": "#status", "text": "playing" },
    { "name": "move", "action": "key", "key": "ArrowRight", "count": 3, "focus": "#game" },
    { "name": "progress", "action": "expect", "selector": "#score", "text": "3" },
    { "name": "result", "action": "expect", "selector": "#status", "text": "won" },
    { "name": "restart", "action": "click", "selector": "#restart" },
    { "name": "reset", "action": "expect", "selector": "#score", "text": "0" },
    { "name": "mobile", "action": "resize", "width": 390, "height": 844 },
    { "name": "mobile layout", "action": "expect", "selector": "#layout", "text": "mobile" }
  ]
}
```

The included [`tests/example-scenario.json`](../../../tests/example-scenario.json) targets the tiny test fixture. It is a contract example, not a game template.

Each step has a required `name` and `action`. Available actions: `click` (`selector`), `key` (`key`, optional `count` and `focus`), `resize` (`width`, `height`), `expect` (`selector` and exactly one of `text` or `visible`), `wait` (`ms`) and `screenshot`. Every step may specify `waitMs` up to 5000 to settle an animation. The helper writes `report.json` and a screenshot per completed step, and fails on page errors, console errors and failed/HTTP error requests by default. Optional booleans `failOnPageError`, `failOnConsoleError` and `failOnNetworkError` can disable individual error classes if the game intentionally emits them.

Choose stable selectors for start, score, result and restart controls. For a Canvas-only game, add a small read-only test state signal when needed, or use its existing HUD. Avoid assertions tied to animation frames or random spawn timing; seed or freeze the game if practical. The helper does not synthesize touch gestures or assert Canvas pixels. Use real browser interaction for those checks and inspect each screenshot. Do not commit captured private gameplay data.
