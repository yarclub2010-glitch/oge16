// Запуск программ на Python: поток с Pyodide, ограничение времени, остановка.

export const TIME_LIMIT = 4000; // мс на один запуск при проверке

export class PythonRunner {
  constructor({ onStatus = () => {} } = {}) {
    this.onStatus = onStatus; // 'loading' | 'ready' | 'error'
    this.worker = null;
    this.readyPromise = null;
    this.job = null;
    this.seq = 0;
    this.cancelled = false;
  }

  // Запускает поток с Python (если ещё не запущен) и ждёт готовности
  ensure() {
    if (this.readyPromise) return this.readyPromise;
    this.onStatus('loading');
    const worker = new Worker(new URL('./worker.js', import.meta.url));
    this.worker = worker;
    this.readyPromise = new Promise((resolve, reject) => {
      worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === 'ready') resolve();
        else if (msg.type === 'fail') reject(new Error(msg.message));
        else this.onMessage(msg);
      };
      worker.onerror = (e) => {
        e.preventDefault?.();
        reject(new Error(e.message || 'поток с Python не запустился'));
      };
    });
    this.readyPromise.then(
      () => this.onStatus('ready'),
      () => {
        this.kill();
        this.onStatus('error');
      },
    );
    return this.readyPromise;
  }

  kill() {
    if (this.worker) this.worker.terminate();
    this.worker = null;
    this.readyPromise = null;
    clearTimeout(this.job?.timer);
  }

  // Остановить текущее выполнение
  stop() {
    this.cancelled = true;
    if (!this.job) return;
    const job = this.job;
    this.kill();
    job.finish(null);
  }

  onMessage(msg) {
    const job = this.job;
    if (!job || msg.id !== job.id) return;
    if (msg.type === 'start') {
      clearTimeout(job.timer);
      job.timer = setTimeout(() => {
        // Программа не уложилась во время — останавливаем поток, дальше продолжим в новом
        this.kill();
        job.finish(msg.index);
      }, job.timeLimit);
    } else if (msg.type === 'result') {
      clearTimeout(job.timer);
      job.results[msg.index] = { out: msg.out, error: msg.error };
      job.onResult(msg.index, job.results[msg.index]);
    } else if (msg.type === 'done') {
      clearTimeout(job.timer);
      job.finish(null);
    }
  }

  // Выполняет программу на каждом из входов. Возвращает { results, cancelled }.
  // Результат: { out, error: { type, message, line } | null }.
  // После maxTimeouts зависаний остальные входы не запускаются (ошибка 'Skipped').
  async runAll(src, inputs, { onResult = () => {}, timeLimit = TIME_LIMIT, maxTimeouts = Infinity } = {}) {
    const results = new Array(inputs.length).fill(null);
    this.cancelled = false;
    let from = 0;
    let timeouts = 0;
    while (from < inputs.length && !this.cancelled) {
      await this.ensure();
      if (this.cancelled) break;
      const stuckAt = await new Promise((resolve) => {
        const id = ++this.seq;
        this.job = {
          id,
          results,
          onResult,
          timeLimit,
          timer: null,
          finish: (index) => {
            this.job = null;
            resolve(index);
          },
        };
        this.worker.postMessage({ id, src, inputs, from });
      });
      if (stuckAt === null) break;
      results[stuckAt] = { out: '', error: { type: 'Timeout', message: '', line: null } };
      onResult(stuckAt, results[stuckAt]);
      from = stuckAt + 1;
      if (++timeouts >= maxTimeouts) {
        for (let i = from; i < inputs.length; i++) {
          results[i] = { out: '', error: { type: 'Skipped', message: '', line: null } };
        }
        break;
      }
    }
    return { results, cancelled: this.cancelled };
  }
}
