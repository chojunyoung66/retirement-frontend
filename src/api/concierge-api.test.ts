import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get, patch } = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));

vi.mock('./client', () => ({
  default: { get, post: vi.fn(), patch, delete: vi.fn() },
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

import { getExecutionPlan, parseExecutionPlan, parseReviewRequest, setExecutionItemDone } from './concierge-api';
import { parseAdminPayments } from './admin-api';

const plan = {
  id: 4,
  reportId: 7,
  startDate: '2026-10-06T00:00:00.000Z',
  items: [{ key: 'health-premium-check', label: '건보료 확인', dueDay: 7, doneAt: null }],
  progress: { done: 0, total: 1, currentDay: 1 },
  createdAt: '2026-10-06T00:00:00.000Z',
  updatedAt: '2026-10-06T00:00:00.000Z',
};

beforeEach(() => {
  get.mockReset();
  patch.mockReset();
});

describe('검토 요청 파싱', () => {
  it('사용자 응답에는 운영자 메모가 없다', () => {
    const parsed = parseReviewRequest({
      id: 1,
      reportId: 7,
      question: '순서가 맞나요?',
      consentAt: '2026-10-06T00:00:00.000Z',
      status: 'REQUESTED',
      answer: null,
      answeredAt: null,
      createdAt: '2026-10-06T00:00:00.000Z',
      updatedAt: '2026-10-06T00:00:00.000Z',
      operatorNote: '내부 메모',
    });
    expect(parsed).not.toHaveProperty('operatorNote');
    expect(parsed.status).toBe('REQUESTED');
  });
});

describe('100일 실행', () => {
  it('계획을 파싱한다', () => {
    expect(parseExecutionPlan(plan).items[0].dueDay).toBe(7);
  });

  it('시작 전(data: null)이면 null', async () => {
    get.mockResolvedValue({ data: { success: true, data: null } });
    await expect(getExecutionPlan(7)).resolves.toBeNull();
  });

  it('이전 서버의 EXECUTION_PLAN_NOT_FOUND 404도 null', async () => {
    get.mockRejectedValue(
      Object.assign(new Error('x'), {
        isAxiosError: true,
        response: { status: 404, data: { error: { code: 'EXECUTION_PLAN_NOT_FOUND' } } },
      }),
    );
    await expect(getExecutionPlan(7)).resolves.toBeNull();
  });

  it('다른 404(리포트 없음)는 그대로 던진다', async () => {
    get.mockRejectedValue(
      Object.assign(new Error('x'), {
        isAxiosError: true,
        response: { status: 404, data: { error: { code: 'REPORT_NOT_FOUND' } } },
      }),
    );
    await expect(getExecutionPlan(7)).rejects.toMatchObject({ errorCode: 'REPORT_NOT_FOUND' });
  });

  it('항목 완료는 계획 id와 항목 키로 보낸다', async () => {
    patch.mockResolvedValue({ data: { data: plan } });
    await setExecutionItemDone(4, 'health-premium-check', true);
    expect(patch).toHaveBeenCalledWith('/execution-plans/4/items/health-premium-check', { done: true });
  });
});

describe('운영자 결제 목록', () => {
  it('결제 키 없이 운영 정보만 읽는다', () => {
    const [row] = parseAdminPayments([
      {
        id: 1,
        orderId: 'rpt_abc',
        userId: 3,
        userEmail: 'a@b.c',
        product: 'REPORT',
        amount: 9900,
        status: 'PAID',
        scenarioSetId: 2,
        scenarioType: 'D',
        method: '카드',
        approvedAt: '2026-10-06T00:00:00.000Z',
        canceledAt: null,
        cancelReason: null,
        receiptUrl: null,
        failureCode: null,
        consumedAt: '2026-10-06T00:00:00.000Z',
        reportId: 7,
        reportDownloadedAt: null,
        createdAt: '2026-10-06T00:00:00.000Z',
        updatedAt: '2026-10-06T00:00:00.000Z',
      },
    ]);
    expect(row).not.toHaveProperty('paymentKey');
    expect(row.status).toBe('PAID');
  });
});
