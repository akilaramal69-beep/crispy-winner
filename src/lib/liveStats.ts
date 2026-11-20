/** Increment a numeric stat in-memory for the dashboard "live" panel. */
type Counter = { value: number; updatedAt: number };

const globalAny = globalThis as unknown as { __svCounters?: Map<string, Counter> };
const counters = (globalAny.__svCounters ??= new Map<string, Counter>());

export function bump(key: string, by = 1): number {
  const c = counters.get(key) ?? { value: 0, updatedAt: Date.now() };
  c.value += by;
  c.updatedAt = Date.now();
  counters.set(key, c);
  return c.value;
}

export function read(key: string): number {
  return counters.get(key)?.value ?? 0;
}
