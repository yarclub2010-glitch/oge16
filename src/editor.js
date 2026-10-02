// Редактор программы на Python: подсветка, номера строк, отступы после двоеточия.

const KEYWORDS = new Set([
  'if', 'elif', 'else', 'while', 'for', 'in', 'def', 'return', 'and', 'or', 'not', 'is',
  'True', 'False', 'None', 'break', 'continue', 'pass', 'import', 'from', 'as', 'lambda',
  'global', 'nonlocal', 'try', 'except', 'finally', 'with', 'class', 'del', 'yield', 'assert', 'raise',
]);
const BUILTINS = new Set([
  'print', 'input', 'int', 'float', 'str', 'len', 'range', 'max', 'min', 'abs', 'sum', 'round',
  'map', 'list', 'sorted', 'bool', 'divmod',
]);
const DEDENT_AFTER = new Set(['return', 'break', 'continue', 'pass']);
const INDENT = '    ';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Код строки без комментария и строк в кавычках
function codePart(text) {
  return text.replace(/"[^"]*"?|'[^']*'?/g, '""').split('#')[0];
}

export function highlightLine(text) {
  let html = '';
  const re = /("[^"]*"?|'[^']*'?)|(#.*$)|([A-Za-z_][\w]*)|(\d+(?:\.\d+)?)|(\s+)|(.)/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[1]) html += `<span class="t-str">${esc(m[1])}</span>`;
    else if (m[2]) html += `<span class="t-cm">${esc(m[2])}</span>`;
    else if (m[3]) {
      if (KEYWORDS.has(m[3])) html += `<span class="t-kw">${m[3]}</span>`;
      else if (BUILTINS.has(m[3])) html += `<span class="t-rb">${m[3]}</span>`;
      else html += esc(m[3]);
    } else if (m[4]) html += `<span class="t-num">${m[4]}</span>`;
    else html += esc(m[5] || m[6]);
  }
  return html;
}

export class CodeEditor {
  constructor(root, { onChange = () => {} } = {}) {
    this.root = root;
    this.onChange = onChange;
    root.classList.add('editor');
    root.innerHTML = `
      <div class="editor-scroll">
        <div class="editor-body">
          <div class="editor-gutter" aria-hidden="true"></div>
          <div class="editor-code">
            <div class="editor-stack">
              <pre class="editor-hl" aria-hidden="true"></pre>
              <textarea class="editor-input" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="Текст программы"></textarea>
            </div>
          </div>
        </div>
      </div>`;
    this.scroll = root.querySelector('.editor-scroll');
    this.gutter = root.querySelector('.editor-gutter');
    this.hl = root.querySelector('.editor-hl');
    this.input = root.querySelector('.editor-input');
    this.errorLine = null;

    this.input.addEventListener('input', () => {
      this.render();
      this.ensureCaretVisible();
      this.onChange(this.value);
    });
    this.input.addEventListener('keydown', (e) => this.onKey(e));
    this.input.addEventListener('scroll', () => {
      // Текстовое поле не должно прокручиваться само: прокручивается весь редактор
      this.input.scrollTop = 0;
    });
    this.render();
  }

  get value() {
    return this.input.value;
  }

  set value(text) {
    this.input.value = text;
    this.render();
  }

  get lineHeight() {
    return parseFloat(getComputedStyle(this.input).lineHeight) || 22;
  }

  setReadOnly(on) {
    this.input.readOnly = on;
    this.root.classList.toggle('is-readonly', on);
  }

  setErrorLine(line) {
    this.errorLine = line || null;
    this.render();
  }

  scrollToLine(line) {
    const lh = this.lineHeight;
    const top = (line - 1) * lh;
    const view = this.scroll;
    if (top < view.scrollTop + 4) view.scrollTop = Math.max(0, top - lh * 2);
    else if (top + lh > view.scrollTop + view.clientHeight - 4) view.scrollTop = top - view.clientHeight + lh * 3;
  }

  focusLine(line) {
    const lines = this.value.split('\n');
    let pos = 0;
    for (let i = 0; i < line - 1 && i < lines.length; i++) pos += lines[i].length + 1;
    const end = pos + (lines[line - 1] || '').length;
    this.input.focus();
    this.input.setSelectionRange(end, end);
    this.scrollToLine(line);
  }

