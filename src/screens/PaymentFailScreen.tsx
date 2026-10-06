import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { readPaymentFailQuery, reportPaymentFailure } from '../api/payment-api';
import { consumePaymentReturn } from '../utils/toss-checkout';
import { trackReportPurchaseFailed } from '../analytics';

const CANCEL_CODES = new Set(['PAY_PROCESS_CANCELED', 'USER_CANCEL']);

export default function PaymentFailScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { code, message, orderId } = readPaymentFailQuery(location.search);
  const returnTo = useRef(consumePaymentReturn() ?? '/withdrawal-scenarios');
  const reported = useRef(false);
  const canceled = CANCEL_CODES.has(code);

  useEffect(() => {
    if (reported.current) return;
    reported.current = true;
    trackReportPurchaseFailed(code);
    if (orderId) void reportPaymentFailure(orderId, code).catch(() => undefined);
  }, [code, orderId]);

  return (
    <div className="screen-content">
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="card-title">{canceled ? '결제를 취소했어요' : '결제하지 못했어요'}</div>
        <p className="card-subtitle">
          {canceled ? '결제되지 않았어요. 언제든 다시 시도할 수 있어요.' : message || '잠시 후 다시 시도해 주세요.'}
        </p>
        <button className="btn-cta" onClick={() => navigate(returnTo.current, { replace: true })}>
          실행안으로 돌아가기
        </button>
      </div>
    </div>
  );
}
