// The whole UI: hash-routed views rendered as HTML strings into #app, with one
// delegated click/change handler. Views: home (#/), session (#/go), lift
// history (#/lift/id), past session (#/log/id), program editor (#/edit),
// settings (#/settings). The rest timer lives outside #app.

import './style.css';
import { LIFTS, PROGRAMS, defaultSlot, liftInfo, related, type Workout } from './program';
import { adjust, e1rm, fmtW, incFor, liftHistory, target, type Effort, type Readiness, type Session, type Target } from './progress';
import { addCustomLift, copyProgram, exportJson, importJson, load, save, uid, type Active, type ActiveSet, type Data } from './store';
import { seed } from './dev';
import { FORMS, cues, formSvg, hasForm } from './form';

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
const openForm = new Set<string>(); // lifts whose form hint is expanded in the session
let editingLog: string | null = null; // past session open for editing
let feeling: Readiness = 'normal'; // picked on home before Start

// ---------- derived ----------

function nextWorkout(): Workout {
  const ws = D.program.workouts;
  const last = D.history.find((s) => ws.some((w) => w.id === s.workout));
  if (!last) return ws[0];
  return ws[(ws.findIndex((w) => w.id === last.workout) + 1) % ws.length];
}

const svg = (d: string) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const IC = {
  back: svg('M15 5l-7 7 7 7'),
  up: svg('M12 19V6M6 12l6-6 6 6'),
  down: svg('M12 5v13M6 12l6 6 6-6'),
  x: svg('M6 6l12 12M18 6L6 18'),
  tick: svg('M4 13l5 5L20 6'),
};
const back = (href = 'javascript:history.back()') => `<a class="back" href="${href}" aria-label="Back">${IC.back}</a>`;

// How a target differs from last time. "Same" says nothing.
const MARK: Record<Target['kind'], string> = { up: IC.up, same: '', deload: IC.down, new: 'new', scaled: '≈' };
const mark = (k: Target['kind']) => `<span class="mark ${k}">${MARK[k]}</span>`;

// Today's target: the progression, shifted for how you feel going in.
const todays = (slot: Workout['slots'][number], feel = D.active?.feel) => adjust(target(slot, D.history, D.unit), slot, D.unit, feel);
const seg = <T extends string>(act: string, cur: T, opts: T[], extra = '') =>
  `<div class="seg ${act}">${opts.map((o) => `<button class="${cur === o ? 'on' : ''}" data-act="${act}" data-v="${o}" ${extra}>${o}</button>`).join('')}</div>`;

function planRow(slot: Workout['slots'][number]) {
  const t = todays(slot, feeling);
  const reps = new Set(t.reps).size === 1 ? `${slot.sets}×${t.reps[0]}` : t.reps.join('·');
  return `<li><a href="#/lift/${slot.lift}">${esc(liftInfo(slot.lift).name)}</a><b>${mark(t.kind)}${fmtW(t.w)}<small>${D.unit}</small></b><span class="reps">${reps}</span></li>`;
}

// ---------- views ----------

function home() {
  const ws = D.program.workouts;
  const next = nextWorkout();
  const w = ws.find((x) => x.id === picked) ?? next;
  const a = D.active;
  const sets = a?.lifts.flatMap((l) => l.sets) ?? [];

  const hero = a
    ? `<section class="hero">
        <p class="eyebrow live">In progress · ${Math.round((Date.now() - a.started) / 60000)} min</p>
        <h2>${esc(workoutName(a.workout))}</h2>
        <p class="muted">${sets.filter((s) => s.done).length} of ${sets.length} sets logged</p>
        <button class="primary big" data-act="resume">Resume</button>
      </section>`
    : `<section class="hero">
        <p class="eyebrow">${w.id === next.id ? 'Next up' : `Instead of ${esc(next.name)}`}</p>
        <h2>${esc(w.name)}</h2>
        <ul class="plan">${w.slots.map(planRow).join('')}</ul>
        <p class="ask">Going in feeling</p>${seg('feel', feeling, ['weak', 'normal', 'amped'])}
        <button class="primary big" data-act="start" data-w="${w.id}">Start</button>
        ${
          ws.length > 1
            ? `<div class="days"><span>or</span>${ws
                .filter((x) => x.id !== w.id)
                .map((x) => `<button data-act="pick" data-w="${x.id}">${esc(x.name)}</button>`)
                .join('')}</div>`
            : ''
        }
      </section>`;

  const recent = D.history.slice(0, 10);
  return `
    <header class="top"><h1 class="logo">stronk</h1>
      <nav><a href="#/edit">Program</a><a href="#/settings">Settings</a></nav></header>
    ${hero}
    <h3>Recent</h3>
    ${
      recent.length
        ? `<ul class="list">${recent
            .map(
              (s) => `<li><a href="#/log/${s.id}"><span>${day(s.date)}</span><b>${esc(sessionName(s))}</b>
              <span class="muted">${s.lifts.reduce((n, l) => n + l.sets.length, 0)} sets</span></a></li>`,
            )
            .join('')}</ul>`
        : `<p class="muted hint">Nothing yet. Targets start as guesses — fix the weights on day one and it learns from there.</p>`
    }`;
}

