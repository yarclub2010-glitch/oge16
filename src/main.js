// Тренажёр задания 16 ОГЭ: связывает редактор, запуск Python и проверку.

import { CodeEditor } from './editor.js';
import { reportScore } from './platform.js';
import { TASKS, LEVELS, COMMON_RULES, taskById, taskText, makeInput, parseInput, buildTests, randomExample } from './tasks.js';
import { compareOutput, scoreOf, explainError } from './checker.js';
import { PythonRunner } from './python/runner.js';
import { CUSTOM_LEVEL_NAME, HASH_PREFIX, decodeSpec, customTask } from './custom.js';
import { initMaker, taskLink, copyText } from './maker.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const DEFAULT_CODE = '';
const RUN_TIME_LIMIT = 10000; // мс для обычного запуска

// ---------- Хранилище (может быть недоступно, например в приватном режиме) ----------

const store = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem('oge16:' + key);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem('oge16:' + key, JSON.stringify(value));
    } catch {
      // нет доступа к хранилищу — просто не сохраняем
    }
  },
};

const state = {
  task: TASKS[0],
  busy: null, // 'run' | 'check'
  scores: store.get('scores', {}),
  custom: [], // свои задания, собранные в конструкторе
  linkTask: null, // задание, открытое по ссылке учителя: ученик видит только его
};

// ---------- Свои задания ----------

function loadCustom() {
  const codes = store.get('custom', []);
  state.custom = (Array.isArray(codes) ? codes : [])
    .map((code) => decodeSpec(code).spec)
    .filter(Boolean)
    .map(customTask);
}

function saveCustom() {
  store.set('custom', state.custom.map((t) => t.code));
}

// Добавляет задание в список «Свои задания» (если его там ещё нет) и возвращает его
function addCustom(t) {
  const known = state.custom.find((x) => x.id === t.id);
  if (known) return known;
  state.custom.push(t);
  saveCustom();
  return t;
}

const allTasks = () => [...TASKS, ...state.custom];
const findTask = (id) => taskById(id) || state.custom.find((t) => t.id === id) || (state.linkTask?.id === id ? state.linkTask : undefined);
const levelName = (t) => (t.level !== 0 ? LEVELS[t.level] : t === state.linkTask ? 'Задание от учителя' : CUSTOM_LEVEL_NAME);

// Режим ссылки: без списка заданий, стрелок и конструктора — только задание учителя
function setLinkTask(t) {
  state.linkTask = t;
  document.body.classList.toggle('link-mode', !!t);
  // Логотип не ведёт к остальным заданиям
  const brand = $('.brand');
  if (t) brand.removeAttribute('href');
  else brand.setAttribute('href', './');
  brand.tabIndex = t ? -1 : 0;
}
const hashOf = (t) => '#' + (t.code ? HASH_PREFIX + t.code : t.id);

