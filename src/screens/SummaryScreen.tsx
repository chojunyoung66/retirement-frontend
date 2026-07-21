import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useDiagnosis } from '../hooks/useDiagnosis';
import { useRetirementGoal } from '../hooks/useRetirementGoal';
import Button from '../components/Button';
import SummaryCard from '../components/SummaryCard';
import { formatWan } from '../utils/format';
import { showToast } from '../store/toast-slice';
import type { AppDispatch } from '../store/store';
import type { RetirementGoal } from '../api/retirement-goal-api';

export default function SummaryScreen() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { state } = useDiagnosis();
  const { fetchGoal, deleteGoal } = useRetirementGoal();
  const projection = state.projection;

  const [serverGoal, setServerGoal] = useState<RetirementGoal | null>(null);
  const [isSaved, setIsSaved] = useState(true);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleLoad = async () => {
    setFetchLoading(true);
    try {
      const goal = await fetchGoal();
      setServerGoal(goal);
      dispatch(showToast('저장된 목표를 불러왔어요'));
    } catch {
      dispatch(showToast('불러오기 실패: 저장된 데이터가 없어요'));
    } finally {
      setFetchLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('저장된 목표를 삭제할까요?')) return;
    setDeleteLoading(true);
    try {
      await deleteGoal();
      setServerGoal(null);
      setIsSaved(false);
      dispatch(showToast('저장된 목표를 삭제했어요'));
    } catch {
      dispatch(showToast('삭제에 실패했어요'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePdf = () => {
    alert('PDF 저장은 준비 중이에요. 곧 제공될 예정입니다.');
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

        {serverGoal && <SavedGoalCard goal={serverGoal} isLoading={deleteLoading} onDelete={handleDelete} />}
      </div>
    );
  }

  const isNegative = projection.gap < 0;

  return (
    <div className="screen-content">
      {isSaved && (
        <div className="text-center mb-16">
          <span className="badge badge-success">저장 완료</span>
        </div>
      )}
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
        <Button onClick={handlePdf}>PDF로 저장하기</Button>
      </div>
      <div className="mt-8">
        <Button variant="secondary" onClick={handleLoad} disabled={fetchLoading}>
          {fetchLoading ? '불러오는 중...' : '불러오기'}
        </Button>
      </div>

      {serverGoal && <SavedGoalCard goal={serverGoal} isLoading={deleteLoading} onDelete={handleDelete} />}
    </div>
  );
}

interface SavedGoalCardProps {
  goal: RetirementGoal;
  isLoading: boolean;
  onDelete: () => void;
}

function SavedGoalCard({ goal, isLoading, onDelete }: SavedGoalCardProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-title">서버 저장 목표</div>
      <div className="item-row">
        <span className="item-row-label">출생 연도</span>
        <span className="item-row-value">{goal.birthYear}년</span>
      </div>
      <div className="item-row">
        <span className="item-row-label">은퇴 예정 연도</span>
        <span className="item-row-value">{goal.retirementYear}년</span>
      </div>
      <div className="item-row">
        <span className="item-row-label">월 생활비</span>
        <span className="item-row-value">{formatWan(goal.monthlyLivingExpense)}</span>
      </div>
      <div className="item-row">
        <span className="item-row-label">국민연금</span>
        <span className="item-row-value">{formatWan(goal.nationalPension)}</span>
      </div>
      <div className="item-row">
        <span className="item-row-label">퇴직금</span>
        <span className="item-row-value">{formatWan(goal.retirementAsset)}</span>
      </div>
      <div className="mt-16">
        <Button variant="secondary" onClick={onDelete} disabled={isLoading || !ready}>
          {isLoading ? '삭제 중...' : '삭제하기'}
        </Button>
      </div>
    </div>
  );
}
