import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearPensionDraft,
  mergePensionPreferPositive,
  readPensionDraft,
  writePensionDraft,
} from './pension-draft';

describe('pension-draft', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('write 후 read로 동일 객체를 복원한다', () => {
    const pension = {
      national: 1_200_000,
      retirement: 500_000,
      personal: 300_000,
      housing: 0,
    };
    writePensionDraft(pension);
    expect(readPensionDraft()).toEqual(pension);
  });

  it('clear 후 read는 null이다', () => {
    writePensionDraft({
      national: 1,
      retirement: 0,
      personal: 0,
      housing: 0,
    });
    clearPensionDraft();
    expect(readPensionDraft()).toBeNull();
  });

  it('mergePensionPreferPositive는 primary 양수를 우선한다', () => {
    const merged = mergePensionPreferPositive(
      { national: 0, retirement: 200_000, personal: 0, housing: 800_000 },
      {
        national: 1_200_000,
        retirement: 100_000,
        personal: 300_000,
        housing: 0,
      },
    );
    expect(merged).toEqual({
      national: 1_200_000,
      retirement: 200_000,
      personal: 300_000,
      housing: 800_000,
    });
  });
});
