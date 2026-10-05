/** 비로그인 저장 시도 → 로그인 복귀 후 자동 저장 의도 플래그 */
export const PENDING_SAVE_KEY = "retirement_pending_result_save";

/** 로그인을 포기하고 한참 뒤 돌아왔을 때 자동 저장되지 않도록 만료 */
export const PENDING_SAVE_TTL_MS = 30 * 60 * 1000;

/** 저장 후 이동할 수 있는 경로 — 세션 값으로 임의 경로에 보내지 않도록 허용 목록만 */
export const PENDING_SAVE_NEXT = ["/summary", "/account-assets"] as const;
export type PendingSaveNext = (typeof PENDING_SAVE_NEXT)[number];
const DEFAULT_NEXT: PendingSaveNext = "/summary";

const isPendingSaveNext = (value: unknown): value is PendingSaveNext =>
  typeof value === "string" && (PENDING_SAVE_NEXT as readonly string[]).includes(value);

/** `{ at, next }` JSON 또는 이전 형식(시각 숫자)을 읽는다 */
function readPending(): { at: number; next: unknown } | null {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(PENDING_SAVE_KEY);
  } catch {
    return null;
  }
  if (raw == null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "number") return { at: parsed, next: DEFAULT_NEXT };
    if (parsed && typeof parsed === "object") {
      const { at, next } = parsed as { at?: unknown; next?: unknown };
      return { at: typeof at === "number" ? at : Number.NaN, next };
    }
  } catch {
    // 형식 오류
  }
  return { at: Number.NaN, next: DEFAULT_NEXT };
}

export function markPendingSave(
  next: PendingSaveNext = DEFAULT_NEXT,
  now = Date.now(),
): void {
  try {
    sessionStorage.setItem(PENDING_SAVE_KEY, JSON.stringify({ at: now, next }));
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
  const pending = readPending();
  if (!pending) return false;
  const valid =
    Number.isFinite(pending.at) &&
    pending.at <= now &&
    now - pending.at < PENDING_SAVE_TTL_MS;
  if (!valid) clearPendingSave();
  return valid;
}

/** 저장 성공 후 이동할 경로 — 플래그가 없거나 허용 목록 밖이면 요약 화면 */
export function pendingSaveNext(): PendingSaveNext {
  const next = readPending()?.next;
  return isPendingSaveNext(next) ? next : DEFAULT_NEXT;
}
