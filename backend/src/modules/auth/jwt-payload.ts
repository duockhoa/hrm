/** Call only after the JWT signature and expiration have been verified. */
export function jwtUserId(
  payload: unknown,
  expectedUse: 'access' | 'refresh',
): number | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload))
    return null;
  const claims = payload as Record<string, unknown>;
  if (claims.token_use !== expectedUse) return null;
  if (
    typeof claims.sub !== 'number' &&
    (typeof claims.sub !== 'string' || !/^\d+$/.test(claims.sub))
  )
    return null;
  const id = Number(claims.sub);
  return Number.isSafeInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}
