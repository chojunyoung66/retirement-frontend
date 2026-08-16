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

export interface CashflowTrendPoint {
  year: number;
  amount: number;
}

export interface CashflowTrend {
  points: CashflowTrendPoint[];
  highlightYear: number;
  yoyPercent: number;
}

export function getWelcomeMetrics(): WelcomeMetrics {
  return {
    averageMonthlyPension: 1870000,
    completedDiagnoses: 13000,
    accuracyRate: 98,
  };
}

// 진단 전 방문자에게 보여주는 예시 추이 — 개인 데이터가 아닌 일러스트레이션 값
export function getCashflowTrendSample(baseYear = 2026): CashflowTrend {
  const ratios = [
    0.72, 0.79, 0.63, 0.81, 0.85, 0.77, 0.88, 0.95, 0.91, 0.99, 0.93, 1, 0.95,
  ];
  const base = getWelcomeMetrics().averageMonthlyPension;

  return {
    points: ratios.map((ratio, i) => ({
      year: baseYear + i,
      amount: Math.round(base * ratio),
    })),
    highlightYear: baseYear + 9,
    yoyPercent: 12,
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

/** 본인 연령 기준 동일 연도의 배우자 연령 (출생연도 차이 보정) */
export function getSpouseAgeAtSelfAge(
  selfAge: number,
  selfBirthYear: number | null,
  spouseBirthYear: number | null,
): number | null {
  if (selfBirthYear == null || spouseBirthYear == null) return null;
  // 배우자가 더 늦게 태어났으면(연도 큼) 나이가 작음
  return selfAge + (selfBirthYear - spouseBirthYear);
}

function resolveNationalAtAge(
  amount: number,
  birthYear: number | null,
  ageAtMoment: number,
  currentAge: number | null,
): { included: number; pending: { amount: number; startAge: number } | null } {
  const startAge = getPensionStartAge(birthYear);
  const alreadyStarted = currentAge !== null && currentAge >= startAge;
  const delayed = !alreadyStarted && startAge > ageAtMoment;
  if (delayed && amount > 0) {
    return { included: 0, pending: { amount, startAge } };
  }
  return { included: amount, pending: null };
}

export function calculateProjection(state: DiagnosisState): ProjectionResult {
  // 정년(retirementAge) 미지정 시 기본값 60세 — 정년 연장 정책 반영 시 state로 주입
  const retirementAge = state.retirementAge ?? 60;
  const nowYear = new Date().getFullYear();
  const selfCurrentAge = state.birthYear ? nowYear - state.birthYear : null;

  // 본인 국민연금 — 퇴직 시점 나이 기준
  const selfNational = resolveNationalAtAge(
    state.pension.national,
    state.birthYear,
    retirementAge,
    selfCurrentAge,
  );

  const housingPensionAmount = state.pension.housing;
  const isCouple = state.diagnosisType === 'couple' && state.spouse != null;
  const spouse = state.spouse;

  // 배우자: 본인 퇴직 연도와 같은 시점의 배우자 나이로 수급개시 판단
  let spouseNationalIncluded = 0;
  let spouseRetirement = 0;
  let spousePersonal = 0;
  const pendingNationalPensions: import('../domain/plan').PendingNationalPension[] = [];

  if (selfNational.pending) {
    pendingNationalPensions.push({
      ...selfNational.pending,
      label: isCouple ? '본인 국민연금' : '국민연금',
    });
  }

  if (isCouple && spouse) {
    spouseRetirement = spouse.pension.retirement;
    spousePersonal = spouse.pension.personal;
    const spouseAgeAtSelfRet = getSpouseAgeAtSelfAge(
      retirementAge,
      state.birthYear,
      spouse.birthYear,
    );
    const spouseCurrentAge = spouse.birthYear ? nowYear - spouse.birthYear : null;
    if (spouseAgeAtSelfRet != null) {
      const spouseNational = resolveNationalAtAge(
        spouse.pension.national,
        spouse.birthYear,
        spouseAgeAtSelfRet,
        spouseCurrentAge,
      );
      spouseNationalIncluded = spouseNational.included;
      if (spouseNational.pending) {
        pendingNationalPensions.push({
          ...spouseNational.pending,
          label: '배우자 국민연금',
        });
      }
    } else {
      // 출생연도 없으면 지연 없이 전액 포함
      spouseNationalIncluded = spouse.pension.national;
    }
  }

  const totalIncome =
    selfNational.included +
    state.pension.retirement +
    state.pension.personal +
    housingPensionAmount +
    spouseNationalIncluded +
    spouseRetirement +
    spousePersonal;
  const totalExpense =
    state.livingExpense.desiredMonthly +
    state.medicalExpense.healthInsurance +
    state.medicalExpense.privateInsurance;
  const gap = totalIncome - totalExpense;

  const incomeItems = isCouple
    ? [
        { label: '본인 국민연금', amount: selfNational.included },
        { label: '배우자 국민연금', amount: spouseNationalIncluded },
        { label: '본인 퇴직연금', amount: state.pension.retirement },
        { label: '배우자 퇴직연금', amount: spouseRetirement },
        { label: '본인 개인연금', amount: state.pension.personal },
        { label: '배우자 개인연금', amount: spousePersonal },
        { label: '주택연금', amount: housingPensionAmount },
      ].filter((i) => i.amount > 0)
    : [
        { label: '국민연금', amount: selfNational.included },
        { label: '퇴직연금', amount: state.pension.retirement },
        { label: '개인연금', amount: state.pension.personal },
        { label: '주택연금', amount: housingPensionAmount },
      ].filter((i) => i.amount > 0);

  const expenseItems = [
    { label: '생활비', amount: state.livingExpense.desiredMonthly },
    { label: '건강보험료', amount: state.medicalExpense.healthInsurance },
    { label: '민영보험료', amount: state.medicalExpense.privateInsurance },
  ].filter((i) => i.amount > 0);

  // 생활비 초과분(권장 생활비 대비)이 부족액에서 차지하는 비율을 실제 데이터로 산정
  const causeAnalysis = gap < 0 ? buildCauseAnalysis(state, -gap) : [];

  const firstPending = pendingNationalPensions[0];
  return {
    totalIncome,
    totalExpense,
    gap,
    incomeItems,
    expenseItems,
    causeAnalysis,
    simulations: [],
    ...(firstPending ? { pendingNationalPension: firstPending } : {}),
    ...(pendingNationalPensions.length > 0
      ? { pendingNationalPensions }
      : {}),
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
  /** 부부 진단 시 해당 연도 배우자 국민연금 개시 여부 */
  spouseNationalPensionStarted?: boolean;
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
  // 정년(retirementAge) 미지정 시 기본값 60세 — 차트 x축은 본인 나이 유지
  const retirementAge = state.retirementAge ?? 60;
  const pensionStartAge = getPensionStartAge(state.birthYear ?? null);
  const nowYear = new Date().getFullYear();
  const currentAge = state.birthYear ? nowYear - state.birthYear : null;
  const isPensionAlreadyStarted = currentAge !== null && currentAge >= pensionStartAge;
  const effectivePensionStartAge = isPensionAlreadyStarted ? retirementAge : pensionStartAge;
  const baseNational = state.pension.national;
  const baseOther = state.pension.retirement + state.pension.personal;
  // 주택연금은 가입 후 종신 정액 가정 — 물가·연금 상승률과 분리해 고정 월액 반영
  const baseHousing = state.pension.housing;
  const baseLivingExpense = state.livingExpense.desiredMonthly;
  const baseMedicalExpense =
    state.medicalExpense.healthInsurance + state.medicalExpense.privateInsurance;

  const isCouple = state.diagnosisType === 'couple' && state.spouse != null;
  const spouse = state.spouse;
  const spousePensionStartAge = spouse
    ? getPensionStartAge(spouse.birthYear)
    : null;
  const spouseCurrentAge = spouse?.birthYear ? nowYear - spouse.birthYear : null;
  const spouseAlreadyStarted =
    spousePensionStartAge != null &&
    spouseCurrentAge !== null &&
    spouseCurrentAge >= spousePensionStartAge;
  const baseSpouseNational = spouse?.pension.national ?? 0;
  const baseSpouseOther =
    (spouse?.pension.retirement ?? 0) + (spouse?.pension.personal ?? 0);

  const result: YearlyProjection[] = [];
  let cumulative = 0;

  for (let i = 0; i < years; i++) {
    const age = retirementAge + i;
    const inflationFactor = Math.pow(1 + inflationRate, i);
    const pensionFactor = Math.pow(1 + pensionGrowthRate, i);

    // 본인 국민연금 — 실효 수급 개시 연령부터
    const nationalPensionStarted = age >= effectivePensionStartAge;
    const pensionStartIndex = effectivePensionStartAge - retirementAge;
    const nationalIncome = nationalPensionStarted
      ? Math.round(baseNational * Math.pow(1 + pensionGrowthRate, i - pensionStartIndex))
      : 0;
    // 퇴직·개인연금은 최장 20년 수령 기본값
    const otherIncome = i < 20 ? Math.round(baseOther * pensionFactor) : 0;
    const housingIncome = baseHousing;

    // 배우자 국민·기타 — 동일 연도의 배우자 나이로 개시 여부 판단
    let spouseNationalIncome = 0;
    let spouseOtherIncome = 0;
    let spouseNationalPensionStarted: boolean | undefined;
    if (isCouple && spouse && spousePensionStartAge != null) {
      const spouseAge = getSpouseAgeAtSelfAge(age, state.birthYear, spouse.birthYear);
      const effectiveSpouseStart = spouseAlreadyStarted
        ? (spouseAge ?? spousePensionStartAge)
        : spousePensionStartAge;
      spouseNationalPensionStarted =
        spouseAge != null ? spouseAge >= effectiveSpouseStart : false;
      if (spouseNationalPensionStarted && spouseAge != null) {
        // 배우자가 이 타임라인에서 처음 수급하는 연도 인덱스
        const spouseStartSelfAge = spouseAlreadyStarted
          ? retirementAge
          : age - (spouseAge - spousePensionStartAge);
        const spouseStartIndex = Math.max(0, spouseStartSelfAge - retirementAge);
        spouseNationalIncome = Math.round(
          baseSpouseNational *
            Math.pow(1 + pensionGrowthRate, i - spouseStartIndex),
        );
      }
      spouseOtherIncome = i < 20 ? Math.round(baseSpouseOther * pensionFactor) : 0;
    }

    const ubIncome =
      unemploymentBenefit && i === 0
        ? Math.round(
            (unemploymentBenefit.monthlyAmount * unemploymentBenefit.durationMonths) / 12,
          )
        : 0;

    const secIncome = secondaryIncomes
      .filter((s) => age >= s.startAge && age <= s.endAge)
      .reduce((sum, s) => sum + Math.round(s.monthlyAmount * inflationFactor), 0);

    const medicalMultiplier = getMedicalEscalationFactor(age, healthEscalation);
    const monthlyMedicalExpense = Math.round(baseMedicalExpense * inflationFactor * medicalMultiplier);
    const monthlyExpense = Math.round(baseLivingExpense * inflationFactor) + monthlyMedicalExpense;
    const monthlyIncome =
      nationalIncome +
      otherIncome +
      housingIncome +
      spouseNationalIncome +
      spouseOtherIncome +
      ubIncome +
      secIncome;
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
      ...(spouseNationalPensionStarted !== undefined
        ? { spouseNationalPensionStarted }
        : {}),
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
  // 추천 기준 수입은 요약 투영과 동일(배우자 합산 포함)
  const snapProjection = calculateProjection(state);
  const totalIncome = snapProjection.totalIncome;
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

  // 주택연금 미반영 시 검토 추천 (월액은 시뮬레이션에서 산정)
  if (state.pension.housing <= 0) {
    items.push({
      label: '주택연금 가입 검토 (보유 주택 담보 월수입)',
      delta: 0,
      detail: '시뮬레이션 메뉴에서 HF 표 기반 예상 월지급금을 확인하세요',
    });
  }

  return items;
}
