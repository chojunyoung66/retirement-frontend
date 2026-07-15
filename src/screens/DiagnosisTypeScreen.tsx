import { useNavigate } from 'react-router-dom';
import { useDiagnosis } from '../hooks/useDiagnosis';
import ProgressBar from '../components/ProgressBar';
import Button from '../components/Button';
import type { DiagnosisType } from '../domain/plan';

export default function DiagnosisTypeScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useDiagnosis();

  const select = (type: DiagnosisType) => {
    dispatch({ type: 'UPDATE', payload: { diagnosisType: type } });
  };

  return (
    <>
      <ProgressBar progress={10} />
      <div className="screen-content">
        <h2 className="card-title mb-8">진단 유형을 선택하세요</h2>
        <p className="card-subtitle mb-16">가구 유형에 맞게 결과를 계산해 드려요.</p>

        <div
          className={`option-card${state.diagnosisType === 'individual' ? ' selected' : ''}`}
          onClick={() => select('individual')}
        >
          <div className="option-card-title">개인</div>
          <div className="option-card-desc">1인 가구 기준 진단</div>
        </div>

        <div
          className={`option-card${state.diagnosisType === 'couple' ? ' selected' : ''}`}
          onClick={() => select('couple')}
        >
          <div className="option-card-title">부부</div>
          <div className="option-card-desc">부부 및 가족 기준 진단</div>
        </div>

        <div className="button-row">
          <Button onClick={() => navigate('/profile')}>다음</Button>
        </div>
      </div>
    </>
  );
}
