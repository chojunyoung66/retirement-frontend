import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type { DiagnosisState, PensionState } from "../domain/plan";
import type { DiagnosisRecord } from "../api/diagnosis-api";
import { calculateProjection } from "../service/retirement-service";
import {
  clearDiagnosisDraft,
  persistDiagnosisState,
  resolveDraftFields,
} from "../utils/diagnosis-draft";
import {
  clearPensionDraft,
  mergePensionPreferPositive,
  readPensionDraft,
  writePensionDraft,
} from "../utils/pension-draft";

const emptyPension = (): PensionState => ({
  national: 0,
  retirement: 0,
  personal: 0,
  housing: 0,
});

function createInitialState(): DiagnosisState {
  // 리로드·로그인 리다이렉트 후에도 진단 요약(출생연도 등) 복원
  const draft = resolveDraftFields();
  if (draft) {
    const base: DiagnosisState = {
      ...draft,
      projection: null,
    };
    // 저장에 필요한 핵심 입력이 있으면 결과도 다시 계산
    if (draft.birthYear != null) {
      return { ...base, projection: calculateProjection(base) };
    }
    return base;
  }

  const pensionDraft = readPensionDraft();
  return {
    diagnosisType: "individual",
    householdSize: 2,
    birthYear: null,
    retirementAge: null,
    incomeStatus: "",
    pension: pensionDraft ?? emptyPension(),
    livingExpense: { desiredMonthly: 0, guideMinimum: 0, guideRecommended: 0 },
    medicalExpense: { healthInsurance: 0, privateInsurance: 0 },
    projection: null,
  };
}

type Action =
  | { type: "UPDATE"; payload: Partial<DiagnosisState> }
  | { type: "CALCULATE" }
  | { type: "UPDATE_AND_CALCULATE"; payload: Partial<DiagnosisState> }
  | { type: "RESET" }
  | { type: "LOAD_FROM_SERVER"; payload: DiagnosisRecord }
  | { type: "HYDRATE_FROM_DRAFT" };

function persistPensionIfPresent(pension: PensionState | undefined) {
  if (pension) writePensionDraft(pension);
}

function reducer(state: DiagnosisState, action: Action): DiagnosisState {
  switch (action.type) {
    case "UPDATE": {
      const next = { ...state, ...action.payload };
      persistPensionIfPresent(action.payload.pension);
      persistDiagnosisState(next);
      return next;
    }
    case "CALCULATE": {
      const projection = calculateProjection(state);
      const next = { ...state, projection };
      persistDiagnosisState(next);
      return next;
    }
    case "UPDATE_AND_CALCULATE": {
      const updated = { ...state, ...action.payload };
      persistPensionIfPresent(action.payload.pension);
      const projection = calculateProjection(updated);
      const next = { ...updated, projection };
      persistDiagnosisState(next);
      return next;
    }
    case "RESET":
      clearPensionDraft();
      clearDiagnosisDraft();
      return createInitialState();
    case "HYDRATE_FROM_DRAFT": {
      // 저장 직전 메모리 유실 시 세션 초안으로 복구
      const draft = resolveDraftFields();
      if (!draft?.birthYear) return state;
      const updated: DiagnosisState = {
        ...state,
        ...draft,
        pension: mergePensionPreferPositive(draft.pension, state.pension),
      };
      const next = {
        ...updated,
        projection: calculateProjection(updated),
      };
      persistDiagnosisState(next);
      return next;
    }
    case "LOAD_FROM_SERVER": {
      const rec = action.payload;
      // MVP: 서버 연금은 0 저장 — 세션/초안의 양수 입력은 덮어쓰지 않음
      const pension = mergePensionPreferPositive(
        {
          national: rec.nationalPension,
          retirement: rec.retirementPension,
          personal: rec.personalPension,
          housing: rec.housingPension,
        },
        mergePensionPreferPositive(state.pension, readPensionDraft()),
      );
      writePensionDraft(pension);
      const updated: DiagnosisState = {
        ...state,
        diagnosisType: rec.householdType as DiagnosisState["diagnosisType"],
        birthYear: rec.birthYear,
        retirementAge: rec.retirementYear - rec.birthYear,
        pension,
        livingExpense: {
          ...state.livingExpense,
          desiredMonthly: rec.monthlyExpense,
        },
        medicalExpense: {
          healthInsurance: rec.healthInsurance,
          privateInsurance: rec.privateInsurance,
        },
      };
      const next = { ...updated, projection: calculateProjection(updated) };
      persistDiagnosisState(next);
      return next;
    }
    default:
      return state;
  }
}

interface DiagnosisContextValue {
  state: DiagnosisState;
  dispatch: Dispatch<Action>;
}

const DiagnosisContext = createContext<DiagnosisContextValue | null>(null);

export function DiagnosisProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  return (
    <DiagnosisContext.Provider value={{ state, dispatch }}>
      {children}
    </DiagnosisContext.Provider>
  );
}

export function useDiagnosis(): DiagnosisContextValue {
  const ctx = useContext(DiagnosisContext);
  if (!ctx)
    throw new Error("useDiagnosis must be used within DiagnosisProvider");
  return ctx;
}
