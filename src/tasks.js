// Библиотека заданий 16 ОГЭ: условия, эталонные ответы, генераторы тестов и решения.

export const LEVELS = {
  1: 'Разминка',
  2: 'Как на ОГЭ',
  3: 'Посложнее',
  4: 'Трудные',
};

export const COMMON_RULES = [
  'Каждое число подаётся на отдельной строке — читайте его так: <code>x = int(input())</code>.',
  'Выводите только то, что требуется: число или слово. Пояснения вроде «Ответ:» тренажёр посчитает ошибкой. Текст подсказки в <code>input("…")</code> не мешает — он не печатается.',
  'Программа должна правильно работать при любых допустимых входных данных, а не только на примере из условия.',
  'Программа не должна зависать: если она не завершилась за 4 секунды, тест не пройден.',
];

const RANDOM_TESTS = 8;
const NBSP = ' ';
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);

// ---------- Случайные числа ----------

function helpers(rand = Math.random) {
  const int = (a, b) => a + Math.floor(rand() * (b - a + 1));
  return {
    int,
    chance: (p) => rand() < p,
    pick: (arr) => arr[int(0, arr.length - 1)],
  };
}

const digitSum = (x) => String(x).split('').reduce((s, d) => s + Number(d), 0);

// ---------- Задания ----------

export function task(def) {
  return {
    format: 'zero', // 'zero' — ввод до 0, 'count' — сначала количество чисел
    maxCount: 1000,
    maxValue: 30000,
    tol: 0,
    guarantee: '',
    valid: () => true,
    good: null, // генератор «подходящего» числа — чтобы в случайных тестах они встречались часто
    special: [],
    ...def,
  };
}

