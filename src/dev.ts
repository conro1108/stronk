// ?seed=N fakes N weeks of history by running the real progression against a
// lifter who usually hits their targets, sometimes misses — so you can see
// targets, badges, deloads and charts without lifting. ?wipe clears history.

import type { Data } from './store';
import { target, type Session } from './progress';

export function seed(d: Data, weeks: number): Session[] {
  const out: Session[] = [];
  const ws = d.program.workouts;
  const perWeek = ws.length;
  const total = weeks * perWeek;
  let rnd = 7;
  const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < total; i++) {
    const w = ws[i % ws.length];
    const date = new Date(Date.now() - (total - i) * (7 / perWeek) * 864e5);
    out.unshift({
      id: 'seed' + i,
      program: d.program.id,
      workout: w.id,
      name: w.name,
      date: date.toISOString(),
      unit: d.unit,
      lifts: w.slots.map((s) => {
        const t = target(s, out, d.unit);
        const w0 = t.w || 0;
        return { lift: s.lift, reps: s.reps, sets: t.reps.map((r, k) => ({ w: w0, r: Math.max(1, r + (rand() < 0.1 + k * 0.04 ? -1 : rand() < 0.55 ? 1 : 0)) })) };
      }),
    });
  }
  return out;
}
