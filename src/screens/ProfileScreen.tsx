import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useDiagnosis } from '../hooks/useDiagnosis';
import ProgressBar from '../components/ProgressBar';
import Input from '../components/Input';
import HouseholdChips from '../components/HouseholdChips';
import Button from '../components/Button';
import {
  DEFAULT_RETIREMENT_AGE,
  formatAge,
  formatYearsToRetirement,
} from '../utils/format';
import type { IncomeStatus } from '../domain/plan';

const MIN_RETIREMENT_AGE = 55;
const MAX_RETIREMENT_AGE = 70;

const profileSchema = z.object({
  birthYear: z
    .number({ message: '출생연도를 입력하세요' })
    .int()
    .min(1940, { message: '1940년 이후로 입력하세요' })
    .max(2010, { message: '2010년 이전으로 입력하세요' }),
  retirementAge: z
    .number({ message: '희망 퇴직 나이를 입력하세요' })
    .int()
    .min(MIN_RETIREMENT_AGE, {
      message: `${MIN_RETIREMENT_AGE}세 이상으로 입력하세요`,
    })
    .max(MAX_RETIREMENT_AGE, {
      message: `${MAX_RETIREMENT_AGE}세 이하로 입력하세요`,
    }),
  incomeStatus: z.enum(['employed', 'self-employed', 'retired'], {
    message: '소득 상태를 선택하세요',
  }),
});

