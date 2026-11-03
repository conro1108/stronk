# CLAUDE.md

stronk: an offline lifting log PWA that proposes each day's weights and reps
from your history. TypeScript + Vite, no framework, all data in localStorage
(no backend). `npm run dev` / `npm test` / `npm run build` (static `dist/`) /
`npm run shot` (phone-size screenshots of every view into `shots/`, needs the
dev server running) / `npm run icons`.

Dev knobs: `?seed=N` fakes N weeks of history through the real progression;
`?wipe` clears history. `#/forms` shows every form figure at once for tuning poses.

## Map

| Want to change… | File |
|---|---|
| Lift catalog, template programs, starting weights, increments, rest times | `src/program.ts` |
| How targets are chosen (double progression, deload, cross-range scaling) | `src/progress.ts` |
| Form hint figures (pose keyframes) and cues per lift | `src/form.ts` |
| What's saved, custom lifts, export/import | `src/store.ts` |
| Views, session flow, swaps, editing past workouts, program editor, rest timer | `src/main.ts` |
| Look | `src/style.css` |
| Fake history | `src/dev.ts` |
| Offline caching | `public/sw.js` |

## Gotchas

- History is keyed by lift id. Changing an id in `LIFTS` orphans that lift's
  history, and dropping a lift a saved program still uses leaves a slot named after its raw id.
- The user's program is a copy in storage. Edits to the templates in
  `program.ts` only reach people who pick the template again in Settings.
- Sessions store weights in the unit they were logged in. Anything reading
  them goes through `liftHistory`/`convert`, or mixed lb/kg history lies.
- A lift with no entry in `FORMS` simply shows no hint (custom lifts never
  have one). Figures animate via SMIL, so check new poses in a real browser
  on `#/forms`: tsc can't tell you a knee bends backwards.
- The service worker only registers in production builds, so `npm run dev`
  never serves stale cached code.
