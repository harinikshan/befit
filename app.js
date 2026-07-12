/* =================================================================
   BeFit — a 26-week consistency-first fitness logbook.
   All data lives in this browser's localStorage. No backend.
   No accounts. Each visitor's data stays on their device.
   ================================================================= */

'use strict';

/* ---------------------------------------------------------------
   Program data — the fixed week. Indexed by JS getDay() (0 = Sun).
   --------------------------------------------------------------- */
const SESSIONS = [
  { // Sunday
    key: 'rest', name: 'Rest or easy walk', where: 'anywhere',
    detail: [
      'Rest is part of the program, not a miss.',
      'An easy stroll is fine if you feel like moving — keep it gentle.'
    ],
    tenMin: null, swap: null, restDay: true
  },
  { // Monday
    key: 'strengthA', name: 'Strength A', where: 'gym',
    detail: [
      '3 rounds: goblet squat ×10 · dumbbell bench or floor press ×10 · one-arm row ×10 per side',
      'Finisher: plank 3 × 30 seconds',
      'Progression: when 3×10 feels easy, add the smallest weight increment, or 2 reps.'
    ],
    tenMin: 'First round only + one 30-second plank. Counts fully.',
    swap: 'Gym crowded? Push-up and band versions of the same movements work.'
  },
  { // Tuesday
    key: 'intervals', name: 'Run — Intervals', where: 'park / outdoors',
    detail: [
      '5 min easy warm-up',
      '8 × (1 min brisk / 1 min easy)',
      '5 min cool-down. Brisk means brisk — you shouldn\'t be able to hold a full conversation during the fast minute.'
    ],
    tenMin: '10 minutes easy running with 4 short pickups. Counts fully.',
    swap: 'Rain or heat? Treadmill, or stair intervals indoors.'
  },
  { // Wednesday
    key: 'strengthB', name: 'Strength B', where: 'gym',
    detail: [
      '3 rounds: Romanian deadlift ×10 · lat pulldown or assisted pull-up ×8 · incline push-up or dip ×10',
      'Finisher: dead bug 3 × 10',
      'Progression: when 3×10 feels easy, add the smallest weight increment, or 2 reps.'
    ],
    tenMin: 'First round only + one set of dead bugs. Counts fully.',
    swap: 'Gym crowded? Band pulldowns and elevated push-ups.'
  },
  { // Thursday
    key: 'walk', name: 'Brisk Walk — 30 min', where: 'office / anywhere',
    detail: [
      'Recovery day with one rule: the pace stays above a stroll.',
      'A lunch-break walk counts. Headphones optional; briskness is not.',
      'A "quick 10" works if the day is truly impossible — better than zero.'
    ],
    tenMin: 'A 10-minute brisk walk counts. Counts fully.',
    swap: 'Weather bad? Stairwell laps or a mall walk.'
  },
  { // Friday
    key: 'strengthC', name: 'Strength C', where: 'gym',
    detail: [
      '3 rounds: lunge ×8 per leg · overhead press ×10 · cable or band row ×12',
      'Finisher: hanging knee raise or crunch 3 × 12',
      'Progression: when 3×10 feels easy, add the smallest weight increment, or 2 reps.'
    ],
    tenMin: 'First round only + one set of crunches. Counts fully.',
    swap: 'Gym crowded? Band rows and pike push-ups.'
  },
  { // Saturday
    key: 'steady', name: 'Run — Steady', where: 'park / outdoors',
    detail: [
      'Continuous easy run at conversation pace.',
      'Start at whatever your baseline allows; add about 2 minutes per week toward a comfortable 5 km.',
      'Add time, not speed — until 5 km feels continuous, then chase your baseline time.'
    ],
    tenMin: '10 minutes of easy running. Counts fully.',
    swap: 'Rain? Treadmill steady run at a comfortable pace.'
  }
];

const DOW_SHORT   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const STAMP       = { done: '✓', short: '½', rest: 'R', sick: 'S', missed: '✕' };
const STATUS_LABEL = { done: 'Done', short: '10-min done', rest: 'Rest', sick: 'Sick', missed: 'Missed' };

const PRINCIPLES = [
  'A 10-minute version always counts. The streak measures showing up, not heroics.',
  'Swapping a venue is fine; leaving the day blank is where lapses start.',
  'Weight is judged on the 4-week trend, never a single morning number.',
  'There is no fourth diet rule. Don\'t invent one.',
  'Progression: strength adds weight when 3×10 feels easy; runs add minutes, not speed.',
  'A treat chosen in advance is part of the plan. An unplanned cascade is not.',
  'The tape measure is data. "I feel leaner" is not.',
  'Decision fatigue kills 20–30 min routines — that\'s why the week is fixed and looked up, not invented daily.',
  'The session you actually do beats the perfect session you postpone.',
  'Soreness fades. Injuries compound. When in doubt, do the 10-minute version, not nothing.'
];

const MRBFIT = {
  channel:  'https://www.youtube.com/channel/UCjeDdgwverf8ZgMAaqY8F3Q',
  playlist: 'https://www.youtube.com/playlist?list=PLoIQtUq-NSUWLOVTE_M7nJ32d-UekOe4h'
};

const PROGRAM_WEEKS = 26;
const WEEKS_TARGET  = 24;

/* ---------------------------------------------------------------
   Store — everything under the "befit." namespace in localStorage.
   --------------------------------------------------------------- */
