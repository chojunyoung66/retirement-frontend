import { describe, expect, it } from 'vitest';
import {
  draftFromAccountAsset,
  emptyAccountAssetDraft,
  toAccountAssetRequest,
  unknownNonDeductibleOf,
  visibleFieldsOf,
  type AccountAssetDraft,
} from './account-asset-form';
import type { AccountAsset } from '../api/account-asset-api';

const draft = (overrides: Partial<AccountAssetDraft>): AccountAssetDraft => ({
  ...emptyAccountAssetDraft(),
  ...overrides,
});

const asset = (overrides: Partial<AccountAsset>): AccountAsset => ({
  id: 1,
  userId: 1,
  accountType: 'IRP',
  accountName: null,
  institution: null,
  balance: 50_000_000,
  principalTaxCredited: 30_000_000,
  principalNonDeductible: 0,
  investmentGain: 10_000_000,
  deferredRetirementIncome: 0,
  irpSource: 'PERSONAL',
  pensionSavingsLegacy: null,
  isaMaturityYm: null,
  verifiedAt: null,
  createdAt: '2026-10-05T00:00:00.000Z',
  updatedAt: '2026-10-05T00:00:00.000Z',
  ...overrides,
});

describe('visibleFieldsOf', () => {
  it('계좌 유형별로 필요한 칸만 보인다', () => {
    expect(visibleFieldsOf('DC').buckets).toEqual(['deferredRetirementIncome']);
    expect(visibleFieldsOf('PENSION_SAVINGS')).toMatchObject({
      buckets: ['principalTaxCredited', 'principalNonDeductible', 'investmentGain'],
      pensionSavingsLegacy: true,
      irpSource: false,
    });
    expect(visibleFieldsOf('IRP')).toMatchObject({ irpSource: true });
    expect(visibleFieldsOf('IRP').buckets).toHaveLength(4);
    expect(visibleFieldsOf('ISA')).toMatchObject({ buckets: ['investmentGain'], isaMaturityYm: true });
    expect(visibleFieldsOf('CASH').buckets).toEqual([]);
    expect(visibleFieldsOf('BROKERAGE').buckets).toEqual([]);
  });
});

describe('toAccountAssetRequest', () => {
  it('만원 입력을 원 단위로 바꾸고 숨은 칸은 비운다', () => {
    const result = toAccountAssetRequest(
      draft({
        accountType: 'ISA',
        balanceWan: '3000',
        bucketsWan: {
          principalTaxCredited: '100',
          principalNonDeductible: '',
          investmentGain: '500',
          deferredRetirementIncome: '',
        },
        irpSource: 'PERSONAL',
        isaMaturityYm: '2027-03',
        pensionSavingsLegacy: true,
      }),
    );
    expect(result).toEqual({
      ok: true,
      request: {
        accountType: 'ISA',
        accountName: null,
        institution: null,
        balance: 30_000_000,
        principalTaxCredited: 0,
        principalNonDeductible: 0,
        investmentGain: 5_000_000,
        deferredRetirementIncome: 0,
        irpSource: null,
        pensionSavingsLegacy: null,
        isaMaturityYm: '2027-03',
      },
    });
  });

  it('과세구분 합계가 잔액을 넘으면 거부한다', () => {
    const result = toAccountAssetRequest(
      draft({
        accountType: 'PENSION_SAVINGS',
        balanceWan: '1000',
        bucketsWan: {
          principalTaxCredited: '800',
          principalNonDeductible: '300',
          investmentGain: '',
          deferredRetirementIncome: '',
        },
      }),
    );
    expect(result.ok).toBe(false);
  });

  it.each([
    [draft({ accountType: '', balanceWan: '100' })],
    [draft({ accountType: 'CASH', balanceWan: '' })],
    [draft({ accountType: 'CASH', balanceWan: '-1' })],
    [draft({ accountType: 'CASH', balanceWan: '300000' })],
    [draft({ accountType: 'CASH', balanceWan: '1,000' })],
  ])('유형·잔액이 잘못되면 거부한다 (%#)', (input) => {
    expect(toAccountAssetRequest(input).ok).toBe(false);
  });

  it('저장된 계좌를 폼 값으로 되돌릴 수 있다', () => {
    const restored = toAccountAssetRequest(draftFromAccountAsset(asset({})));
    expect(restored).toMatchObject({
      ok: true,
      request: { balance: 50_000_000, principalTaxCredited: 30_000_000, irpSource: 'PERSONAL' },
    });
  });
});

describe('unknownNonDeductibleOf', () => {
  it('연금저축·IRP의 미확인 금액만 계산한다', () => {
    expect(unknownNonDeductibleOf(asset({}))).toBe(10_000_000);
    expect(unknownNonDeductibleOf(asset({ accountType: 'CASH' }))).toBe(0);
  });

  it('퇴직금만 이전된 IRP는 확인 대상이 아니다', () => {
    expect(
      unknownNonDeductibleOf(
        asset({ irpSource: 'SEVERANCE', principalTaxCredited: 0, investmentGain: 0 }),
      ),
    ).toBe(0);
  });
});