  render() {
    const lines = this.value.split('\n');
    this.hl.innerHTML = lines.map((l, i) => {
      const inner = highlightLine(l) || ' ';
      return this.errorLine === i + 1 ? `<span class="t-errline">${inner}</span>` : inner;
    }).join('\n') + '\n';
    this.gutter.innerHTML = lines.map((_, i) => {
      const cls = this.errorLine === i + 1 ? ' class="has-error"' : '';
      return `<div${cls}>${i + 1}</div>`;
    }).join('');
    this.input.rows = lines.length + 1;
  }

  ensureCaretVisible() {
    const line = this.value.slice(0, this.input.selectionStart).split('\n').length;
    this.scrollToLine(line);
  }

  // Вставка с сохранением истории отмены (Ctrl+Z)
  insertText(text) {
    this.input.focus();
    const ok = document.execCommand && document.execCommand('insertText', false, text);
    if (!ok) {
      this.input.setRangeText(text, this.input.selectionStart, this.input.selectionEnd, 'end');
      this.input.dispatchEvent(new Event('input'));
    }
  }

  replaceAll(text) {
    this.input.focus();
    this.input.select();
    this.insertText(text);
  }

  currentLineInfo() {
    const pos = this.input.selectionStart;
    const text = this.value;
    const start = text.lastIndexOf('\n', pos - 1) + 1;
    let end = text.indexOf('\n', pos);
    if (end < 0) end = text.length;
    return { pos, start, end, line: text.slice(start, end) };
  }

  // Вставка готовой конструкции с отступом текущей строки. «▮» — место курсора.
  // inline — вставить прямо в позицию курсора (операторы), иначе конструкция начинается с новой строки
  insertSnippet(snippet, { inline = false } = {}) {
    if (this.input.readOnly) return;
    const { pos, start, line } = this.currentLineInfo();
    const indentStr = line.match(/^\s*/)[0];
    let text = snippet.split('\n').map((l, i) => (i === 0 ? l : indentStr + l)).join('\n');
    if (!inline && line.trim() !== '' && pos !== start) text = '\n' + indentStr + text;
    // Пробел перед курсором уже есть — второй не нужен
    if (inline && /\s$/.test(this.input.value.slice(0, this.input.selectionStart))) text = text.replace(/^ +/, '');
    const caret = text.indexOf('▮');
    text = text.replace('▮', '');
    const insertPos = this.input.selectionStart;
    this.insertText(text);
    if (caret >= 0) {
      const p = insertPos + caret;
      this.input.setSelectionRange(p, p);
    }
    this.ensureCaretVisible();
  }

  onKey(e) {
    if (this.input.readOnly) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) this.unindentLine();
      else this.insertText(INDENT);
      return;
    }
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      this.smartEnter();
      return;
    }
    if (e.key === 'Backspace' && this.input.selectionStart === this.input.selectionEnd) {
      // В начале строки Backspace убирает целый уровень отступа
      const { pos, start } = this.currentLineInfo();
      const before = this.value.slice(start, pos);
      if (before.length && /^ +$/.test(before)) {
        e.preventDefault();
        const n = before.length % 4 || 4;
        this.input.setSelectionRange(pos - n, pos);
        this.insertText('');
      }
    }
  }

  unindentLine() {
    const { start, line } = this.currentLineInfo();
    const n = Math.min(INDENT.length, line.match(/^ */)[0].length);
    if (!n) return;
    const pos = this.input.selectionStart;
    this.input.setSelectionRange(start, start + n);
    this.insertText('');
    const p = Math.max(start, pos - n);
    this.input.setSelectionRange(p, p);
  }

  smartEnter() {
    const { pos, start, line } = this.currentLineInfo();
    const head = line.slice(0, pos - start);
    const code = codePart(head).trimEnd();
    let indent = line.match(/^ */)[0];
    if (indent.length > head.length) indent = head;
    const first = code.trim().split(/[\s(]/)[0];
    if (code.endsWith(':')) indent += INDENT;
    else if (DEDENT_AFTER.has(first)) indent = indent.slice(INDENT.length);
    this.insertText('\n' + indent);
    this.ensureCaretVisible();
  }
}
