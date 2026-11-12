// The lift catalog and the template programs. Templates are starting points:
// picking one copies it into storage, where the user edits it. Custom lifts
// are merged into LIFTS at load (store.ts). History is keyed by lift id, so
// renaming is safe but changing an id orphans its history.

export type Lift = {
  id: string;
  name: string;
  inc: number; // lb added when you top the rep range (halved for kg)
  start: number; // first-ever suggestion, lb (0 = bodyweight / added weight)
  rest: number; // seconds
  snap?: boolean; // only multiples of inc exist (user set the jump)
  kin?: string; // movement group: lifts sharing one are swaps for each other
};

export type Slot = { lift: string; sets: number; reps: [min: number, max: number] };
export type Workout = { id: string; name: string; slots: Slot[] };
export type Program = { id: string; name: string; blurb: string; workouts: Workout[] };

const L = (id: string, name: string, inc: number, start: number, rest: number): Lift => ({ id, name, inc, start, rest });
const kin = (k: string, ...ls: Lift[]) => ls.map((l) => ({ ...l, kin: k }));

// Grouped by movement. Within a group, the ratio of two lifts' `start` is the
// guess at how weight carries from one to the other (progress.ts), so starts
// are per-implement: one dumbbell, one cable handle, the machine's stack.
export const LIFTS: Record<string, Lift> = Object.fromEntries(
  [
    ...kin(
      'press',
      L('bench', 'Bench Press', 5, 95, 120),
      L('db-bench', 'Dumbbell Bench Press', 5, 35, 90),
      L('chest-press', 'Chest Press Machine', 5, 80, 90),
      L('smith-bench', 'Smith Machine Bench', 5, 85, 90),
      L('close-bench', 'Close-Grip Bench Press', 5, 80, 90),
      L('incline-bench', 'Incline Bench Press', 5, 75, 120),
      L('incline-db', 'Incline DB Press', 5, 30, 90),
      L('incline-press', 'Incline Press Machine', 5, 65, 90),
      L('pushup', 'Push-up', 5, 0, 60),
    ),
    ...kin(
      'fly',
      L('pec-deck', 'Pec Deck', 5, 60, 60),
      L('cable-fly', 'Cable Fly', 5, 15, 60),
      L('db-fly', 'Dumbbell Fly', 5, 15, 60),
    ),
    ...kin(
      'overhead',
      L('ohp', 'Overhead Press', 5, 65, 120),
      L('db-press', 'Seated DB Shoulder Press', 5, 25, 75),
      L('shoulder-press', 'Shoulder Press Machine', 5, 50, 75),
      L('smith-ohp', 'Smith Machine Shoulder Press', 5, 60, 90),
    ),
    ...kin(
      'lateral',
      L('lateral', 'Lateral Raise', 5, 15, 60),
      L('cable-lateral', 'Cable Lateral Raise', 5, 10, 60),
      L('machine-lateral', 'Lateral Raise Machine', 5, 40, 60),
    ),
    ...kin(
      'rear-delt',
      L('face-pull', 'Face Pull', 5, 30, 60),
      L('rear-delt', 'Reverse Pec Deck', 5, 40, 60),
      L('db-rear-delt', 'Bent-over DB Reverse Fly', 5, 10, 60),
    ),
    ...kin(
      'pull',
      L('pullup', 'Pull-up', 5, 0, 90),
      L('chinup', 'Chin-up', 5, 0, 90),
      L('pulldown', 'Lat Pulldown', 5, 80, 75),
      L('close-pulldown', 'Close-Grip Pulldown', 5, 80, 75),
      L('machine-pulldown', 'Pulldown Machine', 5, 70, 75),
    ),
    ...kin(
      'pullover',
      L('straight-arm', 'Straight-Arm Pulldown', 5, 30, 60),
      L('pullover', 'Pullover Machine', 5, 60, 60),
    ),
    ...kin(
      'row',
      L('row', 'Barbell Row', 5, 75, 90),
      L('cable-row', 'Seated Cable Row', 5, 80, 75),
      L('db-row', 'One-arm DB Row', 5, 35, 75),
      L('machine-row', 'Machine Row', 5, 70, 75),
      L('chest-row', 'Chest-Supported Row', 5, 60, 75),
      L('tbar-row', 'T-Bar Row', 5, 70, 90),
    ),
    ...kin('shrug', L('shrug', 'Dumbbell Shrug', 5, 40, 60), L('machine-shrug', 'Shrug Machine', 10, 90, 60)),
    ...kin(
      'squat',
      L('squat', 'Back Squat', 10, 95, 150),
      L('front-squat', 'Front Squat', 5, 75, 120),
      L('smith-squat', 'Smith Machine Squat', 10, 95, 120),
      L('hack-squat', 'Hack Squat', 10, 90, 120),
      L('pendulum-squat', 'Pendulum Squat', 10, 70, 120),
      L('belt-squat', 'Belt Squat', 10, 90, 120),
      L('leg-press', 'Leg Press', 10, 180, 90),
      L('goblet-squat', 'Goblet Squat', 5, 30, 75),
    ),
    ...kin(
      'lunge',
      L('split-squat', 'Bulgarian Split Squat', 5, 20, 75),
      L('lunge', 'Walking Lunge', 5, 20, 75),
      L('smith-split', 'Smith Machine Split Squat', 5, 50, 75),
      L('step-up', 'Step-up', 5, 15, 75),
    ),
    ...kin(
      'hinge',
      L('deadlift', 'Deadlift', 10, 135, 150),
      L('trap-deadlift', 'Trap Bar Deadlift', 10, 145, 150),
      L('rdl', 'Romanian Deadlift', 10, 95, 90),
      L('db-rdl', 'Dumbbell RDL', 5, 35, 90),
      L('back-ext', 'Back Extension', 5, 0, 60),
    ),
    ...kin(
      'glute',
      L('hip-thrust', 'Hip Thrust', 10, 95, 75),
      L('thrust-machine', 'Hip Thrust Machine', 10, 90, 75),
      L('pull-through', 'Cable Pull-Through', 5, 50, 60),
      L('kickback', 'Glute Kickback Machine', 5, 40, 60),
    ),
    ...kin('ham', L('leg-curl', 'Leg Curl', 5, 50, 75), L('seated-curl', 'Seated Leg Curl', 5, 55, 75)),
    L('leg-ext', 'Leg Extension', 5, 50, 75),
    L('adductor', 'Hip Adduction Machine', 5, 60, 60),
    L('abductor', 'Hip Abduction Machine', 5, 60, 60),
    ...kin(
      'calf',
      L('calf', 'Standing Calf Raise', 10, 90, 60),
      L('seated-calf', 'Seated Calf Raise', 10, 45, 60),
      L('press-calf', 'Leg Press Calf Raise', 10, 140, 60),
    ),
    ...kin(
      'curl',
      L('curl', 'Barbell Curl', 5, 45, 60),
      L('db-curl', 'Dumbbell Curl', 5, 20, 60),
      L('hammer-curl', 'Hammer Curl', 5, 20, 60),
      L('cable-curl', 'Cable Curl', 5, 40, 60),
      L('preacher', 'Preacher Curl Machine', 5, 40, 60),
    ),
    ...kin(
      'triceps',
      L('pushdown', 'Triceps Pushdown', 5, 40, 60),
      L('overhead-ext', 'Overhead Cable Extension', 5, 30, 60),
      L('skullcrusher', 'Skull Crusher', 5, 40, 60),
      L('dip-machine', 'Seated Dip Machine', 5, 80, 60),
      L('dip', 'Dip', 5, 0, 90),
    ),
    ...kin(
      'abs',
      L('leg-raise', 'Hanging Leg Raise', 5, 0, 60),
      L('cable-crunch', 'Cable Crunch', 5, 60, 60),
      L('ab-machine', 'Ab Crunch Machine', 5, 50, 60),
    ),
  ].map((l) => [l.id, l]),
);

