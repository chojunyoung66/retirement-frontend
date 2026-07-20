import { describe, it, expect } from 'vitest';
import {
  calculateProjection,
  calculateLongTermProjection,
} from './retirement-service';
import type { DiagnosisState } from '../domain/plan';

function makeState(overrides: Partial<DiagnosisState> = {}): DiagnosisState {
  return {
    diagnosisType: 'individual',
    householdSize: 1,
    birthYear: null,
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
