const attempts = new Map<string, { count: number; resetAt: number }>();

export function requestKey(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local-client"
  );
}

export function rateLimited(
  key: string,
  limit = 10,
  windowMs = 60_000,
): boolean {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  current.count += 1;
  return current.count > limit;
}
