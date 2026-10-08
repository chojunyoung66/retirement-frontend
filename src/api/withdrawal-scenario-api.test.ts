import { describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {
    errorCode: string;
    constructor(code: string) {
      super();
      this.errorCode = code;
    }
  },
}));

import { isScenarioType, parseScenarioPlan, parseScenarioSet } from './withdrawal-scenario-api';
import { parseAccountAssets } from './account-asset-api';

const summary = {
  grossWithdrawal: 100,
  totalTax: 10,
  netWithdrawal: 90,
  depletionAge: null,
  shortfallMonths: 0,
  firstShortfallYm: null,
  dependentLikelyYears: 3,
  endingBalance: 50,
};

const scenario = (type: string) => ({
  type,
  title: `시나리오 ${type}`,
  goal: '목표',
  recommended: type === 'D',
  priorityOrder: ['실업급여'],
  summary,
  planItems: [
    {
      accountId: 1,
      accountType: 'DC',
      label: '퇴직연금 DC',
      priority: 1,
      actionType: 'ANNUITY',
      startYm: '2032-01',
      endYm: '2049-12',
      monthlyGross: 1,
      monthlyNet: 1,
      totalGross: 1,
      totalTax: 0,
      method: '연금수령',
      taxNote: '이연퇴직소득',
      healthInsuranceNote: '반영 안 됨',
      cautions: [],
    },
  ],
  yearly: [
    {
      year: 2026,
      age: 58,
      expense: 1,
      nationalPension: 0,
      unemployment: 0,
      grossWithdrawal: 1,
      tax: 0,
      netWithdrawal: 1,
      shortfall: 0,
      endingBalance: 1,
      financialIncome: 0,
      dependentStatus: 'LIKELY',
    },
  ],
  notes: [],
});

const result = {
  ruleVersion: 'KR-2026.10',
  basisDates: [{ domain: '연금소득세', effectiveDate: '2026-01-01', source: '소득세법' }],
  startYm: '2026-11',
  endYm: '2058-12',
  assumptions: {
    inflationRate: 0.02,
    pensionGrowthRate: 0.02,
    returnRate: 0.02,
    financialYieldRate: 0.02,
    endAge: 90,
  },
  recommendedType: 'D',
  recommendationNote: '국민연금 개시 후 재판정',
  inputSummary: {
    accountsCount: 1,
    totalBalance: 100,
    nationalPensionSource: 'simulation',
    unemploymentSource: 'none',
    yearsOfServiceSource: 'default',
    propertyProvided: false,
  },
  accountChecks: [],
  scenarios: ['A', 'B', 'C', 'D'].map(scenario),
  disclaimers: ['추정치입니다'],
};

