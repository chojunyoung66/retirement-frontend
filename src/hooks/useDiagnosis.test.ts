/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";
import type { DiagnosisRecord } from "../api/diagnosis-api";
import type { DiagnosisState } from "../domain/plan";
import { diagnosisReducer, isSessionEnded } from "./useDiagnosis";
import { readDiagnosisDraft } from "../utils/diagnosis-draft";
import { writePensionDraft } from "../utils/pension-draft";

const initialState: DiagnosisState = {
  diagnosisType: "individual",
  householdSize: 2,
  birthYear: null,
  retirementAge: null,
  incomeStatus: "",
  pension: { national: 0, retirement: 0, personal: 0, housing: 0 },
  spouse: null,
  livingExpense: { desiredMonthly: 0, guideMinimum: 0, guideRecommended: 0 },
  medicalExpense: { healthInsurance: 0, privateInsurance: 0 },
  projection: null,
};

// 서버는 연금 금액을 0으로만 저장한다
const savedRecord: DiagnosisRecord = {
  id: 1,
  userId: 10,
  householdType: "couple",
  householdSize: 2,
  birthYear: 1970,
  retirementYear: 2032,
  retirementMonth: null,
  spouseBirthYear: 1972,
  spouseRetirementYear: 2035,
  nationalPension: 0,
  retirementPension: 0,
  personalPension: 0,
  housingPension: 0,
  monthlyExpense: 2_500_000,
  healthInsurance: 150_000,
  privateInsurance: 200_000,
  updatedAt: "2026-07-29T00:00:00.000Z",
};

const load = (state: DiagnosisState, rec = savedRecord) =>
  diagnosisReducer(state, { type: "LOAD_FROM_SERVER", payload: rec });

describe("diagnosisReducer LOAD_FROM_SERVER", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("가구·연령·지출 정보를 state에 반영한다", () => {
    const result = load(initialState);
    expect(result.diagnosisType).toBe("couple");
    expect(result.birthYear).toBe(1970);
    expect(result.retirementAge).toBe(62);
    expect(result.spouse?.birthYear).toBe(1972);
    expect(result.spouse?.retirementAge).toBe(63);
    expect(result.livingExpense.desiredMonthly).toBe(2_500_000);
    expect(result.medicalExpense).toEqual({
      healthInsurance: 150_000,
      privateInsurance: 200_000,
    });
    expect(result.projection).not.toBeNull();
  });

  it("세션 초안이 없으면 연금 재입력 플래그를 켜고 초안에도 남긴다", () => {
    const result = load(initialState);
    expect(result.needsPensionReinput).toBe(true);
    expect(readDiagnosisDraft()?.needsPensionReinput).toBe(true);
  });

  it("가이드 생활비를 가구 정보로 다시 채운다", () => {
    const result = load(initialState);
    expect(result.livingExpense.guideRecommended).toBe(2_800_000);
    expect(result.livingExpense.guideMinimum).toBe(2_000_000);
  });

  it("세션 연금 초안이 있으면 유지하고 플래그를 켜지 않는다", () => {
    writePensionDraft({
      national: 1_200_000,
      retirement: 500_000,
      personal: 0,
      housing: 0,
    });
    const result = load(initialState);
    expect(result.pension.national).toBe(1_200_000);
    expect(result.pension.retirement).toBe(500_000);
    expect(result.needsPensionReinput).toBe(false);
  });

  it("배우자 연금만 메모리에 있어도 플래그를 켜지 않는다", () => {
    const withSpouse: DiagnosisState = {
      ...initialState,
      diagnosisType: "couple",
      spouse: {
        birthYear: 1972,
        retirementAge: 63,
        incomeStatus: "",
        pension: { national: 900_000, retirement: 0, personal: 0, housing: 0 },
      },
    };
    expect(load(withSpouse).needsPensionReinput).toBe(false);
  });

  it("개인 가구로 불러오면 배우자 정보를 비운다", () => {
    const result = load(initialState, {
      ...savedRecord,
      householdType: "individual",
    });
    expect(result.spouse).toBeNull();
  });
});

describe("diagnosisReducer 연금 재입력 해제", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("연금을 다시 입력하면 플래그가 꺼진다", () => {
    const flagged = load(initialState);
    const next = diagnosisReducer(flagged, {
      type: "UPDATE",
      payload: {
        pension: { national: 1_000_000, retirement: 0, personal: 0, housing: 0 },
      },
    });
    expect(next.needsPensionReinput).toBe(false);
  });

  it("연금 외 항목만 바꾸면 플래그가 유지된다", () => {
    const flagged = load(initialState);
    const next = diagnosisReducer(flagged, {
      type: "UPDATE",
      payload: { householdSize: 3 },
    });
    expect(next.needsPensionReinput).toBe(true);
  });

  it("RESET은 플래그와 초안을 모두 지운다", () => {
    const flagged = load(initialState);
    const next = diagnosisReducer(flagged, { type: "RESET" });
    expect(next.needsPensionReinput).toBeUndefined();
    expect(readDiagnosisDraft()).toBeNull();
  });
});

describe("isSessionEnded", () => {
  it("로그인 상태에서 비로그인으로 바뀔 때만 true", () => {
    expect(isSessionEnded("authenticated", "unauthenticated")).toBe(true);
    expect(isSessionEnded("checking", "unauthenticated")).toBe(false);
    expect(isSessionEnded("unauthenticated", "authenticated")).toBe(false);
    expect(isSessionEnded("authenticated", "authenticated")).toBe(false);
  });
});
