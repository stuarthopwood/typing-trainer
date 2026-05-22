const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;

const counters = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(pin: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = counters.get(pin);

  if (!entry || now >= entry.resetAt) {
    counters.set(pin, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetIn: WINDOW_MS };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - entry.count, resetIn: entry.resetAt - now };
}
