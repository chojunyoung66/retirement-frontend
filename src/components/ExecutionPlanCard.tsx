import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getExecutionPlan, startExecutionPlan, type ExecutionPlan } from '../api/concierge-api';
import { getApiErrorMessage } from '../utils/api-error-message';
import { progressPercent } from '../utils/concierge-view';
import { trackExecutionPlanStarted } from '../analytics';

/** 리포트 화면의 100일 실행 카드 — 시작 전이면 시작 버튼, 시작했으면 진행률 */
export default function ExecutionPlanCard({ reportId, scenarioType }: { reportId: number; scenarioType: string }) {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const path = `/report/${reportId}/execution`;

  useEffect(() => {
    let active = true;
    getExecutionPlan(reportId)
      .then((value) => {
        if (active) setPlan(value);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [reportId]);

  const handleStart = async () => {
    setBusy(true);
    setError(null);
    try {
      await startExecutionPlan(reportId);
      trackExecutionPlanStarted(scenarioType);
      navigate(path);
    } catch (err) {
      setError(getApiErrorMessage(err, '100일 실행을 시작하지 못했어요. 잠시 후 다시 시도해 주세요'));
      setBusy(false);
    }
  };

  if (!loaded) return null;

  if (!plan) {
    return (
      <div className="card no-print">
        <div className="card-title">100일 실행 체크리스트</div>
        <p className="form-hint" style={{ marginTop: 0 }}>
          이 리포트의 실행안을 날짜별 할 일(건보료·연금 과세 확인, 계좌 이전, 30·60·100일 점검)로 나눠 드려요. 오늘을
          1일째로 시작해요.
        </p>
        {error && (
          <div className="form-error mb-8" role="alert">
            {error}
          </div>
        )}
        <button className="btn-cta" onClick={() => void handleStart()} disabled={busy}>
          {busy ? '준비 중...' : '100일 실행 시작'}
        </button>
      </div>
    );
  }

  const percent = progressPercent(plan.progress.done, plan.progress.total);
  return (
    <div className="card no-print">
      <div className="card-title">100일 실행 체크리스트</div>
      <p className="form-hint" style={{ marginTop: 0 }}>
        {plan.progress.currentDay}일째 · {plan.progress.total}개 중 {plan.progress.done}개 완료
      </p>
      <div
        className="progress-bar mb-8"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <Link className="btn-secondary" to={path} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
        체크리스트 열기
      </Link>
    </div>
  );
}
