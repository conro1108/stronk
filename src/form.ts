// Form hints: a looping stick figure and a few cues per lift. Each pose is two
// keyframes of anchor points (hip P, shoulder S, hand H, ankle A); knees and
// elbows are solved by two-bone IK, bending toward side k/e (1 = toward the
// figure's front for a downward limb). `mirror` draws a front view about that x.
// Coordinates are a side view facing right, floor at y≈90; the viewBox fits
// itself. See every figure at once on #/forms.

type P2 = [number, number];
type Frame = { P: P2; S: P2; H: P2; A: P2; A2?: P2; ft?: number };
type Prop =
  | { line: number[] } // static polyline x,y,x,y…
  | { plate: 'H' | 'S' | 'P'; off?: P2; r?: number } // barbell end-on
  | { db: true } // dumbbell at H
  | { cable: P2 } // cable from a fixed pulley to H
  | { pad: true } // roller pad at the ankle
  | { sled: true }; // leg-press sled under the feet
type Form = { a: Frame; b: Frame; k?: number; e?: number; k2?: number; mirror?: number; props?: Prop[]; cues: string[] };

const LEG: [number, number] = [21, 20];
const ARM: [number, number] = [14, 13];
const stand = { P: [48, 48] as P2, S: [48, 22] as P2, A: [48, 89] as P2 };
const up = (f: Frame, dy: number): Frame => ({ ...f, P: [f.P[0], f.P[1] - dy], S: [f.S[0], f.S[1] - dy], H: [f.H[0], f.H[1] - dy], A: [f.A[0], f.A[1] - dy] });

