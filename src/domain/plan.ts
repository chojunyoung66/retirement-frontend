export type DiagnosisType = 'individual' | 'couple';
export type IncomeStatus = 'employed' | 'self-employed' | 'retired' | '';

export interface PensionState {
  national: number;
  retirement: number;
  personal: number;
  // 주택연금 월지급금 — 시뮬레이션 결과 옵트인 반영. 미입력 시 0
  housing: number;
}

/** 배우자 프로필 — couple일 때만 DiagnosisState.spouse에 설정 */
export interface PersonProfile {
  birthYear: number | null;
  retirementAge: number | null;
  incomeStatus: IncomeStatus;
  pension: PensionState;
}

export interface LivingExpenseState {
  desiredMonthly: number;
  guideMinimum: number;
  guideRecommended: number;
}

export interface MedicalExpenseState {
  healthInsurance: number;
  privateInsurance: number;
}

export interface ProjectionItem {
  label: string;
  amount: number;
}

export interface CauseItem {
  cause: string;
  weight: number;
}

export interface SimulationItem {
  label: string;
  delta: number;
  twentyYearImpact?: number;
  detail?: string;
}

export interface PendingNationalPension {
  amount: number;
  startAge: number;
  /** 본인 / 배우자 구분 라벨 */
  label: string;
}

export interface ProjectionResult {
  totalIncome: number;
  totalExpense: number;
  gap: number;
  incomeItems: ProjectionItem[];
  expenseItems: ProjectionItem[];
  causeAnalysis: CauseItem[];
  simulations: SimulationItem[];
  /** @deprecated pendingNationalPensions 사용 — 첫 항목 호환용 */
  pendingNationalPension?: PendingNationalPension;
  // 퇴직 이후 수급 개시되는 국민연금(본인·배우자)
  pendingNationalPensions?: PendingNationalPension[];
}

export interface DiagnosisState {
  diagnosisType: DiagnosisType;
  householdSize: number;
  birthYear: number | null;
  // null이면 계산 로직에서 기본값(60세)을 적용. 정년 연장 정책 반영 시 UI에서 설정.
  retirementAge: number | null;
  incomeStatus: IncomeStatus;
  pension: PensionState;
  /** couple일 때만 채움. individual이면 null */
  spouse: PersonProfile | null;
  livingExpense: LivingExpenseState;
  medicalExpense: MedicalExpenseState;
  projection: ProjectionResult | null;
}

export function emptyPension(): PensionState {
  return { national: 0, retirement: 0, personal: 0, housing: 0 };
}

export function emptyPersonProfile(): PersonProfile {
  return {
    birthYear: null,
    retirementAge: null,
    incomeStatus: '',
    pension: emptyPension(),
  };
}
