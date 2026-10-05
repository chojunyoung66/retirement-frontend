import type { DependentStatus, YearRow } from '../api/withdrawal-scenario-api';

export type ReportDeviceMode = 'pc' | 'mobile';

export const PC_MIN_WIDTH = 1024;
/** 정밀 포인터·호버가 되는 넓은 화면만 PC로 본다 — User-Agent는 보지 않는다 */
export const PC_MEDIA_QUERY = `(hover: hover) and (pointer: fine) and (min-width: ${PC_MIN_WIDTH}px)`;

export const DEPENDENT_COLOR: Record<DependentStatus, string> = {
  LIKELY: 'var(--success)',
  CAUTION: '#e67e22',
  CHECK_NEEDED: 'var(--text-secondary, #888)',
};

export function resolveReportDeviceMode(input: {
  hoverFine: boolean;
  width: number;
}): ReportDeviceMode {
  return input.hoverFine && input.width >= PC_MIN_WIDTH ? 'pc' : 'mobile';
}

type ShareCapable = { canShare?: (data?: ShareData) => boolean; share?: (data?: ShareData) => Promise<void> };

/** Web Share로 파일을 보낼 수 있는지 — 지원하지 않거나 예외가 나면 false */
export function canShareFile(nav: ShareCapable | undefined, file: File): boolean {
  if (!nav || typeof nav.share !== 'function' || typeof nav.canShare !== 'function') return false;
  try {
    return nav.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export interface CompactYearRow {
  year: number;
  age: number;
  netWithdrawal: number;
  endingBalance: number;
  dependentStatus: DependentStatus;
}

/** 휴대폰 연도별 표 — 가로 스크롤 없이 4열만 */
export function toCompactYearRows(rows: YearRow[]): CompactYearRow[] {
  return rows.map(({ year, age, netWithdrawal, endingBalance, dependentStatus }) => ({
    year,
    age,
    netWithdrawal,
    endingBalance,
    dependentStatus,
  }));
}

/** 인쇄 시 기본 PDF 파일명이 되는 문서 제목 — 개인정보를 넣지 않는다 */
export function reportPrintTitle(id: number): string {
  return `retirement-plan-${id}`;
}

/** ISO 시각을 사용자 기기 기준 YYYY-MM-DD로 */
export function formatReportDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 공유 시트에서 사용자가 닫은 경우는 오류로 보지 않는다 */
export function isShareCancel(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

/** 비동기 대기 뒤 사용자 제스처가 만료돼 공유가 거절된 경우 */
export function isShareGestureExpired(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'NotAllowedError';
}
