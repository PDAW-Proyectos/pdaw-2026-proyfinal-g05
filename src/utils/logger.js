const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };
const SENSITIVE = new Set(['password', 'passwordhash', 'token', 'authorization', 'cookie', 'secret']);

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, SENSITIVE.has(k.toLowerCase()) ? '[OCULTO]' : redact(v)]),
    );
  }
  return value;
}

function createLogger({ level = process.env.NODE_ENV === 'test' ? 'silent' : (process.env.LOG_LEVEL || 'info'), write = (line) => process.stdout.write(`${line}\n`) } = {}) {
  const min = LEVELS[level] ?? LEVELS.info;
  const log = (lvl) => (msg, context = {}) => {
    if (LEVELS[lvl] < min) return;
    write(JSON.stringify({ level: lvl, time: new Date().toISOString(), msg, ...redact(context) }));
  };
  return { debug: log('debug'), info: log('info'), warn: log('warn'), error: log('error') };
}

const defaultLogger = createLogger();

module.exports = { createLogger, redact, defaultLogger };

