import type {
  DiagnosisState,
  DiagnosisType,
  IncomeStatus,
  LivingExpenseState,
  MedicalExpenseState,
  PensionState,
} from "../domain/plan";
import { mergePensionPreferPositive, readPensionDraft, writePensionDraft } from "./pension-draft";

const STORAGE_KEY = "retirement_diagnosis_draft";

export type DiagnosisDraft = {
  diagnosisType: DiagnosisType;
  householdSize: number;
  birthYear: number | null;
  retirementAge: number | null;
  incomeStatus: IncomeStatus;
  pension: PensionState;
  livingExpense: LivingExpenseState;
  medicalExpense: MedicalExpenseState;
};

function isDiagnosisType(value: unknown): value is DiagnosisType {
  return value === "individual" || value === "couple";
}

function isIncomeStatus(value: unknown): value is IncomeStatus {
  return (
    value === "" ||
    value === "employed" ||
    value === "self-employed" ||
    value === "retired"
  );
}

function isPension(value: unknown): value is PensionState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.national === "number" &&
    typeof v.retirement === "number" &&
    typeof v.personal === "number" &&
    typeof v.housing === "number"
  );
}

function isLiving(value: unknown): value is LivingExpenseState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.desiredMonthly === "number" &&
    typeof v.guideMinimum === "number" &&
    typeof v.guideRecommended === "number"
  );
}

function isMedical(value: unknown): value is MedicalExpenseState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.healthInsurance === "number" &&
    typeof v.privateInsurance === "number"
  );
}

function isDiagnosisDraft(value: unknown): value is DiagnosisDraft {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    isDiagnosisType(v.diagnosisType) &&
    typeof v.householdSize === "number" &&
    (v.birthYear === null || typeof v.birthYear === "number") &&
    (v.retirementAge === null || typeof v.retirementAge === "number") &&
    isIncomeStatus(v.incomeStatus) &&
    isPension(v.pension) &&
    isLiving(v.livingExpense) &&
    isMedical(v.medicalExpense)
  );
}

/** 로그인 리다이렉트·리로드 후에도 저장 가능한 진단 요약 유지 */
export function readDiagnosisDraft(): DiagnosisDraft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isDiagnosisDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeDiagnosisDraft(draft: DiagnosisDraft): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    // 연금 초안 키도 함께 맞춰 Cashflow 화면과 공유
    writePensionDraft(draft.pension);
  } catch {
    // quota/private mode — 무시
  }
}

export function clearDiagnosisDraft(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** 메모리 상태에서 초안 추출·저장 (projection 제외) */
export function persistDiagnosisState(state: DiagnosisState): void {
  writeDiagnosisDraft({
    diagnosisType: state.diagnosisType,
    householdSize: state.householdSize,
    birthYear: state.birthYear,
    retirementAge: state.retirementAge,
    incomeStatus: state.incomeStatus,
    pension: state.pension,
    livingExpense: state.livingExpense,
    medicalExpense: state.medicalExpense,
  });
}

/** 세션 초안 + 연금 초안을 병합해 초기 DiagnosisState 필드 구성 */
export function resolveDraftFields(): DiagnosisDraft | null {
  const draft = readDiagnosisDraft();
  const pensionOnly = readPensionDraft();
  if (!draft && !pensionOnly) return null;

  if (!draft) {
    return {
      diagnosisType: "individual",
      householdSize: 2,
      birthYear: null,
      retirementAge: null,
      incomeStatus: "",
      pension: pensionOnly!,
      livingExpense: { desiredMonthly: 0, guideMinimum: 0, guideRecommended: 0 },
      medicalExpense: { healthInsurance: 0, privateInsurance: 0 },
    };
  }

  return {
    ...draft,
    pension: mergePensionPreferPositive(draft.pension, pensionOnly),
  };
}
