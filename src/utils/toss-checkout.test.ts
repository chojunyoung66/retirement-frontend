// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tosspayments/tosspayments-sdk', () => ({ ANONYMOUS: '@@ANONYMOUS', loadTossPayments: vi.fn() }));

import { consumePaymentReturn, isCheckoutCanceled, isTossConfigured, rememberPaymentReturn } from './toss-checkout';

beforeEach(() => {
  sessionStorage.clear();
});

describe('toss-checkout', () => {
  it('클라이언트 키가 비어 있으면 결제창을 열지 않는다', () => {
    expect(isTossConfigured('test_ck_123')).toBe(true);
    expect(isTossConfigured('  ')).toBe(false);
    expect(isTossConfigured(undefined)).toBe(false);
  });

  it('돌아갈 실행안 주소는 한 번만 꺼내고, 실행안 경로만 허용한다', () => {
    rememberPaymentReturn('/withdrawal-plan/3/D');
    expect(consumePaymentReturn()).toBe('/withdrawal-plan/3/D');
    expect(consumePaymentReturn()).toBeNull();
    rememberPaymentReturn('https://evil.example');
    expect(consumePaymentReturn()).toBeNull();
  });

  it('사용자가 결제창을 닫은 경우를 구분한다', () => {
    expect(isCheckoutCanceled({ code: 'USER_CANCEL' })).toBe(true);
    expect(isCheckoutCanceled({ code: 'INVALID_CARD' })).toBe(false);
    expect(isCheckoutCanceled(null)).toBe(false);
  });
});