/** Other lifts that train the same movement, by name. */
export const related = (id: string): Lift[] => {
  const k = LIFTS[id]?.kin;
  return k ? Object.values(LIFTS).filter((l) => l.kin === k && l.id !== id).sort((a, b) => a.name.localeCompare(b.name)) : [];
};

const S = (lift: string, sets: number, min: number, max: number): Slot => ({ lift, sets, reps: [min, max] });

export const PROGRAMS: Program[] = [
  {
    id: 'ul4',
    name: 'Upper / Lower',
    blurb: '4 days a week. Heavy compounds first, accessories after.',
    workouts: [
      {
        id: 'upper-a',
        name: 'Upper A',
        slots: [S('bench', 4, 5, 8), S('row', 4, 6, 10), S('ohp', 3, 6, 10), S('pulldown', 3, 8, 12), S('cable-fly', 3, 10, 15), S('lateral', 3, 12, 20), S('pushdown', 3, 10, 15), S('hammer-curl', 2, 10, 15)],
      },
      {
        id: 'lower-a',
        name: 'Lower A',
        slots: [S('squat', 4, 5, 8), S('rdl', 3, 8, 12), S('leg-press', 3, 10, 15), S('leg-curl', 3, 10, 15), S('calf', 4, 10, 15), S('leg-raise', 3, 8, 15)],
      },
      {
        id: 'upper-b',
        name: 'Upper B',
        slots: [S('incline-db', 3, 8, 12), S('close-pulldown', 3, 6, 10), S('db-press', 3, 8, 12), S('cable-row', 3, 8, 12), S('pec-deck', 3, 10, 15), S('curl', 3, 8, 12), S('overhead-ext', 3, 10, 15), S('face-pull', 2, 12, 20)],
      },
      {
        id: 'lower-b',
        name: 'Lower B',
        slots: [S('deadlift', 3, 3, 6), S('split-squat', 3, 8, 12), S('hip-thrust', 3, 8, 12), S('leg-ext', 3, 10, 15), S('seated-curl', 3, 10, 15), S('seated-calf', 3, 12, 20), S('cable-crunch', 3, 10, 15)],
      },
    ],
  },
  {
    id: 'fb3',
    name: 'Full Body',
    blurb: '3 days a week (e.g. Mon/Wed/Fri). Every day hits everything.',
    workouts: [
      {
        id: 'fb-a',
        name: 'Day A',
        slots: [S('squat', 3, 5, 8), S('bench', 3, 5, 8), S('row', 3, 6, 10), S('leg-curl', 2, 10, 15), S('lateral', 2, 12, 20), S('cable-crunch', 2, 10, 15)],
      },
      {
        id: 'fb-b',
        name: 'Day B',
        slots: [S('deadlift', 3, 3, 6), S('ohp', 3, 6, 10), S('pulldown', 3, 6, 10), S('split-squat', 2, 8, 12), S('pec-deck', 2, 10, 15), S('curl', 2, 8, 12)],
      },
      {
        id: 'fb-c',
        name: 'Day C',
        slots: [S('front-squat', 3, 6, 10), S('incline-db', 3, 8, 12), S('cable-row', 3, 8, 12), S('hip-thrust', 2, 8, 12), S('pushdown', 2, 10, 15), S('calf', 2, 10, 15)],
      },
    ],
  },
];

export const liftInfo = (id: string): Lift => LIFTS[id] ?? { id, name: id, inc: 5, start: 0, rest: 90 };
