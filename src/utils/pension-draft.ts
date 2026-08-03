import type { PensionState } from '../domain/plan';

const STORAGE_KEY = 'retirement_pension_draft';

const emptyPension = (): PensionState => ({
  national: 0,
  retirement: 0,
  personal: 0,
  housing: 0,
});

function isPensionState(value: unknown): value is PensionState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.national === 'number' &&
    typeof v.retirement === 'number' &&
    typeof v.personal === 'number' &&
    typeof v.housing === 'number'
  );
}

/** 화면 이탈·리로드에도 예상 은퇴 소득 초안을 유지 */
export function readPensionDraft(): PensionState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isPensionState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writePensionDraft(pension: PensionState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pension));
  } catch {
    // quota/private mode — 무시
  }
}

export function clearPensionDraft(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** 탈퇴·로그아웃 시 retirement_* 세션 잔여(연금 초안·저장 플래그 등) 제거 */
export function clearClientRetirementSession(): void {
  clearPensionDraft();
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith("retirement_")) keys.push(key);
    }
    for (const key of keys) sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** 필드별 양수 값을 우선해 병합 (세션 유실 보완) */
export function mergePensionPreferPositive(
  primary: PensionState,
  fallback: PensionState | null,
): PensionState {
  const base = fallback ?? emptyPension();
  return {
    national: primary.national > 0 ? primary.national : base.national,
    retirement: primary.retirement > 0 ? primary.retirement : base.retirement,
    personal: primary.personal > 0 ? primary.personal : base.personal,
    housing: primary.housing > 0 ? primary.housing : base.housing,
  };
}
