type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function logStructured(level: LogLevel, message: string, payload: Record<string, unknown> = {}): void {
  const entry = { level, message, timestamp: new Date().toISOString(), ...payload };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}