const store = {
  get (key, fallback) {
    try {
      const raw = localStorage.getItem('befit.' + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  },
  set (key, val) { localStorage.setItem('befit.' + key, JSON.stringify(val)); },
  remove (key)   { localStorage.removeItem('befit.' + key); }
};

let profile = store.get('profile', null);
let days    = store.get('days', {});    // { 'YYYY-MM-DD': 'done'|'short'|'rest'|'sick'|'missed' }
let weeks   = store.get('weeks', []);   // [{ weekEnding, sessions, weightKg, P, S, T, note }]
let monthly = store.get('monthly', []); // [{ date, waistCm, run2kMin }]

function saveAll () {
  store.set('days', days);
  store.set('weeks', weeks);
  store.set('monthly', monthly);
}

/* ---------------------------------------------------------------
   Dates — all local time; never toISOString (that's UTC).
   --------------------------------------------------------------- */
function ymd (d) {
  return d.getFullYear() + '-'
    + String(d.getMonth() + 1).padStart(2, '0') + '-'
    + String(d.getDate()).padStart(2, '0');
}
function parseYMD (s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function addDays (d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function today ()      { const t = new Date(); t.setHours(0,0,0,0); return t; }
function mondayOf (d)  {
  const x = new Date(d); x.setHours(0,0,0,0);
  return addDays(x, -((x.getDay() + 6) % 7));
}
function niceDate (d) {
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}
function shortDate (d) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
function programStart ()  { return profile ? parseYMD(profile.startDate) : null; }
function programMonday () { return profile ? mondayOf(programStart()) : null; }

function weekNumberOf (d) {
  if (!profile) return null;
  const n = Math.floor((d - programMonday()) / (7 * 864e5)) + 1;
  return n;
}

function nextMonday () {
  const t = today();
  const shift = (8 - t.getDay()) % 7 || 7;
  return addDays(t, shift);
}

/* ---------------------------------------------------------------
   Streak + week math.
   Rules encoded: Sunday rest counts (not a miss); "sick" pauses
   the streak without resetting; a 10-min session counts fully.
   --------------------------------------------------------------- */
function dayQualifies (d) {
  const s    = days[ymd(d)];
  const isSun = d.getDay() === 0;
  if (s === 'done' || s === 'short')                return 'count';
  if (s === 'sick')                                  return 'skip';
  if (isSun && (s === 'rest' || s === undefined))    return 'count'; // Sunday rest = program rest
  return 'break'; // missed, or unlogged non-Sunday in the past
}

function currentStreak () {
  if (!profile) return 0;
  let d = today();
  // If today is not yet logged, evaluate as of yesterday
  if (days[ymd(d)] === undefined) d = addDays(d, -1);
  const start = programStart();
  let n = 0;
  while (d >= start) {
    const q = dayQualifies(d);
    if (q === 'break') break;
    if (q === 'count') n++;
    d = addDays(d, -1);
  }
  return n;
}

/* One program week. Quota: 6 sessions (Sunday rest is the 7th day).
   Each sick day lowers the requirement — illness never costs the week. */
function weekStats (monday) {
  let credits = 0, sick = 0, missed = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    const s = days[ymd(d)];
    if (s === 'done' || s === 'short')    credits++;
    else if (s === 'sick')                sick++;
    else if (s === 'missed')              missed++;
    else if (d.getDay() === 0 && d < today()) credits++; // implicit Sunday rest
  }
  const required = Math.max(0, 6 - sick);
  const complete  = addDays(monday, 6) < today();
  return {
    monday, credits, sick, missed, required, complete,
    paused: sick >= 6,
    hit: required === 0 ? true : credits >= required
  };
}

function programWeeks () {
  if (!profile) return [];
  const out   = [];
  const start = programMonday();
  const last  = mondayOf(today());
  for (let m = new Date(start), i = 0; m <= last && i < PROGRAM_WEEKS; m = addDays(m, 7), i++) {
    out.push(Object.assign(weekStats(m), { number: i + 1 }));
  }
  return out;
}

function weeksHit ()       { return programWeeks().filter(w => w.complete && w.hit).length; }
function weeksCompleted () { return programWeeks().filter(w => w.complete).length; }

/* ---------------------------------------------------------------
   Progress math.
   --------------------------------------------------------------- */
function weightSeries () {
  const pts = [];
  if (profile && profile.weightKg) pts.push({ x: profile.startDate, y: profile.weightKg, base: true });
  weeks.slice().sort((a, b) => a.weekEnding < b.weekEnding ? -1 : 1)
    .forEach(w => { if (w.weightKg) pts.push({ x: w.weekEnding, y: w.weightKg }); });
  return pts;
}
function waistSeries () {
  const pts = [];
  if (profile && profile.waistCm) pts.push({ x: profile.startDate, y: profile.waistCm, base: true });
  monthly.slice().sort((a, b) => a.date < b.date ? -1 : 1)
    .forEach(m => { if (m.waistCm) pts.push({ x: m.date, y: m.waistCm }); });
  return pts;
}
function runSeries () {
  const pts = [];
  if (profile && profile.run2kMin) pts.push({ x: profile.startDate, y: profile.run2kMin, base: true });
  monthly.slice().sort((a, b) => a.date < b.date ? -1 : 1)
    .forEach(m => { if (m.run2kMin) pts.push({ x: m.date, y: m.run2kMin }); });
  return pts;
}

/* 4-week weight trend: avg of last 4 logged weeks minus avg of
   the 4 before that (falls back to baseline as anchor). */
function weightTrend () {
  const pts = weightSeries();
  if (pts.length < 3) return null;
  const ys    = pts.map(p => p.y);
  const recent = ys.slice(-4);
  const before = ys.slice(-8, -4).length ? ys.slice(-8, -4) : ys.slice(0, 1);
  const avg    = a => a.reduce((s, v) => s + v, 0) / a.length;
  return avg(recent) - avg(before);
}

/* Three layers. Each returns 'up' | 'flat' | 'nodata'. */
function layerVerdicts () {
  const pw      = programWeeks().filter(w => w.complete);
  const recent  = pw.slice(-4);
  const streakLayer = recent.length === 0 ? 'nodata'
    : (recent.filter(w => w.hit).length >= 3 ? 'up' : 'flat');

  const runs = runSeries();
  const enduranceLayer = runs.length < 2 ? 'nodata'
    : (runs[runs.length - 1].y < runs[0].y - 0.001 ? 'up' : 'flat');

  const waists = waistSeries();
  const trend  = weightTrend();
  let bodyLayer = 'nodata';
  if (waists.length >= 2) bodyLayer = waists[waists.length - 1].y < waists[0].y - 0.001 ? 'up' : 'flat';
  else if (trend !== null) bodyLayer = trend < -0.1 ? 'up' : 'flat';
  return { streakLayer, enduranceLayer, bodyLayer };
}

/* Diet honesty: consecutive recent logged weeks with P, S and T all kept. */
function dietKeptStreak () {
  const rows = weeks.slice().sort((a, b) => a.weekEnding < b.weekEnding ? -1 : 1);
  let n = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].P && rows[i].S && rows[i].T) n++;
    else break;
  }
  return n;
}

/* ---------------------------------------------------------------
   Guidance engine — priority-ordered rules over the user's data.
   --------------------------------------------------------------- */
function buildGuidance () {
  const cards = [];
  if (!profile) return cards;
  const t         = today();
  const yesterday = addDays(t, -1);
  // Only evaluate yesterday if the program has started
  const yq        = (yesterday >= programStart()) ? dayQualifies(yesterday) : 'count';
  const sToday    = SESSIONS[t.getDay()];
  const wk        = weekNumberOf(t);

  // 1 — never miss twice
  if (yq === 'break') {
    cards.push({
      tone: 'urgent', title: 'Never miss twice',
      body: `Yesterday didn't happen — that's life, not a verdict. But two in a row is the start of a lapse, so today's session is mandatory. The 10-minute version of <strong>${sToday.restDay ? 'an easy walk' : sToday.name}</strong> exists exactly for today. Do it, stamp the day, move on.`,
      why: 'One missed day is noise. The day after a miss is where streaks are saved or lost.'
    });
  }

  // 2 — repeated misses: change the system, not the motivation
  const completed    = programWeeks().filter(w => w.complete);
  const recentMisses = completed.slice(-3).reduce((s, w) => s + w.missed, 0);
  if (recentMisses >= 3) {
    cards.push({
      tone: 'urgent', title: 'Change the system, not the pep talk',
      body: `${recentMisses} misses in the last three weeks is a pattern, not bad luck. Ask what keeps colliding with your slot — schedule, sleep, travel, boredom — and change <em>one</em> thing that removes that cause: move the time slot, shrink the session, pack your kit the night before.`,
      why: 'A lapse gets analysis, not guilt. The system adapts; the goal doesn\'t.'
    });
  }

  // 3 — streak solid, body flat → diet
  const v = layerVerdicts();
  if (v.streakLayer === 'up' && v.bodyLayer === 'flat') {
    cards.push({
      tone: 'note', title: 'The streak buys endurance — the kitchen buys abs',
      body: 'Your sessions are landing but your waist/weight isn\'t moving. That\'s normal and it points one place: the three diet rules. Check your weekly P/S/T honesty before changing anything about training.',
      why: 'Visible change from a lean-ish start is roughly 80% diet. Training is the engine; food is the fuel mix.'
    });
  }

  // 4 — diet kept 8+ weeks, waist flat → revision trigger
  const waists    = waistSeries();
  const waistFlat = waists.length >= 2 && waists[waists.length - 1].y >= waists[0].y - 0.5;
  if (dietKeptStreak() >= 8 && waistFlat) {
    cards.push({
      tone: 'note', title: 'Revision trigger: tighten ONE rule',
      body: '8+ weeks with all three diet rules kept and the tape hasn\'t moved — the rules, not your effort, get revised. Tighten one rule only (usually portions). Never all three at once.',
      why: 'Tightening a plan you weren\'t following is the classic lapse-maker. You WERE following it — so the plan earns a careful, targeted edit.'
    });
  }

  // 5 — nothing moving for 4+ weeks
  if (completed.length >= 4 && v.streakLayer === 'flat' && v.enduranceLayer !== 'up' && v.bodyLayer !== 'up') {
    cards.push({
      tone: 'urgent', title: 'Full system review',
      body: 'No layer has moved in 4+ weeks. Stop tweaking and review properly: judge streak, endurance and body separately — they fail differently and get different fixes. Shrink sessions before you move them; move them before you quit.',
      why: 'Zero layers moving means the plan doesn\'t fit your life yet — that\'s a design problem, not a willpower problem.'
    });
  }

  // 6 — week-12 review
  if (wk !== null && wk >= 12 && wk <= 14) {
    cards.push({
      tone: 'calm', title: `Week ${wk} — phase-2 review`,
      body: `<ol>
        <li><strong>Read your data first</strong> — the weekly log rows, monthly waist and run entries. No redesign before reading.</li>
        <li><strong>Judge each layer separately:</strong> streak vs 6/week · run time vs baseline · waist/weight trend.</li>
        <li><strong>Fix by failure type:</strong> streak weak → wrong slot or session length; endurance flat → extend the Saturday run, make Tuesday honest; waist flat with diet kept → tighten one rule.</li>
        <li><strong>Progression, not revolution:</strong> keep the same weekly skeleton; go heavier/longer/tighter only where the data says so.</li>
      </ol>`,
      why: 'Week 1 is easy. Week 12 — when novelty is gone and the data says something imperfect — is where the program is won.'
    });
  }

  // Always: today + a rotating principle
  const streak = currentStreak();
  cards.push({
    tone: 'calm', title: 'Today',
    body: `${sToday.restDay
      ? 'Rest day. Rest is part of the program, not a miss — you earned it.'
      : `<strong>${sToday.name}</strong> — ${sToday.where}. Squeezed? ${sToday.tenMin}`
    }${streak > 0 ? ` Current streak: <strong>${streak} day${streak === 1 ? '' : 's'}</strong>.` : ''}`,
    why: PRINCIPLES[(t.getDate() + t.getMonth()) % PRINCIPLES.length]
  });

  return cards;
}

