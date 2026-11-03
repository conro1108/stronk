import { describe, expect, it } from 'vitest';
import { target, type Session } from './progress';

const bench = { lift: 'bench', sets: 3, reps: [5, 8] as [number, number] };
let n = 0;
const sess = (w: number, reps: number[], range: [number, number] = [5, 8]): Session => ({
  id: String(n++), program: 'p', workout: 'w', date: new Date(2026, 0, n).toISOString(), unit: 'lb',
  lifts: [{ lift: 'bench', reps: range, sets: reps.map((r) => ({ w, r })) }],
});
const hist = (...s: Session[]) => s.reverse(); // newest first

describe('target', () => {
  it('starts from the catalog guess', () => {
    expect(target(bench, [], 'lb')).toMatchObject({ kind: 'new', w: 95, reps: [5, 5, 5] });
  });
  it('adds a rep per set until the top of the range', () => {
    expect(target(bench, hist(sess(135, [8, 7, 5])), 'lb')).toMatchObject({ kind: 'same', w: 135, reps: [8, 8, 6] });
  });
  it('adds weight once every set hits the top', () => {
    expect(target(bench, hist(sess(135, [8, 8, 8])), 'lb')).toMatchObject({ kind: 'up', w: 140, reps: [5, 5, 5] });
  });
  it('deloads after two misses at one weight', () => {
    expect(target(bench, hist(sess(135, [5, 4, 4]), sess(135, [5, 4, 3])), 'lb')).toMatchObject({ kind: 'deload', w: 120 });
  });
  it('progresses from the same rep range when the lift is on two days', () => {
    expect(target(bench, hist(sess(135, [8, 8, 8]), sess(60, [20, 20, 20], [12, 20])), 'lb')).toMatchObject({ kind: 'up', w: 140 });
  });
  it('scales across rep ranges and units', () => {
    const t = target(bench, hist(sess(100, [12, 12, 12], [8, 12])), 'kg');
    expect(t.kind).toBe('scaled');
    expect(t.w % 2.5).toBe(0);
    expect(t.w).toBeGreaterThan(45);
  });
});

it('snaps suggestions to a jump the user set', async () => {
  const { LIFTS } = await import('./program');
  LIFTS.row = { ...LIFTS.row, inc: 10, snap: true };
  expect(target({ lift: 'row', sets: 3, reps: [6, 10] }, [], 'lb').w).toBe(80);
});
