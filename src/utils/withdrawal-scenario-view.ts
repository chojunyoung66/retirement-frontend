import type {
  DependentReason,
  DependentStatus,
  PlanItem,
  ScenarioCard,
  ScenarioPlan,
  ValueSource,
} from '../api/withdrawal-scenario-api';

type ScenarioMonthly = ScenarioPlan['scenario']['monthly'];
import { formatWan } from './format';

export const ACTION_LABEL: Record<PlanItem['actionType'], string> = {
  LUMP_SUM: '일시금',
  ANNUITY: '연금수령',
  AS_NEEDED: '필요할 때 인출',
  HOLD: '보유',
  INCOME: '수입',
};

export const DEPENDENT_STATUS_LABEL: Record<DependentStatus, string> = {
  LIKELY: '추정 가능',
  CAUTION: '주의',
  CHECK_NEEDED: '확인 필요',
};

/** 서버 dependent.ts의 DEPENDENT_REASON_LABEL과 같은 문구 */
export const DEPENDENT_REASON_LABEL: Record<DependentReason, string> = {
  PROPERTY_UNKNOWN: '재산 정보가 없어 판단할 수 없음',
  INCOME_OVER: '연 소득이 2,000만원 기준을 넘음',
  INCOME_NEAR: '연 소득이 2,000만원 기준에 가까움',
  BUSINESS_INCOME_OVER: '사업소득이 500만원 기준을 넘음',
  FINANCIAL_INCOME_OVER: '이자·배당이 1,000만원을 넘어 전액 소득에 반영됨',
  FINANCIAL_INCOME_NEAR: '이자·배당이 1,000만원 기준에 가까움',
  PROPERTY_MID: '재산 5.4억 초과 구간(연 소득 1,000만원 이하만 가능)',
  PROPERTY_OVER: '재산이 9억 기준을 넘음',
  SPOUSE_INCOME_OVER: '배우자 소득이 기준을 넘어 부부가 함께 탈락할 수 있음',
  SPOUSE_INCOME_NEAR: '배우자 소득이 기준에 가까움',
};

/** 연도별 사유 코드를 문구로 — 모르는 코드는 건너뛴다 */
export function dependentReasonText(reasons: readonly string[]): string {
  return reasons
    .filter((code): code is DependentReason => code in DEPENDENT_REASON_LABEL)
    .map((code) => DEPENDENT_REASON_LABEL[code])
    .join(', ');
}

export interface MonthlyRow {
  ym: string;
  gross: number;
  tax: number;
  net: number;
  shortfall: number;
  balance: number;
}

/** 월별 시계열을 연도별 행 묶음으로 — 이전 세트는 net이 없어 세전−세금으로 채운다 */
export function groupMonthlyByYear(monthly: ScenarioMonthly): { year: number; rows: MonthlyRow[] }[] {
  const groups = new Map<number, MonthlyRow[]>();
  monthly.ym.forEach((ym, i) => {
    const gross = monthly.gross[i] ?? 0;
    const tax = monthly.tax[i] ?? 0;
    const row: MonthlyRow = {
      ym,
      gross,
      tax,
      net: monthly.net?.[i] ?? gross - tax,
      shortfall: monthly.shortfall[i] ?? 0,
      balance: monthly.balance[i] ?? 0,
    };
    const year = Number(ym.slice(0, 4));
    const rows = groups.get(year);
    if (rows) rows.push(row);
    else groups.set(year, [row]);
  });
  return [...groups.entries()].map(([year, rows]) => ({ year, rows }));
}

export const VALUE_SOURCE_LABEL: Record<ValueSource, string> = {
  request: '이번에 입력한 값',
  simulation: '최근 시뮬레이션 결과',
  default: '기본값',
  none: '없음',
};

/** "2026-11" → "2026년 11월" */
export function formatYm(ym: string | null): string {
  if (!ym) return '-';
  const [year, month] = ym.split('-');
  return `${year}년 ${Number(month)}월`;
}

export function formatPeriod(startYm: string | null, endYm: string | null): string {
  if (!startYm) return '-';
  if (!endYm || startYm === endYm) return formatYm(startYm);
  return `${formatYm(startYm)} ~ ${formatYm(endYm)}`;
}

export interface ScenarioCardSummary {
  netWithdrawal: string;
  totalTax: string;
  depletion: string;
  dependentYears: string;
}

/** 비교 카드에 쓰는 요약 문구 — 재산 미입력이면 피부양자는 판단하지 않는다 */
export function summarizeScenarioCard(
  card: Pick<ScenarioCard, 'summary'>,
  propertyProvided = true,
): ScenarioCardSummary {
  const { summary } = card;
  return {
    netWithdrawal: formatWan(summary.netWithdrawal),
    totalTax: formatWan(summary.totalTax),
    depletion: summary.depletionAge === null ? '계산 기간 내 소진 없음' : `${summary.depletionAge}세에 소진`,
    dependentYears: propertyProvided ? `${summary.dependentLikelyYears}년` : '재산 입력 시 표시',
  };
}

/** OptionCardGroup 한 줄 설명 */
export function scenarioOptionDesc(card: ScenarioCard, propertyProvided = true): string {
  const s = summarizeScenarioCard(card, propertyProvided);
  return `세후 ${s.netWithdrawal} · 세금 ${s.totalTax} · ${s.depletion} · 피부양자 추정 ${s.dependentYears}`;
}
