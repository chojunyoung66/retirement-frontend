import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type { DiagnosisState } from "../domain/plan";
import { calculateProjection } from "../service/retirement-service";

const initialState: DiagnosisState = {
  diagnosisType: "individual",
  householdSize: 2,
  birthYear: null,
  retirementAge: null,
  incomeStatus: "",
  pension: { national: 0, retirement: 0, personal: 0 },
  livingExpense: { desiredMonthly: 0, guideMinimum: 0, guideRecommended: 0 },
  medicalExpense: { healthInsurance: 0, privateInsurance: 0 },
  projection: null,
};

type Action =
  | { type: "UPDATE"; payload: Partial<DiagnosisState> }
  | { type: "CALCULATE" }
  | { type: "UPDATE_AND_CALCULATE"; payload: Partial<DiagnosisState> }
  | { type: "RESET" }
  | {
      type: "LOAD_FROM_SERVER";
      payload: import("../api/diagnosis-api").DiagnosisRecord;
    };

function reducer(state: DiagnosisState, action: Action): DiagnosisState {
  switch (action.type) {
    case "UPDATE":
      return { ...state, ...action.payload };
    case "CALCULATE": {
      const projection = calculateProjection(state);
      return { ...state, projection };
    }
    case "UPDATE_AND_CALCULATE": {
      const updated = { ...state, ...action.payload };
      const projection = calculateProjection(updated);
      return { ...updated, projection };
    }
    case "RESET":
      return initialState;
    case "LOAD_FROM_SERVER": {
      const rec = action.payload;
      const updated: DiagnosisState = {
        ...state,
        diagnosisType: rec.householdType as DiagnosisState["diagnosisType"],
        birthYear: rec.birthYear,
        retirementAge: rec.retirementYear - rec.birthYear,
        // MVP: monthlyIncome → national 연금으로 일괄 매핑 (pension 분류 정보 미저장)
        pension: { national: rec.monthlyIncome, retirement: 0, personal: 0 },
        livingExpense: {
          ...state.livingExpense,
          desiredMonthly: rec.monthlyExpense,
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
  const [state, dispatch] = useReducer(reducer, initialState);
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
