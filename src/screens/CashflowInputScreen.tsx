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
import { emptyPersonProfile, emptyPension, type PensionState } from '../domain/plan';
import { trackStepCompleted, trackStepViewed } from '../analytics';

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

type WanFields = {
  national: string;
  retirement: string;
  personal: string;
};

export default function CashflowInputScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useDiagnosis();
  const isCouple = state.diagnosisType === 'couple';
  const initial = resolveInitialPension(state.pension);
  const spousePension = state.spouse?.pension ?? emptyPension();

  const [national, setNational] = useState(toWanString(initial.national));
  const [retirement, setRetirement] = useState(toWanString(initial.retirement));
  const [personal, setPersonal] = useState(toWanString(initial.personal));
  const [housing, setHousing] = useState(toWanString(initial.housing));
  const [spouseFields, setSpouseFields] = useState<WanFields>({
    national: toWanString(spousePension.national),
    retirement: toWanString(spousePension.retirement),
    personal: toWanString(spousePension.personal),
  });
  const [error, setError] = useState<string | undefined>();
  const [spouseError, setSpouseError] = useState<string | undefined>();

  useEffect(() => {
    trackStepViewed('cashflow');
  }, []);

  const formPension = (): PensionState => ({
    national: toWonFromWan(national),
    retirement: toWonFromWan(retirement),
    personal: toWonFromWan(personal),
    housing: toWonFromWan(housing),
  });

  const formSpousePension = (): PensionState => ({
    national: toWonFromWan(spouseFields.national),
    retirement: toWonFromWan(spouseFields.retirement),
    personal: toWonFromWan(spouseFields.personal),
    housing: 0,
  });

  // 입력 즉시 초안 저장 — 본인 연금만 pension-draft 키에 유지
  useEffect(() => {
    writePensionDraft(formPension());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [national, retirement, personal, housing]);

  const flushPensionToDiagnosis = () => {
    const pension = formPension();
    writePensionDraft(pension);
    const payload: { pension: PensionState; spouse?: typeof state.spouse } = {
      pension,
    };
    if (isCouple) {
      payload.spouse = {
        ...(state.spouse ?? emptyPersonProfile()),
        pension: formSpousePension(),
      };
    }
    dispatch({ type: 'UPDATE', payload });
  };

  const handleNext = () => {
    const payload = formPension();
    const selfResult = cashflowSchema.safeParse(payload);
    if (!selfResult.success) {
      setError(selfResult.error.issues[0]?.message ?? '입력값을 확인하세요');
      setSpouseError(undefined);
      return;
    }

    if (isCouple) {
      const spousePayload = formSpousePension();
      const spouseResult = cashflowSchema
        .omit({ housing: true })
        .safeParse(spousePayload);
      if (!spouseResult.success) {
        setError(undefined);
        setSpouseError(
          spouseResult.error.issues[0]?.message ??
            '배우자 국민연금 예상 수령액을 입력하세요',
        );
        return;
      }
    }

    writePensionDraft(payload);
    dispatch({
      type: 'UPDATE',
      payload: {
        pension: payload,
        ...(isCouple
          ? {
              spouse: {
                ...(state.spouse ?? emptyPersonProfile()),
                pension: formSpousePension(),
              },
            }
          : {}),
      },
    });
    trackStepCompleted('cashflow');
    navigate('/scenario');
  };

  const handleOpenHousingSimulation = () => {
    flushPensionToDiagnosis();
    navigate('/simulation/housing-pension');
  };

  const renderPensionBlock = (
    title: string,
    fields: WanFields & { housing?: string },
    setters: {
      national: (v: string) => void;
      retirement: (v: string) => void;
      personal: (v: string) => void;
      housing?: (v: string) => void;
    },
    opts: { showHousing?: boolean; fieldError?: string },
  ) => (
    <>
      {isCouple && <h3 className="form-label mb-8">{title}</h3>}
      <Input
        label="국민연금 (필수)"
        type="number"
        value={fields.national}
        onChange={setters.national}
        placeholder="예: 120"
        suffix="만원"
        max={1000}
        hint="숫자만 입력 · 최대 1,000만원"
        error={opts.fieldError}
      />
      <Input
        label="퇴직연금 (선택)"
        type="number"
        value={fields.retirement}
        onChange={setters.retirement}
        placeholder="예: 50"
        suffix="만원"
        max={1000}
        hint="숫자만 입력 · 최대 1,000만원"
      />
      <Input
        label="개인연금 (선택)"
        type="number"
        value={fields.personal}
        onChange={setters.personal}
        placeholder="예: 30"
        suffix="만원"
        max={1000}
        hint="숫자만 입력 · 최대 1,000만원"
      />
      {opts.showHousing && setters.housing && (
        <Input
          label="주택연금 (선택)"
          type="number"
          value={fields.housing ?? ''}
          onChange={setters.housing}
          placeholder="예: 84"
          suffix="만원"
          max={1000}
          hint="직접 입력하거나, 시뮬레이션 › 주택연금에서 「진단에 반영하기」로 채울 수 있어요"
        />
      )}
    </>
  );

  return (
    <>
      <ProgressBar progress={40} />
      <div className="screen-content">
        <h2 className="card-title mb-8">예상 은퇴 소득</h2>
        <p className="card-subtitle mb-16">
          현재 예상 월 수령액을 만원 단위로 입력하세요.
          <br />
          <span className="form-hint">
            {isCouple
              ? '부부는 각자 예상 수령액을 넣으면 합산됩니다. '
              : ''}
            예상 은퇴 소득 금액은 민감 정보로 서버에 저장하지 않아요. 이 기기
            진단 세션에서만 계산에 사용됩니다.
          </span>
        </p>

        {renderPensionBlock(
          '본인 연금',
          { national, retirement, personal, housing },
          {
            national: setNational,
            retirement: setRetirement,
            personal: setPersonal,
            housing: setHousing,
          },
          { showHousing: true, fieldError: error },
        )}

        {toWonFromWan(housing) <= 0 && (
          <div className="mt-8 mb-16">
            <Button
              variant="secondary"
              onClick={handleOpenHousingSimulation}
            >
              주택연금 시뮬레이션으로 계산하기
            </Button>
          </div>
        )}

        {isCouple &&
          renderPensionBlock(
            '배우자 연금',
            spouseFields,
            {
              national: (v) => setSpouseFields((s) => ({ ...s, national: v })),
              retirement: (v) =>
                setSpouseFields((s) => ({ ...s, retirement: v })),
              personal: (v) => setSpouseFields((s) => ({ ...s, personal: v })),
            },
            { showHousing: false, fieldError: spouseError },
          )}

        <div className="button-row">
          <Button onClick={handleNext}>다음</Button>
        </div>
      </div>
    </>
  );
}
