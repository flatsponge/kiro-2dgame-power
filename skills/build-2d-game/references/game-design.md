# One-screen game brief

Fill these in before choosing an engine or drawing lots of art:

| Question | Useful answer |
| --- | --- |
| What does the player do every 1–3 seconds? | One verb, such as dodge, drop, aim or catch. |
| What responds immediately? | Position, hit effect, sound if enabled, score or progress. |
| What increases the challenge? | One visible parameter, such as speed or density, with a cap. |
| How does a run end? | Explicit win or loss with a reason the player can understand. |
| How does the next run begin? | One restart action resets score, entities, timers, input and random seed. |

Aim for a first playable run in under a minute and a full session in a few minutes. A new player should know how to start, what to do and why they lost without external instructions.

## Scope

- Implement one core mechanic, one level or arena and one result screen first. Add more content only after the loop works.
- Make mechanics readable at the smallest intended viewport. A bright accent should carry game meaning, not just decoration.
- Use a small palette, distinct silhouettes and restrained effects. Protect contrast and gameplay visibility when effects overlap.
- If touch support matters, make the main action reachable with a thumb and do not rely on hover.
- If sound matters, unlock it after a user gesture and supply a mute control. The game must remain understandable when muted.
- For timed or precision play, avoid hiding key cues in color alone. Keep text instructions and a keyboard focus indicator for DOM controls.

## Quick feel check

Play several runs without reading the code. Note the first confusing action, unexpected loss, dead time, unreadable element and overly strong effect. Fix the worst one before adding features.
