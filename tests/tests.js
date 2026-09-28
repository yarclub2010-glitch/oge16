// Автотесты: сравнение ответов, библиотека заданий и эталонные решения на настоящем Python.
// Открыть tests/index.html через локальный сервер.

import { TASKS, buildTests, checkLibrary, parseInput, makeInput, taskText } from '../src/tasks.js';
import { compareOutput, scoreOf } from '../src/checker.js';
import { PythonRunner } from '../src/python/runner.js';
import { AIMS, DEFAULT_SPEC, customTask, encodeSpec, decodeSpec, validateSpec } from '../src/custom.js';

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (err) {
    results.push({ name, ok: false, message: err.message });
  }
}
function assert(cond, message) {
  if (!cond) throw new Error(message || 'условие не выполнено');
}

// Балл программы на тестах задания
async function grade(runner, task, src) {
  const tests = buildTests(task);
  const { results: res } = await runner.runAll(src, tests.map((t) => t.input));
  const failed = tests.filter((t, i) => res[i].error || !compareOutput(res[i].out, t.expected, task.tol).ok);
  return { score: scoreOf(failed.length), failed };
}

await test('Сравнение ответов', () => {
  assert(compareOutput('5\n', '5').ok, '5 = 5');
  assert(compareOutput('5.0', '5').ok, '5.0 = 5');
  assert(!compareOutput('', '5').ok, 'пустой вывод');
  assert(!compareOutput('Ответ: 5', '5').ok, 'лишний текст');
  assert(compareOutput('3 27', '3\n27').ok, 'два числа в строку');
  assert(!compareOutput('No', 'NO').ok, 'NO пишется заглавными');
  assert(compareOutput('10.7', '10.666667', 0.05).ok, 'точность до десятых');
  assert(!compareOutput('10', '10.666667', 0.05).ok, 'целая часть — неверно');
});

await test('Баллы по критериям', () => {
  assert(scoreOf(0) === 2 && scoreOf(1) === 1 && scoreOf(2) === 0 && scoreOf(7) === 0);
});

await test('Примеры и особые случаи соответствуют условиям', () => {
  const problems = checkLibrary();
  assert(!problems.length, problems.join('; '));
});

await test('Разбор входных данных', () => {
  const t = TASKS.find((x) => x.format === 'count');
  const z = TASKS.find((x) => x.format === 'zero');
  assert(parseInput(t, '3\n1\n2\n3\n').nums.length === 3);
  assert(parseInput(t, '3\n1\n2\n').error);
  assert(parseInput(z, '5\n6\n0\n').nums.length === 2);
  assert(parseInput(z, '5\n6\n').error);
  assert(parseInput(z, makeInput(z, z.example)).nums.length === z.example.length);
});

// ---------- Свои задания ----------

const spec = (over) => ({ ...DEFAULT_SPEC, ...over });
const CONDS = [
  { conds: [{ type: 'div', value: 3 }], join: 'and' },
  { conds: [{ type: 'even', value: 0 }, { type: 'end', value: 4 }], join: 'and' },
  { conds: [{ type: 'digits', value: 2 }, { type: 'ndiv', value: 7 }], join: 'and' },
  { conds: [{ type: 'end', value: 3 }, { type: 'div', value: 8 }], join: 'or' },
  { conds: [{ type: 'gt', value: 100 }, { type: 'lt', value: 200 }, { type: 'odd', value: 0 }], join: 'and' },
  { conds: [{ type: 'dig2', value: 5 }], join: 'and' },
  { conds: [{ type: 'dig2', value: 3 }, { type: 'div', value: 4 }], join: 'or' },
];
// Все цели × оба формата ввода, условия и границы чисел — по кругу
const CUSTOM_SPECS = Object.keys(AIMS).flatMap((aim, i) => ['count', 'zero'].map((format, j) => spec({
  aim,
  format,
  ...CONDS[(2 * i + j) % CONDS.length],
  maxCount: [1000, 100, 50][(i + j) % 3],
  maxValue: [30000, 300, 1000][(i + 2 * j) % 3],
})));

await test('Своё задание: ссылка кодируется и раскодируется', () => {
  for (const s of [...CUSTOM_SPECS, spec({ title: 'Задача для 9 «Б» класса', hide: true })]) {
    const { spec: back, error } = decodeSpec(encodeSpec(s));
    assert(!error, error);
    assert(encodeSpec(back) === encodeSpec(s), 'после раскодирования ссылка другая');
    assert(customTask(back).id === customTask(s).id, 'другой id');
  }
  assert(decodeSpec(encodeSpec(spec({ hide: true }))).spec.hide === true, 'флаг «скрыть решение» потерян');
});

