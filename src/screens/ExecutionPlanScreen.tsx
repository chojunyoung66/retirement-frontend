import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getExecutionPlan,
  setExecutionItemDone,
  startExecutionPlan,
  type ExecutionItem,
  type ExecutionPlan,
} from '../api/concierge-api';
import { getApiErrorMessage } from '../utils/api-error-message';
import { dueDateLabel, groupItemsByWeek, progressPercent } from '../utils/concierge-view';
import { formatReportDate } from '../utils/report-view';
import { trackExecutionItemCompleted } from '../analytics';

export default function ExecutionPlanScreen() {
  const params = useParams();
  const reportId = Number(params.id);
  const validId = Number.isSafeInteger(reportId) && reportId > 0;
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!validId) return;
    let active = true;
    getExecutionPlan(reportId)
      .then((value) => {
        if (active) setPlan(value);
      })
      .catch((err) => {
        if (active) setError(getApiErrorMessage(err, '체크리스트를 불러오지 못했어요'));
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [validId, reportId]);

  const handleStart = async () => {
    setError(null);
    try {
      setPlan(await startExecutionPlan(reportId));
    } catch (err) {
      setError(getApiErrorMessage(err, '100일 실행을 시작하지 못했어요'));
    }
  };

  const handleToggle = async (item: ExecutionItem) => {
    if (!plan || pendingKey) return;
    const done = item.doneAt === null;
    setPendingKey(item.key);
    setError(null);
    try {
      setPlan(await setExecutionItemDone(plan.id, item.key, done));
      if (done) trackExecutionItemCompleted(item.dueDay);
    } catch (err) {
      setError(getApiErrorMessage(err, '저장하지 못했어요. 다시 시도해 주세요'));
    } finally {
      setPendingKey(null);
    }
  };

  if (!validId) {
    return (
      <div className="screen-content">
        <div className="card">
          <p className="card-subtitle">잘못된 주소예요.</p>
          <Link to="/reports">내 리포트로</Link>
        </div>
      </div>
    );
  }

  const percent = plan ? progressPercent(plan.progress.done, plan.progress.total) : 0;
  const currentWeek = plan ? Math.ceil(plan.progress.currentDay / 7) : 0;

  return (
    <div className="screen-content">
      <section className="hero">
        <h1 className="hero-title">100일 실행 체크리스트</h1>
        {plan && (
          <p className="hero-subtitle">
            {formatReportDate(plan.startDate)} 시작 · 오늘 {plan.progress.currentDay}일째
          </p>
        )}
      </section>

      {error && (
        <div className="form-error mb-8" role="alert">
          {error}
        </div>
      )}
      {!loaded && (
        <div className="card" style={{ textAlign: 'center' }}>
          불러오는 중...
        </div>
      )}

      {loaded && !plan && !error && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="card-subtitle">아직 100일 실행을 시작하지 않았어요.</p>
          <button className="btn-cta" onClick={() => void handleStart()}>
            오늘부터 시작하기
          </button>
        </div>
      )}

      {plan && (
        <>
          <div className="card">
            <div className="item-row">
              <span className="item-row-label">진행률</span>
              <span className="item-row-value">
                {plan.progress.done}/{plan.progress.total} ({percent}%)
              </span>
            </div>
            <div
              className="progress-bar"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${percent}%` }} />
            </div>
            <p className="form-hint" style={{ marginBottom: 0 }}>
              날짜는 리포트를 기준으로 한 권장 시점이에요. 실제 신청 기한은 각 기관 안내를 확인하세요.
            </p>
          </div>

          {groupItemsByWeek(plan.items).map((week) => (
            <div
              key={week.week}
              className="card"
              style={week.week === currentWeek ? { borderColor: 'var(--primary)', borderWidth: 2 } : undefined}
            >
              <div className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {week.week}주차
                <span className="form-hint" style={{ margin: 0, fontWeight: 400 }}>
                  D{week.startDay}~D{week.endDay}
                </span>
                {week.week === currentWeek && <span className="badge badge-success">이번 주</span>}
              </div>
              {week.items.map((item) => {
                const done = item.doneAt !== null;
                const overdue = !done && item.dueDay < plan.progress.currentDay;
                return (
                  <label key={item.key} className={`check-item${done ? ' done' : ''}`}>
                    <input
                      type="checkbox"
                      checked={done}
                      disabled={pendingKey !== null}
                      onChange={() => void handleToggle(item)}
                    />
                    <span>
                      <span className="check-item-label">{item.label}</span>
                      <span className="form-hint" style={{ display: 'block', margin: 0 }}>
                        {dueDateLabel(plan.startDate, item.dueDay)}까지 (D{item.dueDay})
                        {overdue && <span style={{ color: '#e74c3c' }}> · 지남</span>}
                        {done && item.doneAt && ` · ${formatReportDate(item.doneAt)} 완료`}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          ))}
        </>
      )}

      <div className="mt-16">
        <Link className="btn-back" to={`/report/${reportId}`} style={{ display: 'block', textAlign: 'center' }}>
          리포트로 돌아가기
        </Link>
      </div>
    </div>
  );
}
