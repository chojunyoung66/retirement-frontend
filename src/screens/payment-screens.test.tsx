// @vitest-environment jsdom
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { confirmPayment, reportPaymentFailure, track } = vi.hoisted(() => ({
  confirmPayment: vi.fn(),
  reportPaymentFailure: vi.fn(),
  track: {
    purchased: vi.fn(),
    failed: vi.fn(),
    created: vi.fn(),
  },
}));

vi.mock('@tosspayments/tosspayments-sdk', () => ({ ANONYMOUS: '@@ANONYMOUS', loadTossPayments: vi.fn() }));
// 실제 client는 store·router를 끌어와 화면 모듈과 순환 참조가 생긴다
vi.mock('../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {
    errorCode: string;
    constructor(code: string) {
      super();
      this.errorCode = code;
    }
  },
}));
vi.mock('../api/payment-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/payment-api')>()),
  confirmPayment,
  reportPaymentFailure,
}));
vi.mock('../analytics', () => ({
  trackReportPurchased: track.purchased,
  trackReportPurchaseFailed: track.failed,
  trackReportCreated: track.created,
}));

import PaymentSuccessScreen from './PaymentSuccessScreen';
import PaymentFailScreen from './PaymentFailScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

const flush = () => act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
});

async function render(initialEntry: string) {
  const router = createMemoryRouter(
    [
      { path: '/payments/success', element: <PaymentSuccessScreen /> },
      { path: '/payments/fail', element: <PaymentFailScreen /> },
      { path: '/report/:id', element: <div>report page</div> },
      { path: '/withdrawal-plan/:setId/:type', element: <div>plan page</div> },
      { path: '/withdrawal-scenarios', element: <div>scenarios page</div> },
      { path: '/reports', element: <div>reports page</div> },
    ],
    { initialEntries: [initialEntry] },
  );
  await act(async () => {
    root.render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    );
  });
  await flush();
  return router;
}

const click = async (label: string) => {
  const button = [...container.querySelectorAll('button')].find((b) => b.textContent === label);
  if (!button) throw new Error(`button not found: ${label}`);
  await act(async () => {
    button.click();
  });
  await flush();
};

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  sessionStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const SUCCESS_URL = '/payments/success?paymentType=NORMAL&orderId=rpt_abcdef12&paymentKey=pk_1&amount=9900';

describe('PaymentSuccessScreen', () => {
  it('한 번만 승인하고 리포트 화면으로 이동한다 (StrictMode)', async () => {
    confirmPayment.mockResolvedValue({
      orderId: 'rpt_abcdef12',
      status: 'PAID',
      scenarioType: 'D',
      method: '카드',
      reportId: 9,
    });
    const router = await render(SUCCESS_URL);

    expect(confirmPayment).toHaveBeenCalledTimes(1);
    expect(confirmPayment).toHaveBeenCalledWith({ paymentKey: 'pk_1', orderId: 'rpt_abcdef12', amount: 9900 });
    expect(track.purchased).toHaveBeenCalledWith('D', '카드');
    expect(router.state.location.pathname).toBe('/report/9');
    expect(router.state.location.state).toEqual({ justCreated: true });
  });

  it('승인이 실패하면 안내와 다시 시도를 보여 주고, 다시 시도로 이어간다', async () => {
    confirmPayment.mockRejectedValueOnce(Object.assign(new Error(), { errorCode: 'PAYMENT_GATEWAY_UNAVAILABLE' }));
    const router = await render(SUCCESS_URL);

    expect(container.textContent).toContain('결제를 확인하지 못했어요');
    expect(container.textContent).toContain('결제사 응답이 늦어요');
    expect(track.failed).toHaveBeenCalledWith('PAYMENT_GATEWAY_UNAVAILABLE');

    confirmPayment.mockResolvedValueOnce({
      orderId: 'rpt_abcdef12',
      status: 'PAID',
      scenarioType: 'D',
      method: '간편결제',
      reportId: 11,
    });
    await click('다시 시도');
    expect(confirmPayment).toHaveBeenCalledTimes(2);
    expect(router.state.location.pathname).toBe('/report/11');
  });

  it('리포트를 지운 주문이면 이동하지 않고 안내한다', async () => {
    confirmPayment.mockResolvedValue({
      orderId: 'rpt_abcdef12',
      status: 'PAID',
      scenarioType: 'D',
      method: '카드',
      reportId: null,
    });
    const router = await render(SUCCESS_URL);
    expect(router.state.location.pathname).toBe('/payments/success');
    expect(container.textContent).toContain('이미 처리된 결제예요');
  });

  it('결제 정보가 없는 주소는 승인을 부르지 않는다', async () => {
    await render('/payments/success?orderId=rpt_abcdef12');
    expect(confirmPayment).not.toHaveBeenCalled();
    expect(container.textContent).toContain('잘못된 주소예요');
  });
});

describe('PaymentFailScreen', () => {
  it('취소는 취소로 안내하고, 주문을 닫고, 실행안으로 돌아간다', async () => {
    reportPaymentFailure.mockResolvedValue(undefined);
    sessionStorage.setItem('rc_payment_return_to', '/withdrawal-plan/3/D');
    const router = await render('/payments/fail?code=PAY_PROCESS_CANCELED&message=x&orderId=rpt_abcdef12');

    expect(container.textContent).toContain('결제를 취소했어요');
    expect(reportPaymentFailure).toHaveBeenCalledTimes(1);
    expect(reportPaymentFailure).toHaveBeenCalledWith('rpt_abcdef12', 'PAY_PROCESS_CANCELED');
    expect(track.failed).toHaveBeenCalledTimes(1);
    expect(track.failed).toHaveBeenCalledWith('PAY_PROCESS_CANCELED');

    await click('실행안으로 돌아가기');
    expect(router.state.location.pathname).toBe('/withdrawal-plan/3/D');
  });

  it('그 밖의 실패는 결제사 문구를 보여 주고, 돌아갈 곳이 없으면 시나리오 비교로', async () => {
    reportPaymentFailure.mockResolvedValue(undefined);
    const router = await render('/payments/fail?code=REJECT_CARD_COMPANY&message=한도초과&orderId=rpt_abcdef12');
    expect(container.textContent).toContain('결제하지 못했어요');
    expect(container.textContent).toContain('한도초과');

    await click('실행안으로 돌아가기');
    expect(router.state.location.pathname).toBe('/withdrawal-scenarios');
  });
});