/* ---------------------------------------------------------------
   Rendering helpers.
   --------------------------------------------------------------- */
const app = document.getElementById('app');

function esc (s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* Toast notification */
let toastTimer = null;
function showToast (msg) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
  el.classList.remove('hide');
  el.textContent = msg;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.add('hide');
    setTimeout(() => el.remove(), 400);
  }, 2400);
}

/* Tally marks — groups of five (four strokes + a red slash). */
function tallySVG (n) {
  if (n <= 0) return '<span class="tally-label">No marks yet — the first session starts the count.</span>';
  const groups = Math.floor(n / 5);
  const rem    = n % 5;
  let html     = '';
  const group  = (count, slash) => {
    const w = 8 + count * 9 + (slash ? 4 : 0);
    let s = `<svg width="${w}" height="34" viewBox="0 0 ${w} 34" aria-hidden="true">`;
    for (let i = 0; i < count; i++) {
      const x = 6 + i * 9;
      s += `<line class="stroke" x1="${x}" y1="4" x2="${x - 1}" y2="30"/>`;
    }
    if (slash) s += `<line class="stroke slash" x1="1" y1="26" x2="${w - 2}" y2="7"/>`;
    return s + '</svg>';
  };
  const maxGroups = 24;
  for (let g = 0; g < Math.min(groups, maxGroups); g++) html += group(4, true);
  if (groups <= maxGroups && rem > 0) html += group(rem, false);
  html += `<span class="tally-label">${n} day${n === 1 ? '' : 's'}</span>`;
  return html;
}

function statCard (label, valueHTML, subHTML) {
  return `<div class="stat"><span class="eyebrow">${label}</span>
    <div class="num">${valueHTML}</div>
    ${subHTML ? `<div class="small muted">${subHTML}</div>` : ''}</div>`;
}

/* Week strip — 7 columns punch card. */
function weekStripHTML (monday) {
  const t = today();
  let cells = '';
  for (let i = 0; i < 7; i++) {
    const d      = addDays(monday, i);
    const key    = ymd(d);
    const s      = days[key];
    const isToday = key === ymd(t);
    const future  = d > t;
    let stamp, cls;
    if (s)                                         { stamp = STAMP[s]; cls = s; }
    else if (d.getDay() === 0 && !future)          { stamp = STAMP.rest; cls = 'rest'; }
    else if (future)                               { stamp = '·'; cls = 'blank'; }
    else                                           { stamp = '?'; cls = 'blank'; }
    cells += `<div class="day-cell${isToday ? ' today-cell' : ''}" title="${niceDate(d)}${s ? ' — ' + STATUS_LABEL[s] : ''}">
      <span class="dow">${DOW_SHORT[d.getDay()]} ${d.getDate()}</span>
      <span class="stamp ${cls}">${stamp}</span></div>`;
  }
  return `<div class="week-strip">${cells}</div>`;
}

/* Month grid for any given year/month. */
function monthGridHTML (year, month) {
  const t     = today();
  const first = new Date(year, month, 1);
  const lead  = (first.getDay() + 6) % 7; // Monday-first
  const dim   = new Date(year, month + 1, 0).getDate();
  let html    = '';
  ['Mo','Tu','We','Th','Fr','Sa','Su'].forEach(h => {
    html += `<span class="mg-head">${h}</span>`;
  });
  for (let i = 0; i < lead; i++) html += '<span class="mg-day out"></span>';
  for (let day = 1; day <= dim; day++) {
    const d   = new Date(year, month, day);
    const s   = days[ymd(d)];
    const cls = d > t ? 'future'
      : (s || (d.getDay() === 0 ? 'rest' : ''));
    html += `<span class="mg-day ${cls}" title="${niceDate(d)}${s ? ' — ' + STATUS_LABEL[s] : ''}">${day}</span>`;
  }
  return `<div class="month-grid">${html}</div>`;
}