export const FORMS: Record<string, Form> = {
  squat: {
    a: { ...stand, H: [43, 22] },
    b: { A: [48, 89], P: [35, 67], S: [52, 47], H: [47, 46] },
    props: [{ plate: 'S', off: [-3, -1] }],
    cues: ['Bar on upper back, brace before you descend', 'Sit between your heels, knees track over toes', 'Hip crease below the knee, drive up through mid-foot'],
  },
  'front-squat': {
    a: { ...stand, H: [52, 17] },
    b: { A: [48, 89], P: [37, 69], S: [45, 44], H: [49, 39] },
    e: 1,
    props: [{ plate: 'S', off: [4, -1] }],
    cues: ['Bar rests on front delts, elbows high', 'Stay tall — chest up the whole way', 'Squat straight down between your heels'],
  },
  deadlift: {
    a: { ...stand, H: [49, 49] },
    b: { A: [48, 89], P: [38, 60], S: [61, 50], H: [61, 79] },
    props: [{ plate: 'H' }],
    cues: ['Bar over mid-foot, shins touch it', 'Pull the slack out, flat back, then push the floor away', 'Bar drags up your legs; lock out with glutes, not a lean back'],
  },
  rdl: {
    a: { ...stand, H: [49, 49] },
    b: { A: [48, 89], P: [39, 51], S: [64, 45], H: [64, 71] },
    props: [{ plate: 'H' }],
    cues: ['Soft knees, then push hips straight back', 'Bar stays against your legs', 'Stop when hamstrings are tight, back still flat'],
  },
  bench: {
    a: { P: [62, 56], S: [36, 56], A: [79, 89], H: [37, 29] },
    b: { P: [62, 56], S: [36, 56], A: [79, 89], H: [43, 49] },
    k: -1,
    e: -1,
    props: [{ line: [18, 61, 70, 61] }, { line: [24, 61, 24, 90] }, { line: [64, 61, 64, 90] }, { plate: 'H' }],
    cues: ['Shoulder blades pinched, slight arch, feet planted', 'Lower to mid-chest, elbows ~45° from your sides', 'Press back up over the shoulders'],
  },
  ohp: {
    a: { ...stand, H: [53, 21] },
    b: { ...stand, H: [48, -4] },
    e: 1,
    props: [{ plate: 'H' }],
    cues: ['Squeeze glutes and abs — no leaning back', 'Move your head back, bar goes straight up', 'Finish with bar over mid-foot, head through'],
  },
  row: {
    a: { A: [48, 89], P: [40, 52], S: [64, 44], H: [64, 71] },
    b: { A: [48, 89], P: [40, 52], S: [64, 44], H: [54, 57] },
    props: [{ plate: 'H' }],
    cues: ['Hinge to ~45°, flat back, soft knees', 'Pull to your lower ribs, elbows back', "Don't stand up to move the weight"],
  },
  'incline-db': {
    a: { P: [60, 64], S: [40, 47], A: [80, 89], H: [44, 44] },
    b: { P: [60, 64], S: [40, 47], A: [80, 89], H: [55, 23] },
    k: -1,
    e: -1,
    props: [{ line: [34, 52, 63, 69, 80, 69] }, { line: [63, 69, 63, 90] }, { db: true }],
    cues: ['Bench at 30–45°, shoulder blades back', 'Lower to upper chest with a deep stretch', 'Press up and slightly in'],
  },
  'db-press': {
    a: { P: [50, 68], S: [50, 42], A: [71, 88], H: [52, 37] },
    b: { P: [50, 68], S: [50, 42], A: [71, 88], H: [51, 16] },
    k: -1,
    e: 1,
    props: [{ line: [40, 38, 40, 71, 60, 71] }, { line: [50, 71, 50, 90] }, { db: true }],
    cues: ['Back against the pad, ribs down', 'Start with dumbbells at ear height', 'Press up without banging them together'],
  },
  pullup: {
    a: { H: [55, 8], S: [54, 34], P: [52, 60], A: [45, 98], ft: 150 },
    b: { H: [55, 8], S: [50, 17], P: [53, 43], A: [47, 81], ft: 150 },
    k: -1,
    e: 1,
    props: [{ line: [30, 8, 80, 8] }],
    cues: ['Start from a dead hang, shoulders engaged', 'Drive elbows down to your ribs', 'Chin over the bar, lower under control'],
  },
  pulldown: {
    a: { P: [45, 70], S: [39, 45], A: [66, 90], H: [44, 18] },
    b: { P: [45, 70], S: [39, 45], A: [66, 90], H: [44, 44] },
    k: -1,
    e: 1,
    props: [{ line: [34, 73, 56, 73] }, { line: [58, 62, 70, 62] }, { cable: [44, -4] }],
    cues: ['Thighs locked under the pad, slight lean back', 'Pull the bar to your upper chest', 'Lead with elbows, not hands'],
  },
  'cable-row': {
    a: { P: [32, 74], S: [35, 48], A: [72, 80], H: [61, 50] },
    b: { P: [32, 74], S: [33, 48], A: [72, 80], H: [44, 60] },
    k: -1,
    e: -1,
    props: [{ line: [20, 77, 58, 77] }, { line: [77, 70, 77, 90] }, { cable: [97, 78] }],
    cues: ['Sit tall, knees soft', 'Pull to your belly, squeeze shoulder blades', "Let arms stretch forward without rounding over"],
  },
  'leg-press': {
    a: { P: [35, 70], S: [14, 55], A: [64, 41], H: [36, 74] },
    b: { P: [35, 70], S: [14, 55], A: [51, 54], H: [36, 74] },
    k: 1,
    e: -1,
    props: [{ line: [8, 51, 40, 77] }, { sled: true }],
    cues: ['Feet shoulder-width, mid-platform', 'Lower until knees are near your chest — hips stay down', "Press through heels, don't lock the knees hard"],
  },
  'split-squat': {
    a: { P: [44, 50], S: [46, 24], A: [57, 89], A2: [20, 62], H: [46, 51], ft: 90 },
    b: { P: [41, 65], S: [44, 39], A: [57, 89], A2: [20, 62], H: [44, 66], ft: 90 },
    k2: 1,
    props: [{ line: [8, 64, 30, 64] }, { line: [12, 64, 12, 90] }, { line: [27, 64, 27, 90] }, { db: true }],
    cues: ['Rear foot on the bench, front foot well forward', 'Drop straight down, front knee over toes', 'Drive up through the front heel'],
  },
  'hip-thrust': {
    a: { P: [46, 77], S: [28, 57], A: [70, 89], H: [44, 72] },
    b: { P: [52, 56], S: [28, 57], A: [70, 89], H: [51, 52] },
    k: -1,
    e: -1,
    props: [{ line: [12, 61, 30, 61] }, { line: [16, 61, 16, 90] }, { plate: 'P', off: [0, -6] }],
    cues: ['Upper back on the bench edge, bar over hips', 'Chin tucked, drive hips up until flat', 'Squeeze glutes at the top for a beat'],
  },
  'leg-curl': {
    a: { P: [45, 66], S: [42, 40], A: [86, 62], H: [50, 64] },
    b: { P: [45, 66], S: [42, 40], A: [62, 87], H: [50, 64] },
    k: -1,
    props: [{ line: [32, 38, 34, 69, 62, 69] }, { line: [48, 69, 48, 90] }, { pad: true }],
    cues: ['Knees lined up with the machine pivot', 'Curl heels under you, hold a beat', 'Lower slowly — the negative counts'],
  },
  'leg-ext': {
    a: { P: [45, 66], S: [42, 40], A: [63, 86], H: [50, 66] },
    b: { P: [45, 66], S: [42, 40], A: [86, 62], H: [50, 66] },
    k: -1,
    props: [{ line: [32, 38, 34, 69, 62, 69] }, { line: [48, 69, 48, 90] }, { pad: true }],
    cues: ['Knees at the pivot, back against the pad', 'Straighten fully and squeeze the quads', 'Lower under control'],
  },
  calf: {
    a: { ...stand, H: [49, 49], ft: 80 },
    b: up({ ...stand, H: [49, 49], A: [50, 89], ft: 150 }, 7),
    props: [{ line: [42, 91, 64, 91] }, { plate: 'S', off: [-3, -1] }],
    cues: ['Balls of feet on the edge', 'Full stretch at the bottom, pause', 'Rise as high as you can, knees straight'],
  },
  lateral: {
    a: { P: [43, 48], S: [40, 23], A: [43, 89], H: [37, 49], ft: -110 },
    b: { P: [43, 48], S: [40, 23], A: [43, 89], H: [15, 27], ft: -110 },
    mirror: 48,
    e: 1,
    props: [{ db: true }],
    cues: ['Slight bend in the elbows, lean a touch forward', 'Raise out to the sides to shoulder height', 'Lead with elbows; lower slowly'],
  },
  'face-pull': {
    a: { ...stand, H: [73, 19] },
    b: { ...stand, H: [54, 13] },
    e: -1,
    props: [{ cable: [99, 17] }],
    cues: ['Rope at face height, thumbs toward you', 'Pull to your forehead, hands apart', 'Elbows high, finish like a double-biceps pose'],
  },
  curl: {
    a: { ...stand, H: [50, 49] },
    b: { ...stand, H: [55, 26] },
    e: -1,
    props: [{ plate: 'H', r: 6 }],
    cues: ['Elbows pinned to your sides', 'Curl up without swinging', 'Lower all the way down'],
  },
  pushdown: {
    a: { ...stand, H: [57, 30] },
    b: { ...stand, H: [52, 49] },
    e: -1,
    props: [{ cable: [57, -6] }],
    cues: ['Elbows fixed at your sides', 'Push down until arms are straight', "Only the forearms move"],
  },
  'leg-raise': {
    a: { H: [48, 6], S: [48, 32], P: [48, 58], A: [49, 99], ft: 170 },
    b: { H: [48, 6], S: [46, 32], P: [50, 58], A: [91, 57], ft: 60 },
    e: 1,
    props: [{ line: [28, 6, 68, 6] }],
    cues: ['Dead hang, no swinging', 'Raise legs by curling the pelvis up', 'Lower slowly to a full hang'],
  },
  'cable-crunch': {
    a: { P: [48, 64], S: [50, 38], A: [28, 88], H: [56, 31], ft: 180 },
    b: { P: [48, 64], S: [68, 58], A: [28, 88], H: [70, 50], ft: 180 },
    k: 1,
    e: -1,
    props: [{ cable: [58, -8] }],
    cues: ['Kneel, rope held beside your head', 'Curl your ribs toward your hips', "Hips stay put — it's a crunch, not a bow"],
  },
};