// Задание из адреса страницы: #min-3 или #my=… Возвращает задание или null.
function taskFromHash() {
  const hash = decodeURIComponent(location.hash.slice(1));
  if (!hash.startsWith(HASH_PREFIX)) return taskById(hash) || null;
  const { spec, error } = decodeSpec(hash.slice(HASH_PREFIX.length));
  if (error) {
    log('err', `Не удалось открыть задание по ссылке: ${error}. Попросите учителя прислать ссылку ещё раз.`);
    return null;
  }
  const t = customTask(spec);
  return state.custom.find((x) => x.id === t.id) || t;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- Сообщения ----------

const logEl = $('#log');
function log(kind, text, line) {
  const div = document.createElement('div');
  div.className = 'l-' + kind;
  if (line) {
    const btn = document.createElement('button');
    btn.className = 'line-link';
    btn.textContent = `Строка ${line}`;
    btn.addEventListener('click', () => editor.focusLine(line));
    div.append(btn, ': ' + text);
  } else {
    div.textContent = text;
  }
  logEl.append(div);
  while (logEl.children.length > 200) logEl.firstElementChild.remove();
  logEl.scrollTop = logEl.scrollHeight;
}

// ---------- Python ----------

const pyStatus = $('#py-status');
const runner = new PythonRunner({
  onStatus(status) {
    pyStatus.className = 'py-status is-' + status;
    pyStatus.textContent = { loading: 'Python загружается…', ready: 'Python готов', error: 'Python не загрузился' }[status];
  },
});

function loadFailed(err) {
  log('err', 'Не удалось загрузить Python. Он скачивается из интернета при первом открытии страницы — проверьте подключение и нажмите «Выполнить» ещё раз.');
  console.error(err);
}

// ---------- Редактор ----------

const editor = new CodeEditor($('#editor'), {
  onChange(text) {
    store.set('code:' + state.task.id, text);
    editor.setErrorLine(null);
  },
});

const inputEl = $('#input');
const outputEl = $('#output');

inputEl.addEventListener('input', () => {
  store.set('input:' + state.task.id, inputEl.value);
  outputEl.textContent = '';
  $('#output-note').innerHTML = '';
  updateExpected();
});

// Верный ответ для данных, введённых справа
function updateExpected() {
  const note = $('#expected-note');
  const parsed = parseInput(state.task, inputEl.value);
  if (parsed.error) {
    note.innerHTML = `<span class="bad">Данные не подходят:</span> ${esc(parsed.error)}.`;
    return null;
  }
  const answer = state.task.answer(parsed.nums);
  note.innerHTML = `Верный ответ: <b>${esc(answer).replace(/\n/g, ' ')}</b>`;
  return answer;
}

function setInput(text) {
  inputEl.value = text;
  store.set('input:' + state.task.id, text);
  updateExpected();
}

// ---------- Задания ----------

function scoreBadge(id) {
  const s = state.scores[id];
  return s === undefined ? '' : s === 2 ? ' ✓' : ` (${s} из 2)`;
}

function fillTaskSelect() {
  const sel = $('#task-select');
  sel.innerHTML = '';
  for (const [level, name] of Object.entries(LEVELS)) {
    const group = document.createElement('optgroup');
    group.label = name;
    TASKS.filter((t) => t.level === Number(level)).forEach((t) => {
      const n = TASKS.indexOf(t) + 1;
      group.append(new Option(`${n}. ${t.title}${scoreBadge(t.id)}`, t.id));
    });
    sel.append(group);
  }
  if (state.custom.length) {
    const group = document.createElement('optgroup');
    group.label = 'Свои задания';
    state.custom.forEach((t) => group.append(new Option(`${t.title}${scoreBadge(t.id)}`, t.id)));
    sel.append(group);
  }
  sel.value = state.task.id;
}

function updateStatusChip() {
  const s = state.scores[state.task.id];
  const chip = $('#task-status');
  chip.hidden = s === undefined;
  chip.className = `chip chip-score s${s}`;
  chip.textContent = s === 2 ? 'Решено: 2 балла' : `Лучший результат: ${s} из 2`;
}

function selectTask(id, { pushHash = true } = {}) {
  if (state.busy) runner.stop();
  const t = findTask(id) || TASKS[0];
  state.task = t;
  if (!state.linkTask) store.set('task', t.id);
  if (pushHash && location.hash !== hashOf(t)) history.replaceState(null, '', hashOf(t));

  $('#task-select').value = t.id;
  $('#task-level').textContent = levelName(t);
  $('#task-level').className = `chip lvl-${t.level}`;
  $('#task-title').textContent = t.title;
  $('#task-text').innerHTML = taskText(t);
  $('#example-in').textContent = makeInput(t, t.example).trimEnd();
  $('#example-out').textContent = t.answer(t.example);
  $('#hint').innerHTML = t.hint;
  $('#hint').hidden = true;
  $('#btn-hint').setAttribute('aria-expanded', 'false');
  $('#solution-code').textContent = t.solution;
  $('#solution').hidden = true;
  $('#btn-solution').setAttribute('aria-expanded', 'false');
  $('#help-row').hidden = !!t.hideSolution;
  $('#custom-row').hidden = !t.code || t === state.linkTask;
  $('#check-result').hidden = true;
  updateStatusChip();

  editor.value = store.get('code:' + t.id, DEFAULT_CODE);
  editor.setErrorLine(null);
  inputEl.value = store.get('input:' + t.id, makeInput(t, t.example));
  outputEl.textContent = '';
  $('#output-note').innerHTML = '';
  updateExpected();

  const list = allTasks();
  const idx = list.indexOf(t);
  $('#btn-prev').disabled = idx === 0;
  $('#btn-next').disabled = idx === list.length - 1;
}

// ---------- Запуск ----------

function setBusy(kind) {
  state.busy = kind;
  $('#btn-run').disabled = !!kind;
  $('#btn-check').disabled = !!kind;
  $('#btn-stop').disabled = !kind;
  editor.setReadOnly(!!kind);
}

function reportError(err) {
  const text = explainError(err);
  log('err', text, err.line);
  if (err.line) editor.setErrorLine(err.line);
  return text;
}

async function runProgram() {
  if (state.busy) return;
  setBusy('run');
  editor.setErrorLine(null);
  outputEl.textContent = '';
  $('#output-note').innerHTML = '';
  const expected = updateExpected();
  try {
    const { results, cancelled } = await runner.runAll(editor.value, [inputEl.value], { timeLimit: RUN_TIME_LIMIT });
    if (cancelled) {
      log('warn', 'Выполнение остановлено.');
      return;
    }
    const r = results[0];
    outputEl.textContent = r.out;
    if (r.error) {
      const text = reportError(r.error);
      $('#output-note').innerHTML = `<span class="bad">Ошибка.</span> ${esc(text)}`;
      return;
    }
    log('ok', 'Программа выполнена.');
    if (expected !== null) {
      const cmp = compareOutput(r.out, expected, state.task.tol);
      $('#output-note').innerHTML = cmp.ok
        ? '<span class="ok">✓ Ответ совпадает с верным.</span>'
        : `<span class="bad">✗ Ответ неверный:</span> ${esc(cmp.reason)}.`;
    }
  } catch (err) {
    loadFailed(err);
  } finally {
    setBusy(null);
  }
}

// ---------- Проверка ----------

async function checkSolution() {
  if (state.busy) return;
  const t = state.task;
  if (!editor.value.trim()) {
    log('warn', 'Сначала напишите программу.');
    return;
  }
  setBusy('check');
  editor.setErrorLine(null);
  const box = $('#check-result');
  box.hidden = false;
  box.innerHTML = '<p class="muted">Запускаю Python…</p>';
  const tests = buildTests(t);
  try {
    const { results, cancelled } = await runner.runAll(editor.value, tests.map((x) => x.input), {
      maxTimeouts: 2,
      onResult(i) {
        box.innerHTML = `<p class="muted">Проверяю: тест ${i + 1} из ${tests.length}…</p>`;
      },
    });
    if (cancelled) {
      box.innerHTML = '<p class="muted">Проверка остановлена.</p>';
      return;
    }
    const verdicts = tests.map((test, i) => {
      const r = results[i];
      if (r.error) return { ok: false, reason: explainError(r.error), out: r.out, error: r.error };
      return { ...compareOutput(r.out, test.expected, t.tol), out: r.out };
    });
    const failed = verdicts.filter((v) => !v.ok).length;
    const score = scoreOf(failed);
    reportScore(16, t.id, score, 2);
    const firstError = verdicts.find((v) => v.error)?.error;
    if (firstError) reportError(firstError);

    if (state.scores[t.id] === undefined || score > state.scores[t.id]) {
      state.scores[t.id] = score;
      store.set('scores', state.scores);
      fillTaskSelect();
      updateStatusChip();
    }
    log(score === 2 ? 'ok' : 'warn', `Проверка: ${score} из 2 (пройдено тестов: ${tests.length - failed} из ${tests.length}).`);
    renderCheck(tests, verdicts, score, failed);
  } catch (err) {
    box.innerHTML = '<p class="muted">Python не загрузился — проверка невозможна.</p>';
    loadFailed(err);
  } finally {
    setBusy(null);
  }
}

function renderCheck(tests, verdicts, score, failed) {
  const box = $('#check-result');
  const texts = {
    2: 'Программа правильно работает на всех тестах.',
    1: 'Неверный ответ на одном тесте. Найдите его ниже — щелчок подставит данные справа.',
    0: `Неверные ответы на ${failed} тестах. Начните с первого непройденного.`,
  };
  box.innerHTML = `
    <div class="score s${score}">
      <div class="score-num">${score}<small> из 2</small></div>
      <div><p>${texts[score]}</p><p class="score-note">Пройдено тестов: ${tests.length - failed} из ${tests.length}.</p></div>
    </div>
    <ul class="variants"></ul>`;
  const list = box.querySelector('.variants');
  tests.forEach((test, i) => {
    const v = verdicts[i];
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = v.ok ? 'ok' : 'bad';
    const count = test.nums.length;
    let detail = '';
    if (!v.ok && !v.error) {
      detail = `<span class="test-detail">нужно <code>${esc(test.expected.replace(/\n/g, ' '))}</code>, выведено <code>${esc(v.out.trim().replace(/\s+/g, ' ').slice(0, 40) || '—')}</code></span>`;
    }
    btn.innerHTML = `<span class="v-icon">${v.ok ? '✓' : '✗'}</span><span>Тест ${i + 1}. ${esc(test.label)}${count > 1 ? `, чисел: ${count}` : ''}</span>
      <span class="v-text">${v.ok ? 'верно' : esc(v.reason)}</span>${detail}`;
    btn.title = 'Подставить эти данные справа';
    btn.addEventListener('click', () => {
      list.querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', b === btn));
      setInput(test.input);
      outputEl.textContent = v.out || '';
      $('#output-note').innerHTML = v.ok
        ? '<span class="ok">✓ На этом тесте ответ верный.</span>'
        : `<span class="bad">✗ ${esc(v.reason)}.</span>`;
    });
    li.append(btn);
    list.append(li);
  });
}

// ---------- Файлы ----------

function download(name, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const fileInput = $('#file-input');
fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  fileInput.value = '';
  if (!file) return;
  editor.replaceAll(await file.text());
  log('info', `Открыт файл ${file.name}.`);
});

