import type { Session, Portfolio } from "./database";

export const AUTH_COOKIE_NAME = "retirement_token";

function parseAuthCookie(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === AUTH_COOKIE_NAME && rest.length > 0) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

/** Bearer 또는 HttpOnly 쿠키(retirement_token)로 세션 해석 */
export function resolveSession(
  authHeader: string | null,
  sessions: Session[],
  cookieHeader?: string | null,
): Session | null {
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    return sessions.find((s) => s.token === token) ?? null;
  }
  const cookieToken = parseAuthCookie(cookieHeader);
  if (cookieToken) {
    return sessions.find((s) => s.token === cookieToken) ?? null;
  }
  return null;
}

export function isOwner(portfolio: Portfolio, userId: number): boolean {
  return portfolio.userId === userId;
}
