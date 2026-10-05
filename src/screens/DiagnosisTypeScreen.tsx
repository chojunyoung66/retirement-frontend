import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDiagnosis } from '../hooks/useDiagnosis';
import ProgressBar from '../components/ProgressBar';
import Button from '../components/Button';
import OptionCardGroup, { type OptionCardItem } from '../components/OptionCard';
import type { DiagnosisType } from '../domain/plan';
import { setUserProperties, trackStepCompleted, trackStepViewed } from '../analytics';

const TYPE_OPTIONS: OptionCardItem<DiagnosisType>[] = [
  { value: 'individual', title: '개인', desc: '1인 가구 기준 진단' },
  { value: 'couple', title: '부부', desc: '부부 및 가족 기준 진단' },
];

export default function DiagnosisTypeScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useDiagnosis();

  useEffect(() => {
    trackStepViewed('type');
  }, []);

  const select = (type: DiagnosisType) => {
    dispatch({ type: 'UPDATE', payload: { diagnosisType: type } });
    setUserProperties({ diagnosis_type: type });
  };

  const handleNext = () => {
    trackStepCompleted('type');
    navigate('/profile');
  };

  return (
    <>
      <ProgressBar progress={10} />
      <div className="screen-content">
        <h2 id="diagnosis-type-title" className="card-title mb-8">
          진단 유형을 선택하세요
        </h2>
        <p className="card-subtitle mb-16">가구 유형에 맞게 결과를 계산해 드려요.</p>

        <OptionCardGroup
          labelledBy="diagnosis-type-title"
          options={TYPE_OPTIONS}
          selected={state.diagnosisType}
          onSelect={select}
        />

        <div className="button-row">
          <Button onClick={handleNext}>다음</Button>
        </div>
      </div>
    </>
  );
}
