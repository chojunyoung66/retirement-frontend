import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useDiagnosis } from '../hooks/useDiagnosis';
import ProgressBar from '../components/ProgressBar';
import Input from '../components/Input';
import Button from '../components/Button';

const cashflowSchema = z.object({
  national: z
    .number({ message: '국민연금 예상 수령액을 입력하세요' })
    .min(1, { message: '국민연금 예상 수령액을 입력하세요' }),
  retirement: z.number().min(0),
  personal: z.number().min(0),
});

function toWonFromWan(value: string): number {
  const n = Number(value.replace(/[^0-9]/g, ''));
  return Number.isFinite(n) ? n * 10000 : 0;
}

function toWanString(won: number): string {
  return won > 0 ? String(Math.round(won / 10000)) : '';
}

export default function CashflowInputScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useDiagnosis();

  const [national, setNational] = useState(toWanString(state.pension.national));
  const [retirement, setRetirement] = useState(toWanString(state.pension.retirement));
  const [personal, setPersonal] = useState(toWanString(state.pension.personal));
  const [error, setError] = useState<string | undefined>();

  const handleNext = () => {
    const payload = {
      national: toWonFromWan(national),
      retirement: toWonFromWan(retirement),
      personal: toWonFromWan(personal),
    };
    const result = cashflowSchema.safeParse(payload);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? '입력값을 확인하세요');
      return;
    }
    dispatch({
      type: 'UPDATE',
      payload: { pension: payload },
    });
    navigate('/scenario');
  };

  return (
    <>
      <ProgressBar progress={40} />
      <div className="screen-content">
        <h2 className="card-title mb-8">예상 은퇴 소득</h2>
        <p className="card-subtitle mb-16">
          현재 예상 월 수령액을 만원 단위로 입력하세요.
        </p>

        <Input
          label="국민연금 (필수)"
          type="number"
          value={national}
          onChange={setNational}
          placeholder="예: 120"
          suffix="만원"
          max={1000}
          hint="숫자만 입력 · 최대 1,000만원"
          error={error}
        />
        <Input
          label="퇴직연금 (선택)"
          type="number"
          value={retirement}
          onChange={setRetirement}
          placeholder="예: 50"
          suffix="만원"
          max={1000}
          hint="숫자만 입력 · 최대 1,000만원"
        />
        <Input
          label="개인연금 (선택)"
          type="number"
          value={personal}
          onChange={setPersonal}
          placeholder="예: 30"
          suffix="만원"
          max={1000}
          hint="숫자만 입력 · 최대 1,000만원"
        />

        <div className="button-row">
          <Button onClick={handleNext}>다음</Button>
        </div>
      </div>
    </>
  );
}
