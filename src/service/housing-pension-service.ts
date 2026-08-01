/** HF 종신·정액(일반주택) 공개표 기준 버전 — 표 교체 시 테스트 스냅샷과 함께 갱신 */
export const TABLE_VERSION = 'HF-2026-03-01';

const MIN_AGE = 55;
const MAX_AGE_ROW = 80;
const MAX_PRICE_FOR_PAYOUT = 1_200_000_000;
const INITIAL_GUARANTEE_FEE_RATE = 0.01;
const ANNUAL_GUARANTEE_FEE_RATE = 0.0095;

/** 연령 격자 (세) */
const AGES = [55, 60, 65, 70, 75, 80] as const;

/** 주택가격 격자 (원) */
const PRICES = [
  100_000_000, 200_000_000, 300_000_000, 400_000_000, 500_000_000, 600_000_000,
  700_000_000, 800_000_000, 900_000_000, 1_000_000_000, 1_100_000_000, 1_200_000_000,
] as const;

/**
 * 일반주택 · 종신지급 · 정액형 월지급금 (단위: 천원)
 * Source: 한국주택금융공사 월지급금 예시 (2026.03.01)
 */
const LIFETIME_FLAT_THOUSANDS: readonly (readonly number[])[] = [
  // 55세
  [156, 312, 468, 624, 780, 936, 1092, 1248, 1404, 1560, 1716, 1872],
  // 60세
  [210, 421, 632, 842, 1053, 1264, 1475, 1685, 1896, 2107, 2318, 2528],
  // 65세
  [252, 505, 758, 1011, 1264, 1517, 1770, 2023, 2276, 2529, 2782, 3035],
  // 70세
  [307, 615, 923, 1231, 1539, 1847, 2155, 2462, 2770, 3078, 3386, 3414],
  // 75세
  [381, 762, 1143, 1525, 1906, 2287, 2669, 3050, 3431, 3666, 3666, 3666],
  // 80세
  [483, 966, 1449, 1932, 2416, 2899, 3382, 3865, 4060, 4060, 4060, 4060],
];

export type HousingPensionProductType = 'GENERAL' | 'PREFERENTIAL' | 'LOAN_REPAY';
export type HousingPensionPayoutMode = 'LIFETIME' | 'LIFETIME_MIXED' | 'FIXED_TERM_MIXED';
export type HousingPensionPayoutStyle = 'FLAT' | 'FRONT_LOADED' | 'STEP_UP';

export interface HousingPensionInput {
  youngerSpouseAge: number;
  housePrice: number;
  productType: HousingPensionProductType;
  payoutMode: HousingPensionPayoutMode;
  payoutStyle: HousingPensionPayoutStyle;
  isBasicPensionRecipient: boolean;
  isSingleHomeUnder250m: boolean;
  existingMortgageBalance?: number;
}

export interface HousingPensionOutput {
  monthlyPayout: number;
  annualPayout: number;
  initialGuaranteeFee: number;
  annualGuaranteeFeeRate: number;
  eligible: boolean;
  ineligibilityReasons: string[];
  notice: string;
  tableVersion: string;
  lumpSumWithdrawal?: number;
}

// 구간 [lo, hi]에서 value의 위치 비율(0~1)을 구한다
function ratio(value: number, lo: number, hi: number): number {
  if (hi === lo) return 0;
  return (value - lo) / (hi - lo);
}

