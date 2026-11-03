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
};

export type Slot = { lift: string; sets: number; reps: [min: number, max: number] };
export type Workout = { id: string; name: string; slots: Slot[] };
export type Program = { id: string; name: string; blurb: string; workouts: Workout[] };

const L = (id: string, name: string, inc: number, start: number, rest: number): Lift => ({ id, name, inc, start, rest });

export const LIFTS: Record<string, Lift> = Object.fromEntries(
  [
    L('squat', 'Back Squat', 10, 95, 150),
    L('front-squat', 'Front Squat', 5, 75, 120),
    L('deadlift', 'Deadlift', 10, 135, 150),
    L('rdl', 'Romanian Deadlift', 10, 95, 90),
    L('bench', 'Bench Press', 5, 95, 120),
    L('ohp', 'Overhead Press', 5, 65, 120),
    L('row', 'Barbell Row', 5, 75, 90),
    L('incline-db', 'Incline DB Press', 5, 30, 90),
    L('db-press', 'Seated DB Shoulder Press', 5, 25, 75),
    L('pullup', 'Pull-up', 5, 0, 90),
    L('pulldown', 'Lat Pulldown', 5, 80, 75),
    L('cable-row', 'Seated Cable Row', 5, 80, 75),
    L('leg-press', 'Leg Press', 10, 180, 90),
    L('split-squat', 'Bulgarian Split Squat', 5, 20, 75),
    L('hip-thrust', 'Hip Thrust', 10, 95, 75),
    L('leg-curl', 'Leg Curl', 5, 50, 75),
    L('leg-ext', 'Leg Extension', 5, 50, 75),
    L('calf', 'Standing Calf Raise', 10, 90, 60),
    L('lateral', 'Lateral Raise', 5, 15, 60),
    L('face-pull', 'Face Pull', 5, 30, 60),
    L('curl', 'Barbell Curl', 5, 45, 60),
    L('pushdown', 'Triceps Pushdown', 5, 40, 60),
    L('leg-raise', 'Hanging Leg Raise', 5, 0, 60),
    L('cable-crunch', 'Cable Crunch', 5, 60, 60),
  ].map((l) => [l.id, l]),
);

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
        slots: [S('bench', 4, 5, 8), S('row', 4, 6, 10), S('ohp', 3, 6, 10), S('pulldown', 3, 8, 12), S('lateral', 3, 12, 20), S('pushdown', 3, 10, 15)],
      },
      {
        id: 'lower-a',
        name: 'Lower A',
        slots: [S('squat', 4, 5, 8), S('rdl', 3, 8, 12), S('leg-press', 3, 10, 15), S('leg-curl', 3, 10, 15), S('calf', 4, 10, 15), S('leg-raise', 3, 8, 15)],
      },
      {
        id: 'upper-b',
        name: 'Upper B',
        slots: [S('incline-db', 4, 8, 12), S('pullup', 4, 5, 10), S('cable-row', 3, 8, 12), S('db-press', 3, 8, 12), S('curl', 3, 8, 12), S('face-pull', 3, 12, 20)],
      },
      {
        id: 'lower-b',
        name: 'Lower B',
        slots: [S('deadlift', 3, 3, 6), S('split-squat', 3, 8, 12), S('hip-thrust', 3, 8, 12), S('leg-ext', 3, 10, 15), S('calf', 3, 12, 20), S('cable-crunch', 3, 10, 15)],
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
        slots: [S('squat', 3, 5, 8), S('bench', 3, 5, 8), S('row', 3, 6, 10), S('leg-curl', 2, 10, 15), S('lateral', 2, 12, 20)],
      },
      {
        id: 'fb-b',
        name: 'Day B',
        slots: [S('deadlift', 3, 3, 6), S('ohp', 3, 6, 10), S('pullup', 3, 5, 10), S('split-squat', 2, 8, 12), S('curl', 2, 8, 12)],
      },
      {
        id: 'fb-c',
        name: 'Day C',
        slots: [S('front-squat', 3, 6, 10), S('incline-db', 3, 8, 12), S('cable-row', 3, 8, 12), S('hip-thrust', 2, 8, 12), S('pushdown', 2, 10, 15)],
      },
    ],
  },
];

export const liftInfo = (id: string): Lift => LIFTS[id] ?? { id, name: id, inc: 5, start: 0, rest: 90 };
