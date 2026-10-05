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
