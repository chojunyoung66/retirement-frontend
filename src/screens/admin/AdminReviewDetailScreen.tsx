import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAdminReview, updateAdminReview, type AdminReviewDetail } from '../../api/admin-api';
import { REVIEW_STATUSES, type ReviewStatus } from '../../api/concierge-api';
import AdminNav from '../../components/AdminNav';
import PlanItemCard from '../../components/PlanItemCard';
import { getApiErrorMessage } from '../../utils/api-error-message';
import { dueDateLabel, progressPercent, REVIEW_STATUS_LABEL } from '../../utils/concierge-view';
import { formatWan } from '../../utils/format';
import { formatReportDate } from '../../utils/report-view';
import {
  ACTION_LABEL,
  formatPeriod,
  formatYm,
  summarizeScenarioCard,
  taxBreakdownText,
} from '../../utils/withdrawal-scenario-view';

/** 동의받은 리포트 스냅샷만 보여 준다 — 원본 계좌 데이터는 서버가 내려주지 않는다 */
function ReportSnapshot({ detail }: { detail: AdminReviewDetail }) {
  const { report } = detail;
  const { content } = report;
  const summary = summarizeScenarioCard(content.scenario, content.inputSummary.propertyProvided);

  return (
    <>
      <div className="card">
        <div className="card-title">
          리포트 #{report.id} · {report.title ?? content.title}
        </div>
        <p className="form-hint" style={{ marginTop: 0 }}>
          {formatReportDate(report.generatedAt)} 생성 · {report.scenarioType}안 · 규칙 {report.ruleVersion} · 기간{' '}
          {formatPeriod(content.startYm, content.endYm)}
        </p>
        <div className="item-row">
          <span className="item-row-label">세후 총 인출 / 추정 세금</span>
          <span className="item-row-value">
            {summary.netWithdrawal} / {summary.totalTax}
            {content.scenario.summary.totalTax > 0 && (
              <span className="item-row-sub">
                {taxBreakdownText(content.scenario.summary.totalTax, content.scenario.summary.localIncomeTax)}
              </span>
            )}
          </span>
        </div>
        <div className="item-row">
          <span className="item-row-label">자산 소진</span>
          <span className="item-row-value">{summary.depletion}</span>
        </div>
        <div className="item-row">
          <span className="item-row-label">피부양자 추정 기간</span>
          <span className="item-row-value">{summary.dependentYears}</span>
        </div>
        <div className="item-row">
          <span className="item-row-label">추천안</span>
          <span className="item-row-value">{content.recommendedType}안</span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">지금 할 일</div>
        <ol className="form-hint" style={{ paddingLeft: 18, margin: 0 }}>
          {content.nextActions.map((action) => (
            <li key={`${action.label}-${action.startYm ?? 'start'}`}>
              {formatYm(action.startYm ?? content.startYm)}부터 {action.label} · {ACTION_LABEL[action.actionType]}
              {action.monthlyNet > 0 && <> · 월 평균 세후 {formatWan(action.monthlyNet)}</>}
            </li>
          ))}
        </ol>
      </div>

      <details className="card">
        <summary className="card-title">계좌별 실행안 ({content.scenario.planItems.length})</summary>
        {content.scenario.planItems.map((item) => (
          <PlanItemCard key={`${item.accountType}-${item.accountId ?? 'x'}-${item.priority}`} item={item} />
        ))}
      </details>

      {detail.executionPlan && (
        <details className="card">
          <summary className="card-title">
            100일 실행 · {detail.executionPlan.progress.currentDay}일째 ·{' '}
            {progressPercent(detail.executionPlan.progress.done, detail.executionPlan.progress.total)}%
          </summary>
          <ul className="form-hint" style={{ paddingLeft: 18, margin: 0 }}>
            {detail.executionPlan.items.map((item) => (
              <li key={item.key}>
                {item.doneAt ? '✓' : '○'} {item.label} ({dueDateLabel(detail.executionPlan!.startDate, item.dueDay)})
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

export default function AdminReviewDetailScreen() {
  const params = useParams();
  const id = Number(params.id);
  const [detail, setDetail] = useState<AdminReviewDetail | null>(null);
  const [status, setStatus] = useState<ReviewStatus>('REQUESTED');
  const [answer, setAnswer] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isSafeInteger(id) || id <= 0) return;
    let active = true;
    getAdminReview(id)
      .then((value) => {
        if (!active) return;
        setDetail(value);
        setStatus(value.request.status);
        setAnswer(value.request.answer ?? '');
        setNote(value.request.operatorNote ?? '');
      })
      .catch((err) => {
        if (active) setError(getApiErrorMessage(err, '검토 요청을 불러오지 못했어요'));
      });
    return () => {
      active = false;
    };
  }, [id]);

  const handleSave = async () => {
    if (!detail) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const answerChanged = answer.trim() !== (detail.request.answer ?? '');
      const updated = await updateAdminReview(id, {
        ...(status !== detail.request.status ? { status } : {}),
        ...(answerChanged ? { answer: answer.trim() || null } : {}),
        operatorNote: note.trim() || null,
      });
      setDetail({ ...detail, request: { ...detail.request, ...updated } });
      setStatus(updated.status);
      setMessage('저장했어요');
    } catch (err) {
      setError(getApiErrorMessage(err, '저장하지 못했어요'));
    } finally {
      setSaving(false);
    }
  };

  const request = detail?.request;

  return (
    <div className="screen-content screen-wide">
      <AdminNav />
      <Link to="/admin/reviews">← 목록</Link>
      {error && (
        <div className="form-error mt-8" role="alert">
          {error}
        </div>
      )}
      {!detail && !error && <div className="card">불러오는 중...</div>}

      {request && detail && (
        <>
          <div className="card mt-8">
            <div className="card-title">
              검토 요청 #{request.id} · {REVIEW_STATUS_LABEL[request.status]}
            </div>
            <p className="form-hint" style={{ marginTop: 0 }}>
              {request.userEmail ?? '(탈퇴한 사용자)'} · {formatReportDate(request.createdAt)} 요청 · 열람 동의{' '}
              {formatReportDate(request.consentAt)}
            </p>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{request.question}</p>
          </div>

          <div className="card">
            <div className="card-title">답변</div>
            <label className="form-hint" htmlFor="review-status">
              상태
            </label>
            <select
              id="review-status"
              className="form-input mb-8"
              value={status}
              onChange={(e) => setStatus(e.target.value as ReviewStatus)}
              disabled={request.status === 'CANCELED'}
            >
              {REVIEW_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {REVIEW_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <label className="form-hint" htmlFor="review-answer">
              사용자에게 보일 답변 (상태를 그대로 두고 답변을 저장하면 “답변 완료”로 바뀌어요)
            </label>
            <textarea
              id="review-answer"
              className="form-input mb-8"
              rows={8}
              maxLength={5000}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={request.status === 'CANCELED'}
            />
            <label className="form-hint" htmlFor="review-note">
              내부 메모 (사용자에게 보이지 않음)
            </label>
            <textarea
              id="review-note"
              className="form-input mb-8"
              rows={3}
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <p className="form-hint">
              답변은 리포트 내용에 대한 일반 안내로 작성하고, 특정 상품 권유·세무 대리로 보일 표현은 피하세요.
            </p>
            {message && (
              <p className="form-hint" role="status" style={{ color: 'var(--success)' }}>
                {message}
              </p>
            )}
            <button className="btn-cta" onClick={() => void handleSave()} disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>

          <ReportSnapshot detail={detail} />
        </>
      )}
    </div>
  );
}
