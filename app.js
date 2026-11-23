import { store, personKey } from './storage.js';

// ---------- small helpers ----------
const $ = (s, r = document) => r.querySelector(s);
function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
}
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const addDays = (s, n) => { const d = parseYmd(s); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
const todayStr = () => { const t = new Date(); return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`; };
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmtTime = (m) => {
  const hh = Math.floor(m / 60) % 24, mm = m % 60;
  return `${(hh % 12) || 12}:${pad(mm)} ${hh < 12 ? 'AM' : 'PM'}`;
};
const fmtDate = (s, withYear) => {
  const d = parseYmd(s);
  return `${DOW[d.getUTCDay()]} ${MON[d.getUTCMonth()]} ${d.getUTCDate()}${withYear ? ', ' + d.getUTCFullYear() : ''}`;
};
const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');

if (store.mode === 'local') {
  $('#banner').append(h('div', { class: 'demo' },
    'Demo mode: events are saved only in this browser. Add your Firebase config (see README) so others can see and fill in your events.'));
}

// ---------- router ----------
let cleanup = null;
function route() {
  if (cleanup) { cleanup(); cleanup = null; }
  const m = location.hash.match(/^#\/e\/([\w-]+)/);
  if (m) renderEvent(m[1]); else renderCreate();
}
window.addEventListener('hashchange', route);
route();

// ================= CREATE PAGE =================
function renderCreate() {
  const app = $('#app');
  app.innerHTML = '';
  const selected = new Set();
  const weekdays = new Set([1, 2, 3, 4, 5]);
  const t = parseYmd(todayStr());
  let viewY = t.getUTCFullYear(), viewM = t.getUTCMonth();
  let mode = 'dates';

  const nameIn = h('input', { class: 'event-name', placeholder: 'New Event Name', maxlength: 150 });
  const modeSel = h('select', { onchange: () => { mode = modeSel.value; drawDates(); } },
    h('option', { value: 'dates' }, 'Specific Dates'), h('option', { value: 'weekdays' }, 'Days of the Week'));

  const dateArea = h('div');
  const summary = h('div', { class: 'summary' });

  // calendar drag-select
  let dragMode = null;
  const stopDrag = () => { dragMode = null; };
  window.addEventListener('pointerup', stopDrag);
  cleanup = () => window.removeEventListener('pointerup', stopDrag);

  function toggleDay(d, force) {
    const on = force ?? !selected.has(d);
    on ? selected.add(d) : selected.delete(d);
    const cell = dateArea.querySelector(`[data-d="${d}"]`);
    if (cell) cell.classList.toggle('on', on);
    drawSummary();
  }

  function monthGrid(y, m) {
    const first = new Date(Date.UTC(y, m, 1));
    const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const grid = h('div', { class: 'month-grid' }, DOW.map((d) => h('div', { class: 'dow' }, d[0])));
    for (let i = 0; i < first.getUTCDay(); i++) grid.append(h('div'));
    for (let d = 1; d <= days; d++) {
      const s = `${y}-${pad(m + 1)}-${pad(d)}`;
      grid.append(h('div', {
        class: 'day' + (selected.has(s) ? ' on' : '') + (s === todayStr() ? ' today' : ''), 'data-d': s,
      }, String(d)));
    }
    return h('div', { class: 'month' }, h('div', { class: 'month-title' }, `${MONTH_FULL[m]} ${y}`), grid);
  }

  function drawCalendar() {
    const wrap = h('div', { class: 'cal' });
    const months = h('div', { class: 'months' });
    for (let i = 0; i < 2; i++) {
      const y = viewY + Math.floor((viewM + i) / 12), m = (viewM + i) % 12;
      months.append(monthGrid(y, m));
    }
    const shift = (n) => { const tot = viewY * 12 + viewM + n; viewY = Math.floor(tot / 12); viewM = tot % 12; drawDates(); };
    wrap.append(h('div', { class: 'cal-nav' },
      h('button', { onclick: () => shift(-12), title: 'Back one year' }, '«'),
      h('button', { onclick: () => shift(-1), title: 'Previous month' }, '‹'),
      h('button', { onclick: () => { viewY = t.getUTCFullYear(); viewM = t.getUTCMonth(); drawDates(); } }, 'Today'),
      h('button', { onclick: () => shift(1), title: 'Next month' }, '›'),
      h('button', { onclick: () => shift(12), title: 'Forward one year' }, '»')), months);

    months.addEventListener('pointerdown', (e) => {
      const c = e.target.closest('.day'); if (!c) return;
      e.preventDefault();
      dragMode = !selected.has(c.dataset.d);
      toggleDay(c.dataset.d, dragMode);
    });
    months.addEventListener('pointermove', (e) => {
      if (dragMode === null) return;
      const c = document.elementFromPoint(e.clientX, e.clientY)?.closest('.day');
      if (c && selected.has(c.dataset.d) !== dragMode) toggleDay(c.dataset.d, dragMode);
    });

    // range adder — no limit on how long the range is
    const from = h('input', { type: 'date', value: todayStr() });
    const to = h('input', { type: 'date', value: addDays(todayStr(), 13) });
    const skipWknd = h('input', { type: 'checkbox' });
    const addRange = () => {
      if (!from.value || !to.value) return;
      let a = from.value, b = to.value; if (a > b) [a, b] = [b, a];
      for (let d = a; d <= b; d = addDays(d, 1)) {
        const dow = parseYmd(d).getUTCDay();
        if (skipWknd.checked && (dow === 0 || dow === 6)) continue;
        selected.add(d);
      }
      drawDates();
    };
    wrap.append(h('div', { class: 'range' },
      'Add range: ', from, ' to ', to, ' ',
      h('label', {}, skipWknd, ' skip weekends'), ' ',
      h('button', { onclick: addRange }, 'Add'), ' ',
      h('button', { onclick: () => { selected.clear(); drawDates(); } }, 'Clear all')));
    return wrap;
  }

  function drawWeekdays() {
    return h('div', { class: 'weekdays' }, DOW.map((d, i) => h('button', {
      class: 'wd' + (weekdays.has(i) ? ' on' : ''),
      onclick: (e) => { weekdays.has(i) ? weekdays.delete(i) : weekdays.add(i); e.target.classList.toggle('on'); drawSummary(); },
    }, d)));
  }

  function drawSummary() {
    if (mode === 'weekdays') { summary.textContent = `${weekdays.size} day(s) of the week selected`; return; }
    const arr = [...selected].sort();
    summary.textContent = arr.length
      ? `${arr.length} date(s) selected: ${fmtDate(arr[0], true)} → ${fmtDate(arr[arr.length - 1], true)}`
      : 'No dates selected yet — click or drag on the calendar.';
  }

  function drawDates() {
    dateArea.innerHTML = '';
    dateArea.append(mode === 'dates' ? drawCalendar() : drawWeekdays());
    drawSummary();
  }

  // times
  const hourOpts = (sel) => Array.from({ length: 25 }, (_, i) => h('option', { value: i * 60, selected: i * 60 === sel },
    i === 24 ? '12:00 AM (midnight)' : fmtTime(i * 60)));
  const startSel = h('select', {}, hourOpts(540));
  const endSel = h('select', {}, hourOpts(1020));
  const stepSel = h('select', {}, [15, 30, 60].map((m) => h('option', { value: m, selected: m === 30 }, `${m} minutes`)));
  const myTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let tzList = []; try { tzList = Intl.supportedValuesOf('timeZone'); } catch { tzList = [myTz]; }
  if (!tzList.includes(myTz)) tzList.unshift(myTz);
  const tzSel = h('select', {}, tzList.map((z) => h('option', { value: z, selected: z === myTz }, z)));
  const err = h('div', { class: 'err' });

  const createBtn = h('button', { class: 'primary', onclick: async () => {
    err.textContent = '';
    const name = nameIn.value.trim();
    const startMin = +startSel.value, endMin = +endSel.value, step = +stepSel.value;
    if (!name) { err.textContent = 'Please enter an event name.'; nameIn.focus(); return; }
    if (mode === 'dates' && !selected.size) { err.textContent = 'Please select at least one date.'; return; }
    if (mode === 'weekdays' && !weekdays.size) { err.textContent = 'Please select at least one day.'; return; }
    if (endMin <= startMin) { err.textContent = '"No later than" must be after "No earlier than".'; return; }
    const ev = {
      id: newId(), name, mode, startMin, endMin, step, tz: tzSel.value, created: Date.now(),
      dates: mode === 'dates' ? [...selected].sort() : [],
      weekdays: mode === 'weekdays' ? [...weekdays].sort() : [],
    };
    createBtn.disabled = true; createBtn.textContent = 'Creating…';
    try { await store.createEvent(ev); location.hash = '#/e/' + ev.id; }
    catch (e) { err.textContent = 'Could not create event: ' + e.message; createBtn.disabled = false; createBtn.textContent = 'Create Event'; }
  } }, 'Create Event');

  app.append(
    h('div', { class: 'center' }, nameIn),
    h('div', { class: 'create-cols' },
      h('section', {}, h('h2', {}, 'What dates might work?'),
        h('p', { class: 'hint' }, 'Click and drag dates to choose. Use ‹ › to move through months — there is no limit on how far ahead or how many dates.'),
        h('div', {}, 'Survey using: ', modeSel), dateArea, summary),
      h('section', {}, h('h2', {}, 'What times might work?'),
        h('div', { class: 'form-row' }, h('label', {}, 'No earlier than:'), startSel),
        h('div', { class: 'form-row' }, h('label', {}, 'No later than:'), endSel),
        h('div', { class: 'form-row' }, h('label', {}, 'Time slot length:'), stepSel),
        h('div', { class: 'form-row' }, h('label', {}, 'Time Zone:'), tzSel),
        h('div', { class: 'ready' }, 'Ready? ', createBtn), err)));
  drawDates();
}

// ================= EVENT PAGE =================
async function renderEvent(id) {
  const app = $('#app');
  app.innerHTML = 'Loading event…';
  let ev;
  try { ev = await store.getEvent(id); } catch (e) { app.textContent = 'Error loading event: ' + e.message; return; }
  if (!ev) { app.innerHTML = ''; app.append(h('p', {}, 'Event not found. ', h('a', { href: '#/' }, 'Create a new one'))); return; }

  const multiYear = ev.mode === 'dates' && ev.dates[0].slice(0, 4) !== ev.dates[ev.dates.length - 1].slice(0, 4);
  const cols = ev.mode === 'dates'
    ? ev.dates.map((d, i) => {
      const dt = parseYmd(d);
      return { key: d, top: `${MON[dt.getUTCMonth()]} ${dt.getUTCDate()}${multiYear ? ' ’' + String(dt.getUTCFullYear()).slice(2) : ''}`,
        bottom: DOW[dt.getUTCDay()], gap: i > 0 && addDays(ev.dates[i - 1], 1) !== d, title: fmtDate(d, true) };
    })
    : ev.weekdays.map((w, i) => ({ key: 'w' + w, top: DOW[w], bottom: '', gap: i > 0 && ev.weekdays[i - 1] !== w - 1, title: DOW[w] }));
  const rows = [];
  for (let m = ev.startMin; m < ev.endMin; m += ev.step) rows.push(m);
  const K = (c, r) => `${cols[c].key}|${rows[r]}`;

  let people = [];
  let me = null;
  let mySlots = new Set();
  let drag = null;
  let saveTimer = null;
  const savedName = localStorage.getItem('pu_meet_name:' + id);

  // --- header ---
  const link = location.href;
  const copyBtn = h('button', { onclick: async () => {
    try { await navigator.clipboard.writeText(link); copyBtn.textContent = 'Copied!'; } catch { prompt('Copy this link:', link); }
    setTimeout(() => (copyBtn.textContent = 'Copy link'), 1500);
  } }, 'Copy link');
  const viewerTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // --- sign in ---
  const nameIn = h('input', { placeholder: 'Your name', maxlength: 60, value: savedName || '' });
  const signForm = h('form', { class: 'signin', onsubmit: (e) => { e.preventDefault(); signIn(nameIn.value); } },
    h('div', { class: 'hint' }, 'Enter your name to add your availability. Use the same name later to edit it.'),
    nameIn, h('button', { class: 'primary' }, 'Sign in'));
  const meLabel = h('h3', {}, 'Your Availability');
  const saveState = h('span', { class: 'save-state' });

  const myGrid = buildGrid(true);
  const groupGrid = buildGrid(false);
  const hoverBox = h('div', { class: 'hoverbox' }, 'Hover over the group grid to see who is available.');
  const legend = h('div', { class: 'legend' });
  const best = h('div', { class: 'best' });
  const respondents = h('div', { class: 'respondents' });

  const myPanel = h('section', { class: 'panel' }, meLabel, signForm, h('div', { class: 'grid-wrap mine hidden' }, myGrid.el), saveState);
  const groupPanel = h('section', { class: 'panel' }, h('h3', {}, "Group's Availability"), legend,
    h('div', { class: 'grid-wrap' }, groupGrid.el), hoverBox);

  app.innerHTML = '';
  app.append(
    h('div', { class: 'event-head' },
      h('h1', {}, ev.name),
      h('div', { class: 'share' }, 'Share this link: ', h('code', {}, link), ' ', copyBtn),
      h('div', { class: 'hint' }, `Times shown in ${ev.tz}.`,
        viewerTz !== ev.tz ? h('b', {}, ` (Your computer is set to ${viewerTz} — remember to convert.)`) : '')),
    h('div', { class: 'event-cols' }, myPanel, groupPanel),
    h('div', { class: 'below' }, h('div', {}, h('h3', {}, 'Best times'), best), h('div', {}, h('h3', {}, 'Respondents'), respondents)));

  // keep the two grids scrolled together sideways
  const wraps = app.querySelectorAll('.grid-wrap');
  let syncing = false;
  wraps.forEach((w) => w.addEventListener('scroll', () => {
    if (syncing) return; syncing = true;
    wraps.forEach((o) => { if (o !== w) o.scrollLeft = w.scrollLeft; });
    requestAnimationFrame(() => (syncing = false));
  }));

  function buildGrid(editable) {
    const el = h('div', { class: 'grid' + (editable ? ' editable' : '') });
    el.style.gridTemplateColumns = `64px ${cols.map((c) => (c.gap ? '12px ' : '') + '46px').join(' ')}`;
    el.append(h('div', { class: 'corner' }));
    cols.forEach((c) => {
      if (c.gap) el.append(h('div', { class: 'gapcol' }));
      el.append(h('div', { class: 'colhead', title: c.title }, h('div', {}, c.top), h('div', { class: 'sub' }, c.bottom)));
    });
    const cells = [];
    rows.forEach((m, r) => {
      el.append(h('div', { class: 'timelabel' }, m % 60 === 0 || r === 0 ? fmtTime(m) : ''));
      cells[r] = [];
      cols.forEach((c, ci) => {
        if (c.gap) el.append(h('div', { class: 'gapcol' }));
        const cell = h('div', { class: 'cell' + (m % 60 === 0 ? ' hour' : ''), 'data-c': ci, 'data-r': r });
        cells[r][ci] = cell; el.append(cell);
      });
    });
    el.append(h('div', { class: 'timelabel' }, fmtTime(ev.endMin)));
    return { el, cells };
  }

  // --- editing my availability (rectangle drag like when2meet) ---
  const applyRect = (c1, r1) => {
    mySlots = new Set(drag.base);
    const [ca, cb] = [Math.min(drag.c0, c1), Math.max(drag.c0, c1)];
    const [ra, rb] = [Math.min(drag.r0, r1), Math.max(drag.r0, r1)];
    for (let c = ca; c <= cb; c++) for (let r = ra; r <= rb; r++) drag.mode ? mySlots.add(K(c, r)) : mySlots.delete(K(c, r));
    paintMine(); paintGroup();
  };
  myGrid.el.addEventListener('pointerdown', (e) => {
    const c = e.target.closest('.cell'); if (!c || !me) return;
    e.preventDefault();
    const ci = +c.dataset.c, ri = +c.dataset.r;
    drag = { c0: ci, r0: ri, mode: !mySlots.has(K(ci, ri)), base: new Set(mySlots) };
    applyRect(ci, ri);
  });
  const onMove = (e) => {
    if (!drag) return;
    const c = document.elementFromPoint(e.clientX, e.clientY)?.closest('.cell');
    if (c && myGrid.el.contains(c)) applyRect(+c.dataset.c, +c.dataset.r);
  };
  const onUp = () => { if (drag) { drag = null; scheduleSave(); } };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);

  function scheduleSave() {
    saveState.textContent = 'Saving…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await store.savePerson(id, { name: me, slots: [...mySlots], updated: Date.now() });
        saveState.textContent = 'Saved ✓';
      } catch (e) { saveState.textContent = 'Save failed: ' + e.message; }
    }, 400);
  }

  function signIn(name) {
    name = name.trim(); if (!name) return;
    const existing = people.find((p) => personKey(p.name) === personKey(name));
    if (existing) name = existing.name; // keep the original spelling of an existing name
    me = name;
    localStorage.setItem('pu_meet_name:' + id, name);
    mySlots = new Set(existing?.slots || []);
    signForm.remove();
    meLabel.textContent = `${name}'s Availability `;
    meLabel.append(h('button', { class: 'small switch-btn', type: 'button', onclick: signOut }, 'Switch person / sign out'));
    myPanel.querySelector('.grid-wrap').classList.remove('hidden');
    myPanel.insertBefore(h('div', { class: 'hint edit-hint' }, 'Click and drag to mark when you are available. Saves automatically.'), myPanel.querySelector('.grid-wrap'));
    paintMine(); paintGroup();
  }

  async function signOut() {
    // finish any pending save for the current person first
    if (saveTimer) {
      clearTimeout(saveTimer); saveTimer = null;
      try { await store.savePerson(id, { name: me, slots: [...mySlots], updated: Date.now() }); } catch (e) { console.error(e); }
    }
    localStorage.removeItem('pu_meet_name:' + id);
    me = null; mySlots = new Set(); drag = null;
    meLabel.textContent = 'Your Availability';
    myPanel.querySelector('.edit-hint')?.remove();
    myPanel.querySelector('.grid-wrap').classList.add('hidden');
    saveState.textContent = '';
    nameIn.value = '';
    meLabel.after(signForm);
    nameIn.focus();
    paintGroup();
  }

  function paintMine() {
    myGrid.cells.forEach((row, r) => row.forEach((cell, c) => cell.classList.toggle('yes', mySlots.has(K(c, r)))));
  }

  function everyone() {
    const list = people.filter((p) => !me || personKey(p.name) !== personKey(me)).map((p) => ({ name: p.name, set: new Set(p.slots || []) }));
    if (me && (mySlots.size || people.some((p) => personKey(p.name) === personKey(me)))) list.push({ name: me, set: mySlots });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  function paintGroup() {
    const all = everyone();
    const n = all.length;
    let max = 0;
    const counts = rows.map((_, r) => cols.map((_, c) => {
      const k = K(c, r); const cnt = all.reduce((s, p) => s + (p.set.has(k) ? 1 : 0), 0);
      if (cnt > max) max = cnt; return cnt;
    }));
    groupGrid.cells.forEach((row, r) => row.forEach((cell, c) => {
      const cnt = counts[r][c];
      cell.style.background = cnt ? `rgba(22, 140, 60, ${0.15 + 0.85 * cnt / Math.max(n, 1)})` : '';
      cell.classList.toggle('all', n > 0 && cnt === n);
    }));
    legend.textContent = n ? `0/${n} available  ⟶  ${n}/${n} available (darkest green; outlined = everyone)` : 'No responses yet.';
    respondents.innerHTML = '';
    respondents.append(n ? h('ul', {}, all.map((p) => h('li', {}, `${p.name} (${p.set.size} slots)`))) : 'Nobody yet.');
    drawBest(all, counts, max);
  }

  function drawBest(all, counts, max) {
    best.innerHTML = '';
    if (!max) { best.textContent = '—'; return; }
    // merge consecutive slots in a column that have the same group of people
    const blocks = [];
    cols.forEach((col, c) => {
      let cur = null;
      rows.forEach((m, r) => {
        const cnt = counts[r][c];
        const who = cnt ? all.filter((p) => p.set.has(K(c, r))).map((p) => p.name).join(', ') : '';
        if (cur && cnt === cur.cnt && who === cur.who && cnt) cur.end = m + ev.step;
        else { if (cur && cur.cnt) blocks.push(cur); cur = { col, start: m, end: m + ev.step, cnt, who }; }
      });
      if (cur && cur.cnt) blocks.push(cur);
    });
    blocks.sort((a, b) => b.cnt - a.cnt || (b.end - b.start) - (a.end - a.start));
    best.append(h('ol', {}, blocks.slice(0, 8).map((b) => h('li', {},
      h('b', {}, `${b.col.title}, ${fmtTime(b.start)}–${fmtTime(b.end)}`), ` — ${b.cnt}/${all.length}: ${b.who}`))));
  }

  // hover info on group grid
  groupGrid.el.addEventListener('pointerover', (e) => {
    const c = e.target.closest('.cell'); if (!c) return;
    const ci = +c.dataset.c, ri = +c.dataset.r, k = K(ci, ri);
    const all = everyone();
    const yes = all.filter((p) => p.set.has(k)).map((p) => p.name);
    const no = all.filter((p) => !p.set.has(k)).map((p) => p.name);
    hoverBox.innerHTML = '';
    hoverBox.append(
      h('div', { class: 'hb-title' }, `${cols[ci].title} ${fmtTime(rows[ri])}–${fmtTime(rows[ri] + ev.step)}`),
      h('div', { class: 'hb-cols' },
        h('div', {}, h('b', {}, `Available (${yes.length}/${all.length})`), h('ul', {}, yes.map((x) => h('li', {}, x)))),
        h('div', {}, h('b', {}, `Unavailable (${no.length}/${all.length})`), h('ul', {}, no.map((x) => h('li', {}, x))))));
  });

  let first = true;
  const unwatch = store.watchPeople(id, (list) => {
    people = list;
    if (first) { first = false; if (savedName && !me) signIn(savedName); }
    paintGroup();
  });
  cleanup = () => {
    unwatch && unwatch();
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };
  paintGroup();
}
