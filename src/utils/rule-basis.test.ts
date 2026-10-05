import { describe, expect, it } from 'vitest';
import { formatRuleBasis, readRuleBasis } from './rule-basis';

describe('readRuleBasis', () => {
  it('기준일·제도버전이 있으면 읽고 문구로 만든다', () => {
    const basis = readRuleBasis({
      estimatedMonthlyPremium: 1,
      basisDate: { domain: '건강보험', effectiveDate: '2026-01-01', source: '공단 안내' },
      ruleVersion: 'KR-2026.10',
    });
    expect(basis).toEqual({
      domain: '건강보험',
      effectiveDate: '2026-01-01',
      source: '공단 안내',
      ruleVersion: 'KR-2026.10',
    });
    expect(formatRuleBasis(basis!)).toBe('건강보험 기준일 2026-01-01 · 규칙 KR-2026.10 (공단 안내)');
  });

  it('이전에 저장된 결과처럼 기준일이 없으면 null', () => {
    expect(readRuleBasis({ estimatedMonthlyPremium: 1 })).toBeNull();
    expect(readRuleBasis(undefined)).toBeNull();
    expect(readRuleBasis({ basisDate: { effectiveDate: 1 } })).toBeNull();
  });
});