await test('Своё задание: испорченная ссылка не открывается', () => {
  const b64 = (obj) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const good = { f: 'c', n: 100, m: 300, c: [['div', 3]], j: 'a', a: 'count' };
  const bad = [
    '', 'abc', '!!!', 'x'.repeat(5000),
    b64({ ...good, c: [['div', 0]] }),
    b64({ ...good, c: [['toString', 3]] }),
    b64({ ...good, c: [] }),
    b64({ ...good, m: 1e9 }),
    b64({ ...good, n: 1.5 }),
    b64({ ...good, a: 'eval' }),
    b64({ ...good, t: 'x'.repeat(500) }),
    b64({ ...good, c: [['gt', 300]] }),
    b64({ ...good, c: [['div', 3], ['div', 3], ['div', 3], ['div', 3]] }),
  ];
  for (const code of bad) assert(decodeSpec(code).error, `открылась ссылка ${code.slice(0, 40)}`);
  assert(decodeSpec(b64(good)).spec, 'правильная ссылка не открылась');
});

await test('Своё задание: версия ссылки', () => {
  const b64 = (obj) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const good = { f: 'c', n: 100, m: 300, c: [['div', 3]], j: 'a', a: 'count' };
  assert(decodeSpec(b64(good)).spec.version === 1, 'ссылка без версии — версия 1');
  assert(decodeSpec(b64({ ...good, v: 1 })).spec, 'версия 1 явно');
  assert(/новой версии/.test(decodeSpec(b64({ ...good, v: 99 })).error || ''), 'будущая версия');
  assert(decodeSpec(b64({ ...good, v: 'x' })).error, 'версия не число');
  assert(encodeSpec({ ...spec({}), version: 1 }) === encodeSpec(spec({})), 'версия 1 не пишется в ссылку');
});

// Разосланные ссылки должны открывать то же самое задание: сверка со слепком
await test('Своё задание: готовые ссылки не меняются (tests/custom-v1.json)', async () => {
  const snap = await (await fetch(new URL('./custom-v1.json', import.meta.url))).json();
  const hash = async (v) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(v))))]
    .slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
  const changed = [];
  for (const [code, want] of Object.entries(snap)) {
    const { spec: s, error } = decodeSpec(code);
    if (error) {
      changed.push(`${want.title}: ${error}`);
      continue;
    }
    const t = customTask(s);
    const got = { id: t.id, text: taskText(t), example: t.example, exampleAnswer: t.answer(t.example), special: t.special, hint: t.hint, solution: t.solution, hideSolution: t.hideSolution };
    if (t.title !== want.title) changed.push(`${want.title}: название`);
    for (const [k, v] of Object.entries(got)) if ((await hash(v)) !== want[k]) changed.push(`${want.title}: ${k}`);
  }
  assert(Object.keys(snap).length >= 20, 'слепок пустой');
  assert(!changed.length, 'изменилось: ' + changed.join('; '));
});

await test('Своё задание: невыполнимые условия отклоняются', () => {
  assert(validateSpec(spec({ conds: [{ type: 'gt', value: 30000 }] })), 'нет подходящих чисел');
  assert(validateSpec(spec({ conds: [{ type: 'lt', value: 30000 }], maxValue: 100 })), 'подходят все');
  assert(validateSpec(spec({ conds: [{ type: 'digits', value: 5 }], maxValue: 9999 })), 'пятизначных нет');
  assert(validateSpec(spec({ conds: [{ type: 'even', value: 0 }, { type: 'odd', value: 0 }] })), 'чётное и нечётное');
  assert(validateSpec(spec({ maxCount: NaN })), 'пустое поле');
  assert(!validateSpec(spec({})), 'задание по умолчанию');
});

await test('Своё задание: текст условия', () => {
  const t = customTask(spec({ aim: 'max', conds: CONDS[1].conds }));
  assert(t.goal === 'определяет максимальное чётное число, оканчивающееся на 4', t.goal);
  assert(t.guarantee === 'В последовательности всегда имеется чётное число, оканчивающееся на 4.', t.guarantee);
  const u = customTask(spec({ aim: 'count', ...CONDS[3] }));
  assert(u.title === 'Количество чисел, оканчивающихся на 3 или кратных 8', u.title);
  assert(customTask(spec({ title: '  Моё  ' })).title === 'Моё', 'своё название');
  const v = customTask(spec({ aim: 'minNo', conds: [{ type: 'div', value: 7 }] }));
  assert(v.title === 'Наименьшее число, кратное 7, или NO', v.title);
  assert(v.goal === 'определяет минимальное число, кратное 7, или сообщает, что таких чисел нет (выводит NO)', v.goal);
  const w = customTask(spec({ aim: 'maxNo', conds: [{ type: 'even', value: 0 }] }));
  assert(w.title === 'Наибольшее чётное число или NO', w.title);
  const d = customTask(spec({ aim: 'countMin', conds: [{ type: 'dig2', value: 5 }] }));
  assert(d.goal === 'определяет количество чисел, у которых вторая цифра с конца равна 5, и минимальное из них', d.goal);
  assert(d.answer([150, 57, 51, 3]) === '3\n51', d.answer([150, 57, 51, 3]));
  const e = customTask(spec({ aim: 'sumCount' }));
  assert(e.answer([3, 4, 6]) === '9\n2' && e.answer([1, 2]) === '0\n0', 'сумма и количество');
});

