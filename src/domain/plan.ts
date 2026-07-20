export type DiagnosisType = 'individual' | 'couple';
export type IncomeStatus = 'employed' | 'self-employed' | 'retired' | '';

export interface PensionState {
  national: number;
  retirement: number;
  personal: number;
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
}

export interface ProjectionResult {
  totalIncome: number;
  totalExpense: number;
  gap: number;
  incomeItems: ProjectionItem[];
  expenseItems: ProjectionItem[];
  causeAnalysis: CauseItem[];
  simulations: SimulationItem[];
}

export interface DiagnosisState {
  diagnosisType: DiagnosisType;
  householdSize: number;
  birthYear: number | null;
  // null이면 계산 로직에서 기본값(60세)을 적용. 정년 연장 정책 반영 시 UI에서 설정.
  retirementAge: number | null;
  incomeStatus: IncomeStatus;
  pension: PensionState;
  livingExpense: LivingExpenseState;
  medicalExpense: MedicalExpenseState;
  projection: ProjectionResult | null;
}
