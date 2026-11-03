// The whole UI: hash-routed views rendered as HTML strings into #app, with one
// delegated click/change handler. Views: home (#/), session (#/go), lift
// history (#/lift/id), past session (#/log/id), program editor (#/edit),
// settings (#/settings). The rest timer and session clock live outside #app.

import './style.css';
import { LIFTS, PROGRAMS, liftInfo, type Workout } from './program';
import { e1rm, fmtW, liftHistory, target, type Session } from './progress';
import { addCustomLift, copyProgram, exportJson, importJson, load, save, uid, type Active, type Data } from './store';
import { seed } from './dev';

let D: Data = load();
const commit = () => save(D);

const params = new URLSearchParams(location.search);
if (params.has('wipe') || params.has('seed')) {
  if (params.has('wipe')) Object.assign(D, { history: [], active: null });
  if (params.has('seed')) D.history = seed(D, Number(params.get('seed')) || 6);
  commit();
  history.replaceState(null, '', location.pathname + location.hash);
}

const app = document.getElementById('app')!;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const go = (hash: string) => (location.hash = hash);
let picked: string | null = null; // workout previewed on home, if not the rotation's pick

// ---------- derived ----------

function nextWorkout(): Workout {
  const ws = D.program.workouts;
  const last = D.history.find((s) => ws.some((w) => w.id === s.workout));
  if (!last) return ws[0];
  return ws[(ws.findIndex((w) => w.id === last.workout) + 1) % ws.length];
}

const KIND_BADGE: Record<string, string> = { up: '↑', same: '=', deload: '↓', new: 'new', scaled: '≈' };

function targetLine(slot: Workout['slots'][number]) {
  const t = target(slot, D.history, D.unit);
  const reps = new Set(t.reps).size === 1 ? `${slot.sets}×${t.reps[0]}` : t.reps.join('·');
  return { t, html: `<span class="badge ${t.kind}">${KIND_BADGE[t.kind]}</span><b>${fmtW(t.w)}</b><small>${D.unit}</small> <span class="reps">${reps}</span>` };
}

// ---------- views ----------

function home() {
  const ws = D.program.workouts;
  const w = ws.find((x) => x.id === picked) ?? nextWorkout();
  const isNext = w.id === nextWorkout().id;
  const a = D.active;

  const card = a
    ? `<section class="card hero">
        <div class="eyebrow">In progress · ${Math.round((Date.now() - a.started) / 60000)} min</div>
        <h2>${esc(workoutName(a.workout))}</h2>
        <p class="muted">${a.lifts.reduce((n, l) => n + l.sets.filter((s) => s.done).length, 0)} sets logged</p>
        <button class="primary big" data-act="resume">Resume</button>
      </section>`
    : `<section class="card hero">
        <div class="eyebrow">${isNext ? 'Next up' : 'Picked'}</div>
        <h2>${esc(w.name)}</h2>
        <ul class="plan">${w.slots
          .map((s) => `<li><a href="#/lift/${s.lift}">${esc(liftInfo(s.lift).name)}</a><span>${targetLine(s).html}</span></li>`)
          .join('')}</ul>
        <button class="primary big" data-act="start" data-w="${w.id}">Start ${esc(w.name)}</button>
      </section>`;

  const chips = a
    ? ''
    : `<div class="chips">${ws
        .map((x) => `<button class="chip ${x.id === w.id ? 'on' : ''}" data-act="pick" data-w="${x.id}">${esc(x.name)}</button>`)
        .join('')}</div>`;

  const recent = D.history.slice(0, 10);
  return `
    <header class="top"><h1>stronk</h1><span class="muted">${esc(D.program.name)}</span>
      <nav><a href="#/edit" aria-label="Edit program">✎</a><a href="#/settings" aria-label="Settings">⚙</a></nav></header>
    ${card}${chips}
    <h3>Recent</h3>
    ${
      recent.length
        ? `<ul class="list">${recent
            .map(
              (s) => `<li><a href="#/log/${s.id}"><span>${day(s.date)}</span><b>${esc(sessionName(s))}</b>
              <span class="muted">${s.lifts.reduce((n, l) => n + l.sets.length, 0)} sets</span></a></li>`,
            )
            .join('')}</ul>`
        : `<p class="muted empty">Nothing yet. Targets start as guesses — fix the weights on day one and it learns from there.</p>`
    }`;
}