function toggleMenu(open) {
  const menu = $('#file-menu');
  menu.hidden = !open;
  $('#btn-file-menu').setAttribute('aria-expanded', String(open));
}

// ---------- Кнопки ----------

$('#btn-run').addEventListener('click', runProgram);
$('#btn-stop').addEventListener('click', () => runner.stop());
$('#btn-check').addEventListener('click', checkSolution);
$('#task-select').addEventListener('change', (e) => selectTask(e.target.value));
$('#btn-prev').addEventListener('click', () => selectTask(allTasks()[allTasks().indexOf(state.task) - 1].id));
$('#btn-next').addEventListener('click', () => selectTask(allTasks()[allTasks().indexOf(state.task) + 1].id));

let editing = null; // своё задание, открытое в конструкторе кнопкой «Изменить»
const maker = initMaker({
  onOpen(t) {
    // Изменённое задание встаёт в списке на место старого
    const old = editing ? state.custom.indexOf(editing) : -1;
    if (old >= 0 && !state.custom.some((x) => x.id === t.id)) {
      state.custom[old] = t;
      saveCustom();
    }
    const added = addCustom(t);
    fillTaskSelect();
    selectTask(added.id);
    log('info', 'Задание готово. Чтобы отправить его ученикам, нажмите «Ссылка» под кнопкой «Проверить решение».');
  },
});
$('#btn-maker').addEventListener('click', () => {
  editing = null;
  updateLibraryCount();
  maker.open();
});