/* Simple inline SVG line chart. pts: [{x:'YYYY-MM-DD', y, base?}] */
function chartSVG (pts, opts) {
  const { unit = '', betterDown = true } = opts || {};
  if (pts.length === 0) return '<p class="muted small">No data yet — measurements will draw the line here.</p>';
  if (pts.length === 1) {
    return `<p class="mono">${pts[0].y}${unit} <span class="muted small">— baseline logged ${shortDate(parseYMD(pts[0].x))}. One more entry draws the line.</span></p>`;
  }
  const W = 560, H = 160, PL = 44, PR = 12, PT = 14, PB = 26;
  const xs = pts.map(p => parseYMD(p.x).getTime());
  const ys = pts.map(p => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = Math.max((y1 - y0) * 0.18, 0.5);
  y0 -= pad; y1 += pad;
  const X = t => PL + (x1 === x0 ? 0 : (t - x0) / (x1 - x0)) * (W - PL - PR);
  const Y = v => PT + (1 - (v - y0) / (y1 - y0)) * (H - PT - PB);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(parseYMD(p.x).getTime()).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
  const base = pts.find(p => p.base);
  const dots = pts.map(p =>
    `<circle class="chart-dot" cx="${X(parseYMD(p.x).getTime()).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="3.5"><title>${shortDate(parseYMD(p.x))}: ${p.y}${unit}</title></circle>`
  ).join('');
  const gridY = [y0 + pad, (y0 + y1) / 2, y1 - pad].map(v =>
    `<line class="chart-grid" x1="${PL}" y1="${Y(v).toFixed(1)}" x2="${W - PR}" y2="${Y(v).toFixed(1)}"/>
     <text class="chart-axis" x="${PL - 5}" y="${(Y(v) + 3).toFixed(1)}" text-anchor="end">${(Math.round(v * 10) / 10)}</text>`
  ).join('');
  const first = pts[0], lastP = pts[pts.length - 1];
  const delta = Math.round((lastP.y - first.y) * 10) / 10;
  const good  = betterDown ? delta < 0 : delta > 0;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Chart with ${pts.length} data points">
    ${gridY}
    ${base ? `<line class="chart-base" x1="${PL}" y1="${Y(base.y).toFixed(1)}" x2="${W - PR}" y2="${Y(base.y).toFixed(1)}"/>` : ''}
    <path class="chart-line" d="${path}"/>${dots}
    <text class="chart-axis" x="${PL}" y="${H - 8}">${shortDate(parseYMD(first.x))}</text>
    <text class="chart-axis" x="${W - PR}" y="${H - 8}" text-anchor="end">${shortDate(parseYMD(lastP.x))}</text>
  </svg>
  <p class="small mono" style="margin-top:.4rem">${delta === 0 ? 'flat vs baseline'
    : `${delta > 0 ? '+' : ''}${delta}${unit} vs baseline`}
  ${delta !== 0 ? `<span class="${good ? 'yn-y' : 'yn-n'}">${good ? '→ right direction' : '→ wrong direction'}</span>` : ''}</p>`;
}

/* Baseline summary card (always visible when profile has any baseline). */
function baselineCardHTML () {
  if (!profile) return '';
  const hasAny = profile.weightKg || profile.waistCm || profile.run2kMin || profile.maxPushups;
  if (!hasAny) return `<p class="small muted">No baseline measurements yet — add them in Profile. Progress is judged against week-1 numbers, never feelings.</p>`;
  return `<div class="baseline-card">
    <div><span>Start </span><strong>${shortDate(programStart())}</strong></div>
    ${profile.weightKg  ? `<div><span>Weight </span><strong>${profile.weightKg} kg</strong></div>` : ''}
    ${profile.waistCm   ? `<div><span>Waist  </span><strong>${profile.waistCm} cm</strong></div>` : ''}
    ${profile.run2kMin  ? `<div><span>2k run </span><strong>${profile.run2kMin} min</strong></div>` : ''}
    ${profile.maxPushups? `<div><span>Push-ups </span><strong>${profile.maxPushups}</strong></div>` : ''}
  </div>`;
}

/* ---------------------------------------------------------------
   Views.
   --------------------------------------------------------------- */

/* ── Welcome / Onboarding ─────────────────────────────────────── */
function viewWelcome () {
  const t = today();
  return `
  <section class="welcome-hero">
    <h1>Twenty-six weeks.<br><em>Show up.</em></h1>
    <p class="lede">BeFit is a training logbook built on one honest idea: <strong>consistency beats intensity</strong>. A fixed weekly schedule so you never have to decide what to do. Three moderate diet rules instead of calorie counting. A streak that measures showing up — not heroics.</p>
    <div class="welcome-stats">
      <div class="ws-pill"><strong>26</strong> weeks</div>
      <div class="ws-pill"><strong>20–30 min</strong> / day</div>
      <div class="ws-pill"><strong>3</strong> diet rules</div>
      <div class="ws-pill"><strong>0</strong> calorie counting</div>
      <div class="ws-pill"><strong>100%</strong> your browser</div>
    </div>
    <ul class="layer-list">
      <li>
        <span class="lyr">Layer 1 · Foundation</span>
        <span><strong>Consistency</strong> — at least 6 short sessions a week, 24 of 26 weeks. Everything else stands on this.</span>
      </li>
      <li>
        <span class="lyr">Layer 2 · Engine</span>
        <span><strong>Endurance</strong> — beat your baseline timed 2 km run by 20%+ and run 5 km without stopping.</span>
      </li>
      <li>
        <span class="lyr">Layer 3 · Long game</span>
        <span><strong>Body</strong> — waist and weight trending down; visible change is won mostly in the kitchen, over time.</span>
      </li>
    </ul>
  </section>
  <div class="card">
    <h2>Set up your logbook</h2>
    <p class="muted small">Everything stays in this browser — it never leaves your device. Skip any measurement you don't have yet; you can add it during your first (baseline) week.</p>
    <form class="stack" id="onboard-form">
      <div class="field-row">
        <div class="field"><label for="ob-name">Your name</label>
          <input id="ob-name" type="text" placeholder="What should the logbook call you?" required autocomplete="given-name">
        </div>
        <div class="field"><label for="ob-start">Start date</label>
          <input id="ob-start" type="date" value="${ymd(t)}" required>
          <span class="hint">Starting next Monday (${shortDate(nextMonday())}) gives you a clean week 1.</span>
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label for="ob-weight">Weight (kg)</label>
          <input id="ob-weight" type="number" step="0.1" min="25" max="300" placeholder="e.g. 74.5">
          <span class="hint">Same scale, same time, after the bathroom.</span>
        </div>
        <div class="field"><label for="ob-waist">Waist at navel (cm)</label>
          <input id="ob-waist" type="number" step="0.5" min="40" max="220" placeholder="relaxed, not sucked in">
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label for="ob-run">Timed 2 km run (minutes)</label>
          <input id="ob-run" type="number" step="0.1" min="5" max="60" placeholder="at conversation pace">
          <span class="hint">Run 2 km at a pace you could talk at. This is the number you'll beat by week 26.</span>
        </div>
        <div class="field"><label for="ob-pushups">Max push-ups, one set</label>
          <input id="ob-pushups" type="number" step="1" min="0" max="200" placeholder="honest count, no half-reps">
        </div>
      </div>
      <div class="field"><label for="ob-slot">Preferred daily time slot</label>
        <select id="ob-slot">
          <option value="">Not decided yet</option>
          <option>Early morning</option><option>Morning</option>
          <option>Lunchtime</option><option>After work</option><option>Evening</option>
        </select>
        <span class="hint">The slot matters more than the plan — sessions that have a home get done.</span>
      </div>
      <div><button type="submit" class="primary" id="btn-start">Start the logbook →</button></div>
    </form>
  </div>
  <div class="card">
    <h2>Before you start</h2>
    <p>This program assumes you are healthy and cleared for moderate exercise. Injuries, medical conditions, medications, chest symptoms, dizziness, or rapid unexplained weight change — a doctor decides your plan, not a website. <strong>Sharp pain during any movement means stop that movement immediately.</strong></p>
    <p class="small muted">Your data (name, measurements, and session log) is stored only in this browser's localStorage on your own device. There is no account, no server, and no sync. Export regularly as a backup.</p>
  </div>`;
}

/* ── Today (dashboard) ────────────────────────────────────────── */
function viewToday () {
  const t      = today();
  const s      = SESSIONS[t.getDay()];
  const key    = ymd(t);
  const status = days[key];
  const wk     = weekNumberOf(t);
  const streak = currentStreak();
  const hit    = weeksHit();
  const done   = weeksCompleted();
  const monday = mondayOf(t);
  const ws     = weekStats(monday);
  const start  = programStart();

  const yesterday       = addDays(t, -1);
  const programStarted  = start && yesterday >= start;
  const missedYesterday = programStarted && dayQualifies(yesterday) === 'break';

  let banner = '';
  if (missedYesterday && !status) {
    banner = `<div class="banner urgent"><strong>Never miss twice.</strong> Yesterday didn't happen — fine, that's life. Today is non-negotiable, and the 10-minute version counts fully. One miss is noise; two is the start of a lapse.</div>`;
  } else if (status) {
    const msgs = {
      sick:   'Rest properly — the streak is paused, not broken. Illness never resets it.',
      missed: 'Logged honestly — that\'s worth more than a fudged tick. Tomorrow\'s session is the one that matters now.',
      rest:   'Rest day stamped. Nothing else to do until tomorrow.',
      done:   'Day stamped. Session done. Nothing else needed.',
      short:  '10-minute version counts fully — showing up is the whole game.'
    };
    banner = `<div class="banner calm"><strong>${STATUS_LABEL[status]}.</strong> ${msgs[status] || 'Logged.'}</div>`;
  }

  const actions = status
    ? `<div class="log-actions"><button class="ghost" data-status="">Change today's entry</button></div>`
    : s.restDay
      ? `<div class="log-actions">
          <button class="primary" data-status="rest" id="btn-rest">Rest taken</button>
          <button data-status="done" id="btn-walk">Easy walk done</button>
          <button data-status="sick" id="btn-sick-rest">Sick</button>
        </div>`
      : `<div class="log-actions">
          <button class="primary" data-status="done" id="btn-done">Done ✓</button>
          <button data-status="short" id="btn-short">10-min version</button>
          <button data-status="sick" id="btn-sick">Sick</button>
          <button class="danger-ghost" data-status="missed" id="btn-missed">Missed</button>
        </div>`;

  const wkLabel = wk !== null && wk >= 1 && wk <= PROGRAM_WEEKS
    ? `Week ${wk} of ${PROGRAM_WEEKS}${wk >= 12 && wk <= 14 ? ' <span class="wk12-badge">Review week</span>' : ''}`
    : wk !== null && wk < 1
      ? `Program starts ${shortDate(start)}`
      : 'Program window complete — see Progress';

  return `
  <h1 class="view-title">${niceDate(t)}</h1>
  <p class="view-sub">${wkLabel}${profile.timeSlot ? ` · your slot: ${esc(profile.timeSlot).toLowerCase()}` : ''}</p>
  ${banner}
  <div class="card">
    <div class="session-head">
      <span class="session-name">${s.name}</span>
      <span class="session-where">${s.where}</span>
    </div>
    <ul class="session-detail">${s.detail.map(d => `<li>${d}</li>`).join('')}</ul>
    ${s.tenMin ? `<div class="fallback"><strong>Squeezed day?</strong> ${s.tenMin}</div>` : ''}
    ${s.swap   ? `<div class="swap-box"><strong>Swap rule:</strong> ${s.swap}</div>` : ''}
    ${actions}
  </div>
  <div class="stat-row">
    ${statCard('Current streak', `${streak}<small> day${streak === 1 ? '' : 's'}</small>`, 'Sick days pause it. Only a skipped session breaks it.')}
    ${statCard('This week', `${ws.credits}<small> / ${ws.required || 6} sessions</small>`, ws.sick ? `${ws.sick} sick day${ws.sick > 1 ? 's' : ''} — quota lowered, no penalty` : 'Sunday rest is the 7th day, not a miss')}
    ${statCard('Weeks hit', `${hit}<small> / ${WEEKS_TARGET} target</small>`, `${done} of ${PROGRAM_WEEKS} program weeks completed`)}
  </div>
  <div class="card">
    <h2>This week</h2>
    ${weekStripHTML(monday)}
    <div class="legend">
      <span>✓ done</span><span>½ 10-min version</span><span>R rest</span>
      <span>S sick (pauses streak)</span><span>✕ missed</span><span>? not logged</span>
    </div>
  </div>`;
}

/* ── Streak ───────────────────────────────────────────────────── */
function viewStreak () {
  const streak = currentStreak();
  const pws    = programWeeks().slice().reverse();
  const t      = today();

  // Build last 3 months of calendar (most recent first)
  const months = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(t.getFullYear(), t.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  const calHTML = months.map(({ year, month }) => `
    <div class="month-section">
      <h3>${MONTH_NAMES[month]} ${year}</h3>
      ${monthGridHTML(year, month)}
    </div>`).join('');

  const bars = pws.length === 0
    ? '<p class="muted small">Your first program week will appear here.</p>'
    : `<div class="quota-list">${pws.map(w => {
        const pct = Math.min(100, Math.round((w.credits / Math.max(w.required, 1)) * 100));
        const cls = w.paused ? 'paused' : (w.complete && !w.hit ? 'miss' : '');
        const res = w.paused ? 'paused (sick)'
          : w.complete ? (w.hit ? 'hit ✓' : 'missed') : 'in progress';
        return `<div class="quota-row ${cls}">
          <span class="wk">wk ${w.number} · ${shortDate(w.monday)}</span>
          <span class="quota-bar"><i style="width:${pct}%"></i></span>
          <span class="res">${w.credits}/${w.required || 6} — ${res}</span></div>`;
      }).join('')}</div>`;

  return `
  <h1 class="view-title">The streak</h1>
  <p class="view-sub">The only score that matters in the first 12 weeks. Quota: at least 6 sessions a week — Sunday rest counts as the seventh day, not a miss. Target: ${WEEKS_TARGET} of ${PROGRAM_WEEKS} weeks (two grace weeks built in).</p>
  <div class="card">
    <span class="eyebrow">Days showed up, in a row</span>
    <div class="tally">${tallySVG(streak)}</div>
  </div>
  <div class="grid-2">
    <div class="card">
      <h2>Calendar</h2>
      ${calHTML}
    </div>
    <div class="card">
      <h2>The two laws</h2>
      <ol>
        <li><strong>Never miss twice.</strong> One missed day is life; two in a row is the start of a lapse. The day after a miss, the session happens even if it's the 10-minute version — that version exists exactly for that day.</li>
        <li><strong>A lapse gets analysis, not guilt.</strong> A missed week produces one honest note about WHY — schedule, sleep, travel, boredom — and ONE change to the system that removes the cause. The system adapts; the goal doesn't.</li>
      </ol>
      <p class="small muted" style="margin-top:.75rem">Illness pauses the streak without penalty — it never resets it. Training through fever is how people quit, or worse.</p>
    </div>
  </div>
  <div class="card">
    <h2>Week by week</h2>
    ${bars}
  </div>`;
}

/* ── Sunday log ───────────────────────────────────────────────── */
function viewLog () {
  const t = today();
  const lastSunday  = addDays(t, -t.getDay());
  const start       = programStart();
  const defaultEnd  = lastSunday >= start ? lastSunday : addDays(mondayOf(start), 6);
  const editing     = state.logEditing || ymd(defaultEnd);
  const editDate    = parseYMD(editing);
  const existing    = weeks.find(w => w.weekEnding === editing) || {};
  const ws          = weekStats(mondayOf(editDate));
  const isFirstSun  = editDate.getDay() === 0 && editDate.getDate() <= 7;
  const existingM   = monthly.find(m => m.date === editing) || {};

  const rows  = weeks.slice().sort((a, b) => a.weekEnding < b.weekEnding ? 1 : -1);
  const table = rows.length === 0
    ? '<p class="muted small">No weekly reviews yet. The first one takes two minutes — fill the form above, click Save.</p>'
    : `<div class="table-wrap"><table>
      <thead><tr><th>Week ending</th><th class="num">Sessions /7</th><th class="num">Weight</th><th>P</th><th>S</th><th>T</th><th>Note</th><th></th></tr></thead>
      <tbody>${rows.map(w => `<tr>
        <td class="num">${shortDate(parseYMD(w.weekEnding))}</td>
        <td class="num">${w.sessions ?? '—'}</td>
        <td class="num">${w.weightKg ? w.weightKg + ' kg' : '—'}</td>
        <td class="${w.P ? 'yn-y' : 'yn-n'}">${w.P ? 'y' : 'n'}</td>
        <td class="${w.S ? 'yn-y' : 'yn-n'}">${w.S ? 'y' : 'n'}</td>
        <td class="${w.T ? 'yn-y' : 'yn-n'}">${w.T ? 'y' : 'n'}</td>
        <td>${esc(w.note || '')}</td>
        <td><button class="ghost" data-edit-week="${w.weekEnding}">edit</button></td>
      </tr>`).join('')}</tbody></table></div>`;

  return `
  <h1 class="view-title">Sunday review</h1>
  <p class="view-sub">One row, two minutes, every Sunday. Honesty rules: a kept streak with broken diet rules is written exactly as that — it still buys endurance, just not abs. A zero is a zero, with a next action.</p>
  <div class="card">
    <h2>Log a week</h2>
    <form class="stack" id="week-form">
      <div class="field-row">
        <div class="field"><label for="wf-end">Week ending (Sunday)</label>
          <input id="wf-end" type="date" value="${editing}">
        </div>
        <div class="field"><label for="wf-sessions">Sessions done /7</label>
          <input id="wf-sessions" type="number" min="0" max="7" value="${existing.sessions ?? ws.credits}">
          <span class="hint">Pre-filled from your daily stamps (${ws.credits} counted${ws.sick ? `, ${ws.sick} sick` : ''}).</span>
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label for="wf-weight">Friday weight (kg)</label>
          <input id="wf-weight" type="number" step="0.1" min="25" max="300" value="${existing.weightKg ?? ''}" placeholder="optional">
          <span class="hint">Judged on the 4-week trend, never one morning number.</span>
        </div>
        <div class="field"><label for="wf-note">One-line note</label>
          <input id="wf-note" type="text" maxlength="140" value="${esc(existing.note || '')}" placeholder="what helped, what collided">
        </div>
      </div>
      <div class="field">
        <label>Diet rules kept this week? <span class="small muted">(P/S/T)</span></label>
        <div class="check-row"><input type="checkbox" id="wf-p" ${existing.P ? 'checked' : ''}><label for="wf-p"><strong>P</strong> — protein at every meal (eggs, dal, paneer, curd, chicken, fish, sprouts…)</label></div>
        <div class="check-row"><input type="checkbox" id="wf-s" ${existing.S ? 'checked' : ''}><label for="wf-s"><strong>S</strong> — zero sugary drinks (no soft drinks, no sweetened juices)</label></div>
        <div class="check-row"><input type="checkbox" id="wf-t" ${existing.T ? 'checked' : ''}><label for="wf-t"><strong>T</strong> — treats ≤ 2, chosen in advance (not impulse)</label></div>
      </div>
      <hr class="rule">
      <div class="field">
        <label>Monthly measurements ${isFirstSun ? '<span style="color:var(--amber)">— due this week (first Sunday of the month)</span>' : '(optional — due on the first Sunday of each month)'}</label>
        <div class="field-row">
          <div class="field"><label for="wf-waist" class="small">Waist at navel (cm)</label>
            <input id="wf-waist" type="number" step="0.5" min="40" max="220" value="${existingM.waistCm ?? ''}" placeholder="relaxed">
          </div>
          <div class="field"><label for="wf-run" class="small">Timed 2 km (minutes)</label>
            <input id="wf-run" type="number" step="0.1" min="5" max="60" value="${existingM.run2kMin ?? ''}" placeholder="same route as baseline">
          </div>
        </div>
      </div>
      <div><button type="submit" class="primary" id="btn-save-week">Save week</button></div>
    </form>
  </div>
  <div class="card">
    <h2>The log</h2>
    ${table}
  </div>`;
}

/* ── Progress ─────────────────────────────────────────────────── */
function viewProgress () {
  const v      = layerVerdicts();
  const moving = [v.streakLayer, v.enduranceLayer, v.bodyLayer].filter(x => x === 'up').length;
  const known  = [v.streakLayer, v.enduranceLayer, v.bodyLayer].filter(x => x !== 'nodata').length;
  const trend  = weightTrend();

  const chipFor = s => s === 'up'     ? '<span class="chip good">moving</span>'
    : s === 'flat'   ? '<span class="chip bad">flat</span>'
    : '<span class="chip wait">no data yet</span>';

  let verdict;
  if (known === 0)      verdict = `<div class="banner note"><strong>No baseline, no verdict.</strong> Progress is judged against your week-1 numbers, never against feelings. Fill in your measurements in Profile and log your first weeks.</div>`;
  else if (moving >= 2) verdict = `<div class="banner calm"><strong>On track.</strong> ${moving} of 3 layers moving — that's the standard. Keep the week boring and repeatable.</div>`;
  else if (moving === 1) verdict = `<div class="banner note"><strong>One layer moving.</strong> Fine for a stretch — check Guidance for which lever fits the flat layers.</div>`;
  else                   verdict = `<div class="banner"><strong>Nothing moving.</strong> If this holds 4+ weeks, it's a system review, not a willpower problem. See Guidance.</div>`;

  return `
  <h1 class="view-title">Progress</h1>
  <p class="view-sub">Every claim here traces to your baseline or a log row — never to feeling. "On track" means 2 of 3 layers moving.</p>
  ${verdict}
  <div class="stat-row">
    ${statCard('Consistency', chipFor(v.streakLayer), 'Hit ≥3 of the last 4 completed weeks')}
    ${statCard('Endurance', chipFor(v.enduranceLayer), 'Monthly 2 km time vs baseline')}
    ${statCard('Body', chipFor(v.bodyLayer), 'Waist tape first; weight trend as fallback')}
  </div>
  <div class="card chart-card">
    <h2>Weight (kg)</h2>
    ${chartSVG(weightSeries(), { unit: ' kg' })}
    ${trend !== null ? `<p class="small muted">4-week trend: <span class="mono">${trend > 0 ? '+' : ''}${Math.round(trend * 10) / 10} kg</span> ${trend < -0.1 ? '— drifting down, as designed.' : trend > 0.1 ? '— drifting up; check the P/S/T columns before changing training.' : '— flat.'}</p>` : ''}
  </div>
  <div class="grid-2">
    <div class="card chart-card">
      <h2>Waist at navel (cm)</h2>
      ${chartSVG(waistSeries(), { unit: ' cm' })}
      <p class="small muted">Measured monthly. This tape is the honest abs metric — abs appear here long before the mirror shows them.</p>
    </div>
    <div class="card chart-card">
      <h2>Timed 2 km (min)</h2>
      ${chartSVG(runSeries(), { unit: ' min' })}
      <p class="small muted">Re-run monthly on the same route. Target: beat your baseline by 20%+ by week 26.</p>
    </div>
  </div>
  <div class="card">
    <h2>Baseline</h2>
    ${baselineCardHTML()}
  </div>`;
}

/* ── Guidance ─────────────────────────────────────────────────── */
function viewGuidance () {
  const cards = buildGuidance();
  return `
  <h1 class="view-title">Guidance</h1>
  <p class="view-sub">Suggestions built from your own logbook — priority-ordered. No motivation speeches. The system adapts; the goal doesn't.</p>
  ${cards.map(c => `
    <div class="card guide-pri" style="border-color: var(--${c.tone === 'urgent' ? 'red' : c.tone === 'note' ? 'amber' : 'green'})">
      <h2 style="color: var(--${c.tone === 'urgent' ? 'red' : c.tone === 'note' ? 'amber' : 'green'})">${c.title}</h2>
      <div>${c.body}</div>
      <p class="why">Why: ${c.why}</p>
    </div>`).join('')}`;
}

/* ── Plan ─────────────────────────────────────────────────────── */
function viewPlan () {
  const rows = [1, 2, 3, 4, 5, 6, 0].map(i => {
    const s = SESSIONS[i];
    return `<tr><td><strong>${DOW_SHORT[i]}</strong></td><td><strong>${s.name}</strong><br><span class="small muted">${s.detail[0]}${s.detail[1] && !s.restDay ? ' · ' + s.detail[1] : ''}</span></td><td class="num">${s.where}</td></tr>`;
  }).join('');

  return `
  <h1 class="view-title">The plan</h1>
  <p class="view-sub">Fixed on purpose: never decide, just look up. Every session fits 20–30 minutes including warm-up. Phase 1 covers weeks 1–12; at week 12 the plan is reviewed with data, not enthusiasm.</p>
  <div class="card">
    <h2>The fixed week</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Day</th><th>Session (20–30 min)</th><th class="num">Where</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <h3>Rules that make it work</h3>
    <ul>
      <li><strong>A 10-minute version always counts.</strong> Squeezed day → first round only, stamp the streak. It measures showing up, not heroics.</li>
      <li><strong>Progression:</strong> strength — when 3×10 feels easy, add the smallest weight increment or 2 reps. Runs — add time, not speed, until 5 km is continuous, then chase your baseline time.</li>
      <li><strong>Swaps allowed same-week:</strong> rain → treadmill or stairs; crowded gym → push-up and band versions. Swap the venue, never the day off.</li>
      <li><strong>Week 1 is form week:</strong> lightest weights, learn the movements, take your baseline measurements.</li>
    </ul>
  </div>
  <div class="card">
    <h2>The three diet rules</h2>
    <p class="muted small">Chosen deliberately over calorie counting: sustainable beats optimal. This is where visible body change actually comes from.</p>
    <ol>
      <li><strong>Protein at every meal</strong> — a palm-sized portion minimum: eggs, dal, paneer, curd, chicken, fish, sprouts. Protein protects muscle while fat comes off, and keeps you full longer.</li>
      <li><strong>Zero sugary drinks.</strong> No soft drinks, no sweetened juices; sugar in coffee or tea halved, then dropped. Liquid sugar is the single cheapest cut for a lean-ish start.</li>
      <li><strong>One plate, no seconds</strong> — normal home food, stop at one serving. <strong>2 planned treats a week</strong>, chosen in advance, enjoyed without accounting guilt.</li>
    </ol>
    <h3>Deliberately NOT rules</h3>
    <p>No banned foods, no fasting windows, no macros app, no "cheat days" — treats are per-item, not per-day, because a cheat <em>day</em> erases a week.</p>
    <h3>Honest expectations</h3>
    <p>From a lean-ish start, these rules plus the weekly schedule produce slow, visible change — upper abs around month 6 is a realistic mark. A full six-pack is usually a 12-month decision, made later, with data.</p>
  </div>
  <div class="card">
    <h2>Meal prep — the reference</h2>
    <p>For practical recipes and weekly meal-prep walkthroughs that fit the rules above, the reference channel is <a href="${MRBFIT.channel}" target="_blank" rel="noopener"><strong>Mr. B-fit on YouTube</strong></a> — protein-forward home cooking aimed at making a healthy diet easy, sustainable, and tasty.</p>
    <ul>
      <li><a href="${MRBFIT.playlist}" target="_blank" rel="noopener">Full Day Meal Prep (3 meals) — playlist</a> — prep once, eat to the rules all day. A good starting point.</li>
      <li>Watch with the rules in mind: a palm of protein per meal, nothing sugary to drink, one plate per sitting.</li>
    </ul>
    <p class="small muted">External content — treat it as inspiration, not prescription. Recipes are ideas; the three rules are the contract.</p>
  </div>
  <div class="card">
    <h2>Week 12 — the review, committed in advance</h2>
    <p>Week 1 is easy. Week 12 — when novelty is gone and the data says something imperfect — is where programs die. The pre-committed response:</p>
    <ol>
      <li>Read your 12 weeks of log rows and 3 monthly measurements first. No redesign before reading.</li>
      <li>Judge each layer separately — streak, endurance, and body fail differently and get different fixes.</li>
      <li>Streak weak → the slot or session length is wrong, not your motivation. Shrink before you move; move before you quit.</li>
      <li>Endurance flat but streak solid → extend the Saturday run, make Tuesday's brisk minutes honest.</li>
      <li>Waist flat with all diet rules kept 8+ weeks → tighten ONE rule (usually portions). Never all three.</li>
      <li>Then rewrite the week as phase 2: same skeleton, heavier/longer/tighter only where the data says so.</li>
    </ol>
  </div>`;
}

/* ── Safety ───────────────────────────────────────────────────── */
function viewSafety () {
  const lines = [
    {
      title: 'Sharp or joint pain = stop that movement immediately.',
      body: 'Note it in your Sunday log; if it recurs twice, a doctor sees it before it\'s trained again.',
      why: 'Soreness fades, injuries compound — a 26-week streak dies faster from injury than from laziness.'
    },
    {
      title: 'Anything medical is a doctor\'s call, not a plan\'s.',
      body: 'Chest symptoms, dizziness, unexplained rapid weight loss or gain, new medication, any diagnosis — the plan pauses and a professional decides intensity.',
      why: 'A website cannot assess you. It has no medical competence.'
    },
    {
      title: 'Illness → rest without streak penalty.',
      body: 'Mark the day "Sick"; the streak pauses and never resets for illness. Return when you\'re well — not when you feel guilty.',
      why: 'Training through fever is how people quit — or worse.'
    },
    {
      title: 'No supplements or drugs, ever.',
      body: 'Protein comes from meals; anything pharmacological is completely outside this program\'s scope.',
      why: 'Safety cannot be verified for you specifically through a generic website.'
    },
    {
      title: 'No crash protocols.',
      body: 'Nothing that promises the goal faster via extreme deficits or 2-hour daily sessions. The 20–30 minute ceiling and moderate diet rules are the program — chosen for sustainability, not drama.',
      why: 'The plan you can repeat for 26 weeks beats the plan that impresses for 10 days.'
    }
  ];

  return `
  <h1 class="view-title">Safety lines</h1>
  <p class="view-sub">Non-negotiable, whatever the streak says. These aren't advice — they're the floor below which no streak score matters.</p>
  <div class="card">
    ${lines.map(l => `
      <div class="safety-line">
        <strong>${l.title}</strong>
        ${l.body}
        <span class="why">Why: ${l.why}</span>
      </div>`).join('')}
  </div>
  <div class="banner urgent">
    <strong>Not medical advice.</strong> This is a consistency plan built for healthy adults cleared for moderate exercise. If you have any injury, condition, or medication, or if anything starts hurting or feels medical, see a doctor before continuing. The site has no competence to assess your individual situation.
  </div>`;
}

/* ── Profile / Settings ───────────────────────────────────────── */
function viewProfile () {
  const p = profile;
  return `
  <h1 class="view-title">Profile &amp; data</h1>
  <p class="view-sub">Your baseline and settings. Everything lives in this browser's localStorage — export a backup whenever you switch devices or clear your browser.</p>
  <div class="card">
    <h2>Your details</h2>
    <form class="stack" id="profile-form">
      <div class="field-row">
        <div class="field"><label for="pf-name">Name</label>
          <input id="pf-name" type="text" value="${esc(p.name)}" required autocomplete="given-name">
        </div>
        <div class="field"><label for="pf-start">Start date</label>
          <input id="pf-start" type="date" value="${p.startDate}" required>
          <span class="hint">Week numbers and the ${PROGRAM_WEEKS}-week window follow this date.</span>
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label for="pf-weight">Baseline weight (kg)</label>
          <input id="pf-weight" type="number" step="0.1" min="25" max="300" value="${p.weightKg ?? ''}">
        </div>
        <div class="field"><label for="pf-waist">Baseline waist (cm)</label>
          <input id="pf-waist" type="number" step="0.5" min="40" max="220" value="${p.waistCm ?? ''}">
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label for="pf-run">Baseline 2 km (min)</label>
          <input id="pf-run" type="number" step="0.1" min="5" max="60" value="${p.run2kMin ?? ''}">
        </div>
        <div class="field"><label for="pf-pushups">Baseline push-ups</label>
          <input id="pf-pushups" type="number" step="1" min="0" max="200" value="${p.maxPushups ?? ''}">
        </div>
      </div>
      <div class="field"><label for="pf-slot">Daily time slot</label>
        <select id="pf-slot">
          ${['', 'Early morning', 'Morning', 'Lunchtime', 'After work', 'Evening']
            .map(o => `<option value="${o}" ${p.timeSlot === o ? 'selected' : ''}>${o || 'Not decided yet'}</option>`).join('')}
        </select>
      </div>
      <div><button type="submit" class="primary" id="btn-save-profile">Save changes</button></div>
    </form>
  </div>
  <div class="card">
    <h2>Backup &amp; transfer</h2>
    <p class="small muted">One JSON file with your profile, daily stamps, weekly reviews, and monthly measurements. Import on any device to restore your logbook.</p>
    <div class="log-actions">
      <button id="btn-export">Export data ↓</button>
      <button id="btn-import">Import data ↑</button>
      <input type="file" id="import-file" accept="application/json,.json" hidden>
    </div>
  </div>
  <div class="card">
    <h2>Danger zone</h2>
    <p class="small muted">Deletes everything stored by this site in this browser. There is no undo — export a backup first.</p>
    <div class="log-actions"><button class="danger-ghost" id="btn-clear">Clear all data</button></div>
  </div>`;
}

/* ---------------------------------------------------------------
   Router + events.
   --------------------------------------------------------------- */
const VIEWS = {
  today: viewToday, streak: viewStreak, log: viewLog, progress: viewProgress,
  guidance: viewGuidance, plan: viewPlan, safety: viewSafety, profile: viewProfile
};
const state = { logEditing: null };

function currentTab () {
  const h = location.hash.replace(/^#\//, '');
  return VIEWS[h] ? h : 'today';
}

function render () {
  const tab = currentTab();
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
  if (!profile) {
    document.getElementById('nav').style.display = 'none';
    app.innerHTML = viewWelcome();
  } else {
    document.getElementById('nav').style.display = '';
    app.innerHTML = VIEWS[tab]();
  }
  wire(tab);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function numOrNull (id) {
  const v = document.getElementById(id)?.value?.trim();
  return (!v || v === '') ? null : Number(v);
}

function wire (tab) {
  /* ── Onboarding ── */
  const ob = document.getElementById('onboard-form');
  if (ob) {
    ob.addEventListener('submit', e => {
      e.preventDefault();
      profile = {
        name:       document.getElementById('ob-name').value.trim(),
        startDate:  document.getElementById('ob-start').value,
        weightKg:   numOrNull('ob-weight'),
        waistCm:    numOrNull('ob-waist'),
        run2kMin:   numOrNull('ob-run'),
        maxPushups: numOrNull('ob-pushups'),
        timeSlot:   document.getElementById('ob-slot').value
      };
      if (!profile.name) { profile.name = 'You'; }
      store.set('profile', profile);
      location.hash = '#/today';
      render();
      showToast('Logbook started — week 1 begins now.');
    });
    return;
  }

  /* ── Today: status buttons ── */
  app.querySelectorAll('[data-status]').forEach(btn => {
    btn.addEventListener('click', () => {
      const s   = btn.dataset.status;
      const key = ymd(today());
      if (s === '') delete days[key];
      else days[key] = s;
      store.set('days', days);
      render();
    });
  });

  /* ── Log: week form + edit links ── */
  const wf = document.getElementById('week-form');
  if (wf) {
    document.getElementById('wf-end').addEventListener('change', e => {
      state.logEditing = e.target.value;
      render();
    });
    wf.addEventListener('submit', e => {
      e.preventDefault();
      const weekEnding = document.getElementById('wf-end').value;
      if (!weekEnding) return;
      const row = {
        weekEnding,
        sessions: numOrNull('wf-sessions'),
        weightKg: numOrNull('wf-weight'),
        P: document.getElementById('wf-p').checked,
        S: document.getElementById('wf-s').checked,
        T: document.getElementById('wf-t').checked,
        note: document.getElementById('wf-note').value.trim()
      };
      weeks = weeks.filter(w => w.weekEnding !== weekEnding).concat(row);
      const waistCm  = numOrNull('wf-waist');
      const run2kMin = numOrNull('wf-run');
      if (waistCm !== null || run2kMin !== null) {
        monthly = monthly.filter(m => m.date !== weekEnding)
          .concat({ date: weekEnding, waistCm, run2kMin });
      }
      saveAll();
      state.logEditing = null;
      render();
      showToast('Week saved.');
    });
    app.querySelectorAll('[data-edit-week]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.logEditing = btn.dataset.editWeek;
        render();
      });
    });
  }

  /* ── Profile ── */
  const pf = document.getElementById('profile-form');
  if (pf) {
    pf.addEventListener('submit', e => {
      e.preventDefault();
      profile = {
        name:       document.getElementById('pf-name').value.trim() || 'You',
        startDate:  document.getElementById('pf-start').value,
        weightKg:   numOrNull('pf-weight'),
        waistCm:    numOrNull('pf-waist'),
        run2kMin:   numOrNull('pf-run'),
        maxPushups: numOrNull('pf-pushups'),
        timeSlot:   document.getElementById('pf-slot').value
      };
      store.set('profile', profile);
      render();
      showToast('Profile saved.');
    });

    document.getElementById('btn-export').addEventListener('click', () => {
      const data = { profile, days, weeks, monthly, exported: ymd(today()), version: 1 };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = 'befit-backup-' + ymd(today()) + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
      showToast('Backup exported.');
    });

    const fileInput = document.getElementById('import-file');
    document.getElementById('btn-import').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const f = fileInput.files[0];
      if (!f) return;
      f.text().then(txt => {
        try {
          const data = JSON.parse(txt);
          if (!data.profile || !data.profile.startDate) throw new Error('Not a BeFit backup.');
          profile = data.profile;
          days    = data.days    || {};
          weeks   = data.weeks   || [];
          monthly = data.monthly || [];
          store.set('profile', profile);
          saveAll();
          render();
          showToast('Data imported successfully.');
        } catch (err) {
          alert('That file doesn\'t look like a BeFit backup (expected JSON with a profile object). Nothing was changed.');
        }
      });
    });

    document.getElementById('btn-clear').addEventListener('click', () => {
      if (!confirm('Delete ALL BeFit data in this browser?\n\nExport a backup first if you want to keep your logbook. There is no undo.')) return;
      ['profile', 'days', 'weeks', 'monthly'].forEach(k => store.remove(k));
      profile = null; days = {}; weeks = []; monthly = [];
      location.hash = '';
      render();
    });
  }
}

/* ── Bootstrap ── */
window.addEventListener('hashchange', render);
render();