export const TASKS = [
  task({
    id: 'kratnye-3',
    level: 1,
    title: 'Количество чисел, кратных 3',
    goal: 'определяет количество чисел, кратных 3',
    output: 'Программа должна вывести одно число — количество чисел, кратных 3.',
    answer: (a) => String(a.filter((x) => x % 3 === 0).length),
    good: (h) => 3 * h.int(1, 10000),
    example: [12, 25, 9, 7, 3],
    special: [
      { label: 'Нет чисел, кратных 3', nums: [1, 2, 4, 5] },
      { label: 'Одно число', nums: [3] },
      { label: 'Все числа кратны 3', nums: [3, 6, 30000] },
    ],
    hint: 'Читайте числа в цикле <code>while x != 0</code>. Не забудьте прочитать следующее число в конце тела цикла — иначе цикл не закончится. Число кратно 3, если <code>x % 3 == 0</code>.',
    solution: `k = 0
x = int(input())
while x != 0:
    if x % 3 == 0:
        k += 1
    x = int(input())
print(k)
`,
  }),

  task({
    id: 'summa-4',
    level: 1,
    title: 'Сумма чисел, оканчивающихся на 4',
    format: 'count',
    maxCount: 100,
    maxValue: 300,
    goal: 'находит сумму чисел, оканчивающихся на 4',
    output: 'Программа должна вывести одно число — сумму чисел, оканчивающихся на 4.',
    answer: (a) => String(a.filter((x) => x % 10 === 4).reduce((s, x) => s + x, 0)),
    good: (h) => 10 * h.int(0, 29) + 4,
    example: [14, 25, 4, 34],
    special: [
      { label: 'Нет подходящих чисел', nums: [1, 2, 3] },
      { label: 'Одно число', nums: [294] },
    ],
    hint: 'Сначала прочитайте количество чисел <code>n</code>, затем в цикле <code>for i in range(n)</code> читайте по одному числу. Последняя цифра числа — это <code>x % 10</code>.',
    solution: `n = int(input())
s = 0
for i in range(n):
    x = int(input())
    if x % 10 == 4:
        s += x
print(s)
`,
  }),

  task({
    id: 'max-chet',
    level: 1,
    title: 'Наибольшее чётное число',
    format: 'count',
    maxCount: 100,
    maxValue: 300,
    goal: 'определяет максимальное чётное число',
    guarantee: 'В последовательности всегда имеется чётное число.',
    output: 'Программа должна вывести одно число — максимальное чётное число.',
    valid: (a) => a.some((x) => x % 2 === 0),
    answer: (a) => String(Math.max(...a.filter((x) => x % 2 === 0))),
    good: (h) => 2 * h.int(1, 150),
    example: [5, 12, 7, 30, 18],
    special: [
      { label: 'Чётное число только первое', nums: [8, 3, 5, 99] },
      { label: 'Чётное число только последнее', nums: [3, 5, 99, 2] },
      { label: 'Самое большое число нечётное', nums: [299, 298, 7] },
      { label: 'Одно число', nums: [300] },
    ],
    hint: 'Заведите переменную для максимума, например <code>m = 0</code> (все числа натуральные, поэтому 0 меньше любого из них). Обновляйте её, только если число чётное и больше <code>m</code>.',
    solution: `n = int(input())
m = 0
for i in range(n):
    x = int(input())
    if x % 2 == 0 and x > m:
        m = x
print(m)
`,
  }),

  task({
    id: 'summa-6-4',
    level: 2,
    title: 'Сумма чисел, кратных 6 и оканчивающихся на 4',
    format: 'count',
    maxCount: 100,
    maxValue: 300,
    goal: 'определяет сумму всех чисел, кратных 6 и оканчивающихся на 4',
    output: 'Программа должна вывести одно число — сумму всех чисел, кратных 6 и оканчивающихся на 4.',
    answer: (a) => String(a.filter((x) => x % 6 === 0 && x % 10 === 4).reduce((s, x) => s + x, 0)),
    good: (h) => h.pick([24, 54, 84, 114, 144, 174, 204, 234, 264, 294, 36, 4, 14, 66]),
    example: [24, 13, 54, 36],
    special: [
      { label: 'Нет подходящих чисел (4 и 14 не кратны 6, 36 не оканчивается на 4)', nums: [4, 36, 6, 14] },
      { label: 'Все числа подходят', nums: [294, 294, 234] },
    ],
    hint: 'Нужно, чтобы выполнялись оба условия сразу: <code>x % 6 == 0 and x % 10 == 4</code>.',
    solution: `n = int(input())
s = 0
for i in range(n):
    x = int(input())
    if x % 6 == 0 and x % 10 == 4:
        s += x
print(s)
`,
  }),

  task({
    id: 'min-3',
    level: 2,
    title: 'Наименьшее число, оканчивающееся на 3',
    goal: 'определяет минимальное число, оканчивающееся на 3',
    guarantee: 'В последовательности всегда имеется число, оканчивающееся на 3.',
    output: 'Программа должна вывести одно число — минимальное число, оканчивающееся на 3.',
    valid: (a) => a.some((x) => x % 10 === 3),
    answer: (a) => String(Math.min(...a.filter((x) => x % 10 === 3))),
    good: (h) => 10 * h.int(0, 2999) + 3,
    example: [45, 23, 13, 58, 33],
    special: [
      { label: 'Подходящее число одно, большое и последнее', nums: [40, 7, 29983] },
      { label: 'Подходящее число первое', nums: [3, 13, 4] },
      { label: 'Самое маленькое число не оканчивается на 3', nums: [2, 5, 1, 43] },
    ],
    hint: 'Начальное значение минимума должно быть больше любого допустимого числа — например, <code>m = 30001</code>. Если взять 1000 или 10000, программа ошибётся на больших числах.',
    solution: `m = 30001
x = int(input())
while x != 0:
    if x % 10 == 3 and x < m:
        m = x
    x = int(input())
print(m)
`,
  }),

  task({
    id: 'kratnye-4-ne-7',
    level: 2,
    title: 'Кратные 4, но не кратные 7',
    format: 'count',
    goal: 'определяет количество чисел, кратных 4, но не кратных 7',
    output: 'Программа должна вывести одно число — количество чисел, кратных 4, но не кратных 7.',
    answer: (a) => String(a.filter((x) => x % 4 === 0 && x % 7 !== 0).length),
    good: (h) => (h.chance(0.5) ? 28 * h.int(1, 1071) : 4 * h.int(1, 7500)),
    example: [16, 28, 5, 12, 56],
    special: [
      { label: 'Числа кратны и 4, и 7', nums: [28, 56, 84] },
      { label: 'Одно число', nums: [4] },
    ],
    hint: '«Не кратно 7» записывается как <code>x % 7 != 0</code>.',
    solution: `n = int(input())
k = 0
for i in range(n):
    x = int(input())
    if x % 4 == 0 and x % 7 != 0:
        k += 1
print(k)
`,
  }),

  task({
    id: 'max-5',
    level: 2,
    title: 'Наибольшее число, кратное 5',
    goal: 'определяет максимальное число, кратное 5',
    guarantee: 'В последовательности всегда имеется число, кратное 5.',
    output: 'Программа должна вывести одно число — максимальное число, кратное 5.',
    valid: (a) => a.some((x) => x % 5 === 0),
    answer: (a) => String(Math.max(...a.filter((x) => x % 5 === 0))),
    good: (h) => 5 * h.int(1, 6000),
    example: [12, 35, 40, 8, 15],
    special: [
      { label: 'Кратное 5 только последнее', nums: [99, 98, 5] },
      { label: 'Самое большое число не кратно 5', nums: [29999, 25, 14] },
      { label: 'Максимум — первое число', nums: [30000, 10, 20] },
    ],
    hint: 'Проверяйте сразу два условия: число кратно 5 и оно больше текущего максимума.',
    solution: `m = 0
x = int(input())
while x != 0:
    if x % 5 == 0 and x > m:
        m = x
    x = int(input())
print(m)
`,
  }),

  task({
    id: 'kolichestvo-i-max',
    level: 3,
    title: 'Количество и максимум чисел, кратных 3',
    format: 'count',
    goal: 'определяет количество чисел, кратных 3, и максимальное из них',
    guarantee: 'В последовательности всегда имеется число, кратное 3.',
    output: 'Программа должна вывести два числа, каждое на отдельной строке: сначала количество чисел, кратных 3, затем максимальное из них.',
    valid: (a) => a.some((x) => x % 3 === 0),
    answer: (a) => {
      const b = a.filter((x) => x % 3 === 0);
      return `${b.length}\n${Math.max(...b)}`;
    },
    good: (h) => 3 * h.int(1, 10000),
    example: [9, 14, 27, 12],
    special: [
      { label: 'Одно подходящее число', nums: [7, 4, 3] },
      { label: 'Самое большое число не кратно 3', nums: [29999, 6, 21] },
    ],
    hint: 'В одном цикле ведите сразу две переменные: счётчик и максимум. Выведите их двумя вызовами <code>print</code>.',
    solution: `n = int(input())
k = 0
m = 0
for i in range(n):
    x = int(input())
    if x % 3 == 0:
        k += 1
        if x > m:
            m = x
print(k)
print(m)
`,
  }),

  task({
    id: 'srednee-8',
    level: 3,
    title: 'Среднее арифметическое чисел, кратных 8',
    goal: 'вычисляет среднее арифметическое чисел, кратных 8, или сообщает, что таких чисел нет (выводит NO)',
    output: 'Программа должна вывести среднее арифметическое чисел, кратных 8, с точностью не менее десятых, или вывести NO, если таких чисел нет.',
    tol: 0.05,
    answer: (a) => {
      const b = a.filter((x) => x % 8 === 0);
      if (!b.length) return 'NO';
      return String(Number((b.reduce((s, x) => s + x, 0) / b.length).toFixed(6)));
    },
    good: (h) => 8 * h.int(1, 3750),
    example: [8, 122, 64, 16, 7],
    special: [
      { label: 'Нет чисел, кратных 8', nums: [3, 5, 7] },
      { label: 'Одно число, кратное 8', nums: [4, 8] },
      { label: 'Среднее не целое', nums: [8, 8, 16] },
    ],
    hint: 'Накопите сумму и количество подходящих чисел. После цикла: если количество равно 0, выведите <code>NO</code>, иначе — <code>s / k</code>. Обычное деление <code>/</code> даёт дробь; <code>//</code> отбросит дробную часть, и ответ будет неверным.',
    solution: `s = 0
k = 0
x = int(input())
while x != 0:
    if x % 8 == 0:
        s += x
        k += 1
    x = int(input())
if k == 0:
    print('NO')
else:
    print(s / k)
`,
  }),

  task({
    id: 'min-7-no',
    level: 3,
    title: 'Наименьшее число, кратное 7, или NO',
    format: 'count',
    goal: 'определяет минимальное число, кратное 7, или сообщает, что таких чисел нет (выводит NO)',
    output: 'Программа должна вывести минимальное число, кратное 7, или NO, если таких чисел нет.',
    answer: (a) => {
      const b = a.filter((x) => x % 7 === 0);
      return b.length ? String(Math.min(...b)) : 'NO';
    },
    good: (h) => 7 * h.int(1, 4285),
    example: [21, 5, 14, 30],
    special: [
      { label: 'Нет чисел, кратных 7', nums: [1, 2, 3] },
      { label: 'Единственное число, и оно большое', nums: [29995] },
      { label: 'Наименьшее — последнее', nums: [70, 35, 7] },
    ],
    hint: 'Возьмите начальное значение минимума больше любого допустимого числа, например <code>m = 30001</code>. Если после цикла оно не изменилось — подходящих чисел не было, выводите NO.',
    solution: `n = int(input())
m = 30001
for i in range(n):
    x = int(input())
    if x % 7 == 0 and x < m:
        m = x
if m == 30001:
    print('NO')
else:
    print(m)
`,
  }),

  task({
    id: 'bolshe-predydushego',
    level: 4,
    title: 'Сколько чисел больше предыдущего',
    goal: 'определяет, сколько чисел больше предыдущего числа последовательности',
    guarantee: 'В последовательности всегда есть хотя бы одно число (не считая 0).',
    output: 'Программа должна вывести одно число — количество чисел, которые больше предыдущего.',
    answer: (a) => String(a.filter((x, i) => i > 0 && x > a[i - 1]).length),
    gen: (h, n) => {
      const top = h.pick([5, 20, 30000]);
      return Array.from({ length: n }, () => h.int(1, top));
    },
    example: [3, 5, 5, 2, 8],
    special: [
      { label: 'Одно число', nums: [7] },
      { label: 'Все числа равны', nums: [4, 4, 4] },
      { label: 'Числа возрастают', nums: [1, 2, 3, 4, 5] },
      { label: 'Числа убывают', nums: [30000, 200, 1] },
    ],
    hint: 'Храните предыдущее число в отдельной переменной. Первое число прочитайте до цикла — у него нет предыдущего. В конце тела цикла запомните текущее число как предыдущее и прочитайте следующее.',
    solution: `k = 0
prev = int(input())
x = int(input())
while x != 0:
    if x > prev:
        k += 1
    prev = x
    x = int(input())
print(k)
`,
  }),

  task({
    id: 'summa-cifr',
    level: 4,
    title: 'Число с наибольшей суммой цифр',
    format: 'count',
    goal: 'находит число с наибольшей суммой цифр',
    output: 'Программа должна вывести одно число — число с наибольшей суммой цифр. Если таких чисел несколько, выведите первое из них.',
    answer: (a) => {
      let best = a[0];
      for (const x of a) if (digitSum(x) > digitSum(best)) best = x;
      return String(best);
    },
    gen: (h, n) => Array.from({ length: n }, () => (h.chance(0.3) ? h.pick([19, 91, 55, 118, 181, 9, 18, 27]) : h.int(1, 30000))),
    example: [35, 91, 208, 19],
    special: [
      { label: 'У всех чисел сумма цифр одинаковая', nums: [19, 91, 55] },
      { label: 'Одно число', nums: [30000] },
      { label: 'Наибольшая сумма у последнего числа', nums: [100, 11, 29999] },
    ],
    hint: 'Сумму цифр числа найдите внутренним циклом: пока <code>y > 0</code>, прибавляйте <code>y % 10</code> и делите <code>y //= 10</code>. Чтобы при равных суммах осталось первое число, сравнивайте строго: <code>s > best_sum</code>.',
    solution: `n = int(input())
best = 0
best_sum = -1
for i in range(n):
    x = int(input())
    s = 0
    y = x
    while y > 0:
        s += y % 10
        y //= 10
    if s > best_sum:
        best_sum = s
        best = x
print(best)
`,
  }),
];

