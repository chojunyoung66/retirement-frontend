import { describe, it, expect } from 'vitest';
import {
  calculateProjection,
  calculateLongTermProjection,
  generateRecommendations,
  type UnemploymentBenefitOption,
} from './retirement-service';
import type { DiagnosisState } from '../domain/plan';

function makeState(overrides: Partial<DiagnosisState> = {}): DiagnosisState {
  return {
    diagnosisType: 'individual',
    householdSize: 1,
    birthYear: null,
    retirementAge: null,
    incomeStatus: 'retired',
    pension: { national: 1000000, retirement: 500000, personal: 200000 },
    livingExpense: { desiredMonthly: 2000000, guideMinimum: 1200000, guideRecommended: 1800000 },
    medicalExpense: { healthInsurance: 150000, privateInsurance: 50000 },
    projection: null,
    ...overrides,
  };
}

// ─── getPensionStartAge (calculateLongTermProjection을 통해 간접 검증) ─────────

describe('국민연금 개시 연령', () => {
  it('1969년 이후 출생자는 만 65세 개시', () => {
    const rows = calculateLongTermProjection(makeState({ birthYear: 1969 }));
    expect(rows[0].nationalPensionStarted).toBe(false);  // 60세
    expect(rows[4].nationalPensionStarted).toBe(false);  // 64세
    expect(rows[5].nationalPensionStarted).toBe(true);   // 65세
  });

  it('1965–1968년 출생자는 만 64세 개시', () => {
    const rows = calculateLongTermProjection(makeState({ birthYear: 1965 }));
    expect(rows[3].nationalPensionStarted).toBe(false);  // 63세
    expect(rows[4].nationalPensionStarted).toBe(true);   // 64세
  });

  it('1952년 이전 출생자는 만 60세부터 개시', () => {
    const rows = calculateLongTermProjection(makeState({ birthYear: 1950 }));
    expect(rows[0].nationalPensionStarted).toBe(true);   // 60세
  });

  it('birthYear null이면 65세(기본값) 적용', () => {
    const rows = calculateLongTermProjection(makeState({ birthYear: null }));
    expect(rows[4].nationalPensionStarted).toBe(false);  // 64세
    expect(rows[5].nationalPensionStarted).toBe(true);   // 65세
  });
});

// ─── calculateProjection — 개시 연령 이전엔 국민연금 제외 ────────────────────

describe('calculateProjection — 국민연금 개시 연령 적용', () => {
  it('1969년 이후 출생자: 퇴직 시점(60세) 수입에 국민연금 미포함', () => {
    const state = makeState({ birthYear: 1969 });
    const result = calculateProjection(state);

    const hasNational = result.incomeItems.some((i) => i.label === '국민연금');
    expect(hasNational).toBe(false);
    expect(result.totalIncome).toBe(
      state.pension.retirement + state.pension.personal,
    );
  });

  it('1952년 이전 출생자: 퇴직 시점(60세) 수입에 국민연금 포함', () => {
    const state = makeState({ birthYear: 1950 });
    const result = calculateProjection(state);

    const hasNational = result.incomeItems.some((i) => i.label === '국민연금');
    expect(hasNational).toBe(true);
    expect(result.totalIncome).toBe(
      state.pension.national + state.pension.retirement + state.pension.personal,
    );
  });
});

// ─── 결과 요약 ↔ 20년 표 1년차 일치 검증 ────────────────────────────────────

describe('calculateProjection ↔ calculateLongTermProjection 1년차 일치', () => {
  it('1969년 이후: 수입 일치', () => {
    const state = makeState({ birthYear: 1969 });
    const summary = calculateProjection(state);
    const table = calculateLongTermProjection(state);

    expect(summary.totalIncome).toBe(table[0].monthlyIncome);
  });

  it('1969년 이후: 지출 일치', () => {
    const state = makeState({ birthYear: 1969 });
    const summary = calculateProjection(state);
    const table = calculateLongTermProjection(state);

    expect(summary.totalExpense).toBe(table[0].monthlyExpense);
  });

  it('1969년 이후: 부족액(gap) 일치', () => {
    const state = makeState({ birthYear: 1969 });
    const summary = calculateProjection(state);
    const table = calculateLongTermProjection(state);

    expect(summary.gap).toBe(table[0].monthlyGap);
  });

  it('1952년 이전(60세 개시): 수입·부족액 일치', () => {
    const state = makeState({ birthYear: 1950 });
    const summary = calculateProjection(state);
    const table = calculateLongTermProjection(state);

    expect(summary.totalIncome).toBe(table[0].monthlyIncome);
    expect(summary.gap).toBe(table[0].monthlyGap);
  });
});