// ---------- Список «Свои задания» в файле ----------

const LIB_FILE = 'oge16-svoi-zadaniya.json';

function updateLibraryCount() {
  const n = state.custom.length;
  $('#mk-lib-count').textContent = n ? `Свои задания: ${n}` : 'Своих заданий пока нет';
  $('#mk-lib-save').disabled = !n;
}

$('#mk-lib-save').addEventListener('click', () => {
  const data = {
    type: 'oge16-custom-tasks',
    saved: new Date().toISOString().slice(0, 10),
    tasks: state.custom.map((t) => ({ title: t.title, code: t.code, link: taskLink(t.code) })),
  };
  download(LIB_FILE, JSON.stringify(data, null, 2) + '\n');
});

const libInput = $('#lib-file-input');
$('#mk-lib-load').addEventListener('click', () => libInput.click());
libInput.addEventListener('change', async () => {
  const file = libInput.files[0];
  libInput.value = '';
  if (!file || file.size > 1_000_000) return;
  // Берём коды из сохранённого списка или из любых ссылок вида …#my=… в тексте
  const text = await file.text();
  let codes = [...text.matchAll(/my=([\w-]+)/g)].map((m) => m[1]);
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data?.tasks)) codes = data.tasks.map((t) => t?.code).filter((c) => typeof c === 'string');
  } catch {
    // не JSON — остаются ссылки из текста
  }
  const unique = [...new Set(codes)];
  let added = 0;
  let bad = 0;
  for (const code of unique) {
    const { spec } = decodeSpec(code);
    if (!spec) {
      bad++;
      continue;
    }
    const before = state.custom.length;
    addCustom(customTask(spec));
    if (state.custom.length > before) added++;
  }
  saveCustom();
  fillTaskSelect();
  updateLibraryCount();
  const parts = [`добавлено заданий: ${added}`];
  if (unique.length - added - bad) parts.push(`уже были в списке: ${unique.length - added - bad}`);
  if (bad) parts.push(`не удалось прочитать: ${bad}`);
  const message = `Файл ${file.name}: ${unique.length ? parts.join(', ') : 'заданий не найдено'}.`;
  log(added ? 'ok' : 'warn', message);
  $('#mk-lib-count').textContent = message;
});
$('#btn-custom-edit').addEventListener('click', () => {
  editing = state.task;
  maker.open(state.task.spec);
});
$('#btn-custom-link').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const link = taskLink(state.task.code);
  if (await copyText(link)) {
    btn.textContent = 'Скопировано ✓';
    setTimeout(() => (btn.textContent = 'Ссылка'), 2000);
    log('ok', 'Ссылка на задание скопирована — отправьте её ученикам.');
  } else {
    prompt('Скопируйте ссылку на задание:', link);
  }
});
$('#btn-custom-remove').addEventListener('click', () => {
  if (!confirm(`Убрать задание «${state.task.title}» из списка? Его можно будет снова открыть по ссылке.`)) return;
  state.custom = state.custom.filter((t) => t !== state.task);
  saveCustom();
  state.task = TASKS[0];
  fillTaskSelect();
  selectTask(TASKS[0].id);
});

