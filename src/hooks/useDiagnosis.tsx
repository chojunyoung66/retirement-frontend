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
  // 리로드·인증 리다이렉트 후에도 입력 초안 복원
  const draft = readPensionDraft();
  return {
    diagnosisType: "individual",
    householdSize: 2,
    birthYear: null,
    retirementAge: null,
    incomeStatus: "",
    pension: draft ?? emptyPension(),
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
  | { type: "LOAD_FROM_SERVER"; payload: DiagnosisRecord };

function persistPensionIfPresent(pension: PensionState | undefined) {
  if (pension) writePensionDraft(pension);
}

function reducer(state: DiagnosisState, action: Action): DiagnosisState {
  switch (action.type) {
    case "UPDATE": {
      const next = { ...state, ...action.payload };
      persistPensionIfPresent(action.payload.pension);
      return next;
    }
    case "CALCULATE": {
      const projection = calculateProjection(state);
      return { ...state, projection };
    }
    case "UPDATE_AND_CALCULATE": {
      const updated = { ...state, ...action.payload };
      persistPensionIfPresent(action.payload.pension);
      const projection = calculateProjection(updated);
      return { ...updated, projection };
    }
    case "RESET":
      clearPensionDraft();
      return createInitialState();
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
      return { ...updated, projection: calculateProjection(updated) };
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
