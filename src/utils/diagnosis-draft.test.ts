/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearDiagnosisDraft,
  persistDiagnosisState,
  readDiagnosisDraft,
  resolveDraftFields,
  writeDiagnosisDraft,
} from "./diagnosis-draft";
import { clearClientRetirementSession } from "./pension-draft";
import type { DiagnosisState } from "../domain/plan";

const sampleDraft = {
  diagnosisType: "individual" as const,
  householdSize: 2,
  birthYear: 1965,
  retirementAge: 60,
  incomeStatus: "employed" as const,
  pension: {
    national: 1_200_000,
    retirement: 0,
    personal: 0,
    housing: 0,
  },
  livingExpense: {
    desiredMonthly: 2_500_000,
    guideMinimum: 0,
    guideRecommended: 0,
  },
  medicalExpense: { healthInsurance: 150_000, privateInsurance: 0 },
};

describe("diagnosis-draft", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("write 후 read로 출생연도 등 요약을 복원한다", () => {
    writeDiagnosisDraft(sampleDraft);
    expect(readDiagnosisDraft()).toEqual(sampleDraft);
  });

  it("persistDiagnosisState는 projection 없이 초안을 남긴다", () => {
    const state = {
      ...sampleDraft,
      projection: {
        totalIncome: 1,
        totalExpense: 1,
        gap: 0,
        incomeItems: [],
        expenseItems: [],
        causeAnalysis: [],
        simulations: [],
      },
    } satisfies DiagnosisState;
    persistDiagnosisState(state);
    expect(readDiagnosisDraft()?.birthYear).toBe(1965);
    expect(readDiagnosisDraft()?.livingExpense.desiredMonthly).toBe(2_500_000);
  });

  it("resolveDraftFields는 저장된 초안을 반환한다", () => {
    writeDiagnosisDraft(sampleDraft);
    expect(resolveDraftFields()?.birthYear).toBe(1965);
  });

  it("clearDiagnosisDraft 후 read는 null이다", () => {
    writeDiagnosisDraft(sampleDraft);
    clearDiagnosisDraft();
    expect(readDiagnosisDraft()).toBeNull();
  });

  it("clearClientRetirementSession이 진단 초안도 지운다", () => {
    writeDiagnosisDraft(sampleDraft);
    clearClientRetirementSession();
    expect(readDiagnosisDraft()).toBeNull();
  });
});
