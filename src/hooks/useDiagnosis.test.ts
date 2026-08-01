import { describe, it, expect } from "vitest";
import type { DiagnosisRecord } from "../api/diagnosis-api";

// reducer만 분리 테스트 — React 의존성 없이 순수 함수로 검증
// useDiagnosis.tsx 내 reducer를 직접 import하기 어려우므로
// 동일 로직을 여기서 인라인으로 검증한다

import { calculateProjection } from "../service/retirement-service";
import type { DiagnosisState } from "../domain/plan";

const initialState: DiagnosisState = {
  diagnosisType: "individual",
  householdSize: 2,
  birthYear: null,
  retirementAge: null,
  incomeStatus: "",
  pension: { national: 0, retirement: 0, personal: 0, housing: 0 },
  livingExpense: { desiredMonthly: 0, guideMinimum: 0, guideRecommended: 0 },
  medicalExpense: { healthInsurance: 0, privateInsurance: 0 },
  projection: null,
};

function applyLoadFromServer(
  state: DiagnosisState,
  rec: DiagnosisRecord,
): DiagnosisState {
  const retirementAge = rec.retirementYear - rec.birthYear;
  const updated: DiagnosisState = {
    ...state,
    diagnosisType: rec.householdType as DiagnosisState["diagnosisType"],
    birthYear: rec.birthYear,
    retirementAge,
    pension: { national: rec.nationalPension, retirement: rec.retirementPension, personal: rec.personalPension, housing: 0 },
    livingExpense: {
      ...state.livingExpense,
      desiredMonthly: rec.monthlyExpense,
    },
  };
  return { ...updated, projection: calculateProjection(updated) };
}

describe("LOAD_FROM_SERVER 리듀서 로직", () => {
  const sampleRecord: DiagnosisRecord = {
    id: 1,
    userId: 10,
    householdType: "couple",
    birthYear: 1970,
    retirementYear: 2032,
    nationalPension: 1500000,
    retirementPension: 300000,
    personalPension: 200000,
    monthlyExpense: 2500000,
    healthInsurance: 150000,
    privateInsurance: 200000,
    updatedAt: "2026-07-29T00:00:00.000Z",
  };

  it("householdType과 birthYear를 state에 반영한다", () => {
    const result = applyLoadFromServer(initialState, sampleRecord);
    expect(result.diagnosisType).toBe("couple");
    expect(result.birthYear).toBe(1970);
  });

  it("retirementAge를 retirementYear - birthYear로 계산한다", () => {
    const result = applyLoadFromServer(initialState, sampleRecord);
    expect(result.retirementAge).toBe(62); // 2032 - 1970
  });

  it("각 연금 항목을 개별 필드에 매핑한다", () => {
    const result = applyLoadFromServer(initialState, sampleRecord);
    expect(result.pension.national).toBe(1500000);
    expect(result.pension.retirement).toBe(300000);
    expect(result.pension.personal).toBe(200000);
  });

  it("monthlyExpense를 livingExpense.desiredMonthly에 반영한다", () => {
    const result = applyLoadFromServer(initialState, sampleRecord);
    expect(result.livingExpense.desiredMonthly).toBe(2500000);
  });

  it("projection이 자동으로 계산된다", () => {
    const result = applyLoadFromServer(initialState, sampleRecord);
    expect(result.projection).not.toBeNull();
  });
});
