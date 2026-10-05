import { describe, expect, it } from 'vitest';
import {
  dependentReasonText,
  formatPeriod,
  formatYm,
  groupMonthlyByYear,
  summarizeScenarioCard,
} from './withdrawal-scenario-view';

describe('dependentReasonText', () => {
  it('사유 코드를 문구로 잇고 모르는 코드는 건너뛴다', () => {
    expect(dependentReasonText(['INCOME_OVER', 'UNKNOWN', 'PROPERTY_MID'])).toBe(
      '연 소득이 2,000만원 기준을 넘음, 재산 5.4억 초과 구간(연 소득 1,000만원 이하만 가능)',
    );
    expect(dependentReasonText([])).toBe('');
  });
});

describe('groupMonthlyByYear', () => {
  it('연도별로 묶고 net이 없으면 세전−세금으로 채운다', () => {
    const groups = groupMonthlyByYear({
      ym: ['2030-11', '2030-12', '2031-01'],
      gross: [100, 200, 300],
      tax: [10, 20, 30],
      shortfall: [0, 0, 5],
      balance: [900, 700, 400],
    });
    expect(groups.map((g) => g.year)).toEqual([2030, 2031]);
    expect(groups[0]?.rows[1]).toEqual({ ym: '2030-12', gross: 200, tax: 20, net: 180, shortfall: 0, balance: 700 });
    expect(groups[1]?.rows[0]?.shortfall).toBe(5);
  });

  it('서버가 준 net을 우선한다', () => {
    const [group] = groupMonthlyByYear({
      ym: ['2030-11'],
      gross: [100],
      tax: [10],
      net: [85],
      shortfall: [0],
      balance: [0],
    });
    expect(group?.rows[0]?.net).toBe(85);
  });
});

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
