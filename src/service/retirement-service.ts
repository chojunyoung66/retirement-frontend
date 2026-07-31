import type { DiagnosisState, ProjectionResult } from '../domain/plan';

export interface WelcomeMetrics {
  averageMonthlyPension: number;
  completedDiagnoses: number;
  accuracyRate: number;
}

export interface LivingExpenseGuide {
  minimum: number;
  recommended: number;
}

export function getWelcomeMetrics(): WelcomeMetrics {
  return {
    averageMonthlyPension: 1870000,
    completedDiagnoses: 1240000,
    accuracyRate: 98,
  };
}

export function getLivingExpenseGuide(
  diagnosisType: string,
  householdSize: number,
): LivingExpenseGuide {
  if (diagnosisType === 'couple') {
    const guides: Record<number, LivingExpenseGuide> = {
      1: { minimum: 1500000, recommended: 2000000 },
      2: { minimum: 2000000, recommended: 2800000 },
      3: { minimum: 2500000, recommended: 3400000 },
      4: { minimum: 3000000, recommended: 4000000 },
      5: { minimum: 3500000, recommended: 4600000 },
    };
    return guides[householdSize] ?? guides[2];
  }
  return { minimum: 1200000, recommended: 1800000 };
}

export function calculateProjection(state: DiagnosisState): ProjectionResult {
  // 정년(retirementAge) 미지정 시 기본값 60세 — 정년 연장 정책 반영 시 state로 주입
  const retirementAge = state.retirementAge ?? 60;
  const pensionStartAge = getPensionStartAge(state.birthYear ?? null);
  // 현재 나이가 수급 개시 연령 이상이면 이미 수급 중 → 수입에 포함
  const currentAge = state.birthYear ? new Date().getFullYear() - state.birthYear : null;
  const isPensionAlreadyStarted = currentAge !== null && currentAge >= pensionStartAge;
  const isPensionDelayed = !isPensionAlreadyStarted && pensionStartAge > retirementAge;
  const nationalPensionAmount =
    isPensionDelayed ? 0 : state.pension.national;

  const totalIncome =
    nationalPensionAmount + state.pension.retirement + state.pension.personal;
  const totalExpense =
    state.livingExpense.desiredMonthly +
    state.medicalExpense.healthInsurance +
    state.medicalExpense.privateInsurance;
  const gap = totalIncome - totalExpense;

  // 퇴직 시점 이후 수급 개시 국민연금 — 결과화면 별도 안내용
  const pendingNationalPension =
    isPensionDelayed && state.pension.national > 0
      ? { amount: state.pension.national, startAge: pensionStartAge }
      : undefined;

  const incomeItems = [
    { label: '국민연금', amount: nationalPensionAmount },
    { label: '퇴직연금', amount: state.pension.retirement },
    { label: '개인연금', amount: state.pension.personal },
  ].filter((i) => i.amount > 0);

  const expenseItems = [
    { label: '생활비', amount: state.livingExpense.desiredMonthly },
    { label: '건강보험료', amount: state.medicalExpense.healthInsurance },
    { label: '민영보험료', amount: state.medicalExpense.privateInsurance },
  ].filter((i) => i.amount > 0);

  // 생활비 초과분(권장 생활비 대비)이 부족액에서 차지하는 비율을 실제 데이터로 산정
  // (권장 생활비 이내면 부족 원인을 전부 연금 수입 부족으로 귀속)
  const causeAnalysis = gap < 0 ? buildCauseAnalysis(state, -gap) : [];

  return {
    totalIncome,
    totalExpense,
    gap,
    incomeItems,
    expenseItems,
    causeAnalysis,
    simulations: [],
    ...(pendingNationalPension ? { pendingNationalPension } : {}),
  };
}

// 부족액(shortfall) 중 "생활비 설정"(권장 생활비 초과분)이 설명하는 비율을 계산하고,
// 나머지를 "연금 수입 부족"으로 귀속한다. 두 가중치의 합은 항상 100.
function buildCauseAnalysis(
  state: DiagnosisState,
  shortfall: number,
): import('../domain/plan').CauseItem[] {
  const excessLivingExpense = Math.max(
    0,
    state.livingExpense.desiredMonthly - state.livingExpense.guideRecommended,
  );
  const livingExpenseWeight =
    shortfall > 0 ? Math.min(100, Math.round((excessLivingExpense / shortfall) * 100)) : 0;
  const pensionWeight = 100 - livingExpenseWeight;

  return [
    { cause: '연금 수입 부족', weight: pensionWeight },
    { cause: '생활비 설정', weight: livingExpenseWeight },
  ];
}

export interface YearlyProjection {
  year: number;
  age: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyMedicalExpense: number;
  monthlyGap: number;
  cumulativeGap: number;
  unemploymentBenefitIncome?: number;
  secondaryIncome?: number;
  nationalPensionStarted: boolean;
}

