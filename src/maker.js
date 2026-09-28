// Окно «Своё задание»: учитель собирает задание из блоков и получает ссылку.

import { COND_TYPES, AIMS, DEFAULT_SPEC, HASH_PREFIX, hasValue, validateSpec, customTask, autoTitle } from './custom.js';
import { taskText, makeInput, buildTests } from './tasks.js';

const $ = (sel) => document.querySelector(sel);
const MAX_CONDS = 3;

export const taskLink = (code) => location.href.split('#')[0] + '#' + HASH_PREFIX + code;

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// onOpen(task) — учитель нажал «Открыть в тренажёре»
export function initMaker({ onOpen }) {
  const dialog = $('#maker');
  const condsBox = $('#mk-conds');
  let current = null; // собранное задание или null, если в описании ошибка

  for (const [value, label] of Object.entries(AIMS)) $('#mk-aim').append(new Option(label, value));

  function condRow(cond) {
    const row = document.createElement('div');
    row.className = 'mk-cond';
    const type = document.createElement('select');
    type.setAttribute('aria-label', 'Условие');
    for (const [value, t] of Object.entries(COND_TYPES)) type.append(new Option(t.label, value));
    type.value = cond.type;
    const value = document.createElement('input');
    value.type = 'number';
    value.step = '1';
    value.inputMode = 'numeric';
    value.setAttribute('aria-label', 'Число в условии');
    value.value = hasValue(cond.type) ? cond.value : '';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn small ghost';
    remove.textContent = '✕';
    remove.title = 'Убрать условие';
    remove.setAttribute('aria-label', 'Убрать условие');
    const sync = () => {
      const t = COND_TYPES[type.value];
      value.hidden = !hasValue(type.value);
      value.min = t.min ?? '';
      value.max = t.max ?? '';
    };
    type.addEventListener('change', () => {
      sync();
      if (!value.hidden && value.value === '') value.value = COND_TYPES[type.value].min;
    });
    remove.addEventListener('click', () => {
      row.remove();
      update();
    });
    sync();
    row.append(type, value, remove);
    return row;
  }

  function readSpec() {
    const num = (el) => (el.value.trim() === '' ? NaN : Number(el.value));
    return {
      format: $('#mk-format').value,
      maxCount: num($('#mk-count')),
      maxValue: num($('#mk-value')),
      conds: [...condsBox.children].map((row) => {
        const [type, value] = row.querySelectorAll('select, input');
        return { type: type.value, value: hasValue(type.value) ? num(value) : 0 };
      }),
      join: $('#mk-join').value,
      aim: $('#mk-aim').value,
      title: $('#mk-title').value,
      hide: $('#mk-hide').checked,
    };
  }

  function fill(spec) {
    $('#mk-format').value = spec.format;
    $('#mk-count').value = spec.maxCount;
    $('#mk-value').value = spec.maxValue;
    condsBox.replaceChildren(...spec.conds.map(condRow));
    $('#mk-join').value = spec.join;
    $('#mk-aim').value = spec.aim;
    $('#mk-title').value = spec.title;
    $('#mk-hide').checked = spec.hide;
  }

  function update() {
    const rows = condsBox.children.length;
    $('#mk-add-cond').disabled = rows >= MAX_CONDS;
    $('#mk-join-wrap').hidden = rows < 2;
    condsBox.querySelectorAll('.mk-cond > .btn').forEach((b) => (b.hidden = rows < 2));

    const spec = readSpec();
    const error = validateSpec(spec);
    $('#mk-error').hidden = !error;
    $('#mk-error').textContent = error ? `Так задание не собрать: ${error}.` : '';
    $('#mk-preview').hidden = !!error;
    $('#mk-open').disabled = !!error;
    $('#mk-copy').disabled = !!error;
    current = error ? null : customTask(spec);
    $('#mk-link').value = current ? taskLink(current.code) : '';
    if (!current) return;

    $('#mk-title').placeholder = autoTitle(spec);
    $('#mk-p-title').textContent = current.title;
    $('#mk-p-text').innerHTML = taskText(current);
    $('#mk-p-in').textContent = makeInput(current, current.example).trimEnd();
    $('#mk-p-out').textContent = current.answer(current.example);
    $('#mk-p-solution').textContent = current.solution;
    const tests = buildTests(current);
    $('#mk-p-tests').textContent = `При проверке ${tests.length} тестов: пример из условия, особые случаи (${
      current.special.map((s) => s.label.toLowerCase()).join('; ') || 'нет'
    }), 8 случайных и тест из ${current.maxCount} чисел.`;
  }

  $('#maker-form').addEventListener('input', update);
  $('#maker-form').addEventListener('change', update);
  $('#maker-form').addEventListener('submit', (e) => e.preventDefault());
  $('#mk-add-cond').addEventListener('click', () => {
    if (condsBox.children.length >= MAX_CONDS) return;
    condsBox.append(condRow({ type: 'end', value: 4 }));
    update();
  });
  $('#mk-copy').addEventListener('click', async () => {
    if (!current) return;
    const btn = $('#mk-copy');
    const ok = await copyText(taskLink(current.code));
    if (!ok) $('#mk-link').select();
    btn.textContent = ok ? 'Скопировано ✓' : 'Скопируйте ссылку вручную';
    setTimeout(() => (btn.textContent = 'Скопировать ссылку'), 2000);
  });
  $('#mk-link').addEventListener('focus', (e) => e.target.select());
  $('#mk-open').addEventListener('click', () => {
    if (!current) return;
    dialog.close();
    onOpen(current);
  });
  $('#btn-maker-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  return {
    open(spec = DEFAULT_SPEC) {
      fill(spec);
      update();
      dialog.showModal();
    },
  };
}
