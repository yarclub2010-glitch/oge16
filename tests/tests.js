// Автотесты: сравнение ответов, библиотека заданий и эталонные решения на настоящем Python.
// Открыть tests/index.html через локальный сервер.

import { TASKS, buildTests, checkLibrary, parseInput, makeInput } from '../src/tasks.js';
import { compareOutput, scoreOf } from '../src/checker.js';
import { PythonRunner } from '../src/python/runner.js';

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

const runner = new PythonRunner();

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