// ─── 65세 개시 시 성장 계수 — 연금 개시 시점부터 누적 성장 ─────────────────

describe('calculateLongTermProjection — 65세 개시 성장 계수', () => {
  it('65세(year 6)에 base 금액으로 시작', () => {
    const state = makeState({ birthYear: 1969 });
    const rows = calculateLongTermProjection(state, 20, 0.02, 0.02);

    // 개시 첫 해(i=5, age=65): baseNational * (1.02)^(5-5) = baseNational
    expect(rows[5].monthlyIncome).toBe(
      state.pension.national +
        Math.round((state.pension.retirement + state.pension.personal) * Math.pow(1.02, 5)),
    );
  });

  it('66세(year 7)에 1년 성장 반영', () => {
    const state = makeState({ birthYear: 1969 });
    const rows = calculateLongTermProjection(state, 20, 0.02, 0.02);

    const expectedNational = Math.round(state.pension.national * 1.02);
    const expectedOther = Math.round(
      (state.pension.retirement + state.pension.personal) * Math.pow(1.02, 6),
    );
    expect(rows[6].monthlyIncome).toBe(expectedNational + expectedOther);
  });
});

// ─── causeAnalysis — 생활비 초과분 기준 데이터 기반 가중치 ──────────────────

describe('calculateProjection — causeAnalysis 가중치', () => {
  it('희망 생활비가 권장 생활비 이하면 원인을 전부 연금 수입 부족으로 귀속', () => {
    const state = makeState({
      birthYear: 1969, // 퇴직 시점(60세) 국민연금 미개시 → 부족 발생
      pension: { national: 1000000, retirement: 0, personal: 100000 },
      livingExpense: { desiredMonthly: 1800000, guideMinimum: 1200000, guideRecommended: 1800000 },
      medicalExpense: { healthInsurance: 0, privateInsurance: 0 },
    });
    const result = calculateProjection(state);
    expect(result.gap).toBeLessThan(0);
    expect(result.causeAnalysis).toEqual([
      { cause: '연금 수입 부족', weight: 100 },
      { cause: '생활비 설정', weight: 0 },
    ]);
  });

  it('생활비 초과분이 부족액을 전부 설명하면 원인을 전부 생활비 설정으로 귀속', () => {
    const state = makeState({
      birthYear: 1950, // 퇴직 시점(60세) 국민연금 개시됨 → 소득은 충분
      pension: { national: 1000000, retirement: 500000, personal: 0 },
      livingExpense: { desiredMonthly: 1600000, guideMinimum: 1000000, guideRecommended: 1200000 },
      medicalExpense: { healthInsurance: 0, privateInsurance: 0 },
    });
    const result = calculateProjection(state);
    // totalIncome=1,500,000, totalExpense=1,600,000, gap=-100,000
    // 초과분 = desiredMonthly(1,600,000) - guideRecommended(1,200,000) = 400,000 ≥ 부족액(100,000)
    expect(result.gap).toBe(-100000);
    expect(result.causeAnalysis).toEqual([
      { cause: '연금 수입 부족', weight: 0 },
      { cause: '생활비 설정', weight: 100 },
    ]);
  });

  it('생활비 초과분이 부족액의 일부만 설명하면 비율대로 분배', () => {
    const state = makeState({
      birthYear: 1950,
      pension: { national: 1000000, retirement: 200000, personal: 0 },
      livingExpense: { desiredMonthly: 1500000, guideMinimum: 1000000, guideRecommended: 1300000 },
      medicalExpense: { healthInsurance: 0, privateInsurance: 0 },
    });
    const result = calculateProjection(state);
    // totalIncome=1,200,000, totalExpense=1,500,000, gap=-300,000
    // 초과분 = desiredMonthly(1,500,000) - guideRecommended(1,300,000) = 200,000
    // 200,000 / 300,000 ≈ 66.7% → 생활비 설정 67, 연금 수입 부족 33
    expect(result.gap).toBe(-300000);
    expect(result.causeAnalysis).toEqual([
      { cause: '연금 수입 부족', weight: 33 },
      { cause: '생활비 설정', weight: 67 },
    ]);
  });

  it('가중치 두 항목의 합은 항상 100', () => {
    const state = makeState({
      birthYear: 1969,
      pension: { national: 800000, retirement: 200000, personal: 0 },
      livingExpense: { desiredMonthly: 1700000, guideMinimum: 1200000, guideRecommended: 1500000 },
      medicalExpense: { healthInsurance: 100000, privateInsurance: 0 },
    });
    const result = calculateProjection(state);
    const total = result.causeAnalysis.reduce((sum, c) => sum + c.weight, 0);
    expect(total).toBe(100);
  });

  it('부족액이 없으면(gap>=0) causeAnalysis는 빈 배열', () => {
    const state = makeState({
      birthYear: 1950,
      pension: { national: 1000000, retirement: 1000000, personal: 0 },
      livingExpense: { desiredMonthly: 1000000, guideMinimum: 1000000, guideRecommended: 1000000 },
      medicalExpense: { healthInsurance: 0, privateInsurance: 0 },
    });
    const result = calculateProjection(state);
    expect(result.gap).toBeGreaterThanOrEqual(0);
    expect(result.causeAnalysis).toEqual([]);
  });
});

