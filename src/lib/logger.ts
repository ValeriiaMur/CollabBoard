/**
 * Lightweight logger with namespace prefixes and environment awareness.
 * In production, debug/info logs are suppressed; only warn/error emit.
 */

const IS_DEV = process.env.NODE_ENV !== "production";

export function createLogger(namespace: string) {
  const prefix = `[${namespace}]`;

  return {
    /** Debug-level — suppressed in production */
    debug: (...args: unknown[]) => {
      if (IS_DEV) console.log(prefix, ...args);
    },
    /** Info-level — suppressed in production */
    info: (...args: unknown[]) => {
      if (IS_DEV) console.log(prefix, ...args);
    },
    /** Warning — always emits */
    warn: (...args: unknown[]) => {
      console.warn(prefix, ...args);
    },
    /** Error — always emits */
    error: (...args: unknown[]) => {
      console.error(prefix, ...args);
    },
  };
}
