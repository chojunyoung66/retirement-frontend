import { describe, expect, it } from 'vitest';
import { isValidRetirementGoalInput } from './retirement-goal-validation';

describe('isValidRetirementGoalInput', () => {
  const validFullInput = {
    birthYear: 1970,
    retirementYear: 2030,
    monthlyLivingExpense: 2500000,
    nationalPension: 900000,
    retirementAsset: 300000000,
  };

  it('필수 필드가 모두 숫자이면 true를 반환한다 (전체 입력, POST)', () => {
    expect(isValidRetirementGoalInput(validFullInput, { partial: false })).toBe(true);
  });

  it('필수 필드 중 하나라도 없으면 false를 반환한다 (전체 입력, POST)', () => {
    const rest: Record<string, unknown> = { ...validFullInput };
    delete rest.birthYear;
    expect(isValidRetirementGoalInput(rest, { partial: false })).toBe(false);
  });

  it('필드 값이 숫자가 아니면 false를 반환한다', () => {
    expect(
      isValidRetirementGoalInput({ ...validFullInput, birthYear: '1970' }, { partial: false })
    ).toBe(false);
  });

  it('부분 입력(PATCH)에서는 제공된 필드만 검사하며 숫자면 true를 반환한다', () => {
    expect(isValidRetirementGoalInput({ retirementAsset: 400000000 }, { partial: true })).toBe(
      true
    );
  });

  it('부분 입력(PATCH)에서 제공된 필드가 숫자가 아니면 false를 반환한다', () => {
    expect(
      isValidRetirementGoalInput({ retirementAsset: '400000000' }, { partial: true })
    ).toBe(false);
  });

  it('부분 입력(PATCH)에서 알 수 없는 필드는 무시하고 나머지만 검사한다', () => {
    expect(
      isValidRetirementGoalInput({ retirementAsset: 400000000, foo: 'bar' }, { partial: true })
    ).toBe(true);
  });

  it('입력값이 객체가 아니면 false를 반환한다', () => {
    expect(isValidRetirementGoalInput(null, { partial: false })).toBe(false);
    expect(isValidRetirementGoalInput('string', { partial: true })).toBe(false);
  });
});