export type HealthEscalationMode = 'none' | 'moderate' | 'steep';

// 연령대별 의료비 배율 (기준 연령 대비, 물가상승 별도)
function getMedicalEscalationFactor(age: number, mode: HealthEscalationMode): number {
  if (mode === 'none') return 1;
  const table = mode === 'moderate'
    ? [{ from: 85, factor: 3.0 }, { from: 80, factor: 2.5 }, { from: 75, factor: 2.0 }, { from: 70, factor: 1.5 }]
    : [{ from: 85, factor: 5.0 }, { from: 80, factor: 4.0 }, { from: 75, factor: 3.0 }, { from: 70, factor: 2.0 }];
  return table.find((r) => age >= r.from)?.factor ?? 1;
}

export interface SecondaryIncome {
  startAge: number;
  endAge: number;
  monthlyAmount: number; // 원 단위
}

export function getPensionStartAge(birthYear: number | null): number {
  if (!birthYear) return 65;
  if (birthYear >= 1969) return 65;
  if (birthYear >= 1965) return 64;
  if (birthYear >= 1961) return 63;
  if (birthYear >= 1957) return 62;
  if (birthYear >= 1953) return 61;
  return 60;
}

export interface UnemploymentBenefitOption {
  monthlyAmount: number;
  durationMonths: number;
}

export function calculateLongTermProjection(
  state: DiagnosisState,
  years = 20,
  inflationRate = 0.02,
  pensionGrowthRate = 0.02,
  unemploymentBenefit?: UnemploymentBenefitOption,
  secondaryIncomes: SecondaryIncome[] = [],
  healthEscalation: HealthEscalationMode = 'none',
): YearlyProjection[] {
  // 정년(retirementAge) 미지정 시 기본값 60세 — 정년 연장 정책 반영 시 state로 주입
  const retirementAge = state.retirementAge ?? 60;
  const pensionStartAge = getPensionStartAge(state.birthYear ?? null);
  // 현재 이미 수급 중이면 시뮬레이션 시작(retirementAge)부터 포함
  const currentAge = state.birthYear ? new Date().getFullYear() - state.birthYear : null;
  const isPensionAlreadyStarted = currentAge !== null && currentAge >= pensionStartAge;
  const effectivePensionStartAge = isPensionAlreadyStarted ? retirementAge : pensionStartAge;
  const baseNational = state.pension.national;
  const baseOther = state.pension.retirement + state.pension.personal;
  // 생활비와 의료비를 분리해 연령별 의료비 배율을 별도 적용
  const baseLivingExpense = state.livingExpense.desiredMonthly;
  const baseMedicalExpense =
    state.medicalExpense.healthInsurance + state.medicalExpense.privateInsurance;

  const result: YearlyProjection[] = [];
  let cumulative = 0;

  for (let i = 0; i < years; i++) {
    const age = retirementAge + i;
    const inflationFactor = Math.pow(1 + inflationRate, i);
    const pensionFactor = Math.pow(1 + pensionGrowthRate, i);

    // 국민연금은 실효 수급 개시 연령부터 포함 (이미 수급 중이면 시작부터)
    const nationalPensionStarted = age >= effectivePensionStartAge;
    const pensionStartIndex = effectivePensionStartAge - retirementAge;
    const nationalIncome = nationalPensionStarted
      ? Math.round(baseNational * Math.pow(1 + pensionGrowthRate, i - pensionStartIndex))
      : 0;
    // 퇴직·개인연금은 최장 20년 수령 기본값 — 퇴직 후 20년 초과 시 0
    const otherIncome = i < 20 ? Math.round(baseOther * pensionFactor) : 0;

    // 60세(i=0)에 실업급여를 연간 총액의 월평균으로 반영
    const ubIncome =
      unemploymentBenefit && i === 0
        ? Math.round(
            (unemploymentBenefit.monthlyAmount * unemploymentBenefit.durationMonths) / 12,
          )
        : 0;

    // 제2 수입 (파트타임·프리랜서 등) — 물가 상승률 반영
    const secIncome = secondaryIncomes
      .filter((s) => age >= s.startAge && age <= s.endAge)
      .reduce((sum, s) => sum + Math.round(s.monthlyAmount * inflationFactor), 0);

    // 의료비: 물가 상승 + 연령대별 배율 (healthEscalation)
    const medicalMultiplier = getMedicalEscalationFactor(age, healthEscalation);
    const monthlyMedicalExpense = Math.round(baseMedicalExpense * inflationFactor * medicalMultiplier);
    const monthlyExpense = Math.round(baseLivingExpense * inflationFactor) + monthlyMedicalExpense;
    const monthlyIncome = nationalIncome + otherIncome + ubIncome + secIncome;
    const monthlyGap = monthlyIncome - monthlyExpense;
    cumulative += monthlyGap * 12;

    result.push({
      year: i + 1,
      age,
      monthlyIncome,
      monthlyExpense,
      monthlyMedicalExpense,
      monthlyGap,
      cumulativeGap: cumulative,
      nationalPensionStarted,
      ...(ubIncome > 0 ? { unemploymentBenefitIncome: ubIncome } : {}),
      ...(secIncome > 0 ? { secondaryIncome: secIncome } : {}),
    });
  }
  return result;
}