const workoutName = (id: string) => D.program.workouts.find((w) => w.id === id)?.name ?? 'Workout';
const sessionName = (s: Session) => s.name || workoutName(s.workout);

function session(a: Active) {
  const lifts = a.lifts
    .map((l, li) => {
      const info = liftInfo(l.lift);
      const done = l.sets.length > 0 && l.sets.every((s) => s.done);
      return `<section class="card lift ${done ? 'done' : ''}">
        <header><a href="#/lift/${l.lift}"><h2>${esc(info.name)}</h2></a><span class="muted">${l.sets.length}×${l.reps[0]}–${l.reps[1]}</span></header>
        <p class="note"><span class="badge ${l.target.kind}">${KIND_BADGE[l.target.kind]}</span>${esc(l.target.note)}</p>
        ${l.sets
          .map(
            (s, si) => `<div class="set ${s.done ? 'done' : ''}">
            <span class="n">${si + 1}</span>
            <input inputmode="decimal" data-f="w" data-l="${li}" data-s="${si}" value="${s.w ?? ''}" aria-label="weight"><small>${a.unit}</small>
            <span class="x">×</span>
            <input inputmode="numeric" data-f="r" data-l="${li}" data-s="${si}" value="${s.r ?? ''}" aria-label="reps">
            <button class="check" data-act="check" data-l="${li}" data-s="${si}" aria-label="done">✓</button>
          </div>`,
          )
          .join('')}
        <div class="row"><button data-act="addset" data-l="${li}">+ set</button><button data-act="rmset" data-l="${li}">− set</button>
          <button data-act="rmlift" data-l="${li}" class="ghost">remove</button></div>
      </section>`;
    })
    .join('');
  return `
    <header class="top sticky"><a href="#/" aria-label="Home">‹</a><h1>${esc(workoutName(a.workout))}</h1>
      <span id="clock" class="muted"></span><button class="primary" data-act="finish">Finish</button></header>
    ${lifts}
    <div class="card add">${liftPicker('addlift', '+ Add exercise')}</div>
    <button class="ghost wide" data-act="discard">Discard workout</button>`;
}

function liftPicker(act: string, label: string, extra = '') {
  const opts = Object.values(LIFTS)
    .sort((x, y) => x.name.localeCompare(y.name))
    .map((l) => `<option value="${l.id}">${esc(l.name)}</option>`)
    .join('');
  return `<select data-act="${act}" ${extra}><option value="">${label}</option>${opts}<option value="__new">New exercise…</option></select>`;
}

function liftView(id: string) {
  const info = liftInfo(id);
  const past = liftHistory(id, D.history, D.unit);
  const pts = past
    .map((p) => {
      const best = p.log.sets.reduce((b, s) => (e1rm(s) > e1rm(b) ? s : b));
      return { date: p.session.date, v: e1rm(best), best };
    })
    .reverse();
  const pr = pts.reduce<(typeof pts)[number] | null>((b, p) => (!b || p.v > b.v ? p : b), null);
  return `
    <header class="top"><a href="javascript:history.back()" aria-label="Back">‹</a><h1>${esc(info.name)}</h1></header>
    ${
      pr
        ? `<section class="card"><div class="eyebrow">Estimated 1RM</div>
          <div class="stat"><b>${Math.round(pts[pts.length - 1].v)}</b><small>${D.unit}</small>
          <span class="muted">best ${Math.round(pr.v)} · ${fmtW(pr.best.w)}×${pr.best.r} on ${day(pr.date)}</span></div>
          ${pts.length > 1 ? chart(pts) : ''}</section>`
        : `<p class="muted empty">No sets logged yet.</p>`
    }
    <ul class="list">${past
      .map(
        (p) => `<li><a href="#/log/${p.session.id}"><span>${day(p.session.date)}</span>
        <span class="sets">${p.log.sets.map((s) => `${fmtW(s.w)}×${s.r}`).join(', ')}</span></a></li>`,
      )
      .join('')}</ul>`;
}