export function taskById(id) {
  return TASKS.find((t) => t.id === id);
}

// ---------- Условие ----------

export function taskText(t) {
  const input = t.format === 'zero'
    ? `Программа получает на вход натуральные числа, количество введённых чисел неизвестно, последовательность чисел заканчивается числом 0 (0 — признак окончания ввода, не входит в последовательность). Количество чисел не превышает ${fmt(t.maxCount)}. Введённые числа не превышают ${fmt(t.maxValue)}.`
    : `Программа получает на вход количество чисел в последовательности, а затем сами числа. В последовательности всегда имеется хотя бы одно число. Количество чисел не превышает ${fmt(t.maxCount)}. Введённые числа — натуральные и не превышают ${fmt(t.maxValue)}.`;
  return `<p>Напишите программу, которая в последовательности натуральных чисел ${t.goal}.</p>
<p>${input}${t.guarantee ? ' ' + t.guarantee : ''}</p>
<p>${t.output}</p>`;
}

// ---------- Входные данные ----------

export function makeInput(t, nums) {
  const lines = t.format === 'count' ? [nums.length, ...nums] : [...nums, 0];
  return lines.join('\n') + '\n';
}

// Разбирает входные данные, введённые вручную. Возвращает { nums } или { error }.
export function parseInput(t, text) {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (!tokens.length) return { error: 'входные данные пустые' };
  if (tokens.some((s) => !/^-?\d+$/.test(s))) return { error: 'во входных данных должны быть только целые числа' };
  const all = tokens.map(Number);
  let nums;
  if (t.format === 'count') {
    const n = all[0];
    if (n < 1) return { error: 'первое число — количество чисел, оно должно быть не меньше 1' };
    if (all.length - 1 < n) return { error: `первое число говорит, что чисел ${n}, а дальше их только ${all.length - 1}` };
    nums = all.slice(1, n + 1);
  } else {
    const end = all.indexOf(0);
    if (end < 0) return { error: 'последовательность должна заканчиваться числом 0' };
    nums = all.slice(0, end);
    if (!nums.length) return { error: 'до 0 нет ни одного числа' };
  }
  if (nums.length > t.maxCount) return { error: `чисел больше ${fmt(t.maxCount)}` };
  if (nums.some((x) => x < 1 || x > t.maxValue)) return { error: `числа должны быть натуральными и не больше ${fmt(t.maxValue)}` };
  if (!t.valid(nums)) return { error: 'не выполнено условие задачи: ' + t.guarantee.toLowerCase().replace(/\.$/, '') };
  return { nums };
}