export function generateRecommendations(
  state: DiagnosisState,
  twentyYearGap: number,
): import('../domain/plan').SimulationItem[] {
  const MONTHS = 240;
  // calculateProjection과 동일 규칙: 현재 수급 중이거나 퇴직 시점에 개시된 경우만 포함
  const retirementAge = state.retirementAge ?? 60;
  const pensionStartAge = getPensionStartAge(state.birthYear ?? null);
  const currentAge = state.birthYear ? new Date().getFullYear() - state.birthYear : null;
  const isPensionAlreadyStarted = currentAge !== null && currentAge >= pensionStartAge;
  const isPensionDelayed = !isPensionAlreadyStarted && pensionStartAge > retirementAge;
  const nationalPensionAmount = isPensionDelayed ? 0 : state.pension.national;
  const totalIncome =
    nationalPensionAmount + state.pension.retirement + state.pension.personal;
  const totalInsurance =
    state.medicalExpense.healthInsurance + state.medicalExpense.privateInsurance;
  const { desiredMonthly } = state.livingExpense;

  const isDeficit = twentyYearGap < 0;
  const monthlyGap = Math.abs(twentyYearGap) / MONTHS;
  // 5만원 단위로 올림, 최소 5만원
  const snap = (n: number) => Math.max(50000, Math.ceil(n / 50000) * 50000);
  const wan = (n: number) => Math.round(n / 10000);

  const items: import('../domain/plan').SimulationItem[] = [];

  if (!isDeficit) {
    // 여유 있는 경우: 활용 제안

    // 1. 생활비 상향 여력 — 20년 갭 전체를 월 단위로 환산
    const spendingIncrease = snap(monthlyGap);
    items.push({
      label: `생활비 월 ${wan(spendingIncrease)}만원 더 써도 20년 균형 유지`,
      delta: spendingIncrease,
      twentyYearImpact: spendingIncrease * MONTHS,
    });

    // 2. IRP 추가 납입 — 여유금의 50%, 최대 37.5만원/월 (연 450만원)
    const irpMonthly = Math.min(snap(monthlyGap * 0.5), 375000);
    if (irpMonthly >= 50000) {
      const irpAnnual = irpMonthly * 12;
      // 소득 5,500만원 이하 세액공제율 16.5%, 납입 한도 연 900만원
      const taxCredit = Math.round(Math.min(irpAnnual, 9000000) * 0.165);
      // 연 4% 수익률 기준 20년 복리
      const irp20Year = Math.round(irpAnnual * ((Math.pow(1.04, 20) - 1) / 0.04));
      items.push({
        label: `월 ${wan(irpMonthly)}만원 IRP 추가 납입 시`,
        delta: irpMonthly,
        twentyYearImpact: irp20Year,
        detail: `세액공제 연 ${wan(taxCredit)}만원 절감 (소득 5,500만원 이하 기준)`,
      });
    }

    return items;
  }

  // 적자인 경우: 개선 시뮬레이션
  const monthlyTarget = monthlyGap;

  // 생활비 절감 (갭의 50%를 생활비로 메움, 최대 25% 절감)
  if (desiredMonthly > 0) {
    const delta = snap(Math.min(monthlyTarget * 0.5, desiredMonthly * 0.25));
    items.push({
      label: `생활비 월 ${wan(delta)}만원 절감`,
      delta,
      twentyYearImpact: delta * MONTHS,
    });
  }

  // 연금 수입 증가 (갭의 50%를 연금으로 메움, 최대 30% 증가)
  if (totalIncome > 0) {
    const delta = snap(Math.min(monthlyTarget * 0.5, totalIncome * 0.3));
    items.push({
      label: `연금 수입 월 ${wan(delta)}만원 증가`,
      delta,
      twentyYearImpact: delta * MONTHS,
    });
  }

  // 보험료 절감 (보험료가 있을 때만, 15% 절감 목표, 입력 합산 초과 불가)
  if (totalInsurance > 0) {
    const delta = Math.min(snap(Math.min(totalInsurance * 0.15, 200000)), totalInsurance);
    items.push({
      label: `보험료 월 ${wan(delta)}만원 절감`,
      delta,
      twentyYearImpact: delta * MONTHS,
    });
  }

  return items;
}
