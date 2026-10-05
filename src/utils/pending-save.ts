/** 비로그인 저장 시도 → 로그인 복귀 후 자동 저장 의도 플래그 */
export const PENDING_SAVE_KEY = "retirement_pending_result_save";

/** 로그인을 포기하고 한참 뒤 돌아왔을 때 자동 저장되지 않도록 만료 */
export const PENDING_SAVE_TTL_MS = 30 * 60 * 1000;

export function markPendingSave(now = Date.now()): void {
  try {
    sessionStorage.setItem(PENDING_SAVE_KEY, String(now));
  } catch {
    // quota/private mode — 무시
  }
}

export function clearPendingSave(): void {
  try {
    sessionStorage.removeItem(PENDING_SAVE_KEY);
  } catch {
    // ignore
  }
}

/** 유효한 플래그면 true, 만료·형식 오류면 지우고 false */
export function hasPendingSave(now = Date.now()): boolean {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(PENDING_SAVE_KEY);
  } catch {
    return false;
  }
  if (raw == null) return false;
  const markedAt = Number(raw);
  const valid =
    Number.isFinite(markedAt) &&
    markedAt <= now &&
    now - markedAt < PENDING_SAVE_TTL_MS;
  if (!valid) clearPendingSave();
  return valid;
}