// 1차원 선형 보간
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// 연령·가격 격자에 대한 양방향(bilinear) 보간 — 반환 단위는 원
export function interpolateLifetimeFlatPayout(age: number, housePrice: number): number {
  const clampedAge = Math.min(Math.max(age, AGES[0]), MAX_AGE_ROW);
  const clampedPrice = Math.min(Math.max(housePrice, 0), MAX_PRICE_FOR_PAYOUT);

  // 시세가 최저 격자 미만이면 1억 행에 비례 축소
  if (clampedPrice < PRICES[0]) {
    const atMin = interpolateLifetimeFlatPayout(clampedAge, PRICES[0]);
    return Math.round(atMin * (clampedPrice / PRICES[0]));
  }

  // 연령 구간 인덱스
  let ageLoIdx = 0;
  for (let i = 0; i < AGES.length - 1; i++) {
    if (clampedAge >= AGES[i]) ageLoIdx = i;
  }
  const ageHiIdx = Math.min(ageLoIdx + 1, AGES.length - 1);
  const ageT = ratio(clampedAge, AGES[ageLoIdx], AGES[ageHiIdx]);

  // 가격 구간 인덱스
  let priceLoIdx = 0;
  for (let i = 0; i < PRICES.length - 1; i++) {
    if (clampedPrice >= PRICES[i]) priceLoIdx = i;
  }
  const priceHiIdx = Math.min(priceLoIdx + 1, PRICES.length - 1);
  const priceT = ratio(clampedPrice, PRICES[priceLoIdx], PRICES[priceHiIdx]);

  // 천원 격자에서 bilinear 보간 후 원 단위로 변환
  const v00 = LIFETIME_FLAT_THOUSANDS[ageLoIdx][priceLoIdx];
  const v01 = LIFETIME_FLAT_THOUSANDS[ageLoIdx][priceHiIdx];
  const v10 = LIFETIME_FLAT_THOUSANDS[ageHiIdx][priceLoIdx];
  const v11 = LIFETIME_FLAT_THOUSANDS[ageHiIdx][priceHiIdx];
  const rowLo = lerp(v00, v01, priceT);
  const rowHi = lerp(v10, v11, priceT);
  const thousands = lerp(rowLo, rowHi, ageT);

  return Math.round(thousands * 1000);
}

// 우대형 가산율 — HF 안내(최대 약 20%/25%)를 MVP 계수로 적용
function preferentialMultiplier(housePrice: number): number {
  if (housePrice < 180_000_000) return 1.25;
  if (housePrice < 250_000_000) return 1.2;
  return 1;
}

export function calculateHousingPension(input: HousingPensionInput): HousingPensionOutput {
  const reasons: string[] = [];

  // 가입 연령·가격 기본 검증
  if (!Number.isFinite(input.youngerSpouseAge) || input.youngerSpouseAge < MIN_AGE) {
    reasons.push('MIN_AGE');
  }
  if (!Number.isFinite(input.housePrice) || input.housePrice <= 0) {
    reasons.push('INVALID_HOUSE_PRICE');
  }

  // 우대형 자격(기초연금 + 시가 2.5억 미만 1주택)
  if (input.productType === 'PREFERENTIAL') {
    if (!input.isBasicPensionRecipient || !input.isSingleHomeUnder250m) {
      reasons.push('PREFERENTIAL_NOT_QUALIFIED');
    }
    if (input.housePrice >= 250_000_000) {
      reasons.push('PREFERENTIAL_PRICE_LIMIT');
    }
  }

  const notice =
    'HF 공개 월지급금 표(종신·정액, 2026.03.01) 보간 기반 예상액입니다. 실제 가입액은 한국주택금융공사 조회·상담으로 확인하세요. 기존 가입자 소급 없음.';

  if (reasons.length > 0) {
    return {
      monthlyPayout: 0,
      annualPayout: 0,
      initialGuaranteeFee: 0,
      annualGuaranteeFeeRate: ANNUAL_GUARANTEE_FEE_RATE,
      eligible: false,
      ineligibilityReasons: reasons,
      notice,
      tableVersion: TABLE_VERSION,
    };
  }

  // 상환용: 기존 주담대만큼 일시 인출(최대 시세의 90%) 후 잔여 시세로 월액 산정
  let effectivePrice = input.housePrice;
  let lumpSumWithdrawal: number | undefined;
  if (input.productType === 'LOAN_REPAY') {
    const balance = Math.max(0, input.existingMortgageBalance ?? 0);
    lumpSumWithdrawal = Math.min(balance, Math.floor(input.housePrice * 0.9));
    effectivePrice = Math.max(0, input.housePrice - lumpSumWithdrawal);
  }

  // 1차 MVP는 종신·정액 표만 사용 (혼합·증액형은 동일 표 + 안내)
  let monthly = interpolateLifetimeFlatPayout(input.youngerSpouseAge, effectivePrice);

  if (input.productType === 'PREFERENTIAL') {
    monthly = Math.round(monthly * preferentialMultiplier(input.housePrice));
  }

  return {
    monthlyPayout: monthly,
    annualPayout: monthly * 12,
    initialGuaranteeFee: Math.round(input.housePrice * INITIAL_GUARANTEE_FEE_RATE),
    annualGuaranteeFeeRate: ANNUAL_GUARANTEE_FEE_RATE,
    eligible: true,
    ineligibilityReasons: [],
    notice,
    tableVersion: TABLE_VERSION,
    ...(lumpSumWithdrawal !== undefined ? { lumpSumWithdrawal } : {}),
  };
}
