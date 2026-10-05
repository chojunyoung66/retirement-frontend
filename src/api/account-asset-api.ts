import { isAxiosError } from 'axios';
import z from 'zod';
import client, { ApiError } from './client';

export const ACCOUNT_ASSET_TYPES = [
  'DC',
  'PENSION_SAVINGS',
  'IRP',
  'ISA',
  'BROKERAGE',
  'CASH',
] as const;
export const IRP_SOURCES = ['PERSONAL', 'SEVERANCE', 'MIXED', 'UNKNOWN'] as const;

const accountAssetSchema = z.object({
  id: z.number(),
  userId: z.number(),
  accountType: z.enum(ACCOUNT_ASSET_TYPES),
  accountName: z.string().nullable(),
  institution: z.string().nullable(),
  balance: z.number(),
  principalTaxCredited: z.number(),
  principalNonDeductible: z.number(),
  investmentGain: z.number(),
  deferredRetirementIncome: z.number(),
  irpSource: z.enum(IRP_SOURCES).nullable(),
  pensionSavingsLegacy: z.boolean().nullable(),
  isaMaturityYm: z.string().nullable(),
  verifiedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const wonAmount = z.number().int().nonnegative();

const accountAssetReqSchema = z.object({
  accountType: z.enum(ACCOUNT_ASSET_TYPES),
  accountName: z.string().nullable(),
  institution: z.string().nullable(),
  balance: wonAmount,
  principalTaxCredited: wonAmount,
  principalNonDeductible: wonAmount,
  investmentGain: wonAmount,
  deferredRetirementIncome: wonAmount,
  irpSource: z.enum(IRP_SOURCES).nullable(),
  pensionSavingsLegacy: z.boolean().nullable(),
  isaMaturityYm: z.string().nullable(),
});

export type AccountAssetType = (typeof ACCOUNT_ASSET_TYPES)[number];
export type IrpSource = (typeof IRP_SOURCES)[number];
export type AccountAsset = z.infer<typeof accountAssetSchema>;
export type AccountAssetRequest = z.infer<typeof accountAssetReqSchema>;

const toApiError = (err: unknown): unknown =>
  isAxiosError(err)
    ? new ApiError(err.response?.data?.error?.code || 'UNKNOWN_ERROR', err.response?.status)
    : err;

const parseOrThrow = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new Error('유효하지 않은 응답 형식입니다');
  return parsed.data;
};

export const parseAccountAssets = (data: unknown): AccountAsset[] =>
  parseOrThrow(z.array(accountAssetSchema), data);

// 계좌 목록 조회
export const getAccountAssets = async (): Promise<AccountAsset[]> => {
  try {
    const res = await client.get('/account-assets');
    return parseAccountAssets(res.data.data);
  } catch (err: unknown) {
    throw toApiError(err);
  }
};

// 계좌 추가
export const createAccountAsset = async (data: AccountAssetRequest): Promise<AccountAsset> => {
  try {
    const parsedReq = accountAssetReqSchema.safeParse(data);
    if (!parsedReq.success) throw new ApiError('VALIDATION_ERROR');
    const res = await client.post('/account-assets', parsedReq.data);
    return parseOrThrow(accountAssetSchema, res.data.data);
  } catch (err: unknown) {
    throw toApiError(err);
  }
};

// 계좌 수정 — 화면은 전체 값을 보내 유형 변경 시 남은 항목이 없도록 한다
export const updateAccountAsset = async (
  id: number,
  data: AccountAssetRequest,
): Promise<AccountAsset> => {
  try {
    const parsedReq = accountAssetReqSchema.safeParse(data);
    if (!parsedReq.success) throw new ApiError('VALIDATION_ERROR');
    const res = await client.patch(`/account-assets/${id}`, parsedReq.data);
    return parseOrThrow(accountAssetSchema, res.data.data);
  } catch (err: unknown) {
    throw toApiError(err);
  }
};

// 계좌 삭제
export const deleteAccountAsset = async (id: number): Promise<void> => {
  try {
    await client.delete(`/account-assets/${id}`);
  } catch (err: unknown) {
    throw toApiError(err);
  }
};

// 계좌 정보 전체 삭제
export const deleteAllAccountAssets = async (): Promise<number> => {
  try {
    const res = await client.delete('/account-assets');
    return parseOrThrow(z.object({ deletedCount: z.number() }), res.data.data).deletedCount;
  } catch (err: unknown) {
    throw toApiError(err);
  }
};
