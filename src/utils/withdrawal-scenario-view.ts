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

/** 세금 합계를 소득세·지방소득세로 — 이전 데이터는 값이 없어 합계 ÷ 11(국세의 10%)로 나눈다 */
export function taxBreakdown(
  totalTax: number,
  localIncomeTax?: number,
): { incomeTax: number; localIncomeTax: number } {
  const local = localIncomeTax ?? Math.round(totalTax / 11);
  return { incomeTax: totalTax - local, localIncomeTax: local };
}

/** "소득세 1,565만원 · 지방소득세 157만원", 세금이 없으면 빈 문자열 */
export function taxBreakdownText(totalTax: number, localIncomeTax?: number): string {
  if (totalTax <= 0) return '';
  const split = taxBreakdown(totalTax, localIncomeTax);
  return `소득세 ${formatWan(split.incomeTax)} · 지방소득세 ${formatWan(split.localIncomeTax)}`;
}

/** 오름차순 연도를 "2027~2030년, 2033년"으로 묶는다 */
export function yearRanges(years: readonly number[]): string {
  const groups: { start: number; end: number }[] = [];
  for (const year of years) {
    const last = groups[groups.length - 1];
    if (last && last.end === year - 1) last.end = year;
    else groups.push({ start: year, end: year });
  }
  return groups.map((g) => (g.start === g.end ? `${g.start}년` : `${g.start}~${g.end}년`)).join(', ');
}

/** 계좌 총액 행 — 이전 데이터(필드 없음)와 잉여 적립 항목은 숨긴다 */
export function startBalanceLabel(item: PlanItem): { label: string; value: string } | null {
  if (item.startBalance === undefined) return null;
  if (item.accountType === 'UNEMPLOYMENT') return { label: '총 수급액', value: formatWan(item.totalGross) };
  if (item.startBalance === null) return null;
  return { label: '계좌 총액 (시작 시점)', value: formatWan(item.startBalance) };
}

const PENSION_ACCOUNT_TYPES: ReadonlySet<string> = new Set(['DC', 'PENSION_SAVINGS', 'IRP']);

export interface AnnuityLimitRowView {
  year: number;
  receiptYear: string;
  limit: string;
  planned: string;
  exceeded: boolean;
}

export type AnnuityLimitView =
  | { kind: 'none'; text: string }
  | {
      kind: 'limit';
      label: string;
      value: string;
      planned: string;
      exceededText: string | null;
      rows: AnnuityLimitRowView[];
    };

/** 연간 수령한도 행 — 대표 연도는 첫 인출 연도, 인출이 없으면 첫해. 이전 데이터는 null */
export function annuityLimitView(item: PlanItem): AnnuityLimitView | null {
  if (item.annuityLimit === undefined || item.accountType === 'UNEMPLOYMENT') return null;
  const limit = item.annuityLimit;
  if (limit === null) {
    return {
      kind: 'none',
      text: PENSION_ACCOUNT_TYPES.has(item.accountType)
        ? '일시금 수령 (수령한도 해당 없음)'
        : '수령한도 없음 (연금계좌 아님)',
    };
  }
  const focus = limit.years.find((y) => y.planned > 0) ?? limit.years[0];
  if (!focus) return { kind: 'none', text: '잔액이 없어 수령한도 없음' };
  const last = limit.years[limit.years.length - 1];
  if (focus.planned === 0 && item.actionType !== 'HOLD' && last?.receiptYear === 10) {
    return { kind: 'none', text: `11년차(${last.year + 1}년) 이후 인출이라 수령한도 없음` };
  }
  return {
    kind: 'limit',
    label: `연간 수령한도 (${focus.year}년 · ${focus.receiptYear}년차)`,
    value: formatWan(focus.limit),
    planned: `계획 인출 ${formatWan(focus.planned)}`,
    exceededText:
      limit.exceededYears.length > 0
        ? `${yearRanges(limit.exceededYears)} 계획 인출이 연금수령한도를 넘습니다. 초과분은 연금외수령으로 과세될 수 있어요.`
        : null,
    rows: limit.years.map((y) => ({
      year: y.year,
      receiptYear: `${y.receiptYear}년차`,
      limit: formatWan(y.limit),
      planned: formatWan(y.planned),
      exceeded: y.planned > y.limit,
    })),
  };
}

export interface ScenarioCardSummary {
  netWithdrawal: string;
  totalTax: string;
  localIncomeTax: string;
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
    localIncomeTax: formatWan(taxBreakdown(summary.totalTax, summary.localIncomeTax).localIncomeTax),
    depletion: summary.depletionAge === null ? '계산 기간 내 소진 없음' : `${summary.depletionAge}세에 소진`,
    dependentYears: propertyProvided ? `${summary.dependentLikelyYears}년` : '재산 입력 시 표시',
  };
}

/** OptionCardGroup 한 줄 설명 */
export function scenarioOptionDesc(card: ScenarioCard, propertyProvided = true): string {
  const s = summarizeScenarioCard(card, propertyProvided);
  return `세후 ${s.netWithdrawal} · 세금 ${s.totalTax} · ${s.depletion} · 피부양자 추정 ${s.dependentYears}`;
}
