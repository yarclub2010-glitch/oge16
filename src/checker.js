// Проверка ответов и выставление баллов по критериям задания 16 ОГЭ.

const NUM = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;
const toNum = (s) => (NUM.test(s) ? Number(s) : null);
const tokens = (s) => s.split(/\s+/).filter(Boolean);

function values(n) {
  const m10 = n % 10;
  const m100 = n % 100;
  const word = m10 === 1 && m100 !== 11 ? 'значение' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'значения' : 'значений';
  return `${n} ${word}`;
}

// Сравнивает вывод программы с верным ответом. Числа сравниваются как числа (5 и 5.0 — одно и то же),
// tol — допустимая погрешность для дробных ответов.
export function compareOutput(out, expected, tol = 0) {
  const got = tokens(out);
  const want = tokens(expected);
  if (!got.length) return { ok: false, reason: 'программа ничего не вывела' };
  if (got.length !== want.length) {
    return { ok: false, reason: `выведено ${values(got.length)}, а нужно ${values(want.length)}` };
  }
  for (let i = 0; i < want.length; i++) {
    const y = toNum(want[i]);
    if (y !== null) {
      const x = toNum(got[i]);
      if (x === null) return { ok: false, reason: `вместо числа выведено «${got[i]}»` };
      if (Math.abs(x - y) > tol + 1e-9) return { ok: false, reason: 'неверный ответ' };
    } else if (got[i] !== want[i]) {
      const same = got[i].toLowerCase() === want[i].toLowerCase();
      return { ok: false, reason: same ? `нужно вывести ровно ${want[i]}` : 'неверный ответ' };
    }
  }
  return { ok: true };
}

// Критерии: 2 балла — верно на всех тестах, 1 балл — неверно ровно на одном, иначе 0
export function scoreOf(failed) {
  return failed === 0 ? 2 : failed === 1 ? 1 : 0;
}

// Понятное объяснение ошибки выполнения
export function explainError(err) {
  const msg = err.message || '';
  switch (err.type) {
    case 'Timeout':
      return 'Программа не завершилась вовремя. Скорее всего, бесконечный цикл: например, внутри while не читается следующее число.';
    case 'Skipped':
      return 'Тест не запускался: программа уже зависла на двух тестах, а это 0 баллов.';
    case 'OutputLimit':
      return 'Программа выводит слишком много — похоже, print стоит внутри бесконечного цикла.';
    case 'EOFError':
      return 'Программа пытается прочитать больше чисел, чем есть во входных данных. Проверьте, что цикл останавливается на 0 или выполняется ровно n раз.';
    case 'SyntaxError':
      if (/expected ':'/.test(msg)) return 'Синтаксическая ошибка: пропущено двоеточие в конце строки с if, for, while или else.';
      if (/never closed|unmatched|was not closed/.test(msg)) return 'Синтаксическая ошибка: не закрыта скобка или кавычка.';
      if (/invalid syntax\. Maybe you meant '==' or ':='/.test(msg)) return 'Синтаксическая ошибка: для сравнения нужно ==, а не =.';
      return `Синтаксическая ошибка (${msg}). Проверьте двоеточия, скобки и кавычки.`;
    case 'IndentationError':
    case 'TabError':
      return 'Ошибка в отступах: тело цикла и условия сдвигается на 4 пробела, а строки одного блока — на одинаковое расстояние.';
    case 'NameError': {
      const name = msg.match(/name '(.+?)'/)?.[1];
      return `Неизвестное имя${name ? ` «${name}»` : ''}: опечатка, или переменной не присвоено значение до использования.`;
    }
    case 'ValueError':
      if (/invalid literal for int/.test(msg)) return 'int() получил не целое число. Каждое число подаётся на отдельной строке — читайте их по одному.';
      return `Недопустимое значение: ${msg}`;
    case 'TypeError':
      if (/'str' and 'int'|'int' and 'str'|not supported between instances of 'str'/.test(msg)) {
        return 'Строка и число вперемешку: похоже, забыли int() вокруг input().';
      }
      return `Ошибка типов: ${msg}`;
    case 'ZeroDivisionError':
      return 'Деление на ноль — например, среднее считается, когда подходящих чисел нет.';
    default:
      return `${err.type}: ${msg}`;
  }
}
