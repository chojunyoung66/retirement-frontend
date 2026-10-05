import { describe, it, expect } from 'vitest';
import { validateSecondaryIncome } from './secondary-income';

const MIN_AGE = 60;
const MAX_AGE = 89;
const check = (startAge: string, endAge: string, monthlyAmount: string) =>
  validateSecondaryIncome({ startAge, endAge, monthlyAmount }, MIN_AGE, MAX_AGE);

describe('validateSecondaryIncome', () => {
  it('유효한 구간은 원 단위 월 수입으로 반영', () => {
    expect(check('61', '65', '150')).toEqual({
      income: { startAge: 61, endAge: 65, monthlyAmount: 1_500_000 },
      message: null,
    });
  });

  it('막 추가한 빈 행은 안내 없이 제외', () => {
    expect(check('', '', '')).toEqual({ income: null, message: null });
  });

  it('일부만 입력하면 입력 안내', () => {
    const result = check('61', '', '150');
    expect(result.income).toBeNull();
    expect(result.message).toContain('모두 입력');
  });

  it('월 수입 0은 입력 안내', () => {
    expect(check('61', '65', '0').message).toContain('모두 입력');
  });

  it('종료 나이가 시작보다 작으면 안내', () => {
    const result = check('70', '65', '100');
    expect(result.income).toBeNull();
    expect(result.message).toContain('종료 나이는 시작 나이 이상');
  });

  it('계산 기간보다 앞서 끝나면 기간 안내', () => {
    const result = check('50', '55', '100');
    expect(result.income).toBeNull();
    expect(result.message).toContain(`${MIN_AGE}~${MAX_AGE}세`);
  });

  it('계산 기간 이후에 시작하면 기간 안내', () => {
    expect(check('95', '99', '100').message).toContain('겹치지 않아');
  });

  it('계산 기간과 일부만 겹쳐도 반영', () => {
    expect(check('55', '62', '100').income).not.toBeNull();
  });
});
