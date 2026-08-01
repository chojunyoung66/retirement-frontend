import { describe, expect, it } from 'vitest';
import {
  calculateHousingPension,
  interpolateLifetimeFlatPayout,
  TABLE_VERSION,
} from './housing-pension-service';

describe('interpolateLifetimeFlatPayout (일반주택 종신·정액)', () => {
  it('격자점 60세·4억은 HF 표와 동일하다 (842천원)', () => {
    expect(interpolateLifetimeFlatPayout(60, 400_000_000)).toBe(842_000);
  });

  it('격자점 70세·3억은 HF 표와 동일하다 (923천원)', () => {
    expect(interpolateLifetimeFlatPayout(70, 300_000_000)).toBe(923_000);
  });

  it('격자점 55세·1억은 HF 표와 동일하다 (156천원)', () => {
    expect(interpolateLifetimeFlatPayout(55, 100_000_000)).toBe(156_000);
  });

  it('연령·가격 중간값은 양방향 선형 보간한다 (스냅샷)', () => {
    // 57.5세·3.5억: 연령 55↔60, 가격 3억↔4억 보간
    const mid = interpolateLifetimeFlatPayout(57.5, 350_000_000);
    expect(mid).toBe(641_500);
  });

  it('시세 12억 초과분은 12억 한도로 산정한다', () => {
    expect(interpolateLifetimeFlatPayout(65, 1_500_000_000)).toBe(
      interpolateLifetimeFlatPayout(65, 1_200_000_000),
    );
  });

  it('80세 초과는 80세 행을 사용한다', () => {
    expect(interpolateLifetimeFlatPayout(85, 400_000_000)).toBe(
      interpolateLifetimeFlatPayout(80, 400_000_000),
    );
  });
});

describe('calculateHousingPension', () => {
  it('해피패스: 60세·4억·일반·종신정액 월지급금과 비용을 반환한다', () => {
    const result = calculateHousingPension({
      youngerSpouseAge: 60,
      housePrice: 400_000_000,
      productType: 'GENERAL',
      payoutMode: 'LIFETIME',
      payoutStyle: 'FLAT',
      isBasicPensionRecipient: false,
      isSingleHomeUnder250m: false,
    });

    expect(result.eligible).toBe(true);
    expect(result.monthlyPayout).toBe(842_000);
    expect(result.annualPayout).toBe(842_000 * 12);
    expect(result.initialGuaranteeFee).toBe(4_000_000); // 1.0%
    expect(result.annualGuaranteeFeeRate).toBe(0.0095);
    expect(result.tableVersion).toBe(TABLE_VERSION);
    expect(result.ineligibilityReasons).toEqual([]);
  });

  it('55세 미만이면 자격이 없고 사유를 반환한다', () => {
    const result = calculateHousingPension({
      youngerSpouseAge: 54,
      housePrice: 400_000_000,
      productType: 'GENERAL',
      payoutMode: 'LIFETIME',
      payoutStyle: 'FLAT',
      isBasicPensionRecipient: false,
      isSingleHomeUnder250m: false,
    });

    expect(result.eligible).toBe(false);
    expect(result.monthlyPayout).toBe(0);
    expect(result.ineligibilityReasons).toContain('MIN_AGE');
  });

  it('우대형(시가 1.8억 미만)은 일반형 대비 25% 가산한다', () => {
    const general = calculateHousingPension({
      youngerSpouseAge: 70,
      housePrice: 130_000_000,
      productType: 'GENERAL',
      payoutMode: 'LIFETIME',
      payoutStyle: 'FLAT',
      isBasicPensionRecipient: true,
      isSingleHomeUnder250m: true,
    });
    const preferential = calculateHousingPension({
      youngerSpouseAge: 70,
      housePrice: 130_000_000,
      productType: 'PREFERENTIAL',
      payoutMode: 'LIFETIME',
      payoutStyle: 'FLAT',
      isBasicPensionRecipient: true,
      isSingleHomeUnder250m: true,
    });

    expect(preferential.monthlyPayout).toBe(Math.round(general.monthlyPayout * 1.25));
  });

  it('상환용은 기존 주담대만큼 유효 시세를 줄여 월액을 재산정한다', () => {
    const full = calculateHousingPension({
      youngerSpouseAge: 65,
      housePrice: 400_000_000,
      productType: 'GENERAL',
      payoutMode: 'LIFETIME',
      payoutStyle: 'FLAT',
      isBasicPensionRecipient: false,
      isSingleHomeUnder250m: false,
    });
    const repay = calculateHousingPension({
      youngerSpouseAge: 65,
      housePrice: 400_000_000,
      productType: 'LOAN_REPAY',
      payoutMode: 'LIFETIME',
      payoutStyle: 'FLAT',
      isBasicPensionRecipient: false,
      isSingleHomeUnder250m: false,
      existingMortgageBalance: 100_000_000,
    });

    expect(repay.eligible).toBe(true);
    expect(repay.lumpSumWithdrawal).toBe(100_000_000);
    expect(repay.monthlyPayout).toBeLessThan(full.monthlyPayout);
    expect(repay.monthlyPayout).toBe(
      interpolateLifetimeFlatPayout(65, 300_000_000),
    );
  });
});
