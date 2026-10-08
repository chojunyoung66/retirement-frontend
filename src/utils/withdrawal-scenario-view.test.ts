import { describe, expect, it } from 'vitest';
import type { PlanItem } from '../api/withdrawal-scenario-api';
import {
  annuityLimitView,
  dependentReasonText,
  formatPeriod,
  formatYm,
  groupMonthlyByYear,
  startBalanceLabel,
  summarizeScenarioCard,
  taxBreakdown,
  taxBreakdownText,
  yearRanges,
} from './withdrawal-scenario-view';

const planItem = (overrides: Partial<PlanItem> = {}): PlanItem => ({
  accountId: 1,
  accountType: 'DC',
  label: '퇴직연금 DC',
  priority: 1,
  actionType: 'ANNUITY',
  startYm: '2027-01',
  endYm: '2036-12',
  monthlyGross: 0,
  monthlyNet: 0,
  totalGross: 0,
  totalTax: 0,
  method: '',
  taxNote: '',
  healthInsuranceNote: '',
  cautions: [],
  ...overrides,
});

const limit = {
  baseYear: 2026,
  legacy: false,
  years: [
    { year: 2026, receiptYear: 1, openingBalance: 300_000_000, limit: 36_000_000, planned: 0 },
    { year: 2027, receiptYear: 2, openingBalance: 306_000_000, limit: 40_800_000, planned: 45_000_000 },
    { year: 2028, receiptYear: 3, openingBalance: 270_000_000, limit: 40_500_000, planned: 45_000_000 },
  ],
  exceededYears: [2027, 2028],
};

describe('taxBreakdown', () => {
  it('서버가 준 지방소득세를 쓰고, 없으면 합계 ÷ 11로 나눈다', () => {
    expect(taxBreakdown(1_100_000, 100_001)).toEqual({ incomeTax: 999_999, localIncomeTax: 100_001 });
    expect(taxBreakdown(1_100_000)).toEqual({ incomeTax: 1_000_000, localIncomeTax: 100_000 });
  });

  it('세금이 없으면 분리 문구를 비운다', () => {
    expect(taxBreakdownText(0)).toBe('');
    expect(taxBreakdownText(17_220_000)).toBe('소득세 1,565만원 · 지방소득세 157만원');
  });
});

describe('yearRanges', () => {
  it('연속 연도를 묶는다', () => {
    expect(yearRanges([2027, 2028, 2029, 2033])).toBe('2027~2029년, 2033년');
    expect(yearRanges([])).toBe('');
  });
});

describe('startBalanceLabel', () => {
  it('계좌 총액을 보여 주고 실업급여는 총 수급액을 쓴다', () => {
    expect(startBalanceLabel(planItem({ startBalance: 300_000_000 }))).toEqual({
      label: '계좌 총액 (시작 시점)',
      value: '30,000만원',
    });
    expect(
      startBalanceLabel(planItem({ accountType: 'UNEMPLOYMENT', startBalance: null, totalGross: 17_820_000 })),
    ).toEqual({ label: '총 수급액', value: '1,782만원' });
  });

  it('이전 데이터와 잉여 적립 항목은 숨긴다', () => {
    expect(startBalanceLabel(planItem())).toBeNull();
    expect(startBalanceLabel(planItem({ accountType: 'CASH', startBalance: null }))).toBeNull();
  });
});

describe('annuityLimitView', () => {
  it('첫 인출 연도의 한도와 계획 인출, 초과 연도를 보여 준다', () => {
    const view = annuityLimitView(planItem({ annuityLimit: limit }));
    expect(view).toMatchObject({
      kind: 'limit',
      label: '연간 수령한도 (2027년 · 2년차)',
      value: '4,080만원',
      planned: '계획 인출 4,500만원',
    });
    if (view?.kind !== 'limit') throw new Error('limit view expected');
    expect(view.exceededText).toContain('2027~2028년');
    expect(view.rows.map((r) => r.exceeded)).toEqual([false, true, true]);
  });

  it('인출이 없으면 첫해를 보여 주고 초과 문구는 없다', () => {
    const quiet = { ...limit, years: limit.years.map((y) => ({ ...y, planned: 0 })), exceededYears: [] };
    const view = annuityLimitView(planItem({ actionType: 'HOLD', annuityLimit: quiet }));
    expect(view).toMatchObject({ kind: 'limit', label: '연간 수령한도 (2026년 · 1년차)', exceededText: null });
  });

  it('10년차까지 인출이 없고 그 뒤에 인출하면 한도 없음으로 보여 준다', () => {
    const years = Array.from({ length: 10 }, (_, i) => ({
      year: 2026 + i,
      receiptYear: i + 1,
      openingBalance: 50_000_000,
      limit: 6_000_000,
      planned: 0,
    }));
    const late = { ...limit, years, exceededYears: [] };
    expect(annuityLimitView(planItem({ annuityLimit: late }))).toEqual({
      kind: 'none',
      text: '11년차(2036년) 이후 인출이라 수령한도 없음',
    });
  });

  it('연금계좌가 아니거나 일시금이면 한도 없음, 이전 데이터와 실업급여는 null', () => {
    expect(annuityLimitView(planItem({ accountType: 'ISA', annuityLimit: null }))).toEqual({
      kind: 'none',
      text: '수령한도 없음 (연금계좌 아님)',
    });
    expect(annuityLimitView(planItem({ actionType: 'LUMP_SUM', annuityLimit: null }))).toEqual({
      kind: 'none',
      text: '일시금 수령 (수령한도 해당 없음)',
    });
    expect(annuityLimitView(planItem())).toBeNull();
    expect(annuityLimitView(planItem({ accountType: 'UNEMPLOYMENT', annuityLimit: null }))).toBeNull();
  });
});

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
      localIncomeTax: '381만원',
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
