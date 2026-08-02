import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useDiagnosis } from '../hooks/useDiagnosis';
import ProgressBar from '../components/ProgressBar';
import Input from '../components/Input';
import Button from '../components/Button';
import {
  mergePensionPreferPositive,
  readPensionDraft,
  writePensionDraft,
} from '../utils/pension-draft';
import type { PensionState } from '../domain/plan';

const cashflowSchema = z.object({
  national: z
    .number({ message: '국민연금 예상 수령액을 입력하세요' })
    .min(1, { message: '국민연금 예상 수령액을 입력하세요' }),
  retirement: z.number().min(0),
  personal: z.number().min(0),
  housing: z.number().min(0),
});

function toWonFromWan(value: string): number {
  const n = Number(value.replace(/[^0-9]/g, ''));
  return Number.isFinite(n) ? n * 10000 : 0;
}

function toWanString(won: number): string {
  return won > 0 ? String(Math.round(won / 10000)) : '';
}

function resolveInitialPension(session: PensionState): PensionState {
  // 컨텍스트 + sessionStorage 초안을 병합해 복귀 시 빈 폼 방지
  return mergePensionPreferPositive(session, readPensionDraft());
}

export default function CashflowInputScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useDiagnosis();
  const initial = resolveInitialPension(state.pension);

  const [national, setNational] = useState(toWanString(initial.national));
  const [retirement, setRetirement] = useState(toWanString(initial.retirement));
  const [personal, setPersonal] = useState(toWanString(initial.personal));
  const [housing, setHousing] = useState(toWanString(initial.housing));
  const [error, setError] = useState<string | undefined>();

  const formPension = (): PensionState => ({
    national: toWonFromWan(national),
    retirement: toWonFromWan(retirement),
    personal: toWonFromWan(personal),
    housing: toWonFromWan(housing),
  });

  // 입력 즉시 초안 저장 — 시뮬 이동·뒤로가기·리로드에도 유지
  useEffect(() => {
    writePensionDraft(formPension());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [national, retirement, personal, housing]);

  // 로컬 폼 → 진단 세션에 반영 (화면 이탈 시 입력 유실 방지)
  const flushPensionToDiagnosis = () => {
    const pension = formPension();
    writePensionDraft(pension);
    dispatch({
      type: 'UPDATE',
      payload: { pension },
    });
  };

  const handleNext = () => {
    const payload = formPension();
    const result = cashflowSchema.safeParse(payload);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? '입력값을 확인하세요');
      return;
    }
    writePensionDraft(payload);
    dispatch({
      type: 'UPDATE',
      payload: { pension: payload },
    });
    navigate('/scenario');
  };

  // 시뮬레이션 이동 전 입력을 세션에 남겨 복귀 시 초기화되지 않게 함
  const handleOpenHousingSimulation = () => {
    flushPensionToDiagnosis();
    navigate('/simulation/housing-pension');
  };

  return (
    <>
      <ProgressBar progress={40} />
      <div className="screen-content">
        <h2 className="card-title mb-8">예상 은퇴 소득</h2>
        <p className="card-subtitle mb-16">
          현재 예상 월 수령액을 만원 단위로 입력하세요.
          <br />
          <span className="form-hint">
            예상 은퇴 소득 금액은 민감 정보로 서버에 저장하지 않아요. 이 기기
            진단 세션에서만 계산에 사용됩니다.
          </span>
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
        <Input
          label="주택연금 (선택)"
          type="number"
          value={housing}
          onChange={setHousing}
          placeholder="예: 84"
          suffix="만원"
          max={1000}
          hint="직접 입력하거나, 시뮬레이션 › 주택연금에서 「진단에 반영하기」로 채울 수 있어요"
        />

        {toWonFromWan(housing) <= 0 && (
          <div className="mt-8">
            <Button
              variant="secondary"
              onClick={handleOpenHousingSimulation}
            >
              주택연금 시뮬레이션으로 계산하기
            </Button>
          </div>
        )}

        <div className="button-row">
          <Button onClick={handleNext}>다음</Button>
        </div>
      </div>
    </>
  );
}
