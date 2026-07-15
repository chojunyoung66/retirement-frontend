import { useNavigate } from 'react-router-dom';
import { useDiagnosis } from '../hooks/useDiagnosis';
import Button from '../components/Button';
import SummaryCard from '../components/SummaryCard';
import { formatWan } from '../utils/format';

export default function SummaryScreen() {
  const navigate = useNavigate();
  const { state } = useDiagnosis();
  const projection = state.projection;

  const handlePdf = () => {
    alert('PDF 저장은 준비 중이에요. 곧 제공될 예정입니다.');
  };

  if (!projection) {
    return (
      <div className="screen-content">
        <div className="card">
          <div className="card-title">저장된 결과가 없어요</div>
          <div className="mt-16">
            <Button onClick={() => navigate('/diagnosis')}>진단 시작하기</Button>
          </div>
        </div>
      </div>
    );
  }

  const isNegative = projection.gap < 0;

  return (
    <div className="screen-content">
      <div className="text-center mb-16">
        <span className="badge badge-success">저장 완료</span>
      </div>
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
    </div>
  );
}
