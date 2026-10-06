import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { readPaymentSuccessQuery } from '../api/payment-api';
import { usePayment } from '../hooks/usePayment';
import { consumePaymentReturn } from '../utils/toss-checkout';
import { trackReportCreated, trackReportPurchased, trackReportPurchaseFailed } from '../analytics';

type Phase = 'confirming' | 'failed' | 'missing-report' | 'invalid';

export default function PaymentSuccessScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm, error } = usePayment();
  const query = readPaymentSuccessQuery(location.search);
  const [phase, setPhase] = useState<Phase>(query ? 'confirming' : 'invalid');
  const started = useRef(false);

  const runConfirm = useCallback(async () => {
    if (!query) return;
    setPhase('confirming');
    try {
      const result = await confirm(query);
      consumePaymentReturn();
      trackReportPurchased(result.scenarioType, result.method);
      if (result.reportId === null) {
        setPhase('missing-report');
        return;
      }
      trackReportCreated(result.scenarioType);
      navigate(`/report/${result.reportId}`, { replace: true, state: { justCreated: true } });
    } catch (err) {
      trackReportPurchaseFailed((err as { errorCode?: string } | null)?.errorCode);
      setPhase('failed');
    }
    // query는 주소에서 매번 새로 읽으므로 의존성에서 뺀다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, confirm, navigate]);

  // StrictMode에서 두 번 승인하지 않도록 한 번만 실행 — 서버도 같은 주문은 한 번만 승인한다
  useEffect(() => {
    if (started.current || !query) return;
    started.current = true;
    void runConfirm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="screen-content">
      <div className="card" style={{ textAlign: 'center' }}>
        {phase === 'confirming' && (
          <>
            <div className="card-title">결제를 확인하고 있어요</div>
            <p className="card-subtitle" role="status">
              리포트를 만드는 중이에요. 이 화면을 닫지 말아 주세요.
            </p>
          </>
        )}
        {phase === 'failed' && (
          <>
            <div className="card-title">결제를 확인하지 못했어요</div>
            <div className="form-error mb-8" role="alert">
              {error ?? '잠시 후 다시 시도해 주세요'}
            </div>
            <p className="form-hint">
              결제가 끝났는데 리포트가 보이지 않으면 다시 시도해 주세요. 같은 결제가 두 번 청구되지 않아요.
            </p>
            <div className="report-sheet-actions">
              <Link className="btn-back" to="/reports">
                리포트 목록
              </Link>
              <button className="btn-cta" onClick={() => void runConfirm()}>
                다시 시도
              </button>
            </div>
          </>
        )}
        {phase === 'missing-report' && (
          <>
            <div className="card-title">이미 처리된 결제예요</div>
            <p className="card-subtitle">
              이 결제로 만든 리포트가 삭제되었어요. 환불이 필요하면 고객센터로 문의해 주세요.
            </p>
            <Link to="/reports">리포트 목록으로</Link>
          </>
        )}
        {phase === 'invalid' && (
          <>
            <div className="card-title">잘못된 주소예요</div>
            <p className="card-subtitle">결제 정보가 없어요. 실행안 화면에서 다시 시도해 주세요.</p>
            <Link to="/withdrawal-scenarios">시나리오 비교로</Link>
          </>
        )}
      </div>
    </div>
  );
}
