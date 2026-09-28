// Свои задания учителя: сборка из готовых блоков и упаковка в ссылку.
// Описание задания (spec) — это только выбранные блоки и числа; условие, пример,
// особые случаи, эталонный ответ и решение тренажёр строит сам.

import { task } from './tasks.js';

export const CUSTOM_LEVEL_NAME = 'Своё задание';
export const HASH_PREFIX = 'my=';
const MAX_CONDS = 3;
const MAX_TITLE = 80;
const MAX_CODE = 1000;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// ---------- Условия отбора ----------

const DIGITS = {
  1: ['однозначных', 'однозначное'],
  2: ['двузначных', 'двузначное'],
  3: ['трёхзначных', 'трёхзначное'],
  4: ['четырёхзначных', 'четырёхзначное'],
  5: ['пятизначных', 'пятизначное'],
};

// pl — «количество чисел, кратных 3», sg — «максимальное число, кратное 3».
// adj — прилагательное, которое ставится перед словом «число»: «чётных чисел».
export const COND_TYPES = {
  div: {
    label: 'кратно', min: 2, max: 1000,
    pl: (v) => `кратных ${v}`, sg: (v) => `кратное ${v}`,
    py: (v) => `x % ${v} == 0`, test: (v) => (x) => x % v === 0,
  },
  ndiv: {
    label: 'не кратно', min: 2, max: 1000,
    pl: (v) => `не кратных ${v}`, sg: (v) => `не кратное ${v}`,
    py: (v) => `x % ${v} != 0`, test: (v) => (x) => x % v !== 0,
  },
  end: {
    label: 'оканчивается на', min: 0, max: 9,
    pl: (v) => `оканчивающихся на ${v}`, sg: (v) => `оканчивающееся на ${v}`,
    py: (v) => `x % 10 == ${v}`, test: (v) => (x) => x % 10 === v,
  },
  nend: {
    label: 'не оканчивается на', min: 0, max: 9,
    pl: (v) => `не оканчивающихся на ${v}`, sg: (v) => `не оканчивающееся на ${v}`,
    py: (v) => `x % 10 != ${v}`, test: (v) => (x) => x % 10 !== v,
  },
  even: {
    label: 'чётное', adj: true,
    pl: () => 'чётных', sg: () => 'чётное',
    py: () => 'x % 2 == 0', test: () => (x) => x % 2 === 0,
  },
  odd: {
    label: 'нечётное', adj: true,
    pl: () => 'нечётных', sg: () => 'нечётное',
    py: () => 'x % 2 != 0', test: () => (x) => x % 2 !== 0,
  },
  gt: {
    label: 'больше', min: 1, max: 30000,
    pl: (v) => `больших ${fmt(v)}`, sg: (v) => `большее ${fmt(v)}`,
    py: (v) => `x > ${v}`, test: (v) => (x) => x > v,
  },
  lt: {
    label: 'меньше', min: 1, max: 30000,
    pl: (v) => `меньших ${fmt(v)}`, sg: (v) => `меньшее ${fmt(v)}`,
    py: (v) => `x < ${v}`, test: (v) => (x) => x < v,
  },
  digits: {
    label: 'количество цифр', min: 1, max: 5, adj: true,
    pl: (v) => DIGITS[v][0], sg: (v) => DIGITS[v][1],
    py: (v) => (v === 1 ? 'x <= 9' : `${10 ** (v - 1)} <= x <= ${10 ** v - 1}`),
    test: (v) => (x) => String(x).length === v,
  },
};

export const hasValue = (type) => 'min' in COND_TYPES[type];

// ---------- Что найти ----------

export const AIMS = {
  count: 'количество',
  sum: 'сумму',
  max: 'максимум',
  min: 'минимум',
  maxNo: 'максимум или NO',
  minNo: 'минимум или NO',
  avg: 'среднее арифметическое или NO',
  countMax: 'количество и максимум',
};
const GUARANTEED = ['max', 'min', 'countMax'];

export const DEFAULT_SPEC = {
  format: 'count',
  maxCount: 1000,
  maxValue: 30000,
  conds: [{ type: 'div', value: 3 }],
  join: 'and',
  aim: 'count',
  title: '',
  hide: false,
};

