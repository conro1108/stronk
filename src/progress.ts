// What to lift today. Pure: given a slot and the history, propose weight and
// reps per set. Double progression — beat last time's reps at the same weight
// until every set hits the top of the range, then add weight and drop to the
// bottom. Two misses in a row at one weight resets 10%. Progression follows
// the lift's history in this rep range, so a lift on two days in two ranges
// climbs separately; with no history in this range, scale from e1RM.

import { liftInfo, type Slot } from './program';

export type Unit = 'lb' | 'kg';
export type SetLog = { w: number; r: number };
export type LiftLog = { lift: string; reps: [number, number]; sets: SetLog[] };
export type Session = { id: string; program: string; workout: string; name?: string; date: string; unit: Unit; lifts: LiftLog[] };

export type Target = {
  w: number;
  reps: number[];
  kind: 'new' | 'up' | 'same' | 'deload' | 'scaled';
  note: string;
};

const KG = 2.20462;
export const step = (unit: Unit) => (unit === 'kg' ? 2.5 : 5);
export const incFor = (lift: string, unit: Unit) => (unit === 'kg' ? liftInfo(lift).inc / 2 : liftInfo(lift).inc);
export const convert = (w: number, from: Unit, to: Unit) => (from === to ? w : to === 'kg' ? w / KG : w * KG);
const roundTo = (w: number, s: number) => Math.round(w / s) * s;
const floorTo = (w: number, s: number) => Math.floor(w / s + 1e-9) * s;
export const e1rm = ({ w, r }: SetLog) => w * (1 + r / 30);

/** Newest-first log entries for a lift, weights converted to `unit`. */
export function liftHistory(lift: string, history: Session[], unit: Unit) {
  const out: { session: Session; log: LiftLog }[] = [];
  for (const s of history) {
    for (const l of s.lifts) {
      if (l.lift !== lift || !l.sets.length) continue;
      const sets = l.sets.map((x) => ({ w: convert(x.w, s.unit, unit), r: x.r }));
      out.push({ session: s, log: { ...l, sets } });
    }
  }
  return out.sort((a, b) => b.session.date.localeCompare(a.session.date));
}

const topWeight = (sets: SetLog[]) => Math.max(...sets.map((s) => s.w));
const fmtReps = (sets: SetLog[]) => sets.map((s) => s.r).join('·');

export function target(slot: Slot, history: Session[], unit: Unit): Target {
  const [min, max] = slot.reps;
  const n = slot.sets;
  const flat = (r: number) => Array(n).fill(r);
  const past = liftHistory(slot.lift, history, unit);

  if (!past.length) {
    const w = roundTo(convert(liftInfo(slot.lift).start, 'lb', unit), step(unit));
    return { w, reps: flat(min), kind: 'new', note: 'First time — adjust to something you could do for a couple more.' };
  }

  const same = past.filter((p) => p.log.reps[0] === min && p.log.reps[1] === max);
  if (!same.length) {
    const other = past[0].log;
    const best = Math.max(...other.sets.map(e1rm));
    const w = floorTo(best / (1 + (min + 1) / 30), step(unit));
    return { w, reps: flat(min), kind: 'scaled', note: `Scaled from ${fmtW(topWeight(other.sets))} × ${fmtReps(other.sets)} at ${other.reps[0]}–${other.reps[1]}.` };
  }

  const last = same[0].log;
  const W = topWeight(last.sets);

  const work = last.sets.filter((s) => s.w >= W);
  if (work.length >= n && work.every((s) => s.r >= max)) {
    return { w: W + incFor(slot.lift, unit), reps: flat(min), kind: 'up', note: `Hit ${max}s across last time — add weight.` };
  }

  const missed = (l: LiftLog) => l.sets.length < n || l.sets.some((s) => s.r < min);
  const prev = same[1]?.log;
  if (missed(last) && prev && topWeight(prev.sets) === W && missed(prev)) {
    return { w: floorTo(W * 0.9, step(unit)), reps: flat(min), kind: 'deload', note: `Stalled twice at ${fmtW(W)} — back off 10% and build again.` };
  }

  const reps = Array.from({ length: n }, (_, i) => Math.min(max, Math.max(min, (work[i]?.r ?? min - 1) + 1)));
  return { w: W, reps, kind: 'same', note: `Last: ${fmtReps(last.sets)}. Beat it by a rep.` };
}

/** Trim float noise from unit conversion: 102.06 -> 102, 61.25 stays. */
export const fmtW = (w: number) => String(Math.round(w * 4) / 4);