const INCOME_OPTIONS: { key: IncomeStatus; title: string; desc: string }[] = [
  { key: 'employed', title: '재직 중', desc: '회사에서 근무 중이에요' },
  { key: 'self-employed', title: '자영업', desc: '자영업 또는 프리랜서예요' },
  { key: 'retired', title: '은퇴/무직', desc: '현재 소득 활동이 없어요' },
];

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useDiagnosis();
  const [birthYearInput, setBirthYearInput] = useState<string>(
    state.birthYear ? String(state.birthYear) : '',
  );
  // 미입력이면 현행 가정(60세)을 기본값으로 보여 줌
  const [retirementAgeInput, setRetirementAgeInput] = useState<string>(
    String(state.retirementAge ?? DEFAULT_RETIREMENT_AGE),
  );
  const [errors, setErrors] = useState<{
    birthYear?: string;
    retirementAge?: string;
    incomeStatus?: string;
  }>({});

  const parsedBirthYear = birthYearInput ? Number(birthYearInput) : null;
  const parsedRetirementAge = retirementAgeInput
    ? Number(retirementAgeInput)
    : null;
  const retirementAge =
    parsedRetirementAge && Number.isFinite(parsedRetirementAge)
      ? parsedRetirementAge
      : DEFAULT_RETIREMENT_AGE;

  const ageInfo = useMemo(() => {
    if (!parsedBirthYear || parsedBirthYear < 1900 || parsedBirthYear > 2020)
      return null;
    const age = formatAge(parsedBirthYear);
    const years = formatYearsToRetirement(parsedBirthYear, retirementAge);
    return { age, years };
  }, [parsedBirthYear, retirementAge]);

  const ageHint = useMemo(() => {
    if (!ageInfo) return '1940년 ~ 2010년 사이';
    const { age, years } = ageInfo;
    // 은퇴/무직: 이미 정년과 무관
    if (state.incomeStatus === 'retired') {
      return `만 ${age}세 · 은퇴/무직 상태`;
    }
    // 재직 중 / 자영업: 희망 퇴직 나이 기준 안내
    if (
      state.incomeStatus === 'employed' ||
      state.incomeStatus === 'self-employed'
    ) {
      if (age >= retirementAge)
        return `만 ${age}세 · 희망 퇴직(${retirementAge}세) 도달`;
      return `만 ${age}세 · 희망 퇴직(${retirementAge}세)까지 ${years}년`;
    }
    // 소득 상태 미선택: 나이만 표시
    return `만 ${age}세`;
  }, [ageInfo, state.incomeStatus, retirementAge]);

  const retirementHint = useMemo(() => {
    if (!ageInfo) return `${MIN_RETIREMENT_AGE}~${MAX_RETIREMENT_AGE}세 · 기본 ${DEFAULT_RETIREMENT_AGE}세`;
    if (state.incomeStatus === 'retired') {
      return '이미 은퇴하셨다면 진단 시작 나이로 쓰여요';
    }
    if (ageInfo.age >= retirementAge) {
      return `현재 나이가 희망 퇴직 이상이에요`;
    }
    return `퇴직까지 약 ${ageInfo.years}년 · 회사·법 개정에 따라 달라질 수 있어요`;
  }, [ageInfo, retirementAge, state.incomeStatus]);

  const handleBirthYear = (value: string) => {
    setBirthYearInput(value.replace(/[^0-9]/g, '').slice(0, 4));
  };

  const handleRetirementAge = (value: string) => {
    setRetirementAgeInput(value.replace(/[^0-9]/g, '').slice(0, 2));
  };

  const handleIncome = (status: IncomeStatus) => {
    dispatch({ type: 'UPDATE', payload: { incomeStatus: status } });
  };

  const handleNext = () => {
    const result = profileSchema.safeParse({
      birthYear: parsedBirthYear,
      retirementAge: parsedRetirementAge,
      incomeStatus: state.incomeStatus || undefined,
    });
    if (!result.success) {
      const fieldErrors: {
        birthYear?: string;
        retirementAge?: string;
        incomeStatus?: string;
      } = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0];
        if (path === 'birthYear') fieldErrors.birthYear = issue.message;
        if (path === 'retirementAge') fieldErrors.retirementAge = issue.message;
        if (path === 'incomeStatus') fieldErrors.incomeStatus = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    // 출생연도·희망 퇴직 나이를 진단 세션에 반영
    dispatch({
      type: 'UPDATE',
      payload: {
        birthYear: result.data.birthYear,
        retirementAge: result.data.retirementAge,
      },
    });
    navigate('/cashflow');
  };

  return (
    <>
      <ProgressBar progress={25} />
      <div className="screen-content">
        <h2 className="card-title mb-8">나의 기본 정보</h2>
        <p className="card-subtitle mb-16">진단에 필요한 최소 정보만 입력해요.</p>

        <Input
          label="출생연도"
          type="number"
          value={birthYearInput}
          onChange={handleBirthYear}
          placeholder="예: 1970"
          suffix="년"
          error={errors.birthYear}
          hint={ageHint}
        />

        <Input
          label="희망 퇴직 나이"
          type="number"
          value={retirementAgeInput}
          onChange={handleRetirementAge}
          placeholder={`예: ${DEFAULT_RETIREMENT_AGE}`}
          suffix="세"
          error={errors.retirementAge}
          hint={retirementHint}
        />

        <div className="form-group">
          <label className="form-label">소득 상태</label>
          {INCOME_OPTIONS.map((opt) => (
            <div
              key={opt.key}
              className={`option-card${state.incomeStatus === opt.key ? ' selected' : ''}`}
              onClick={() => handleIncome(opt.key)}
            >
              <div className="option-card-title">{opt.title}</div>
              <div className="option-card-desc">{opt.desc}</div>
            </div>
          ))}
          {errors.incomeStatus && (
            <div className="form-error">{errors.incomeStatus}</div>
          )}
        </div>

        {state.diagnosisType === 'couple' && (
          <div className="form-group">
            <label className="form-label">가구원 수</label>
            <HouseholdChips
              value={state.householdSize}
              onChange={(size) =>
                dispatch({ type: 'UPDATE', payload: { householdSize: size } })
              }
            />
          </div>
        )}

        <div className="button-row">
          <Button onClick={handleNext}>다음</Button>
        </div>
      </div>
    </>
  );
}
