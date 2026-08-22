const isDev = Boolean(import.meta.env.DEV);
const loggedKeys = new Set();

const toLogString = (value) => {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value, (_key, entry) => {
        if (entry instanceof Error) {
          return { name: entry.name, message: entry.message, code: entry.code, status: entry.status };
        }
        return entry;
      });
    } catch {
      return Object.prototype.toString.call(value);
    }
  }
  try {
    return String(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
};

const buildLogKey = (args) => args.map(toLogString).join('|');

const writeLog = (method, args, { once = false } = {}) => {
  if (!isDev) return;

  if (once) {
    const key = buildLogKey(args);
    if (loggedKeys.has(key)) return;
    loggedKeys.add(key);
  }

  console[method](...args);
};

const extractErrorPayload = (error) => error?.response?.data || error?.message || error;

const isBenignError = (error) => {
  const status = Number(error?.status || error?.response?.status || 0);
  const code = String(error?.code || error?.response?.data?.code || '').toLowerCase();
  const message = String(error?.response?.data?.message || error?.message || '').toLowerCase();

  return (
    status === 401
    || code === 'err_canceled'
    || code === 'aborterror'
    || code === 'econnaborted'
    || message.includes('canceled')
    || message.includes('cancelled')
    || message.includes('aborted')
    || message.includes('timeout')
    || message.includes('timed out')
    || message.includes('timeout exceeded')
    || message.includes('session expired')
  );
};

export const devLogger = {
  warn: (...args) => writeLog('warn', args),
  warnOnce: (...args) => writeLog('warn', args, { once: true }),
  error: (...args) => writeLog('error', args),
  errorOnce: (...args) => writeLog('error', args, { once: true }),
  warnUnlessBenign: (label, error, { once = false } = {}) => {
    if (isBenignError(error)) return;
    writeLog('warn', [label, extractErrorPayload(error)], { once });
  },
  errorUnlessBenign: (label, error, { once = false } = {}) => {
    if (isBenignError(error)) return;
    writeLog('error', [label, extractErrorPayload(error)], { once });
  },
};

export default devLogger;
