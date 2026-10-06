import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, get } = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));

vi.mock('./client', () => ({
  default: { get, post, patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {
    errorCode: string;
    httpStatus?: number;
    constructor(code: string, status?: number) {
      super();
      this.errorCode = code;
      this.httpStatus = status;
    }
  },
}));

import {
  confirmPayment,
  createReportOrder,
  getPaymentConfig,
  parseConfirmResult,
  parsePaymentConfig,
  parseReportOrder,
  readPaymentFailQuery,
  readPaymentSuccessQuery,
} from './payment-api';

beforeEach(() => {
  post.mockReset();
  get.mockReset();
});

describe('응답 파싱', () => {
  it('가격 설정을 읽고 잘못된 값은 거부한다', () => {
    expect(parsePaymentConfig({ enabled: true, price: 9900 })).toEqual({ enabled: true, price: 9900 });
    expect(() => parsePaymentConfig({ enabled: true, price: 0 })).toThrow();
    expect(() => parsePaymentConfig({ enabled: 'yes', price: 9900 })).toThrow();
  });

  it('주문 응답은 결제창에 넘길 값만 담는다', () => {
    const order = { orderId: 'rpt_abcdef123456', amount: 9900, orderName: '은퇴현금 실행계획 리포트' };
    expect(parseReportOrder(order)).toEqual(order);
    expect(() => parseReportOrder({ ...order, orderId: 'x' })).toThrow();
  });

  it('승인 결과 — 리포트를 지운 주문은 reportId가 null', () => {
    const result = { orderId: 'rpt_abcdef', status: 'PAID', scenarioType: 'D', method: '카드', reportId: null };
    expect(parseConfirmResult(result).reportId).toBeNull();
    expect(() => parseConfirmResult({ ...result, scenarioType: 'Z' })).toThrow();
  });
});

describe('API 호출', () => {
  it('주문 생성은 실행안만 보내고 금액은 보내지 않는다', async () => {
    post.mockResolvedValue({ data: { data: { orderId: 'rpt_abcdef1', amount: 9900, orderName: '리포트' } } });
    await createReportOrder(3, 'D');
    expect(post).toHaveBeenCalledWith('/payments/report-orders', { scenarioSetId: 3, scenarioType: 'D' });
  });

  it('승인은 결제창이 돌려준 값을 그대로 보내고 오래 기다린다', async () => {
    post.mockResolvedValue({
      data: { data: { orderId: 'rpt_abcdef1', status: 'PAID', scenarioType: 'D', method: '카드', reportId: 5 } },
    });
    const input = { paymentKey: 'pk_1', orderId: 'rpt_abcdef1', amount: 9900 };
    await expect(confirmPayment(input)).resolves.toMatchObject({ reportId: 5 });
    expect(post).toHaveBeenCalledWith('/payments/confirm', input, { timeout: 90_000 });
  });

  it('서버 오류 코드를 ApiError로 바꾼다', async () => {
    const axiosError = Object.assign(new Error('x'), {
      isAxiosError: true,
      response: { status: 402, data: { error: { code: 'PAYMENT_REQUIRED' } } },
    });
    get.mockRejectedValue(axiosError);
    await expect(getPaymentConfig()).rejects.toMatchObject({ errorCode: 'PAYMENT_REQUIRED', httpStatus: 402 });
  });
});

describe('결제창 복귀 쿼리', () => {
  it('성공 쿼리에서 승인에 필요한 값을 꺼낸다', () => {
    expect(readPaymentSuccessQuery('?paymentType=NORMAL&orderId=rpt_1&paymentKey=pk&amount=9900')).toEqual({
      paymentKey: 'pk',
      orderId: 'rpt_1',
      amount: 9900,
    });
  });

  it('값이 빠졌거나 금액이 숫자가 아니면 null', () => {
    expect(readPaymentSuccessQuery('?orderId=rpt_1&amount=9900')).toBeNull();
    expect(readPaymentSuccessQuery('?orderId=rpt_1&paymentKey=pk&amount=abc')).toBeNull();
    expect(readPaymentSuccessQuery('?orderId=rpt_1&paymentKey=pk&amount=-1')).toBeNull();
  });

  it('실패 쿼리 — 코드 형식이 이상하면 UNKNOWN, 메시지는 200자까지', () => {
    expect(readPaymentFailQuery('?code=PAY_PROCESS_CANCELED&message=취소&orderId=rpt_1')).toEqual({
      code: 'PAY_PROCESS_CANCELED',
      message: '취소',
      orderId: 'rpt_1',
    });
    const parsed = readPaymentFailQuery(`?code=<script>&message=${'가'.repeat(300)}`);
    expect(parsed.code).toBe('UNKNOWN');
    expect(parsed.message).toHaveLength(200);
    expect(parsed.orderId).toBeNull();
  });
});
