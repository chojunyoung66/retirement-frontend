import type { ScenarioSet, ScenarioType } from '../api/withdrawal-scenario-api';

export interface ScenarioOverlayRow {
  /** 그해 계산 개월 수로 나눈 월 평균 — 서버 연간 합계를 나누기만 한다 */
  monthlyNet: number;
  monthlyShortfall: number;
  endingBalance: number;
}

export interface ScenarioOverlay {
  type: ScenarioType;
  title: string;
  ruleVersion: string;
  createdAt: string;
  byAge: Map<number, ScenarioOverlayRow>;
}

const ymParts = (ym: string): [number, number] => {
  const [y, m] = ym.split('-');
  return [Number(y), Number(m)];
};

/** 계산 기간(startYm~endYm) 중 해당 연도에 포함된 개월 수 */
export function monthsInYear(year: number, startYm: string, endYm: string): number {
  const [sy, sm] = ymParts(startYm);
  const [ey, em] = ymParts(endYm);
  if (year < sy || year > ey) return 0;
  const from = year === sy ? sm : 1;
  const to = year === ey ? em : 12;
  return Math.max(0, to - from + 1);
}

/** 최신 세트에서 사용자가 선택한 시나리오의 서버 연간값을 나이별로 — 선택이 없으면 null */
export function buildScenarioOverlay(set: ScenarioSet | null): ScenarioOverlay | null {
  if (!set?.selectedType) return null;
  const scenario = set.result.scenarios.find((s) => s.type === set.selectedType);
  if (!scenario) return null;
  const byAge = new Map<number, ScenarioOverlayRow>();
  for (const row of scenario.yearly) {
    const months = monthsInYear(row.year, set.result.startYm, set.result.endYm) || 12;
    byAge.set(row.age, {
      monthlyNet: Math.round(row.netWithdrawal / months),
      monthlyShortfall: Math.round(row.shortfall / months),
      endingBalance: row.endingBalance,
    });
  }
  return {
    type: scenario.type,
    title: scenario.title,
    ruleVersion: set.result.ruleVersion,
    createdAt: set.createdAt,
    byAge,
  };
}