// ---------- geometry ----------

function ik(a: P2, b: P2, [l1, l2]: [number, number], side: number): P2 {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d, uy = dy / d;
  if (d >= l1 + l2) return [a[0] + ux * l1, a[1] + uy * l1];
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x)) * side;
  return [a[0] + ux * x + uy * h, a[1] + uy * x - ux * h];
}

const toe = (A: P2, deg = 90): P2 => [A[0] + 7 * Math.sin((deg * Math.PI) / 180), A[1] - 7 * Math.cos((deg * Math.PI) / 180)];

type Shape = { kind: 'body' | 'far' | 'kit' | 'iron'; pts: P2[]; r?: number }; // r => circle at pts[0]

function shapes(f: Form, fr: Frame): Shape[] {
  const { P, S, H, A } = fr;
  const E = ik(S, H, ARM, f.e ?? -1);
  const K = ik(P, A, LEG, f.k ?? 1);
  const out: Shape[] = [];
  const m = f.mirror;
  const flip = (pts: P2[]): P2[] => pts.map(([x, y]) => [2 * m! - x, y]);
  const len = Math.hypot(S[0] - P[0], S[1] - P[1]);

  for (const p of f.props ?? []) {
    if ('line' in p) {
      const pts: P2[] = [];
      for (let i = 0; i < p.line.length; i += 2) pts.push([p.line[i], p.line[i + 1]]);
      out.push({ kind: 'kit', pts });
    } else if ('cable' in p) out.push({ kind: 'kit', pts: [p.cable, H] });
    else if ('sled' in p) out.push({ kind: 'kit', pts: [[A[0] - 9, A[1] - 9], [A[0] + 9, A[1] + 9]] });
  }

  const leg = [P, K, A, toe(A, fr.ft)];
  if (fr.A2) {
    const K2 = ik(P, fr.A2, LEG, f.k2 ?? 1);
    out.push({ kind: 'far', pts: [P, K2, fr.A2, toe(fr.A2, 0)] });
  }
  if (m != null) {
    out.push({ kind: 'body', pts: flip(leg) }, { kind: 'body', pts: flip([S, E, H]) });
    out.push({ kind: 'body', pts: [S, flip([S])[0]] }, { kind: 'body', pts: [P, flip([P])[0]] });
    out.push({ kind: 'body', pts: [[m, S[1]], [m, P[1]]] }, { kind: 'body', pts: [[m, S[1] - 9]], r: 5.5 });
  } else {
    out.push({ kind: 'body', pts: [P, S] }, { kind: 'body', pts: [[S[0] + ((S[0] - P[0]) / len) * 9, S[1] + ((S[1] - P[1]) / len) * 9]], r: 5.5 });
  }
  out.push({ kind: 'body', pts: leg }, { kind: 'body', pts: [S, E, H] });

  for (const p of f.props ?? []) {
    if ('plate' in p) {
      const at = fr[p.plate], off = p.off ?? [0, 0];
      out.push({ kind: 'iron', pts: [[at[0] + off[0], at[1] + off[1]]], r: p.r ?? 8 });
    } else if ('db' in p) {
      out.push({ kind: 'iron', pts: [H], r: 3.5 });
      if (m != null) out.push({ kind: 'iron', pts: flip([H]), r: 3.5 });
    } else if ('pad' in p) out.push({ kind: 'kit', pts: [A], r: 3 });
  }
  return out;
}

