/**
 * Minimal structured logger.
 *
 * Rules enforced by convention throughout the codebase (see Section 5 of the
 * technical brief): never log secrets, passwords, password hashes, full card
 * payloads, JWTs, or raw Stripe signatures. Only log metadata that describes
 * what happened.
 */

type LogMeta = Record<string, unknown>;

function base(level: string, message: string, meta?: LogMeta) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(meta ? { meta } : {}),
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(entry));
}

export const logger = {
  info: (message: string, meta?: LogMeta) => base('info', message, meta),
  warn: (message: string, meta?: LogMeta) => base('warn', message, meta),
  error: (message: string, meta?: LogMeta) => base('error', message, meta),
  debug: (message: string, meta?: LogMeta) => {
    if (process.env.NODE_ENV !== 'production') base('debug', message, meta);
  },
};
