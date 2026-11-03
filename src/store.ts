// Everything persisted, in one localStorage key: settings, the user's editable
// program, custom lifts, finished sessions and the in-progress one. Also JSON
// export/import, since browser storage is the only copy of the data.

import { LIFTS, PROGRAMS, type Lift, type Program } from './program';
import type { Session, Target, Unit } from './progress';

export type ActiveSet = { w: number | null; r: number | null; done: boolean };
export type ActiveLift = { lift: string; reps: [number, number]; target: Target; sets: ActiveSet[] };
export type Active = { program: string; workout: string; started: number; unit: Unit; lifts: ActiveLift[] };

export type Data = {
  v: 1;
  unit: Unit;
  program: Program;
  customLifts: Lift[];
  history: Session[]; // newest first
  active: Active | null;
};

const KEY = 'stronk';

export const copyProgram = (p: Program): Program => JSON.parse(JSON.stringify(p));

function fresh(): Data {
  return { v: 1, unit: 'lb', program: copyProgram(PROGRAMS[0]), customLifts: [], history: [], active: null };
}

function adopt(d: Data) {
  for (const l of d.customLifts) LIFTS[l.id] = l;
  return d;
}

export function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return adopt({ ...fresh(), ...JSON.parse(raw) });
  } catch {}
  return fresh();
}

export const save = (d: Data) => localStorage.setItem(KEY, JSON.stringify(d));

export function exportJson(d: Data) {
  const blob = new Blob([JSON.stringify({ ...d, active: null }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `stronk-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function importJson(text: string): Data {
  const d = JSON.parse(text);
  if (!d || !Array.isArray(d.history) || !d.program?.workouts) throw new Error('Not a stronk backup');
  return adopt({ ...fresh(), ...d, active: null });
}

export function addCustomLift(d: Data, name: string): string {
  const base = 'c-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let id = base;
  for (let i = 2; LIFTS[id]; i++) id = `${base}-${i}`;
  const lift: Lift = { id, name, inc: 5, start: 0, rest: 90 };
  d.customLifts.push(lift);
  LIFTS[id] = lift;
  return id;
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