// ---------- svg ----------

const fmt = (pts: P2[]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
const ANIM = 'dur="3.2s" repeatCount="indefinite" keyTimes="0;0.15;0.5;0.65;1" calcMode="spline" keySplines="0 0 1 1;.45 0 .55 1;0 0 1 1;.45 0 .55 1"';
const anim = (attr: string, a: string, b: string) => (a === b ? '' : `<animate attributeName="${attr}" values="${a};${a};${b};${b};${a}" ${ANIM}/>`);

export const hasForm = (lift: string) => lift in FORMS;

export function formSvg(lift: string, cls = 'form', still = false): string {
  const f = FORMS[lift];
  if (!f) return '';
  const A = shapes(f, f.a), B = shapes(f, f.b);
  const all = [...A, ...B].flatMap((s) => s.pts.map(([x, y]) => [x, y, s.r ?? 0]));
  const x0 = Math.min(...all.map((p) => p[0] - p[2])), x1 = Math.max(...all.map((p) => p[0] + p[2]));
  const y0 = Math.min(...all.map((p) => p[1] - p[2])), y1 = Math.max(...all.map((p) => p[1] + p[2]));
  const size = Math.max(x1 - x0, y1 - y0) + 10;
  const vb = `${((x0 + x1) / 2 - size / 2).toFixed(1)} ${((y0 + y1) / 2 - size / 2).toFixed(1)} ${size.toFixed(1)} ${size.toFixed(1)}`;
  const els = A.map((s, i) => {
    const t = B[i];
    if (s.r) {
      const [ax, ay] = s.pts[0].map((v) => v.toFixed(1)), [bx, by] = t.pts[0].map((v) => v.toFixed(1));
      return `<circle class="${s.kind}" r="${s.r}" cx="${still ? bx : ax}" cy="${still ? by : ay}">${still ? '' : anim('cx', ax, bx) + anim('cy', ay, by)}</circle>`;
    }
    const a = fmt(s.pts), b = fmt(t.pts);
    return `<polyline class="${s.kind}" points="${still ? b : a}">${still ? '' : anim('points', a, b)}</polyline>`;
  }).join('');
  return `<svg class="${cls}" viewBox="${vb}" aria-hidden="true">${els}</svg>`;
}

export const cues = (lift: string) => FORMS[lift]?.cues ?? [];