// ---------- Тесты ----------

export function randomNums(t, h, n) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const nums = t.gen
      ? t.gen(h, n)
      : Array.from({ length: n }, () => (t.good && h.chance(0.4) ? t.good(h) : h.int(1, t.maxValue)));
    const fixed = nums.map((x) => Math.min(Math.max(x, 1), t.maxValue));
    if (t.valid(fixed)) return fixed;
  }
  return t.example.slice();
}

export function randomExample(t, rand) {
  const h = helpers(rand);
  return randomNums(t, h, h.int(3, 10));
}

// Набор тестов: пример из условия, особые случаи, случайные и один максимального размера
export function buildTests(t, rand = Math.random) {
  const h = helpers(rand);
  const list = [{ label: 'Пример из условия', nums: t.example }, ...t.special];
  for (let i = 0; i < RANDOM_TESTS; i++) {
    list.push({ label: 'Случайные числа', nums: randomNums(t, h, h.int(1, Math.min(t.maxCount, 15))) });
  }
  list.push({ label: `Много чисел (${fmt(t.maxCount)})`, nums: randomNums(t, h, t.maxCount) });
  return list.map((test) => ({ ...test, input: makeInput(t, test.nums), expected: t.answer(test.nums) }));
}

// Самопроверка библиотеки: примеры и особые случаи удовлетворяют условию
export function checkLibrary() {
  const problems = [];
  const ids = new Set();
  for (const t of TASKS) {
    if (ids.has(t.id)) problems.push(`${t.id}: повторяется id`);
    ids.add(t.id);
    for (const test of [{ label: 'пример', nums: t.example }, ...t.special]) {
      const { error } = parseInput(t, makeInput(t, test.nums));
      if (error) problems.push(`${t.id}, ${test.label}: ${error}`);
    }
  }
  return problems;
}