$('#btn-hint').addEventListener('click', (e) => {
  const open = $('#hint').hidden;
  $('#hint').hidden = !open;
  e.currentTarget.setAttribute('aria-expanded', String(open));
});
$('#btn-solution').addEventListener('click', (e) => {
  const open = $('#solution').hidden;
  $('#solution').hidden = !open;
  e.currentTarget.setAttribute('aria-expanded', String(open));
});
$('#btn-use-solution').addEventListener('click', () => {
  if (state.busy) return;
  editor.replaceAll(state.task.solution);
});

$('#btn-example').addEventListener('click', () => {
  setInput(makeInput(state.task, state.task.example));
  outputEl.textContent = '';
  $('#output-note').innerHTML = '';
});
$('#btn-random').addEventListener('click', () => {
  setInput(makeInput(state.task, randomExample(state.task)));
  outputEl.textContent = '';
  $('#output-note').innerHTML = '';
});

$$('.palette [data-snippet]').forEach((b) => b.addEventListener('click', () => editor.insertSnippet(b.dataset.snippet)));

$('#btn-clear-log').addEventListener('click', () => {
  logEl.innerHTML = '';
});

$('#btn-file-menu').addEventListener('click', (e) => {
  e.stopPropagation();
  toggleMenu($('#file-menu').hidden);
});
document.addEventListener('click', () => toggleMenu(false));
$('#btn-open-code').addEventListener('click', () => fileInput.click());
$('#btn-save-code').addEventListener('click', () => download(`${state.task.id}.py`, editor.value));
$('#btn-new-code').addEventListener('click', () => {
  if (state.busy) return;
  if (editor.value.trim() && !confirm('Удалить текущую программу и начать заново?')) return;
  editor.replaceAll(DEFAULT_CODE);
});

const help = $('#help');
$('#btn-help').addEventListener('click', () => help.showModal());
$('#btn-help-close').addEventListener('click', () => help.close());
help.addEventListener('click', (e) => {
  if (e.target === help) help.close();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'F9' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
    e.preventDefault();
    runProgram();
  } else if (e.key === 'Escape' && state.busy) {
    e.preventDefault();
    runner.stop();
  } else if (e.key === 'F1') {
    e.preventDefault();
    help.showModal();
  }
});

window.addEventListener('hashchange', () => {
  const t = taskFromHash();
  if (!t || t === state.task) return;
  setLinkTask(t.code ? t : null);
  fillTaskSelect();
  selectTask(t.id, { pushHash: false });
});

// ---------- Старт ----------

$('#rules').innerHTML = COMMON_RULES.map((r) => `<li>${r}</li>`).join('');
loadCustom();
const linked = taskFromHash();
if (linked?.code) setLinkTask(linked);
state.task = linked || findTask(store.get('task', TASKS[0].id)) || TASKS[0];
fillTaskSelect();
selectTask(state.task.id);
runner.ensure().catch(() => {});
