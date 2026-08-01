import { useState } from 'react';
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

export default function SummaryScreen() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { state } = useDiagnosis();
  const projection = state.projection;

  const [savedDiagnosis, setSavedDiagnosis] = useState<DiagnosisRecord | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleLoad = async () => {
    setFetchLoading(true);
    try {
      const record = await getLatestDiagnosis();
      setSavedDiagnosis(record);
      if (record) {
        dispatch(showToast('저장된 진단을 불러왔어요'));
      } else {
        dispatch(showToast('저장된 진단 결과가 없어요'));
      }
    } catch {
      dispatch(showToast('불러오기 실패: 저장된 데이터가 없어요'));
    } finally {
      setFetchLoading(false);
    }
  };

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
          <div className="mt-16">
            <Button onClick={handleLoad} disabled={fetchLoading}>
              {fetchLoading ? '불러오는 중...' : '불러오기'}
            </Button>
          </div>
          <div className="mt-8">
            <Button onClick={() => navigate('/diagnosis')}>진단 시작하기</Button>
          </div>
        </div>

        {savedDiagnosis && (
          <SavedDiagnosisCard
            record={savedDiagnosis}
            isLoading={deleteLoading}
            onDelete={handleDelete}
          />
        )}
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

      <div className="mt-16">
        <Button variant="secondary" onClick={handleLoad} disabled={fetchLoading}>
          {fetchLoading ? '불러오는 중...' : '불러오기'}
        </Button>
      </div>

      {savedDiagnosis && (
        <SavedDiagnosisCard
          record={savedDiagnosis}
          isLoading={deleteLoading}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

interface SavedDiagnosisCardProps {
  record: DiagnosisRecord;
  isLoading: boolean;
  onDelete: () => void;
}

function SavedDiagnosisCard({ record, isLoading, onDelete }: SavedDiagnosisCardProps) {
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
      <div className="item-row">
        <span className="item-row-label">국민연금</span>
        <span className="item-row-value">{formatWan(record.nationalPension)}</span>
      </div>
      <div className="item-row">
        <span className="item-row-label">퇴직연금</span>
        <span className="item-row-value">{formatWan(record.retirementPension)}</span>
      </div>
      <div className="item-row">
        <span className="item-row-label">개인연금</span>
        <span className="item-row-value">{formatWan(record.personalPension)}</span>
      </div>
      <div className="item-row">
        <span className="item-row-label">월 연금 합계</span>
        <span className="item-row-value">
          {formatWan(record.nationalPension + record.retirementPension + record.personalPension)}
        </span>
      </div>
      <div className="item-row">
        <span className="item-row-label">월 생활비</span>
        <span className="item-row-value">{formatWan(record.monthlyExpense)}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Button variant="secondary" onClick={onDelete} disabled={isLoading} fullWidth={false}>
          {isLoading ? '삭제 중...' : '삭제'}
        </Button>
      </div>
    </div>
  );
}
