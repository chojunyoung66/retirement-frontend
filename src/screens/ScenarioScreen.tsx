import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useDiagnosis } from '../hooks/useDiagnosis';
import ProgressBar from '../components/ProgressBar';
import Input from '../components/Input';
import Button from '../components/Button';
import { getLivingExpenseGuide } from '../service/retirement-service';
import { formatWan } from '../utils/format';

const scenarioSchema = z.object({
  desiredMonthly: z
    .number()
    .min(1, { message: '희망 생활비를 입력하세요' }),
});

function toWon(value: string): number {
  const n = Number(value.replace(/[^0-9]/g, ''));
  return Number.isFinite(n) ? n * 10000 : 0;
}

function toWanString(won: number): string {
  return won > 0 ? String(Math.round(won / 10000)) : '';
}

export default function ScenarioScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useDiagnosis();

  const guide = useMemo(
    () => getLivingExpenseGuide(state.diagnosisType, state.householdSize),
    [state.diagnosisType, state.householdSize],
  );

  const [desired, setDesired] = useState(toWanString(state.livingExpense.desiredMonthly));
  const [error, setError] = useState<string | undefined>();

  const handleNext = () => {
    const desiredWon = toWon(desired);
    const parsed = scenarioSchema.safeParse({ desiredMonthly: desiredWon });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '입력값을 확인하세요');
      return;
    }
    dispatch({
      type: 'UPDATE',
      payload: {
        livingExpense: {
          desiredMonthly: desiredWon,
          guideMinimum: guide.minimum,
          guideRecommended: guide.recommended,
        },
      },
    });
    navigate('/medical');
  };

  return (
    <>
      <ProgressBar progress={70} />
      <div className="screen-content">
        <h2 className="card-title mb-8">희망 생활비</h2>
        <p className="card-subtitle mb-16">은퇴 후 매월 사용하고 싶은 금액을 입력하세요.</p>

        <div className="card">
          <div className="card-title">가구 유형별 가이드</div>
          <div className="item-row">
            <span className="item-row-label">최소 생활비</span>
            <span className="item-row-value">{formatWan(guide.minimum)}</span>
          </div>
          <div className="item-row">
            <span className="item-row-label">적정 생활비</span>
            <span className="item-row-value">{formatWan(guide.recommended)}</span>
          </div>
        </div>

        <Input
          label="희망 월 생활비"
          type="number"
          value={desired}
          onChange={(v) => setDesired(v.replace(/[^0-9]/g, ''))}
          placeholder="예: 250"
          suffix="만원"
          max={1000}
          error={error}
        />

        <div className="button-row">
          <Button onClick={handleNext}>다음</Button>
        </div>
      </div>
    </>
  );
}