// ─── 정년(retirementAge) 하드코딩 제거 — 정년 65세 정책 대응 ────────────────

describe('retirementAge 파라미터화 — 정년 연장 정책 대응', () => {
  it('retirementAge를 지정하지 않으면 기존과 동일하게 60세로 계산(하위 호환)', () => {
    const state = makeState({ birthYear: 1950 }); // pensionStartAge=60
    const result = calculateProjection(state);
    expect(result.totalIncome).toBe(
      state.pension.national + state.pension.retirement + state.pension.personal,
    );
  });

  it('retirementAge=65로 지정하면 65세 개시자(1969년생)도 퇴직 시점에 국민연금 포함', () => {
    const state = makeState({ birthYear: 1969, retirementAge: 65 });
    const result = calculateProjection(state);
    const hasNational = result.incomeItems.some((i) => i.label === '국민연금');
    expect(hasNational).toBe(true);
    expect(result.totalIncome).toBe(
      state.pension.national + state.pension.retirement + state.pension.personal,
    );
  });

  it('retirementAge=65 지정 시 20년 표의 첫 행이 65세부터 시작', () => {
    const state = makeState({ birthYear: 1969, retirementAge: 65 });
    const rows = calculateLongTermProjection(state, 5);
    expect(rows[0].age).toBe(65);
    expect(rows[0].nationalPensionStarted).toBe(true);
  });
});

// ─── generateRecommendations — 국민연금 개시연령 반영 ───────────────────────

describe('generateRecommendations — 국민연금 개시연령 반영', () => {
  it('퇴직 시점에 국민연금이 미개시 상태면 연금 수입 관련 추천에서 제외', () => {
    // 1969년생(65세 개시) + 정년 60세 퇴직 → 퇴직 시점엔 국민연금 미개시
    const state = makeState({
      birthYear: 1969,
      pension: { national: 1000000, retirement: 0, personal: 0 },
    });
    const recs = generateRecommendations(state, -100000000);
    const pensionRec = recs.find((r) => r.label.includes('연금'));
    expect(pensionRec).toBeUndefined();
  });

  it('퇴직 시점에 국민연금이 개시된 상태면 연금 수입 관련 추천에 포함', () => {
    // 1950년생(60세 개시) + 정년 60세 퇴직 → 퇴직 시점에 국민연금 개시됨
    const state = makeState({
      birthYear: 1950,
      pension: { national: 1000000, retirement: 0, personal: 0 },
    });
    const recs = generateRecommendations(state, -100000000);
    const pensionRec = recs.find((r) => r.label.includes('연금'));
    expect(pensionRec).toBeDefined();
  });
});

// ─── 실업급여 반영 규칙 — 60세(year 1)에만, 월평균 환산 ──────────────────────

describe('calculateLongTermProjection — 실업급여', () => {
  const ub: UnemploymentBenefitOption = { monthlyAmount: 1980000, durationMonths: 9 };

  it('198만원 × 9개월 → 60세 월 수입에 1,485,000원 추가', () => {
    const state = makeState({ birthYear: 1969 });
    const rows = calculateLongTermProjection(state, 20, 0, 0, ub);
    // 월평균 = 1,980,000 * 9 / 12 = 1,485,000
    expect(rows[0].unemploymentBenefitIncome).toBe(1485000);
  });

  it('실업급여는 60세(rows[0])에만 반영', () => {
    const state = makeState({ birthYear: 1969 });
    const rows = calculateLongTermProjection(state, 20, 0, 0, ub);
    expect(rows[1].unemploymentBenefitIncome).toBeUndefined();
    expect(rows[2].unemploymentBenefitIncome).toBeUndefined();
  });

  it('실업급여 포함 시 monthlyIncome 차이가 ubIncome과 일치', () => {
    const state = makeState({ birthYear: 1969 });
    const withUb = calculateLongTermProjection(state, 20, 0, 0, ub);
    const withoutUb = calculateLongTermProjection(state, 20, 0, 0);
    expect(withUb[0].monthlyIncome - withoutUb[0].monthlyIncome).toBe(1485000);
    // 2년차 이후는 동일
    expect(withUb[1].monthlyIncome).toBe(withoutUb[1].monthlyIncome);
  });
});
