/**
 * 로그인/가입 후 복귀 경로 — open redirect 방지용 상대 경로만 허용
 */
export function resolveSafeReturnTo(
  candidate: string | null | undefined,
  fallback = "/result",
): string {
  if (typeof candidate !== "string") return fallback;

  const trimmed = candidate.trim();
  if (!trimmed) return fallback;

  // 동일 출처 상대 경로만 허용 (//evil.com, https://… 차단)
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  return trimmed;
}
