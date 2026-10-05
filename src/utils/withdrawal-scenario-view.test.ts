import { describe, expect, it } from 'vitest';
import {
  formatPeriod,
  formatYm,
  summarizeScenarioCard,
} from './withdrawal-scenario-view';

const summary = {
  grossWithdrawal: 764_529_652,
  totalTax: 41_902_520,
  netWithdrawal: 722_627_132,
  depletionAge: 82 as number | null,
  shortfallMonths: 97,
  firstShortfallYm: '2050-12' as string | null,
  dependentLikelyYears: 13,
  endingBalance: 0,
};

describe('summarizeScenarioCard', () => {
  it('비교 카드 요약을 만원 단위로 포맷한다', () => {
    expect(summarizeScenarioCard({ summary })).toEqual({
      netWithdrawal: '72,263만원',
      totalTax: '4,190만원',
      depletion: '82세에 소진',
      dependentYears: '13년',
    });
  });

  it('재산을 입력하지 않으면 피부양자 기간을 숫자로 보이지 않는다', () => {
    expect(summarizeScenarioCard({ summary }, false).dependentYears).toBe('재산 입력 시 표시');
  });

  it('소진되지 않으면 그렇게 표시한다', () => {
    expect(summarizeScenarioCard({ summary: { ...summary, depletionAge: null } }).depletion).toBe(
      '계산 기간 내 소진 없음',
    );
  });
});

describe('formatYm·formatPeriod', () => {
  it('연월과 기간을 읽기 쉽게 표시한다', () => {
    expect(formatYm('2026-11')).toBe('2026년 11월');
    expect(formatYm(null)).toBe('-');
    expect(formatPeriod('2026-11', '2026-11')).toBe('2026년 11월');
    expect(formatPeriod('2026-11', '2036-10')).toBe('2026년 11월 ~ 2036년 10월');
  });
});
