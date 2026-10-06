import { useCallback, useEffect, useState } from 'react';
import {
  cancelReviewRequest,
  createReviewRequest,
  getMyReviewRequests,
  REVIEW_QUESTION_MAX,
  REVIEW_QUESTION_MIN,
  type ReviewRequest,
} from '../api/concierge-api';
import Sheet from './Sheet';
import { getApiErrorMessage } from '../utils/api-error-message';
import {
  isActiveReview,
  REVIEW_STATUS_LABEL,
  REVIEW_STEPS,
  reviewStepIndex,
} from '../utils/concierge-view';
import { formatReportDate } from '../utils/report-view';
import { trackExpertReviewRequested } from '../analytics';

function ReviewRequestSheet({
  busy,
  error,
  onClose,
  onSubmit,
}: {
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (question: string) => void;
}) {
  const [question, setQuestion] = useState('');
  const [consent, setConsent] = useState(false);
  const length = question.trim().length;
  const valid = length >= REVIEW_QUESTION_MIN && length <= REVIEW_QUESTION_MAX && consent;

  return (
    <Sheet
      title="무료 검토 요청"
      onClose={busy ? undefined : onClose}
      actions={
        <>
          <button className="btn-back" onClick={onClose} disabled={busy}>
            취소
          </button>
          <button className="btn-cta" onClick={() => onSubmit(question.trim())} disabled={!valid || busy}>
            {busy ? '보내는 중...' : '요청 보내기'}
          </button>
        </>
      }
    >
      <p className="form-hint">
        운영자가 이 리포트를 보고 실행 순서·주의할 점을 앱 안에서 답변해 드려요. 투자 권유나 세무 대리는 하지 않아요.
      </p>
      <textarea
        className="form-input"
        rows={5}
        maxLength={REVIEW_QUESTION_MAX}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="예) 퇴직 후 IRP를 먼저 쓰는 순서가 맞는지, 건보 피부양자 유지에 문제가 없는지 봐 주세요"
        aria-label="검토받고 싶은 내용"
        style={{ resize: 'vertical', minHeight: 110 }}
      />
      <p className="form-hint" style={{ textAlign: 'right' }}>
        {length}/{REVIEW_QUESTION_MAX}자 (최소 {REVIEW_QUESTION_MIN}자)
      </p>
      <label className="form-hint" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          aria-label="리포트 열람 동의"
        />
        <span>
          검토를 위해 운영자가 이 리포트(만든 시점의 결과)와 100일 체크리스트 진행 상황을 보는 것에 동의해요. 입력한
          원본 계좌 정보는 보지 않아요.
        </span>
      </label>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
    </Sheet>
  );
}

/** 리포트 화면의 앱 안 검토 요청 — 상태·답변까지 여기서 보여 준다 */
export default function ReviewRequestCard({ reportId, scenarioType }: { reportId: number; scenarioType: string }) {
  const [request, setRequest] = useState<ReviewRequest | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await getMyReviewRequests();
      setRequest(list.find((r) => r.reportId === reportId) ?? null);
    } catch {
      setRequest(null);
    } finally {
      setLoaded(true);
    }
  }, [reportId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (question: string) => {
    setBusy(true);
    setError(null);
    try {
      const created = await createReviewRequest({ reportId, question, consent: true });
      trackExpertReviewRequested(scenarioType, 'report');
      setRequest(created);
      setSheetOpen(false);
    } catch (err) {
      setError(getApiErrorMessage(err, '검토 요청을 보내지 못했어요. 잠시 후 다시 시도해 주세요'));
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!request) return;
    setBusy(true);
    setError(null);
    try {
      setRequest(await cancelReviewRequest(request.id));
    } catch (err) {
      setError(getApiErrorMessage(err, '요청을 취소하지 못했어요'));
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) return null;

  const canRequest = !request || !isActiveReview(request.status);
  const step = request ? reviewStepIndex(request.status) : -1;

  return (
    <div className="card no-print">
      <div className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        무료 검토 요청
        {request && (
          <span className={`badge ${request.status === 'ANSWERED' ? 'badge-success' : 'badge-neutral'}`}>
            {REVIEW_STATUS_LABEL[request.status]}
          </span>
        )}
      </div>

      {request && request.status !== 'CANCELED' && (
        <>
          <div className="status-steps" aria-label={`진행 단계: ${REVIEW_STATUS_LABEL[request.status]}`}>
            {REVIEW_STEPS.map((s, i) => (
              <span key={s} className={i <= step ? 'done' : undefined} />
            ))}
          </div>
          <p className="form-hint" style={{ marginTop: 0 }}>
            {formatReportDate(request.createdAt)} 요청 · “{request.question}”
          </p>
        </>
      )}

      {request?.answer && (
        <div style={{ background: 'var(--primary-light)', borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            운영자 답변{request.answeredAt ? ` · ${formatReportDate(request.answeredAt)}` : ''}
          </div>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{request.answer}</p>
        </div>
      )}

      {request && isActiveReview(request.status) && (
        <>
          <p className="form-hint">답변이 등록되면 이 리포트 화면에서 확인할 수 있어요.</p>
          <button className="btn-back" style={{ width: '100%' }} onClick={() => void handleCancel()} disabled={busy}>
            {busy ? '취소하는 중...' : '요청 취소'}
          </button>
        </>
      )}

      {canRequest && (
        <>
          {!request && (
            <p className="form-hint" style={{ marginTop: 0 }}>
              실행 전에 궁금한 점을 남기면 운영자가 리포트를 보고 답변해 드려요. 비용은 받지 않아요.
            </p>
          )}
          <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setSheetOpen(true)}>
            {request?.status === 'ANSWERED' || request?.status === 'CLOSED' ? '추가로 질문하기' : '검토 요청하기'}
          </button>
        </>
      )}

      {error && !sheetOpen && (
        <div className="form-error mt-8" role="alert">
          {error}
        </div>
      )}

      {sheetOpen && (
        <ReviewRequestSheet
          busy={busy}
          error={error}
          onClose={() => {
            setSheetOpen(false);
            setError(null);
          }}
          onSubmit={(question) => void handleSubmit(question)}
        />
      )}
    </div>
  );
}
