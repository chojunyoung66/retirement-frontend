import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useDiagnosis } from '../hooks/useDiagnosis';
import Button from '../components/Button';
import SummaryCard from '../components/SummaryCard';
import { formatWan } from '../utils/format';
import { showToast } from '../store/toast-slice';
import type { AppDispatch } from '../store/store';
import type { DiagnosisRecord } from '../api/diagnosis-api';
import {
  getLatestDiagnosis,
  deleteLatestDiagnosis,
} from '../api/diagnosis-api';
import { trackResultSaved } from '../analytics';

const PENDING_RESULT_SAVED_EVENT_KEY = 'rc_emit_result_saved';

export default function SummaryScreen() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { state } = useDiagnosis();
  const projection = state.projection;

  const [savedDiagnosis, setSavedDiagnosis] = useState<DiagnosisRecord | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 저장 직후 진입 시 result_saved 보완 전송 (이동 직전 유실 대비)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let householdType: string | null = null;
      try {
        householdType = sessionStorage.getItem(PENDING_RESULT_SAVED_EVENT_KEY);
      } catch {
        // ignore
      }
      if (!householdType || cancelled) return;
      await trackResultSaved(householdType);
      if (cancelled) return;
      try {
        sessionStorage.removeItem(PENDING_RESULT_SAVED_EVENT_KEY);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 저장 직후 진입·재방문 시 서버 진단 불러오기
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFetchLoading(true);
      try {
        const record = await getLatestDiagnosis();
        if (!cancelled) setSavedDiagnosis(record);
      } catch {
        if (!cancelled) setSavedDiagnosis(null);
      } finally {
        if (!cancelled) setFetchLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async () => {
    if (!window.confirm('저장된 진단을 삭제할까요?')) return;
    setDeleteLoading(true);
    try {
      await deleteLatestDiagnosis();
      setSavedDiagnosis(null);
      dispatch(showToast('저장된 진단을 삭제했어요'));
    } catch {
      dispatch(showToast('삭제에 실패했어요'));
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!projection) {
    return (
      <div className="screen-content">
        <div className="card">
          <div className="card-title">저장된 결과가 없어요</div>
          <div className="card-subtitle mb-16">
            {fetchLoading
              ? '저장된 진단을 확인하는 중...'
              : savedDiagnosis
                ? '아래에서 저장된 진단을 확인할 수 있어요'
                : '진단을 먼저 진행해 주세요'}
          </div>
          {savedDiagnosis && (
            <div className="mt-8">
              <Button
                variant="secondary"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? '삭제 중...' : '삭제하기'}
              </Button>
            </div>
          )}
          <div className="mt-8">
            <Button onClick={() => navigate('/diagnosis')}>진단 시작하기</Button>
          </div>
        </div>

        {savedDiagnosis && <SavedDiagnosisCard record={savedDiagnosis} />}
      </div>
    );
  }

  const isNegative = projection.gap < 0;

  return (
    <div className="screen-content">
      <h2 className="card-title mb-16">진단 결과 요약</h2>

      <SummaryCard
        label={isNegative ? '월 부족액' : '월 여유금액'}
        value={`${isNegative ? '-' : '+'}${formatWan(Math.abs(projection.gap))}`}
        variant={isNegative ? 'negative' : 'positive'}
      />
      <SummaryCard label="총 예상 수입" value={formatWan(projection.totalIncome)} />
      <SummaryCard label="총 예상 지출" value={formatWan(projection.totalExpense)} />
      <SummaryCard
        label="가구 유형"
        value={state.diagnosisType === 'couple' ? `부부 (${state.householdSize}인)` : '개인'}
      />

      {savedDiagnosis && (
        <>
          <div className="mt-16">
            <Button
              variant="secondary"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? '삭제 중...' : '삭제하기'}
            </Button>
          </div>
          <SavedDiagnosisCard record={savedDiagnosis} />
        </>
      )}

      {!savedDiagnosis && !fetchLoading && (
        <p className="form-hint mt-16">서버에 저장된 진단이 없어요</p>
      )}
    </div>
  );
}

interface SavedDiagnosisCardProps {
  record: DiagnosisRecord;
}

function SavedDiagnosisCard({ record }: SavedDiagnosisCardProps) {
  const currentYear = new Date().getFullYear();
  const retirementLabel = record.retirementYear <= currentYear ? '퇴직 연도' : '은퇴 예정 연도';

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-title">저장된 진단</div>
      <div className="item-row">
        <span className="item-row-label">출생 연도</span>
        <span className="item-row-value">{record.birthYear}년</span>
      </div>
      <div className="item-row">
        <span className="item-row-label">{retirementLabel}</span>
        <span className="item-row-value">{record.retirementYear}년</span>
      </div>
      <p className="form-hint" style={{ margin: '8px 0' }}>
        예상 은퇴 소득(국민·퇴직·개인·주택연금) 금액은 서버에 저장하지 않아요.
      </p>
      <div className="item-row">
        <span className="item-row-label">월 생활비</span>
        <span className="item-row-value">{formatWan(record.monthlyExpense)}</span>
      </div>
    </div>
  );
}