// One series, so no legend: the card's eyebrow names it. Tap a point for its value.
function chart(pts: { date: string; v: number; best: { w: number; r: number } }[]) {
  const W = 320, H = 120, P = 10;
  const vs = pts.map((p) => p.v);
  const lo = Math.min(...vs), hi = Math.max(...vs), span = hi - lo || 1;
  const x = (i: number) => P + (i * (W - 2 * P)) / (pts.length - 1);
  const y = (v: number) => H - P - ((v - lo) / span) * (H - 2 * P);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  const dots = pts
    .map(
      (p, i) => `<g class="pt" data-act="pt" data-tip="${day(p.date)} · ${fmtW(p.best.w)}×${p.best.r} · e1RM ${Math.round(p.v)}">
      <circle r="14" cx="${x(i)}" cy="${y(p.v)}" class="hit"/><circle r="4" cx="${x(i)}" cy="${y(p.v)}"/></g>`,
    )
    .join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Estimated 1RM over time">
    <line x1="${P}" x2="${W - P}" y1="${H - P}" y2="${H - P}" class="axis"/>
    <path d="${line}"/>${dots}</svg><p id="tip" class="muted tip">Tap a point</p>`;
}

function logView(id: string) {
  const s = D.history.find((x) => x.id === id);
  if (!s) return `<header class="top"><a href="#/">‹</a><h1>Not found</h1></header>`;
  return `
    <header class="top"><a href="javascript:history.back()" aria-label="Back">‹</a><h1>${esc(sessionName(s))}</h1>
      <span class="muted">${day(s.date)}</span></header>
    ${s.lifts
      .map(
        (l) => `<section class="card"><a href="#/lift/${l.lift}"><h2>${esc(liftInfo(l.lift).name)}</h2></a>
        <p class="sets">${l.sets.map((x) => `${fmtW(x.w)}×${x.r}`).join(', ')} <small>${s.unit}</small></p></section>`,
      )
      .join('')}
    <button class="ghost wide danger" data-act="dellog" data-id="${s.id}">Delete this workout</button>`;
}

function editView() {
  const p = D.program;
  return `
    <header class="top"><a href="#/" aria-label="Home">‹</a><h1>Program</h1></header>
    <label class="field">Name <input data-edit="pname" value="${esc(p.name)}"></label>
    ${p.workouts
      .map(
        (w, wi) => `<section class="card">
        <header class="row"><input class="title" data-edit="wname" data-w="${wi}" value="${esc(w.name)}">
          <button class="ghost" data-act="wmove" data-w="${wi}" data-d="-1" aria-label="Move day up">↑</button>
          <button class="ghost danger" data-act="wdel" data-w="${wi}" aria-label="Delete day">✕</button></header>
        ${w.slots
          .map(
            (s, si) => `<div class="slot">
            <span class="name">${esc(liftInfo(s.lift).name)}</span>
            <input inputmode="numeric" data-edit="sets" data-w="${wi}" data-s="${si}" value="${s.sets}" aria-label="sets"><span class="x">×</span>
            <input inputmode="numeric" data-edit="min" data-w="${wi}" data-s="${si}" value="${s.reps[0]}" aria-label="min reps">–<input inputmode="numeric" data-edit="max" data-w="${wi}" data-s="${si}" value="${s.reps[1]}" aria-label="max reps">
            <button class="ghost" data-act="smove" data-w="${wi}" data-s="${si}" aria-label="Move up">↑</button>
            <button class="ghost danger" data-act="sdel" data-w="${wi}" data-s="${si}" aria-label="Remove">✕</button>
          </div>`,
          )
          .join('')}
        ${liftPicker('sadd', '+ Add exercise', `data-w="${wi}"`)}
      </section>`,
      )
      .join('')}
    <button class="wide" data-act="wadd">+ Add day</button>
    <p class="muted empty">Sets × min–max reps. Targets climb a rep at a time until every set hits the max, then add weight. History follows the exercise, not the day, so editing here never loses progress.</p>`;
}

function settingsView() {
  return `
    <header class="top"><a href="#/" aria-label="Home">‹</a><h1>Settings</h1></header>
    <section class="card"><h2>Units</h2><div class="chips">
      ${(['lb', 'kg'] as const).map((u) => `<button class="chip ${D.unit === u ? 'on' : ''}" data-act="unit" data-u="${u}">${u}</button>`).join('')}
    </div></section>
    <section class="card"><h2>Start from a template</h2><p class="muted">Replaces your program (history is kept).</p>
      ${PROGRAMS.map((p) => `<button class="wide" data-act="template" data-p="${p.id}"><b>${esc(p.name)}</b> <span class="muted">${esc(p.blurb)}</span></button>`).join('')}
    </section>
    <section class="card"><h2>Backup</h2><p class="muted">Everything lives on this device only. Export now and then.</p>
      <div class="row"><button data-act="export">Export</button><label class="button">Import<input type="file" accept="application/json" data-act="import" hidden></label></div>
    </section>
    <button class="ghost wide danger" data-act="wipe">Erase all history</button>`;
}

// ---------- render ----------

function render() {
  const [, route, arg] = location.hash.slice(1).split('/');
  if (route === 'go' && !D.active) return go('#/');
  app.innerHTML =
    route === 'go' ? session(D.active!)
    : route === 'lift' ? liftView(arg)
    : route === 'log' ? logView(arg)
    : route === 'edit' ? editView()
    : route === 'settings' ? settingsView()
    : home();
  tick();
}
window.addEventListener('hashchange', () => {
  render();
  scrollTo(0, 0);
});

// ---------- session actions ----------

function start(wid: string) {
  const w = D.program.workouts.find((x) => x.id === wid)!;
  D.active = {
    program: D.program.id,
    workout: w.id,
    started: Date.now(),
    unit: D.unit,
    lifts: w.slots.map((s) => {
      const t = target(s, D.history, D.unit);
      return { lift: s.lift, reps: [...s.reps], target: t, sets: t.reps.map((r) => ({ w: t.w, r, done: false })) };
    }),
  };
  picked = null;
  commit();
  go('#/go');
}

function finish() {
  const a = D.active!;
  const lifts = a.lifts
    .map((l) => ({ lift: l.lift, reps: l.reps, sets: l.sets.filter((s) => s.done && s.w != null && s.r).map((s) => ({ w: s.w!, r: s.r! })) }))
    .filter((l) => l.sets.length);
  const undone = a.lifts.reduce((n, l) => n + l.sets.filter((s) => !s.done).length, 0);
  if (!lifts.length) return void (confirm('No sets checked off. Discard this workout?') && discard());
  if (undone && !confirm(`${undone} set${undone > 1 ? 's' : ''} not checked off — they won't be saved. Finish anyway?`)) return;
  const s: Session = { id: uid(), program: a.program, workout: a.workout, name: workoutName(a.workout), date: new Date().toISOString(), unit: a.unit, lifts };
  D.history.unshift(s);
  D.active = null;
  stopRest();
  commit();
  const vol = lifts.reduce((n, l) => n + l.sets.reduce((m, x) => m + x.w * x.r, 0), 0);
  toast(`Saved · ${Math.round((Date.now() - a.started) / 60000)} min · ${Math.round(vol).toLocaleString()} ${a.unit} moved`);
  go('#/');
}

