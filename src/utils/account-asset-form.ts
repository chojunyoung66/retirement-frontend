import type {
  AccountAsset,
  AccountAssetRequest,
  AccountAssetType,
  IrpSource,
} from '../api/account-asset-api';

export const ACCOUNT_TYPE_LABEL: Record<AccountAssetType, string> = {
  DC: '퇴직연금 DC',
  PENSION_SAVINGS: '연금저축',
  IRP: '개인IRP',
  ISA: 'ISA',
  BROKERAGE: '주식계좌',
  CASH: '현금성 자산',
};

export const IRP_SOURCE_LABEL: Record<IrpSource, string> = {
  PERSONAL: '개인 납입',
  SEVERANCE: '퇴직금 이전',
  MIXED: '개인 납입 + 퇴직금',
  UNKNOWN: '모름',
};

export type BucketField =
  | 'principalTaxCredited'
  | 'principalNonDeductible'
  | 'investmentGain'
  | 'deferredRetirementIncome';

export const BUCKET_LABEL: Record<BucketField, string> = {
  principalTaxCredited: '세액공제 받은 원금',
  principalNonDeductible: '세액공제 안 받은 원금',
  investmentGain: '운용수익',
  deferredRetirementIncome: '이연퇴직소득(퇴직금)',
};

const BUCKET_FIELDS: readonly BucketField[] = [
  'principalTaxCredited',
  'principalNonDeductible',
  'investmentGain',
  'deferredRetirementIncome',
];

export interface AccountFieldVisibility {
  buckets: readonly BucketField[];
  irpSource: boolean;
  pensionSavingsLegacy: boolean;
  isaMaturityYm: boolean;
}

/** 계좌 유형별로 보여 줄 과세구분·보조 입력 칸 (서버 검증 규칙과 같음) */
export function visibleFieldsOf(type: AccountAssetType): AccountFieldVisibility {
  switch (type) {
    case 'DC':
      return { buckets: ['deferredRetirementIncome'], irpSource: false, pensionSavingsLegacy: false, isaMaturityYm: false };
    case 'PENSION_SAVINGS':
      return {
        buckets: ['principalTaxCredited', 'principalNonDeductible', 'investmentGain'],
        irpSource: false,
        pensionSavingsLegacy: true,
        isaMaturityYm: false,
      };
    case 'IRP':
      return { buckets: BUCKET_FIELDS, irpSource: true, pensionSavingsLegacy: false, isaMaturityYm: false };
    case 'ISA':
      return { buckets: ['investmentGain'], irpSource: false, pensionSavingsLegacy: false, isaMaturityYm: true };
    default:
      return { buckets: [], irpSource: false, pensionSavingsLegacy: false, isaMaturityYm: false };
  }
}

/** 입력 폼 상태 — 금액은 만원 단위 문자열 */
export interface AccountAssetDraft {
  accountType: AccountAssetType | '';
  accountName: string;
  institution: string;
  balanceWan: string;
  bucketsWan: Record<BucketField, string>;
  irpSource: IrpSource | '';
  pensionSavingsLegacy: boolean;
  isaMaturityYm: string;
}

export function emptyAccountAssetDraft(): AccountAssetDraft {
  return {
    accountType: '',
    accountName: '',
    institution: '',
    balanceWan: '',
    bucketsWan: {
      principalTaxCredited: '',
      principalNonDeductible: '',
      investmentGain: '',
      deferredRetirementIncome: '',
    },
    irpSource: '',
    pensionSavingsLegacy: false,
    isaMaturityYm: '',
  };
}

const wonToWanText = (won: number): string => (won ? String(won / 10000) : '');

export function draftFromAccountAsset(asset: AccountAsset): AccountAssetDraft {
  return {
    accountType: asset.accountType,
    accountName: asset.accountName ?? '',
    institution: asset.institution ?? '',
    balanceWan: wonToWanText(asset.balance),
    bucketsWan: {
      principalTaxCredited: wonToWanText(asset.principalTaxCredited),
      principalNonDeductible: wonToWanText(asset.principalNonDeductible),
      investmentGain: wonToWanText(asset.investmentGain),
      deferredRetirementIncome: wonToWanText(asset.deferredRetirementIncome),
    },
    irpSource: asset.irpSource ?? '',
    pensionSavingsLegacy: asset.pensionSavingsLegacy ?? false,
    isaMaturityYm: asset.isaMaturityYm ?? '',
  };
}

// 서버 Int4 저장 상한(20억원)
const MAX_WAN = 200_000;

const parseWan = (text: string): number | null => {
  const trimmed = text.trim();
  if (trimmed === '') return 0;
  if (!/^\d+(\.\d{1,4})?$/.test(trimmed)) return null;
  const wan = Number(trimmed);
  return wan <= MAX_WAN ? Math.round(wan * 10000) : null;
};

export type DraftResult =
  | { ok: true; request: AccountAssetRequest }
  | { ok: false; error: string };

/** 폼 값을 API 요청으로 변환 — 유형에 없는 칸은 0/null로 비운다 */
export function toAccountAssetRequest(draft: AccountAssetDraft): DraftResult {
  if (!draft.accountType) return { ok: false, error: '계좌 유형을 선택하세요' };
  const balance = parseWan(draft.balanceWan);
  if (balance === null || draft.balanceWan.trim() === '') {
    return { ok: false, error: '잔액을 만원 단위 숫자로 입력하세요 (최대 20억원)' };
  }
  const visible = visibleFieldsOf(draft.accountType);
  const buckets = {} as Record<BucketField, number>;
  for (const field of BUCKET_FIELDS) {
    if (!visible.buckets.includes(field)) {
      buckets[field] = 0;
      continue;
    }
    const value = parseWan(draft.bucketsWan[field]);
    if (value === null) return { ok: false, error: `${BUCKET_LABEL[field]}을(를) 숫자로 입력하세요` };
    buckets[field] = value;
  }
  const bucketSum = BUCKET_FIELDS.reduce((sum, field) => sum + buckets[field], 0);
  if (bucketSum > balance) {
    return { ok: false, error: '과세구분 금액의 합계가 잔액보다 클 수 없어요' };
  }
  if (visible.isaMaturityYm && draft.isaMaturityYm && !/^\d{4}-(0[1-9]|1[0-2])$/.test(draft.isaMaturityYm)) {
    return { ok: false, error: 'ISA 만기월을 다시 선택하세요' };
  }
  return {
    ok: true,
    request: {
      accountType: draft.accountType,
      accountName: draft.accountName.trim() || null,
      institution: draft.institution.trim() || null,
      balance,
      ...buckets,
      irpSource: visible.irpSource && draft.irpSource ? draft.irpSource : null,
      pensionSavingsLegacy: visible.pensionSavingsLegacy ? draft.pensionSavingsLegacy : null,
      isaMaturityYm: visible.isaMaturityYm && draft.isaMaturityYm ? draft.isaMaturityYm : null,
    },
  };
}

/** 연금저축·IRP에서 과세구분이 확인되지 않은 금액 (퇴직금만 이전된 IRP는 제외) */
export function unknownNonDeductibleOf(asset: AccountAsset): number {
  if (asset.accountType !== 'PENSION_SAVINGS' && asset.accountType !== 'IRP') return 0;
  if (asset.accountType === 'IRP' && asset.irpSource === 'SEVERANCE' && asset.deferredRetirementIncome === 0) {
    return 0;
  }
  const known = BUCKET_FIELDS.reduce((sum, field) => sum + asset[field], 0);
  return Math.max(0, asset.balance - known);
}
