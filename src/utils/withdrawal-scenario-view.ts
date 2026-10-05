import type {
  DependentStatus,
  PlanItem,
  ScenarioCard,
  ValueSource,
} from '../api/withdrawal-scenario-api';
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