function discard() {
  D.active = null;
  stopRest();
  commit();
  go('#/');
}

function newLiftFrom(sel: HTMLSelectElement): string | null {
  const v = sel.value;
  sel.value = '';
  if (v !== '__new') return v || null;
  const name = prompt('Exercise name')?.trim();
  return name ? addCustomLift(D, name) : null;
}

// ---------- events ----------

app.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
  if (!el || el.tagName === 'SELECT' || el.tagName === 'INPUT') return;
  const { act, l, s, w } = el.dataset;
  const a = D.active;
  const lift = a && l != null ? a.lifts[+l] : null;
  const wk = w != null && /^\d+$/.test(w) ? D.program.workouts[+w] : null;

  switch (act) {
    case 'start': return start(w!);
    case 'resume': return go('#/go');
    case 'pick': picked = w!; return render();
    case 'finish': return finish();
    case 'discard': return void (confirm('Throw away this workout?') && discard());
    case 'check': {
      const set = lift!.sets[+s!];
      set.done = !set.done;
      if (set.done) startRest(liftInfo(lift!.lift).rest);
      break;
    }
    case 'addset': {
      const lastSet = lift!.sets[lift!.sets.length - 1];
      lift!.sets.push({ w: lastSet?.w ?? lift!.target.w, r: lastSet?.r ?? lift!.reps[0], done: false });
      break;
    }
    case 'rmset': {
      const i = lift!.sets.map((x) => x.done).lastIndexOf(false);
      if (i >= 0) lift!.sets.splice(i, 1);
      break;
    }
    case 'rmlift': a!.lifts.splice(+l!, 1); break;
    case 'dellog':
      if (!confirm('Delete this workout from history?')) return;
      D.history = D.history.filter((x) => x.id !== el.dataset.id);
      commit();
      return history.back();
    case 'pt': document.getElementById('tip')!.textContent = el.dataset.tip!; return;
    case 'wadd': D.program.workouts.push({ id: uid(), name: `Day ${D.program.workouts.length + 1}`, slots: [] }); break;
    case 'wdel':
      if (D.program.workouts.length < 2 || !confirm(`Delete ${wk!.name}?`)) return;
      D.program.workouts.splice(+w!, 1);
      break;
    case 'wmove': swap(D.program.workouts, +w!, +w! - 1); break;
    case 'smove': swap(wk!.slots, +s!, +s! - 1); break;
    case 'sdel': wk!.slots.splice(+s!, 1); break;
    case 'unit': D.unit = el.dataset.u as Data['unit']; break;
    case 'template': {
      const p = PROGRAMS.find((x) => x.id === el.dataset.p)!;
      if (!confirm(`Replace your program with ${p.name}? Your edits to the current one are lost; history stays.`)) return;
      D.program = copyProgram(p);
      commit();
      return go('#/');
    }
    case 'export': return exportJson(D);
    case 'wipe':
      if (!confirm('Erase all workout history? Export first if unsure.')) return;
      D.history = [];
      D.active = null;
      break;
    default: return;
  }
  commit();
  render();
});

