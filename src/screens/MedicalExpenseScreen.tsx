import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useDiagnosis } from '../hooks/useDiagnosis';
import ProgressBar from '../components/ProgressBar';
import Input from '../components/Input';
import Button from '../components/Button';

const medicalSchema = z.object({
  healthInsurance: z.number().min(0),
  privateInsurance: z.number().min(0),
});

function toWon(value: string): number {
  const n = Number(value.replace(/[^0-9]/g, ''));
  return Number.isFinite(n) ? n * 10000 : 0;
}

function toWanString(won: number): string {
  return won > 0 ? String(Math.round(won / 10000)) : '';
}

export default function MedicalExpenseScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useDiagnosis();

  const [health, setHealth] = useState(toWanString(state.medicalExpense.healthInsurance));
  const [privateIns, setPrivateIns] = useState(
    toWanString(state.medicalExpense.privateInsurance),
  );
  const [error, setError] = useState<string | undefined>();

  const handleNext = () => {
    const payload = {
      healthInsurance: toWon(health),
      privateInsurance: toWon(privateIns),
    };
    const result = medicalSchema.safeParse(payload);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? '입력값을 확인하세요');
      return;
    }
    dispatch({ type: 'UPDATE_AND_CALCULATE', payload: { medicalExpense: payload } });
    navigate('/result');
  };

  return (
    <>
      <ProgressBar progress={86} />
      <div className="screen-content">
        <h2 className="card-title mb-8">의료·보험 지출</h2>
        <p className="card-subtitle mb-16">매달 부담하는 보험료를 입력하세요.</p>

        <Input
          label="건강보험료"
          type="number"
          value={health}
          onChange={(v) => setHealth(v.replace(/[^0-9]/g, ''))}
          placeholder="예: 15"
          suffix="만원"
          max={1000}
          error={error}
        />
        <Input
          label="민영보험료"
          type="number"
          value={privateIns}
          onChange={(v) => setPrivateIns(v.replace(/[^0-9]/g, ''))}
          placeholder="예: 20"
          suffix="만원"
          max={1000}
        />

        <div className="button-row">
          <Button onClick={handleNext}>결과 보기</Button>
        </div>
      </div>
    </>
  );
}
