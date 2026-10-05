import { describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({
  default: { post: vi.fn() },
  ApiError: class ApiError extends Error {},
}));

import { parseTaxHealthCheckResult } from './tax-health-check-api';

const valid = {
  dependent: {
    status: 'CAUTION',
    statusLabel: '주의',
    reasons: [{ code: 'INCOME_NEAR', label: '연 소득이 2,000만원 기준에 가까워요' }],
    likelyFails: false,
  },
  premium: {
    estimatedMonthly: 180_000,
    incomePremium: 90_000,
    propertyPremium: 70_000,
    carPremium: 0,
    longTermCarePremium: 20_000,
    actualMonthly: 200_000,
    differenceMonthly: 20_000,
    comparison: 'ACTUAL_HIGHER',
  },
  financialIncome: { amount: 5_000_000, countedInFull: false },
  checklist: ['공단에 피부양자 자격 확인'],
  basisDate: { domain: '건강보험', effectiveDate: '2026-01-01', source: '보건복지부 고시' },
  ruleVersion: 'KR-2026.10',
  notices: ['추정치입니다'],
};

describe('parseTaxHealthCheckResult', () => {
  it('정상 응답을 파싱한다', () => {
    const result = parseTaxHealthCheckResult(valid);
    expect(result.dependent.reasons[0]?.code).toBe('INCOME_NEAR');
    expect(result.premium.comparison).toBe('ACTUAL_HIGHER');
  });

  it('알 수 없는 상태 값은 거부한다', () => {
    expect(() =>
      parseTaxHealthCheckResult({ ...valid, dependent: { ...valid.dependent, status: 'OK' } }),
    ).toThrow('유효하지 않은 응답 형식입니다');
  });
});
