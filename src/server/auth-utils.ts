import type { Session, Portfolio } from "./database";

export function resolveSession(
  authHeader: string | null,
  sessions: Session[]
): Session | null {
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  return sessions.find((s) => s.token === token) ?? null;
}

export function isOwner(portfolio: Portfolio, userId: number): boolean {
  return portfolio.userId === userId;
}
