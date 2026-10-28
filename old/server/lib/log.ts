/**
 * Small, leveled logger for the Dante server.
 *
 * Outputs lines like:
 *   [2024-01-15T10:30:00.000Z] [INFO] db: sqlite ready
 *
 * Set LOG_LEVEL=debug|info|warn|error to filter output. Default is "info".
 */

const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

type Level = keyof typeof LEVELS;

const currentLevel = (() => {
  const env = Deno.env.get("LOG_LEVEL")?.toLowerCase() as Level | undefined;
  return env && env in LEVELS ? LEVELS[env] : LEVELS.info;
})();

function write(
  level: Level,
  levelValue: number,
  consoleFn: typeof console.log,
  args: unknown[],
) {
  if (levelValue < currentLevel) return;
  consoleFn(`[${new Date().toISOString()}] [${level.toUpperCase()}]`, ...args);
}

export const log = {
  debug: (...args: unknown[]) =>
    write("debug", LEVELS.debug, console.log, args),
  info: (...args: unknown[]) => write("info", LEVELS.info, console.log, args),
  warn: (...args: unknown[]) => write("warn", LEVELS.warn, console.warn, args),
  error: (...args: unknown[]) =>
    write("error", LEVELS.error, console.error, args),
};