describe('parseScenarioSet', () => {
  it('서버 응답을 파싱한다', () => {
    const set = parseScenarioSet({
      id: 1,
      ruleVersion: 'KR-2026.10',
      selectedType: null,
      createdAt: '2026-10-05T00:00:00.000Z',
      result,
    });
    expect(set.result.scenarios.map((s) => s.type)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('고도화 이전 세트는 신규 필드를 기본값으로 채운다', () => {
    const set = parseScenarioSet({ id: 1, ruleVersion: 'x', selectedType: null, createdAt: 'x', result });
    const row = set.result.scenarios[0].yearly[0];
    expect(row).toMatchObject({ healthPremium: 0, spouseNationalPension: 0, dependentReasons: [] });
    expect(set.result.isaStrategy).toEqual([]);
    expect(set.result.inputSummary.spouseNationalPensionSource).toBe('none');
  });

  it('건보료·피부양자 사유·ISA 전략을 파싱한다', () => {
    const next = structuredClone(result) as typeof result & { isaStrategy: unknown[] };
    Object.assign(next.scenarios[0].yearly[0], {
      healthPremium: 1_200_000,
      spouseNationalPension: 0,
      dependentReasons: ['INCOME_OVER'],
    });
    next.isaStrategy = [
      {
        accountId: 4,
        label: 'ISA',
        balance: 30_000_000,
        maturityYm: '2027-03',
        extraCreditBase: 3_000_000,
        excessOverCap: 0,
        maxTaxCreditEstimate: 396_000,
        effectLimitedAfterRetirement: true,
        notes: ['60일 이내 전환'],
      },
    ];
    const set = parseScenarioSet({ id: 1, ruleVersion: 'x', selectedType: null, createdAt: 'x', result: next });
    expect(set.result.scenarios[0].yearly[0].dependentReasons).toEqual(['INCOME_OVER']);
    expect(set.result.isaStrategy[0].extraCreditBase).toBe(3_000_000);
  });

  it('계좌 총액·수령한도·지방소득세를 파싱하고, 없는 이전 세트는 undefined로 둔다', () => {
    const legacy = parseScenarioSet({ id: 1, ruleVersion: 'x', selectedType: null, createdAt: 'x', result });
    const legacyItem = legacy.result.scenarios[0].planItems[0];
    expect(legacyItem.startBalance).toBeUndefined();
    expect(legacyItem.annuityLimit).toBeUndefined();
    expect(legacy.result.scenarios[0].summary.localIncomeTax).toBeUndefined();

    const next = structuredClone(result);
    Object.assign(next.scenarios[0].planItems[0], {
      localIncomeTax: 0,
      startBalance: 300_000_000,
      annuityLimit: {
        baseYear: 2026,
        legacy: false,
        years: [{ year: 2026, receiptYear: 1, openingBalance: 300_000_000, limit: 36_000_000, planned: 0 }],
        exceededYears: [],
      },
    });
    Object.assign(next.scenarios[1].planItems[0], { startBalance: null, annuityLimit: null });
    Object.assign(next.scenarios[0].summary, { localIncomeTax: 1 });
    const set = parseScenarioSet({ id: 1, ruleVersion: 'x', selectedType: null, createdAt: 'x', result: next });
    expect(set.result.scenarios[0].planItems[0].annuityLimit?.years[0]?.limit).toBe(36_000_000);
    expect(set.result.scenarios[1].planItems[0].annuityLimit).toBeNull();
    expect(set.result.scenarios[0].summary.localIncomeTax).toBe(1);
  });

  it('피부양자 상태가 3단계 밖이면 거부한다 (AC-09)', () => {
    const broken = structuredClone(result);
    (broken.scenarios[0].yearly[0] as { dependentStatus: string }).dependentStatus = 'OK';
    expect(() =>
      parseScenarioSet({ id: 1, ruleVersion: 'x', selectedType: null, createdAt: 'x', result: broken }),
    ).toThrow();
  });
});

describe('parseScenarioPlan', () => {
  it('월별 배열이 포함된 실행안을 파싱한다', () => {
    const plan = parseScenarioPlan({
      setId: 1,
      ruleVersion: 'KR-2026.10',
      selectedType: 'D',
      createdAt: '2026-10-05T00:00:00.000Z',
      basisDates: result.basisDates,
      startYm: result.startYm,
      endYm: result.endYm,
      recommendedType: 'D',
      accountChecks: [],
      disclaimers: [],
      scenario: {
        ...scenario('D'),
        monthly: { ym: ['2026-11'], gross: [1], tax: [0], shortfall: [0], balance: [1] },
      },
    });
    expect(plan.scenario.monthly.ym).toEqual(['2026-11']);
  });
});

describe('isScenarioType', () => {
  it('A~D만 허용한다', () => {
    expect(isScenarioType('D')).toBe(true);
    expect(isScenarioType('E')).toBe(false);
    expect(isScenarioType(undefined)).toBe(false);
  });
});

describe('parseAccountAssets', () => {
  it('계좌 목록을 파싱하고 잘못된 유형은 거부한다', () => {
    const base = {
      id: 1,
      userId: 1,
      accountType: 'CASH',
      accountName: null,
      institution: null,
      balance: 1,
      principalTaxCredited: 0,
      principalNonDeductible: 0,
      investmentGain: 0,
      deferredRetirementIncome: 0,
      irpSource: null,
      pensionSavingsLegacy: null,
      isaMaturityYm: null,
      verifiedAt: null,
      createdAt: 'x',
      updatedAt: 'x',
    };
    expect(parseAccountAssets([base])).toHaveLength(1);
    expect(() => parseAccountAssets([{ ...base, accountType: 'SAVINGS' }])).toThrow();
  });
});