await test('Своё задание: примеры и особые случаи соответствуют условию', () => {
  const problems = [];
  for (const s of CUSTOM_SPECS) {
    const t = customTask(s);
    for (const test of [{ label: 'пример', nums: t.example }, ...t.special]) {
      const { error } = parseInput(t, makeInput(t, test.nums));
      if (error) problems.push(`${t.title}, ${test.label}: ${error}`);
    }
    if (!t.special.length) problems.push(`${t.title}: нет особых случаев`);
  }
  assert(!problems.length, problems.join('; '));
});

const runner = new PythonRunner();

for (const s of CUSTOM_SPECS) {
  const t = customTask(s);
  await test(`Своё задание «${t.title}» (${s.format === 'count' ? 'количество' : 'до 0'}, до ${s.maxValue}): эталон получает 2 балла`, async () => {
    const { score, failed } = await grade(runner, t, t.solution);
    assert(score === 2, `${score} балла, не пройдены: ${failed.map((x) => x.label).join(', ')}\n${t.solution}`);
  });
}

await test('Своё задание: решение без условия отбора теряет баллы', async () => {
  const t = customTask(spec({ format: 'count', aim: 'sum' }));
  const { score } = await grade(runner, t, t.solution.replace('x % 3 == 0', 'True'));
  assert(score === 0, `получено ${score}`);
});

await test('Своё задание: минимум с начальным значением 1000 теряет баллы', async () => {
  const t = customTask(spec({ format: 'zero', aim: 'min', conds: [{ type: 'end', value: 7 }] }));
  const { score } = await grade(runner, t, t.solution.replace('m = 30001', 'm = 1000'));
  assert(score < 2, `получено ${score}`);
});

for (const task of TASKS) {
  await test(`Эталонное решение «${task.title}» получает 2 балла`, async () => {
    const { score, failed } = await grade(runner, task, task.solution);
    assert(score === 2, `${score} балла, не пройдены: ${failed.map((t) => t.label).join(', ')}`);
  });
}

await test('Бесконечный цикл даёт 0 баллов и не вешает проверку', async () => {
  const task = TASKS[0];
  const src = 'k = 0\nx = int(input())\nwhile x != 0:\n    if x % 3 == 0:\n        k += 1\nprint(k)\n';
  const { score } = await grade(runner, task, src);
  assert(score === 0, `получено ${score}`);
});

await test('Минимум с начальным значением 1000 теряет баллы', async () => {
  const task = TASKS.find((t) => t.id === 'min-3');
  const { score } = await grade(runner, task, task.solution.replace('30001', '1000'));
  assert(score < 2, `получено ${score}`);
});

await test('Целочисленное деление в среднем теряет баллы', async () => {
  const task = TASKS.find((t) => t.id === 'srednee-8');
  const { score } = await grade(runner, task, task.solution.replace('s / k', 's // k'));
  assert(score < 2, `получено ${score}`);
});

await test('Ошибки Python распознаются', async () => {
  const { results: res } = await runner.runAll('x = int(input())\nif x > 0\n    print(x)\n', ['1\n']);
  assert(res[0].error?.type === 'SyntaxError' && res[0].error.line === 2, JSON.stringify(res[0].error));
  const { results: res2 } = await runner.runAll('x = int(input())\ny = int(input())\n', ['1\n']);
  assert(res2[0].error?.type === 'EOFError' && res2[0].error.line === 2, JSON.stringify(res2[0].error));
});

const ok = results.filter((r) => r.ok).length;
document.getElementById('results').innerHTML =
  `<h2 class="${ok === results.length ? 'ok' : 'fail'}">Пройдено ${ok} из ${results.length}</h2>` +
  results.map((r) => `<div class="${r.ok ? 'ok' : 'fail'}">${r.ok ? '✓' : '✗'} ${r.name}${r.ok ? '' : `<pre>${r.message}</pre>`}</div>`).join('');
