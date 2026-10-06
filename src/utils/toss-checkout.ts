import { ANONYMOUS, loadTossPayments } from '@tosspayments/tosspayments-sdk';
import type { ReportOrder } from '../api/payment-api';

export const PAYMENT_SUCCESS_PATH = '/payments/success';
export const PAYMENT_FAIL_PATH = '/payments/fail';

/** 결제창을 연 리포트 실행안 — 실패하면 그 화면으로 돌려보낸다 */
const RETURN_KEY = 'rc_payment_return_to';

export const rememberPaymentReturn = (path: string): void => {
  try {
    sessionStorage.setItem(RETURN_KEY, path);
  } catch {
    /* ignore */
  }
};

export const consumePaymentReturn = (): string | null => {
  try {
    const path = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    return path && path.startsWith('/withdrawal-plan/') ? path : null;
  } catch {
    return null;
  }
};

export const isTossConfigured = (clientKey: string | undefined = import.meta.env.VITE_TOSS_CLIENT_KEY): boolean =>
  typeof clientKey === 'string' && clientKey.trim().length > 0;

/**
 * 카드·간편결제 통합결제창을 연다. 성공·실패 시 결제창이 successUrl·failUrl로 이동시킨다.
 * 구매자 식별정보는 결제사에 넘기지 않는다 (비회원 customerKey)
 */
export async function openTossCheckout(order: ReportOrder): Promise<void> {
  const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;
  if (!isTossConfigured(clientKey)) {
    throw new Error('TOSS_CLIENT_KEY_MISSING');
  }
  const tossPayments = await loadTossPayments(clientKey!.trim());
  const payment = tossPayments.payment({ customerKey: ANONYMOUS });
  await payment.requestPayment({
    method: 'CARD',
    amount: { currency: 'KRW', value: order.amount },
    orderId: order.orderId,
    orderName: order.orderName,
    successUrl: `${window.location.origin}${PAYMENT_SUCCESS_PATH}`,
    failUrl: `${window.location.origin}${PAYMENT_FAIL_PATH}`,
    card: { flowMode: 'DEFAULT', useEscrow: false },
  });
}

/** 결제창을 닫은 경우 — 사용자 취소라 오류 안내를 띄우지 않는다 */
export const isCheckoutCanceled = (err: unknown): boolean => {
  const code = (err as { code?: unknown } | null)?.code;
  return code === 'USER_CANCEL' || code === 'PAY_PROCESS_CANCELED';
};
