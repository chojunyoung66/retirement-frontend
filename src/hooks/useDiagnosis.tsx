import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  emptyPension,
  emptyPersonProfile,
  type DiagnosisState,
  type PensionState,
} from "../domain/plan";
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
    spouse: null,
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

/** 유형 전환 시 spouse 객체 동기화 */
function syncSpouseForType(
  next: DiagnosisState,
  prev: DiagnosisState,
): DiagnosisState {
  if (next.diagnosisType === "couple" && !next.spouse) {
    return { ...next, spouse: prev.spouse ?? emptyPersonProfile() };
  }
  if (next.diagnosisType === "individual") {
    return { ...next, spouse: null };
  }
  return next;
}

function reducer(state: DiagnosisState, action: Action): DiagnosisState {
  switch (action.type) {
    case "UPDATE": {
      let next = syncSpouseForType(
        { ...state, ...action.payload },
        state,
      );
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
      let updated = syncSpouseForType(
        { ...state, ...action.payload },
        state,
      );
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
        spouse: draft.spouse,
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
      const householdType =
        rec.householdType === "couple" ? "couple" : "individual";
      // 서버 배우자 연도 → 세션 spouse 복원 (연금은 세션 유지)
      let spouse = state.spouse;
      if (householdType === "couple") {
        const base = spouse ?? emptyPersonProfile();
        spouse = {
          ...base,
          birthYear: rec.spouseBirthYear ?? base.birthYear,
          retirementAge:
            rec.spouseBirthYear != null && rec.spouseRetirementYear != null
              ? rec.spouseRetirementYear - rec.spouseBirthYear
              : base.retirementAge,
        };
      } else {
        spouse = null;
      }
      const updated: DiagnosisState = {
        ...state,
        diagnosisType: householdType,
        householdSize: rec.householdSize ?? state.householdSize,
        birthYear: rec.birthYear,
        retirementAge: rec.retirementYear - rec.birthYear,
        pension,
        spouse,
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