const workoutName = (id: string) => D.program.workouts.find((w) => w.id === id)?.name ?? 'Workout';
const sessionName = (s: Session) => s.name || workoutName(s.workout);

// The set the steppers sit under: the one last touched, else the next unchecked.
let now: { l: number; s: number } | null = null;
function nextUndone(a: Active, from: number) {
  for (let k = 0; k < a.lifts.length; k++) {
    const l = (from + k) % a.lifts.length;
    const s = a.lifts[l].sets.findIndex((x) => !x.done);
    if (s >= 0) return { l, s };
  }
  return null;
}

function session(a: Active) {
  if (!now || !a.lifts[now.l]?.sets[now.s]) now = nextUndone(a, now?.l ?? 0);
  const all = a.lifts.flatMap((l) => l.sets);
  const ticked = all.filter((s) => s.done).length;
  const lifts = a.lifts
    .map((l, li) => {
      const info = liftInfo(l.lift);
      const done = l.sets.length > 0 && l.sets.every((s) => s.done);
      const inc = fmtW(incFor(l.lift, a.unit));
      return `<section class="lift ${done ? 'done' : ''}">
        <header>${hasForm(l.lift) ? `<button class="thumb" data-act="form" data-id="${l.lift}" aria-label="Form tips">${formSvg(l.lift, 'form small', true)}</button>` : ''}
          <a href="#/lift/${l.lift}"><h2>${esc(info.name)}</h2></a><span class="range">${l.sets.length} × ${l.reps[0]}–${l.reps[1]}</span></header>
        ${openForm.has(l.lift) ? formCard(l.lift) : ''}
        <p class="note">${mark(l.target.kind)}${esc(l.target.note)}</p>
        ${l.sets
          .map((s, si) => {
            const at = `data-l="${li}" data-s="${si}"`;
            return `<div class="set ${s.done ? 'done' : ''} ${now?.l === li && now.s === si ? 'now' : ''}">
            <span class="n">${si + 1}</span>
            <label class="fld"><input inputmode="decimal" data-f="w" ${at} value="${s.w ?? ''}" aria-label="weight"><small>${a.unit}</small></label>
            <span class="x">×</span>
            <label class="fld"><input inputmode="numeric" data-f="r" ${at} value="${s.r ?? ''}" aria-label="reps"></label>
            <button class="check" data-act="check" ${at} aria-label="done">${IC.tick}</button>
            <div class="st w"><button data-act="step" data-f="w" data-d="-1" ${at}>−${inc}</button><button data-act="step" data-f="w" data-d="1" ${at}>+${inc}</button></div>
            <div class="st r"><button data-act="step" data-f="r" data-d="-1" ${at}>−1</button><button data-act="step" data-f="r" data-d="1" ${at}>+1</button></div>
          </div>`;
          })
          .join('')}
        ${done ? `<p class="ask">How'd it feel?</p>${seg('rate', l.feel ?? 'normal', ['heavy', 'normal', 'light'] as Effort[], `data-l="${li}"`)}` : ''}
        <div class="tools"><button data-act="addset" data-l="${li}">+ set</button><button data-act="rmset" data-l="${li}">− set</button>
          ${liftPicker('swaplift', 'Swap…', `class="mini" data-l="${li}"`, l.lift)}<button data-act="rmlift" data-l="${li}">Remove</button></div>
      </section>`;
    })
    .join('');
  return `
    <header class="top sticky">${back('#/')}<h1>${esc(workoutName(a.workout))}</h1>${a.feel ? `<span class="mood">${a.feel}</span>` : ''}
      <span id="clock" class="muted"></span><button class="${ticked && ticked === all.length ? 'primary' : ''}" data-act="finish">Finish</button>
      <i class="prog" style="--p:${all.length ? ticked / all.length : 0}"></i></header>
    ${lifts}
    <div class="add">${liftPicker('addlift', '+ Add exercise')}</div>
    <button class="wide danger" data-act="discard">Discard workout</button>`;
}

function liftPicker(act: string, label: string, extra = '', near?: string) {
  // Swaps list the lifts related to `near` first. A "New exercise…" at the end
  // lets you make a custom lift right where you need it.
  const opt = (l: { id: string; name: string }) => `<option value="${l.id}">${esc(l.name)}</option>`;
  const kin = near ? related(near) : [];
  const rest = Object.values(LIFTS)
    .filter((l) => !kin.includes(l))
    .sort((x, y) => x.name.localeCompare(y.name))
    .map(opt)
    .join('');
  const opts = kin.length ? `<optgroup label="Similar">${kin.map(opt).join('')}</optgroup><optgroup label="Everything">${rest}</optgroup>` : rest;
  return `<select data-act="${act}" ${near ? `data-near="${near}"` : ''} ${extra}><option value="">${label}</option>${opts}<option value="__new">New exercise…</option></select>`;
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
    <header class="top">${back()}<h1>${esc(info.name)}</h1></header>
    ${hasForm(id) ? formCard(id) : ''}
    ${
      pr
        ? `<section class="e1rm"><p class="eyebrow">Estimated 1RM</p>
          <div class="stat"><b>${Math.round(pts[pts.length - 1].v)}</b><small>${D.unit}</small>
          <span class="muted">Best ${Math.round(pr.v)} · ${fmtW(pr.best.w)}×${pr.best.r} on ${day(pr.date)}</span></div>
          ${pts.length > 1 ? chart(pts) : ''}</section>`
        : `<p class="muted hint">No sets logged yet.</p>`
    }
    <h3>Setup</h3>
    <section class="prefs"><label>Weight jump <input inputmode="decimal" data-pref="inc" data-id="${id}" value="${fmtW(incFor(id, D.unit))}"><small>${D.unit}</small></label>
      <label>Rest <input inputmode="numeric" data-pref="rest" data-id="${id}" value="${info.rest}"><small>sec</small></label>
      <p class="muted">Fixed bars or a machine that goes 10 at a time? Set 10 and targets only land on weights that exist.</p></section>
    ${related(id).length ? `<p class="muted kin">Similar: ${related(id).map((l) => `<a href="#/lift/${l.id}">${esc(l.name)}</a>`).join(' · ')}</p>` : ''}
    <button class="wide" data-act="variant" data-id="${id}">+ Another version (a different machine)</button>
    ${past.length ? '<h3>History</h3>' : ''}
    <ul class="list">${past
      .map(
        (p) => `<li><a href="#/log/${p.session.id}"><span>${day(p.session.date)}</span>
        <span class="sets">${p.log.sets.map((s) => `${fmtW(s.w)}×${s.r}`).join(', ')}${p.log.feel ? ` <small>felt ${p.log.feel}</small>` : ''}</span></a></li>`,
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

function formCard(id: string) {
  return `<div class="formcard">${formSvg(id, 'form big')}<ul>${cues(id).map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>`;
}

// Dev page: every figure at once, to tune poses in form.ts.
function formsView() {
  return `<header class="top">${back('#/')}<h1>Forms</h1></header><div class="formgrid">${Object.keys(FORMS)
    .map((id) => `<a href="#/lift/${id}">${formSvg(id, 'form big')}<span>${esc(liftInfo(id).name)}</span></a>`)
    .join('')}</div>`;
}

function logView(id: string) {
  const s = D.history.find((x) => x.id === id);
  if (!s) return `<header class="top">${back('#/')}<h1>Not found</h1></header>`;
  const editing = editingLog === id;
  const top = `<header class="top">${back()}<h1>${esc(sessionName(s))}</h1>
      <button class="${editing ? 'primary' : ''}" data-act="logedit">${editing ? 'Done' : 'Edit'}</button></header>
      <p class="eyebrow">${day(s.date)}${s.feel ? ` · went in ${s.feel}` : ''}</p>`;
  if (editing) {
    return `${top}
    ${s.lifts
      .map(
        (l, li) => `<section class="lift"><header><h2>${esc(liftInfo(l.lift).name)}</h2></header>
        ${l.sets
          .map(
            (x, si) => `<div class="set log"><span class="n">${si + 1}</span>
            <label class="fld"><input inputmode="decimal" data-lg="w" data-l="${li}" data-s="${si}" value="${fmtW(x.w)}" aria-label="weight"><small>${s.unit}</small></label>
            <span class="x">×</span><label class="fld"><input inputmode="numeric" data-lg="r" data-l="${li}" data-s="${si}" value="${x.r}" aria-label="reps"></label></div>`,
          )
          .join('')}
        <div class="tools"><button data-act="logaddset" data-l="${li}">+ set</button><button data-act="logrmset" data-l="${li}">− set</button>
          ${liftPicker('logswap', 'Swap…', `class="mini" data-l="${li}"`, l.lift)}<button data-act="logrmlift" data-l="${li}">Remove</button></div>
      </section>`,
      )
      .join('')}
    <div class="add">${liftPicker('logadd', '+ Add exercise')}</div>
    <p class="muted hint">Swapping keeps the sets and moves them to the other exercise's history, so the original lift's targets ignore this workout.</p>`;
  }
  return `${top}
    <ul class="list log">${s.lifts
      .map(
        (l) => `<li><a href="#/lift/${l.lift}"><b>${esc(liftInfo(l.lift).name)}</b>
        <span class="sets">${l.sets.map((x) => `${fmtW(x.w)}×${x.r}`).join(', ')} <small>${s.unit}${l.feel ? ` · felt ${l.feel}` : ''}</small></span></a></li>`,
      )
      .join('')}</ul>
    <button class="wide danger" data-act="dellog" data-id="${s.id}">Delete this workout</button>`;
}

function editView() {
  const p = D.program;
  return `
    <header class="top">${back('#/')}<h1>Program</h1></header>
    <label class="field">Name <input data-edit="pname" value="${esc(p.name)}"></label>
    ${p.workouts
      .map(
        (w, wi) => `<section class="day">
        <header><input class="title" data-edit="wname" data-w="${wi}" value="${esc(w.name)}" aria-label="Day name">
          <button class="icon" data-act="wmove" data-w="${wi}" data-d="-1" aria-label="Move day up">${IC.up}</button>
          <button class="icon" data-act="wdel" data-w="${wi}" aria-label="Delete day">${IC.x}</button></header>
        ${w.slots
          .map(
            (s, si) => `<div class="slot">
            <span class="name">${esc(liftInfo(s.lift).name)}</span>
            <input inputmode="numeric" data-edit="sets" data-w="${wi}" data-s="${si}" value="${s.sets}" aria-label="sets"><span class="x">×</span>
            <input inputmode="numeric" data-edit="min" data-w="${wi}" data-s="${si}" value="${s.reps[0]}" aria-label="min reps"><span class="x">–</span><input inputmode="numeric" data-edit="max" data-w="${wi}" data-s="${si}" value="${s.reps[1]}" aria-label="max reps">
            <button class="icon" data-act="smove" data-w="${wi}" data-s="${si}" aria-label="Move up">${IC.up}</button>
            <button class="icon" data-act="sdel" data-w="${wi}" data-s="${si}" aria-label="Remove">${IC.x}</button>
          </div>`,
          )
          .join('')}
        <div class="add">${liftPicker('sadd', '+ Add exercise', `data-w="${wi}"`)}</div>
      </section>`,
      )
      .join('')}
    <button class="addday" data-act="wadd">+ Add day</button>
    <p class="muted hint">Sets × min–max reps. Targets climb a rep at a time until every set hits the max, then add weight. History follows the exercise, not the day, so editing here never loses progress.</p>`;
}

function settingsView() {
  return `
    <header class="top">${back('#/')}<h1>Settings</h1></header>
    <h3>Units</h3>
    <div class="seg">
      ${(['lb', 'kg'] as const).map((u) => `<button class="${D.unit === u ? 'on' : ''}" data-act="unit" data-u="${u}">${u}</button>`).join('')}
    </div>
    <h3>Start from a template</h3>
    <p class="muted hint">Replaces your program. History is kept.</p>
    ${PROGRAMS.map((p) => `<button class="pick" data-act="template" data-p="${p.id}"><b>${esc(p.name)}</b><span class="muted">${esc(p.blurb)}</span></button>`).join('')}
    <h3>Backup</h3>
    <p class="muted hint">Everything lives on this device only. Export now and then.</p>
    <div class="row"><button data-act="export">Export</button><label class="button">Import<input type="file" accept="application/json" data-act="import" hidden></label></div>
    <button class="wide danger" data-act="wipe">Erase all history</button>`;
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
    : route === 'forms' ? formsView()
    : home();
  tick();
}
window.addEventListener('hashchange', () => {
  editingLog = null;
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
    ...(feeling !== 'normal' && { feel: feeling }),
    lifts: w.slots.map((s) => {
      const t = todays(s, feeling);
      return { lift: s.lift, reps: [...s.reps], target: t, sets: t.reps.map((r) => ({ w: t.w, r, done: false })) };
    }),
  };
  picked = null;
  feeling = 'normal';
  now = null;
  commit();
  go('#/go');
}

function finish() {
  const a = D.active!;
  const lifts = a.lifts
    .map((l) => ({ lift: l.lift, reps: l.reps, sets: l.sets.filter((s) => s.done && s.w != null && s.r).map((s) => ({ w: s.w!, r: s.r! })), ...(l.feel && { feel: l.feel }) }))
    .filter((l) => l.sets.length);
  const undone = a.lifts.reduce((n, l) => n + l.sets.filter((s) => !s.done).length, 0);
  if (!lifts.length) return void (confirm('No sets checked off. Discard this workout?') && discard());
  if (undone && !confirm(`${undone} set${undone > 1 ? 's' : ''} not checked off — they won't be saved. Finish anyway?`)) return;
  const s: Session = { id: uid(), program: a.program, workout: a.workout, name: workoutName(a.workout), date: new Date().toISOString(), unit: a.unit, lifts, ...(a.feel && { feel: a.feel }) };
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
  // From a Swap menu, the new exercise is a version of the one being swapped out.
  const near = sel.dataset.near;
  const name = prompt(near ? `New exercise like ${liftInfo(near).name} — name it` : 'Exercise name')?.trim();
  return name ? addCustomLift(D, name, near) : null;
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
    case 'feel': feeling = el.dataset.v as Readiness; return render();
    case 'rate': {
      const v = el.dataset.v as Effort;
      if (v === 'normal') delete lift!.feel;
      else lift!.feel = v;
      break;
    }
    case 'finish': return finish();
    case 'discard': return void (confirm('Throw away this workout?') && discard());
    case 'check': {
      const set = lift!.sets[+s!];
      set.done = !set.done;
      now = set.done ? nextUndone(a!, +l!) : { l: +l!, s: +s! };
      if (set.done) startRest(liftInfo(lift!.lift).rest);
      break;
    }
    case 'step': {
      const set = lift!.sets[+s!];
      const d = +el.dataset.d!;
      if (el.dataset.f === 'r') set.r = Math.max(0, (set.r ?? 0) + d);
      else setWeight(lift!.sets, +s!, Math.max(0, Math.round(((set.w ?? 0) + d * incFor(lift!.lift, a!.unit)) * 100) / 100));
      now = { l: +l!, s: +s! };
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
    case 'logedit': {
      const id = location.hash.split('/')[2];
      if (editingLog) {
        const ls = D.history.find((x) => x.id === editingLog);
        if (ls) ls.lifts = ls.lifts.filter((x) => x.sets.length);
        editingLog = null;
      } else editingLog = id;
      break;
    }
    case 'logaddset': {
      const sets = logLift(+l!).sets;
      const last = sets[sets.length - 1];
      sets.push(last ? { ...last } : { w: 0, r: 8 });
      break;
    }
    case 'logrmset': logLift(+l!).sets.pop(); break;
    case 'logrmlift': D.history.find((x) => x.id === editingLog)!.lifts.splice(+l!, 1); break;
    case 'dellog':
      if (!confirm('Delete this workout from history?')) return;
      D.history = D.history.filter((x) => x.id !== el.dataset.id);
      commit();
      return history.back();
    case 'form': openForm.has(el.dataset.id!) ? openForm.delete(el.dataset.id!) : openForm.add(el.dataset.id!); return render();
    case 'variant': {
      const base = el.dataset.id!;
      const name = prompt(`Name this version of ${liftInfo(base).name}, e.g. "${liftInfo(base).name} (blue one)". It keeps its own weights.`)?.trim();
      if (!name) return;
      const id = addCustomLift(D, name, base);
      commit();
      return go(`#/lift/${id}`);
    }
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

const logLift = (i: number) => D.history.find((x) => x.id === editingLog)!.lifts[i];

function swap<T>(arr: T[], i: number, j: number) {
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

app.addEventListener('change', async (e) => {
  const el = e.target as HTMLInputElement & HTMLSelectElement;
  const act = el.dataset.act;
  if (act === 'swaplift' || act === 'logswap' || act === 'logadd') {
    const id = newLiftFrom(el);
    if (!id) return;
    if (act === 'swaplift') {
      // Checked-off sets stay as entered; the rest take the new lift's target,
      // in the new lift's own rep range (leg extensions don't inherit squat's 5–8).
      const l = D.active!.lifts[+el.dataset.l!];
      const reps = defaultSlot(id).reps;
      const t = todays({ lift: id, sets: l.sets.length, reps });
      Object.assign(l, { lift: id, reps, target: t, sets: l.sets.map((x, i) => (x.done ? x : { w: t.w, r: t.reps[i], done: false })) });
    } else if (act === 'logswap') logLift(+el.dataset.l!).lift = id;
    else {
      const slot = defaultSlot(id);
      const t = target(slot, D.history, D.unit);
      D.history.find((x) => x.id === editingLog)!.lifts.push({ lift: id, reps: slot.reps, sets: t.reps.map((r) => ({ w: t.w, r })) });
    }
  } else if (el.dataset.pref) {
    const id = el.dataset.id!;
    const v = Number(el.value.replace(',', '.'));
    if (!(v > 0)) return render();
    const pref = (D.liftPrefs[id] ??= {});
    if (el.dataset.pref === 'inc') Object.assign(pref, { inc: D.unit === 'kg' ? v * 2 : v, snap: true });
    else pref.rest = Math.round(v);
    LIFTS[id] = { ...liftInfo(id), ...pref };
    toast('Saved');
  } else if (el.dataset.lg) {
    const v = Number(el.value.replace(',', '.'));
    if (el.value.trim() === '' || isNaN(v) || v < 0) return;
    const set = logLift(+el.dataset.l!).sets[+el.dataset.s!];
    if (el.dataset.lg === 'w') set.w = v;
    else set.r = Math.round(v);
    return commit();
  } else if (act === 'addlift' || act === 'sadd') {
    const id = newLiftFrom(el);
    if (!id) return;
    if (act === 'addlift') {
      const slot = defaultSlot(id);
      const t = todays(slot);
      D.active!.lifts.push({ lift: id, reps: slot.reps, target: t, sets: t.reps.map((r) => ({ w: t.w, r, done: false })) });
    } else {
      D.program.workouts[+el.dataset.w!].slots.push(defaultSlot(id));
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

// Changing a weight carries it down to later unchecked sets that had the same
// weight. Returns one past the last set changed.
function setWeight(sets: ActiveSet[], i: number, v: number | null) {
  const old = sets[i].w;
  sets[i].w = v;
  let j = i + 1;
  for (; j < sets.length && !sets[j].done && sets[j].w === old; j++) sets[j].w = v;
  return j;
}

// Typing in a set updates state without re-rendering (keeps focus).
app.addEventListener('input', (e) => {
  const el = e.target as HTMLInputElement;
  const { f, l, s } = el.dataset;
  if (!f || !D.active) return;
  const sets = D.active.lifts[+l!].sets;
  const v = el.value.trim() === '' ? null : Number(el.value.replace(',', '.'));
  if (v != null && isNaN(v)) return;
  if (f === 'r') sets[+s!].r = v;
  else {
    const end = setWeight(sets, +s!, v);
    for (let i = +s! + 1; i < end; i++) app.querySelector<HTMLInputElement>(`input[data-f="w"][data-l="${l}"][data-s="${i}"]`)!.value = el.value;
  }
  commit();
});
app.addEventListener('focusin', (e) => {
  const el = e.target as HTMLInputElement;
  if (!el.matches('.set input')) return;
  el.select();
  if (!el.dataset.f) return;
  now = { l: +el.dataset.l!, s: +el.dataset.s! };
  app.querySelector('.set.now')?.classList.remove('now');
  el.closest('.set')!.classList.add('now');
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
    // An open context keeps the audio output live (a faint hiss), so let it go.
    o.onended = () => ctx.close();
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
