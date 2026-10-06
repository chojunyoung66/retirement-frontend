import type { AdminPayment, PaymentStatus } from '../api/admin-api';

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  READY: '결제 대기',
  PAID: '결제 완료',
  FAILED: '실패',
  CANCELED: '취소',
  REFUNDED: '환불',
};

export const REFUND_WINDOW_DAYS = 7;

/** 약관 기준 단순 변심 환불 대상 — 결제 후 7일 이내이고 PDF·엑셀을 받지 않음 */
export function isWithinRefundPolicy(
  payment: Pick<AdminPayment, 'status' | 'approvedAt' | 'reportDownloadedAt'>,
  now: Date = new Date(),
): boolean {
  if (payment.status !== 'PAID' || !payment.approvedAt || payment.reportDownloadedAt) return false;
  const elapsed = now.getTime() - new Date(payment.approvedAt).getTime();
  return elapsed <= REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}