// ---------- Проверка описания ----------

const isInt = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;

function predicate(spec) {
  const tests = spec.conds.map((c) => COND_TYPES[c.type].test(c.value));
  return spec.join === 'or' ? (x) => tests.some((f) => f(x)) : (x) => tests.every((f) => f(x));
}

// Возвращает текст ошибки или '' — если из описания можно собрать задание
export function validateSpec(spec) {
  if (!spec || typeof spec !== 'object') return 'нет описания задания';
  if (spec.format !== 'zero' && spec.format !== 'count') return 'неизвестный формат ввода';
  if (!isInt(spec.maxCount, 5, 1000)) return 'количество чисел — целое число от 5 до 1 000';
  if (!isInt(spec.maxValue, 10, 30000)) return 'наибольшее число — целое число от 10 до 30 000';
  if (!Array.isArray(spec.conds) || !spec.conds.length) return 'добавьте хотя бы одно условие отбора';
  if (spec.conds.length > MAX_CONDS) return `условий отбора не больше ${MAX_CONDS}`;
  for (const c of spec.conds) {
    const type = c && COND_TYPES[c.type];
    if (!type || !Object.hasOwn(COND_TYPES, c.type)) return 'неизвестное условие отбора';
    if (hasValue(c.type) && !isInt(c.value, type.min, type.max)) {
      return `в условии «${type.label}» нужно целое число от ${fmt(type.min)} до ${fmt(type.max)}`;
    }
  }
  if (spec.join !== 'and' && spec.join !== 'or') return 'условия соединяются через «и» или «или»';
  if (!Object.hasOwn(AIMS, spec.aim)) return 'неизвестно, что нужно найти';
  if (typeof spec.title !== 'string' || spec.title.length > MAX_TITLE) return `название — не длиннее ${MAX_TITLE} символов`;
  if (typeof spec.hide !== 'boolean') return 'неверный флаг «скрыть решение»';
  const pred = predicate(spec);
  let fit = 0;
  for (let x = 1; x <= spec.maxValue; x++) if (pred(x)) fit++;
  if (!fit) return `ни одно число от 1 до ${fmt(spec.maxValue)} не подходит под условие`;
  if (fit === spec.maxValue) return `под условие подходят все числа от 1 до ${fmt(spec.maxValue)} — отбирать нечего`;
  return '';
}

// ---------- Ссылка ----------