function swap<T>(arr: T[], i: number, j: number) {
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

app.addEventListener('change', async (e) => {
  const el = e.target as HTMLInputElement & HTMLSelectElement;
  const act = el.dataset.act;
  if (act === 'addlift' || act === 'sadd') {
    const id = newLiftFrom(el);
    if (!id) return;
    if (act === 'addlift') {
      const slot = { lift: id, sets: 3, reps: [8, 12] as [number, number] };
      const t = target(slot, D.history, D.unit);
      D.active!.lifts.push({ lift: id, reps: slot.reps, target: t, sets: t.reps.map((r) => ({ w: t.w, r, done: false })) });
    } else {
      D.program.workouts[+el.dataset.w!].slots.push({ lift: id, sets: 3, reps: [8, 12] });
    }
  } else if (act === 'import') {
    const file = el.files?.[0];
    if (!file) return;
    try {
      D = importJson(await file.text());
      toast(`Imported ${D.history.length} workouts`);
    } catch (err) {
      return alert(String(err));
    }
  } else if (el.dataset.edit) {
    const { edit, w, s } = el.dataset;
    const n = Math.max(1, Math.round(Number(el.value)) || 1);
    const slot = w != null && s != null ? D.program.workouts[+w].slots[+s] : null;
    if (edit === 'pname') D.program.name = el.value.trim() || 'My program';
    if (edit === 'wname') D.program.workouts[+w!].name = el.value.trim() || 'Day';
    if (edit === 'sets') slot!.sets = n;
    if (edit === 'min') slot!.reps = [n, Math.max(n, slot!.reps[1])];
    if (edit === 'max') slot!.reps = [Math.min(n, slot!.reps[0]), n];
  } else return;
  commit();
  render();
});

// Typing in a set updates state without re-rendering (keeps focus). Changing a
// weight carries it down to later unchecked sets that had the same weight.
app.addEventListener('input', (e) => {
  const el = e.target as HTMLInputElement;
  const { f, l, s } = el.dataset;
  if (!f || !D.active) return;
  const sets = D.active.lifts[+l!].sets;
  const v = el.value.trim() === '' ? null : Number(el.value.replace(',', '.'));
  if (v != null && isNaN(v)) return;
  if (f === 'r') sets[+s!].r = v;
  else {
    const old = sets[+s!].w;
    sets[+s!].w = v;
    for (let i = +s! + 1; i < sets.length; i++) {
      if (sets[i].done || sets[i].w !== old) break;
      sets[i].w = v;
      app.querySelector<HTMLInputElement>(`input[data-f="w"][data-l="${l}"][data-s="${i}"]`)!.value = el.value;
    }
  }
  commit();
});
app.addEventListener('focusin', (e) => {
  if ((e.target as HTMLElement).matches('.set input')) (e.target as HTMLInputElement).select();
});

// ---------- rest timer, clock, wake lock ----------

const bar = document.getElementById('rest')!;
let restEnd = 0;
let restLen = 0;
let wake: WakeLockSentinel | null = null;

function startRest(sec: number) {
  restLen = sec;
  restEnd = Date.now() + sec * 1000;
  tick();
}
function stopRest() {
  restEnd = 0;
  bar.hidden = true;
}
bar.addEventListener('click', (e) => {
  const act = (e.target as HTMLElement).dataset.act;
  if (act === 'more') {
    restEnd += 30000;
    restLen += 30;
  }
  if (act === 'skip') stopRest();
  tick();
});

const mmss = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

function tick() {
  const clock = document.getElementById('clock');
  if (clock && D.active) clock.textContent = mmss(Date.now() - D.active.started);
  if (!restEnd) return void (bar.hidden = true);
  const left = restEnd - Date.now();
  bar.hidden = false;
  if (left <= 0) {
    if (!bar.classList.contains('go')) buzz();
    bar.classList.add('go');
    bar.querySelector('.t')!.textContent = 'Go';
    if (left < -4000) stopRest();
  } else {
    bar.classList.remove('go');
    bar.querySelector('.t')!.textContent = mmss(left);
    (bar.querySelector('.fill') as HTMLElement).style.transform = `scaleX(${left / (restLen * 1000)})`;
  }
}
setInterval(tick, 250);

function buzz() {
  navigator.vibrate?.([200, 100, 200]);
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.4);
  } catch {}
}

// Keep the screen on mid-workout; the lock drops whenever the tab hides.
async function holdWake() {
  if (D.active && !wake && document.visibilityState === 'visible') {
    wake = await navigator.wakeLock?.request('screen').catch(() => null);
    wake?.addEventListener('release', () => (wake = null));
  }
}
document.addEventListener('visibilitychange', holdWake);
setInterval(holdWake, 5000);

let toastTimer = 0;
function toast(msg: string) {
  const t = document.getElementById('toast')!;
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (t.hidden = true), 3500);
}

render();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
