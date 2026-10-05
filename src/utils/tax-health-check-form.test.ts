import { describe, expect, it } from 'vitest';
import {
  EMPTY_TAX_HEALTH_FORM,
  buildTaxHealthCheckRequest,
  comparePremium,
  parseAmount,
} from './tax-health-check-form';

describe('parseAmount', () => {
  it('만원 입력을 원으로 바꾸고 빈 값은 null이다', () => {
    expect(parseAmount('1,200', 'wan')).toBe(12_000_000);
    expect(parseAmount('', 'wan')).toBeNull();
    expect(parseAmount('-1', 'wan')).toBeUndefined();
    expect(parseAmount('abc', 'won')).toBeUndefined();
    expect(parseAmount('185000', 'won')).toBe(185_000);
  });
});

describe('comparePremium', () => {
  it('10% 이내는 비슷, 그 밖은 높음/낮음, 미입력은 추정만', () => {
    expect(comparePremium(200_000, null)).toBe('ESTIMATE_ONLY');
    expect(comparePremium(200_000, 215_000)).toBe('SIMILAR');
    expect(comparePremium(200_000, 230_000)).toBe('ACTUAL_HIGHER');
    expect(comparePremium(200_000, 150_000)).toBe('ACTUAL_LOWER');
  });
});

describe('buildTaxHealthCheckRequest', () => {
  it('비운 재산·실제 보험료는 미입력(null)으로 보낸다', () => {
    const result = buildTaxHealthCheckRequest({ ...EMPTY_TAX_HEALTH_FORM, publicPensionWan: '1440' }, false);
    expect(result).toEqual({
      ok: true,
      request: {
        publicPensionAnnual: 14_400_000,
        laborIncome: 0,
        businessIncome: 0,
        financialIncome: 0,
        otherIncome: 0,
        propertyValue: null,
        carValue: 0,
        actualMonthlyPremium: null,
        spouseAnnualIncome: null,
      },
    });
  });

  it('배우자가 있으면 배우자 소득을 0 이상으로 보낸다', () => {
    const result = buildTaxHealthCheckRequest(EMPTY_TAX_HEALTH_FORM, true);
    expect(result.ok && result.request.spouseAnnualIncome).toBe(0);
  });

  it('잘못된 입력은 해당 필드를 알려준다', () => {
    expect(buildTaxHealthCheckRequest({ ...EMPTY_TAX_HEALTH_FORM, financialWan: 'x' }, false)).toEqual({
      ok: false,
      field: 'financialWan',
    });
  });
});
