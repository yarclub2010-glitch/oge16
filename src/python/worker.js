// Выполнение программ на Python в отдельном потоке (Pyodide — настоящий Python в браузере).
// Главный поток может в любой момент остановить поток, если программа зациклилась.

importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.js');

const RUNNER = `
import sys, io, json, builtins, traceback

class _TooMuchOutput(Exception):
    pass

class _Out(io.StringIO):
    LIMIT = 200000
    def write(self, s):
        if self.tell() + len(s) > self.LIMIT:
            raise _TooMuchOutput()
        return super().write(s)

def _run_json(src, data):
    out = _Out()
    inp = io.StringIO(data)

    def _input(prompt=''):
        # Подсказку в input("...") не печатаем: проверяется только ответ
        line = inp.readline()
        if not line:
            raise EOFError('EOF when reading a line')
        return line.rstrip('\\r\\n')

    try:
        code = compile(src, '<prog>', 'exec')
    except SyntaxError as e:
        return json.dumps({'out': '', 'error': {'type': type(e).__name__, 'message': str(e.msg), 'line': e.lineno}})

    err = None
    saved = sys.stdout, sys.stdin, builtins.input
    sys.stdout, sys.stdin, builtins.input = out, inp, _input
    try:
        exec(code, {'__name__': '__main__'})
    except _TooMuchOutput:
        err = {'type': 'OutputLimit', 'message': '', 'line': None}
    except SystemExit:
        pass
    except BaseException as e:
        line = None
        for frame in traceback.extract_tb(e.__traceback__):
            if frame.filename == '<prog>':
                line = frame.lineno
        err = {'type': type(e).__name__, 'message': str(e), 'line': line}
    finally:
        sys.stdout, sys.stdin, builtins.input = saved
    return json.dumps({'out': out.getvalue(), 'error': err})
`;

const ready = (async () => {
  const py = await loadPyodide();
  py.runPython(RUNNER);
  return py;
})();

ready.then(
  () => postMessage({ type: 'ready' }),
  (err) => postMessage({ type: 'fail', message: String(err && err.message ? err.message : err) }),
);

onmessage = async (e) => {
  const { id, src, inputs, from } = e.data;
  const py = await ready;
  const run = py.globals.get('_run_json');
  try {
    for (let i = from; i < inputs.length; i++) {
      postMessage({ type: 'start', id, index: i });
      const res = JSON.parse(run(src, inputs[i]));
      postMessage({ type: 'result', id, index: i, out: res.out, error: res.error });
    }
  } finally {
    run.destroy();
  }
  postMessage({ type: 'done', id });
};