function toBase64Url(text) {
  let bin = '';
  new TextEncoder().encode(text).forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code) {
  let s = code.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bytes = Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

// Одинаковые задания дают одинаковую ссылку: порядок полей фиксирован
export function encodeSpec(spec) {
  const short = {
    f: spec.format === 'zero' ? 'z' : 'c',
    n: spec.maxCount,
    m: spec.maxValue,
    c: spec.conds.map((c) => (hasValue(c.type) ? [c.type, c.value] : [c.type])),
    j: spec.join === 'or' ? 'o' : 'a',
    a: spec.aim,
  };
  if (spec.title.trim()) short.t = spec.title.trim();
  if (spec.hide) short.h = 1;
  return toBase64Url(JSON.stringify(short));
}

// Возвращает { spec } или { error }
export function decodeSpec(code) {
  let short;
  try {
    if (typeof code !== 'string' || !code || code.length > MAX_CODE || !/^[\w-]+$/.test(code)) throw new Error();
    short = JSON.parse(fromBase64Url(code));
    if (!short || typeof short !== 'object' || !Array.isArray(short.c)) throw new Error();
  } catch {
    return { error: 'ссылка на задание повреждена' };
  }
  const spec = {
    format: { z: 'zero', c: 'count' }[short.f],
    maxCount: short.n,
    maxValue: short.m,
    conds: short.c.map((c) => (Array.isArray(c) ? { type: c[0], value: c.length > 1 ? c[1] : 0 } : null)),
    join: { a: 'and', o: 'or' }[short.j],
    aim: short.a,
    title: short.t === undefined ? '' : short.t,
    hide: short.h === 1,
  };
  const error = validateSpec(spec);
  return error ? { error: 'ссылка на задание повреждена: ' + error } : { spec };
}

// ---------- Текст условия ----------

// Словосочетание с «числом»: pl — «чётных чисел, кратных 3», sg — «чётное число, кратное 3»
function phrase(spec, form) {
  const noun = form === 'pl' ? 'чисел' : 'число';
  const parts = spec.conds.map((c) => ({ adj: !!COND_TYPES[c.type].adj, text: COND_TYPES[c.type][form](c.value) }));
  if (spec.join === 'or' && parts.length > 1) return `${noun}, ${parts.map((p) => p.text).join(' или ')}`;
  const before = parts.filter((p) => p.adj).map((p) => p.text).join(' ');
  const after = parts.filter((p) => !p.adj).map((p) => p.text).join(' и ');
  return `${before ? before + ' ' : ''}${noun}${after ? ', ' + after : ''}`;
}

const cap = (s) => s[0].toUpperCase() + s.slice(1);

function texts(spec) {
  const pl = phrase(spec, 'pl');
  const sg = phrase(spec, 'sg');
  const no = 'или сообщает, что таких чисел нет (выводит NO)';
  const one = 'Программа должна вывести одно число — ';
  // Причастный оборот в конце («число, кратное 3») закрывается запятой: «число, кратное 3, или NO»
  const c = (p) => (p.includes(',') ? ',' : '');
  switch (spec.aim) {
    case 'count':
      return { title: `Количество ${pl}`, goal: `определяет количество ${pl}`, output: `${one}количество ${pl}.` };
    case 'sum':
      return { title: `Сумма ${pl}`, goal: `определяет сумму ${pl}`, output: `${one}сумму ${pl}.` };
    case 'max':
      return { title: `Наибольшее ${sg}`, goal: `определяет максимальное ${sg}`, output: `${one}максимальное ${sg}.` };
    case 'min':
      return { title: `Наименьшее ${sg}`, goal: `определяет минимальное ${sg}`, output: `${one}минимальное ${sg}.` };
    case 'maxNo':
      return {
        title: `Наибольшее ${sg}${c(sg)} или NO`,
        goal: `определяет максимальное ${sg}${c(sg)} ${no}`,
        output: `Программа должна вывести максимальное ${sg}${c(sg)} или NO, если таких чисел нет.`,
      };
    case 'minNo':
      return {
        title: `Наименьшее ${sg}${c(sg)} или NO`,
        goal: `определяет минимальное ${sg}${c(sg)} ${no}`,
        output: `Программа должна вывести минимальное ${sg}${c(sg)} или NO, если таких чисел нет.`,
      };
    case 'avg':
      return {
        title: `Среднее арифметическое ${pl}`,
        goal: `вычисляет среднее арифметическое ${pl}${c(pl)} ${no}`,
        output: `Программа должна вывести среднее арифметическое ${pl}${c(pl)} с точностью не менее десятых, или вывести NO, если таких чисел нет.`,
      };
    case 'countMax':
      return {
        title: `Количество и максимум ${pl}`,
        goal: `определяет количество ${pl}${c(pl)} и максимальное из них`,
        output: `Программа должна вывести два числа, каждое на отдельной строке: сначала количество ${pl}, затем максимальное из них.`,
      };
  }
}

export const autoTitle = (spec) => cap(texts(spec).title);

// ---------- Эталонный ответ ----------

function answerFn(spec, pred) {
  return (a) => {
    const b = a.filter(pred);
    const sum = b.reduce((s, x) => s + x, 0);
    switch (spec.aim) {
      case 'count': return String(b.length);
      case 'sum': return String(sum);
      case 'max': return String(Math.max(...b));
      case 'min': return String(Math.min(...b));
      case 'maxNo': return b.length ? String(Math.max(...b)) : 'NO';
      case 'minNo': return b.length ? String(Math.min(...b)) : 'NO';
      case 'avg': return b.length ? String(Number((sum / b.length).toFixed(6))) : 'NO';
      case 'countMax': return `${b.length}\n${Math.max(...b)}`;
    }
  };
}

// ---------- Решение и подсказка ----------

export function pythonCondition(spec) {
  return spec.conds.map((c) => COND_TYPES[c.type].py(c.value)).join(spec.join === 'or' ? ' or ' : ' and ');
}

function solutionCode(spec) {
  const cond = pythonCondition(spec);
  // Условие, к которому дописывается «and x > m»: «или» надо взять в скобки
  const both = spec.join === 'or' && spec.conds.length > 1 ? `(${cond})` : cond;
  const big = spec.maxValue + 1;
  const plan = {
    count: { init: ['k = 0'], body: [`if ${cond}:`, '    k += 1'], end: ['print(k)'] },
    sum: { init: ['s = 0'], body: [`if ${cond}:`, '    s += x'], end: ['print(s)'] },
    max: { init: ['m = 0'], body: [`if ${both} and x > m:`, '    m = x'], end: ['print(m)'] },
    min: { init: [`m = ${big}`], body: [`if ${both} and x < m:`, '    m = x'], end: ['print(m)'] },
    maxNo: {
      init: ['m = 0'], body: [`if ${both} and x > m:`, '    m = x'],
      end: ['if m == 0:', "    print('NO')", 'else:', '    print(m)'],
    },
    minNo: {
      init: [`m = ${big}`], body: [`if ${both} and x < m:`, '    m = x'],
      end: [`if m == ${big}:`, "    print('NO')", 'else:', '    print(m)'],
    },
    avg: {
      init: ['s = 0', 'k = 0'], body: [`if ${cond}:`, '    s += x', '    k += 1'],
      end: ['if k == 0:', "    print('NO')", 'else:', '    print(s / k)'],
    },
    countMax: {
      init: ['k = 0', 'm = 0'], body: [`if ${cond}:`, '    k += 1', '    if x > m:', '        m = x'],
      end: ['print(k)', 'print(m)'],
    },
  }[spec.aim];
  const body = plan.body.map((line) => '    ' + line);
  const lines = spec.format === 'count'
    ? ['n = int(input())', ...plan.init, 'for i in range(n):', '    x = int(input())', ...body, ...plan.end]
    : [...plan.init, 'x = int(input())', 'while x != 0:', ...body, '    x = int(input())', ...plan.end];
  return lines.join('\n') + '\n';
}

function hintText(spec) {
  const loop = spec.format === 'count'
    ? 'Сначала прочитайте количество чисел <code>n</code>, затем в цикле <code>for i in range(n)</code> читайте по одному числу.'
    : 'Читайте числа в цикле <code>while x != 0</code>. Не забудьте прочитать следующее число в конце тела цикла — иначе цикл не закончится.';
  const cond = `Число подходит, если <code>${esc(pythonCondition(spec))}</code>.`;
  const big = `<code>m = ${spec.maxValue + 1}</code>`;
  const aim = {
    count: 'Заведите счётчик <code>k = 0</code> и увеличивайте его на 1 для каждого подходящего числа.',
    sum: 'Накапливайте сумму подходящих чисел в переменной <code>s</code>, начав с 0.',
    max: 'Начните с <code>m = 0</code> — все числа натуральные. Обновляйте максимум, только если число подходит и больше <code>m</code>.',
    min: `Начальное значение минимума должно быть больше любого допустимого числа, например ${big}.`,
    maxNo: 'Начните с <code>m = 0</code>. Если после цикла максимум так и остался равен 0, подходящих чисел не было — выведите NO.',
    minNo: `Начните с ${big} — это больше любого допустимого числа. Если после цикла значение не изменилось, подходящих чисел не было — выведите NO.`,
    avg: 'Накопите сумму и количество подходящих чисел. После цикла: если количество равно 0, выведите <code>NO</code>, иначе — <code>s / k</code>. Деление <code>//</code> отбросит дробную часть, и ответ будет неверным.',
    countMax: 'В одном цикле ведите сразу две переменные: счётчик и максимум. Выведите их двумя вызовами <code>print</code>.',
  }[spec.aim];
  return `${loop} ${cond} ${aim}`;
}

// ---------- Пример и особые случаи ----------

// Предсказуемые «случайные» числа: у одной и той же ссылки всегда один и тот же пример
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

function makeExample(spec, fits, misses, rand) {
  // Для примера — числа поменьше, чтобы условие читалось легко
  const small = (list) => {
    const s = list.filter((x) => x <= 200);
    return (s.length >= 3 ? s : list).slice();
  };
  const f = small(fits);
  const m = small(misses);
  // Числа не повторяются, пока их хватает
  const pick = (list) => {
    const i = Math.floor(rand() * list.length);
    return list.length > 3 ? list.splice(i, 1)[0] : list[i];
  };
  const nFit = fits.length >= 3 ? 2 + Math.floor(rand() * 2) : Math.min(fits.length, 2);
  const nums = [];
  for (let i = 0; i < nFit; i++) nums.push(pick(f));
  while (nums.length < 5) nums.push(pick(m));
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  return nums;
}

function makeSpecial(spec, fits, misses) {
  const at = (list, part) => list[Math.min(list.length - 1, Math.floor(list.length * part))];
  const fit = at(fits, 0.5);
  const miss = at(misses, 0.3);
  const miss2 = at(misses, 0.7);
  const maxFit = fits[fits.length - 1];
  const maxMiss = misses[misses.length - 1];
  const minMiss = misses[0];
  const list = [];
  const add = (label, nums, when = true) => when && list.push({ label, nums });

  if (!GUARANTEED.includes(spec.aim)) add('Нет подходящих чисел', [misses[0], miss, maxMiss]);
  add('Одно число, и оно подходит', [maxFit]);
  if (['count', 'sum', 'avg'].includes(spec.aim)) {
    add('Все числа подходят', [fit, maxFit, fits[0]]);
    add('Подходят первое и последнее числа', [fits[0], miss, maxFit]);
  }
  if (['max', 'maxNo', 'countMax'].includes(spec.aim)) {
    add('Подходящее число только первое', [fit, miss, miss2]);
    add('Подходящее число только последнее', [miss, miss2, fit]);
    add('Самое большое число не подходит', [maxMiss, fits[0]], maxMiss > fits[0]);
  }
  if (['min', 'minNo'].includes(spec.aim)) {
    add('Подходящее число одно, большое и последнее', [miss, miss2, maxFit]);
    add('Подходящее число первое', [fits[0], miss2, maxFit]);
    add('Самое маленькое число не подходит', [minMiss, maxFit], minMiss < maxFit);
  }
  if (spec.aim === 'avg') {
    // Два числа с нечётной суммой или три, сумма которых не делится на 3
    const a = fits[0];
    const odd = fits.find((x) => (x + a) % 2 === 1);
    const third = fits.find((x) => (2 * a + x) % 3 !== 0);
    if (odd !== undefined) add('Среднее не целое', [a, odd]);
    else if (third !== undefined) add('Среднее не целое', [a, a, third]);
  }
  return list;
}

// ---------- Задание целиком ----------

// Собирает задание в том же виде, что и задания библиотеки. spec должен пройти validateSpec.
export function customTask(spec) {
  const code = encodeSpec(spec);
  const pred = predicate(spec);
  const fits = [];
  const misses = [];
  for (let x = 1; x <= spec.maxValue; x++) (pred(x) ? fits : misses).push(x);
  const t = texts(spec);
  const guaranteed = GUARANTEED.includes(spec.aim);
  const example = makeExample(spec, fits, misses, seeded(hash(code)));
  const seen = new Set([example.join()]);
  const special = makeSpecial(spec, fits, misses).filter((s) => !seen.has(s.nums.join()) && seen.add(s.nums.join()));
  return task({
    id: 'my-' + hash(code).toString(36),
    code,
    spec,
    level: 0,
    title: spec.title.trim() || cap(t.title),
    format: spec.format,
    maxCount: spec.maxCount,
    maxValue: spec.maxValue,
    tol: spec.aim === 'avg' ? 0.05 : 0,
    goal: t.goal,
    output: t.output,
    guarantee: guaranteed ? `В последовательности всегда имеется ${phrase(spec, 'sg')}.` : '',
    valid: guaranteed ? (a) => a.some(pred) : () => true,
    answer: answerFn(spec, pred),
    good: (h) => h.pick(fits),
    example,
    special,
    hint: hintText(spec),
    solution: solutionCode(spec),
    hideSolution: spec.hide,
  });
}
