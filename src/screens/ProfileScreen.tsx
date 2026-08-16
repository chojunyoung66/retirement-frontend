import { useEffect, useMemo, useState } from 'react';
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
import { emptyPersonProfile, type IncomeStatus } from '../domain/plan';
import { trackStepCompleted, trackStepViewed } from '../analytics';

const MIN_RETIREMENT_AGE = 55;
const MAX_RETIREMENT_AGE = 70;

const personFieldsSchema = z.object({
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

type FieldErrors = {
  birthYear?: string;
  retirementAge?: string;
  incomeStatus?: string;
};

function buildAgeHint(
  birthYear: number | null,
  retirementAge: number,
  incomeStatus: IncomeStatus,
): string {
  if (!birthYear || birthYear < 1900 || birthYear > 2020) {
    return '1940년 ~ 2010년 사이';
  }
  const age = formatAge(birthYear);
  const years = formatYearsToRetirement(birthYear, retirementAge);
  if (incomeStatus === 'retired') return `만 ${age}세 · 은퇴/무직 상태`;
  if (incomeStatus === 'employed' || incomeStatus === 'self-employed') {
    if (age >= retirementAge) {
      return `만 ${age}세 · 희망 퇴직(${retirementAge}세) 도달`;
    }
    return `만 ${age}세 · 희망 퇴직(${retirementAge}세)까지 ${years}년`;
  }
  return `만 ${age}세`;
}

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useDiagnosis();
  const isCouple = state.diagnosisType === 'couple';
  const spouse = state.spouse ?? emptyPersonProfile();

  const [birthYearInput, setBirthYearInput] = useState<string>(
    state.birthYear ? String(state.birthYear) : '',
  );
  const [retirementAgeInput, setRetirementAgeInput] = useState<string>(
    String(state.retirementAge ?? DEFAULT_RETIREMENT_AGE),
  );
  const [spouseBirthYearInput, setSpouseBirthYearInput] = useState<string>(
    spouse.birthYear ? String(spouse.birthYear) : '',
  );
  const [spouseRetirementAgeInput, setSpouseRetirementAgeInput] = useState<string>(
    String(spouse.retirementAge ?? DEFAULT_RETIREMENT_AGE),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [spouseErrors, setSpouseErrors] = useState<FieldErrors>({});

  useEffect(() => {
    trackStepViewed('profile');
  }, []);

  // couple 전환 직후 spouse 객체가 없으면 생성
  useEffect(() => {
    if (isCouple && !state.spouse) {
      dispatch({ type: 'UPDATE', payload: { spouse: emptyPersonProfile() } });
    }
  }, [isCouple, state.spouse, dispatch]);

  const parsedBirthYear = birthYearInput ? Number(birthYearInput) : null;
  const parsedRetirementAge = retirementAgeInput
    ? Number(retirementAgeInput)
    : null;
  const retirementAge =
    parsedRetirementAge && Number.isFinite(parsedRetirementAge)
      ? parsedRetirementAge
      : DEFAULT_RETIREMENT_AGE;

  const parsedSpouseBirthYear = spouseBirthYearInput
    ? Number(spouseBirthYearInput)
    : null;
  const parsedSpouseRetirementAge = spouseRetirementAgeInput
    ? Number(spouseRetirementAgeInput)
    : null;
  const spouseRetirementAge =
    parsedSpouseRetirementAge && Number.isFinite(parsedSpouseRetirementAge)
      ? parsedSpouseRetirementAge
      : DEFAULT_RETIREMENT_AGE;

  const ageHint = useMemo(
    () => buildAgeHint(parsedBirthYear, retirementAge, state.incomeStatus),
    [parsedBirthYear, retirementAge, state.incomeStatus],
  );

  const spouseAgeHint = useMemo(
    () =>
      buildAgeHint(parsedSpouseBirthYear, spouseRetirementAge, spouse.incomeStatus),
    [parsedSpouseBirthYear, spouseRetirementAge, spouse.incomeStatus],
  );

  const retirementHint = useMemo(() => {
    if (!parsedBirthYear || parsedBirthYear < 1900) {
      return `${MIN_RETIREMENT_AGE}~${MAX_RETIREMENT_AGE}세 · 기본 ${DEFAULT_RETIREMENT_AGE}세`;
    }
    const age = formatAge(parsedBirthYear);
    if (state.incomeStatus === 'retired') {
      return '이미 은퇴하셨다면 진단 시작 나이로 쓰여요';
    }
    if (age >= retirementAge) return `현재 나이가 희망 퇴직 이상이에요`;
    const years = formatYearsToRetirement(parsedBirthYear, retirementAge);
    return `퇴직까지 약 ${years}년 · 회사·법 개정에 따라 달라질 수 있어요`;
  }, [parsedBirthYear, retirementAge, state.incomeStatus]);

  const handleIncome = (status: IncomeStatus) => {
    dispatch({ type: 'UPDATE', payload: { incomeStatus: status } });
  };

  const handleSpouseIncome = (status: IncomeStatus) => {
    dispatch({
      type: 'UPDATE',
      payload: {
        spouse: {
          ...(state.spouse ?? emptyPersonProfile()),
          incomeStatus: status,
        },
      },
    });
  };

  const handleNext = () => {
    const selfResult = personFieldsSchema.safeParse({
      birthYear: parsedBirthYear,
      retirementAge: parsedRetirementAge,
      incomeStatus: state.incomeStatus || undefined,
    });

    let spouseResult: z.SafeParseReturnType<
      z.infer<typeof personFieldsSchema>,
      z.infer<typeof personFieldsSchema>
    > | null = null;

    if (isCouple) {
      spouseResult = personFieldsSchema.safeParse({
        birthYear: parsedSpouseBirthYear,
        retirementAge: parsedSpouseRetirementAge,
        incomeStatus: spouse.incomeStatus || undefined,
      });
    }

    if (!selfResult.success || (spouseResult && !spouseResult.success)) {
      const toErrors = (issues: z.ZodIssue[]): FieldErrors => {
        const fieldErrors: FieldErrors = {};
        for (const issue of issues) {
          const path = issue.path[0];
          if (path === 'birthYear') fieldErrors.birthYear = issue.message;
          if (path === 'retirementAge') fieldErrors.retirementAge = issue.message;
          if (path === 'incomeStatus') fieldErrors.incomeStatus = issue.message;
        }
        return fieldErrors;
      };
      setErrors(selfResult.success ? {} : toErrors(selfResult.error.issues));
      setSpouseErrors(
        spouseResult && !spouseResult.success
          ? toErrors(spouseResult.error.issues)
          : {},
      );
      return;
    }

    // 본인·배우자 프로필을 진단 세션에 반영
    dispatch({
      type: 'UPDATE',
      payload: {
        birthYear: selfResult.data.birthYear,
        retirementAge: selfResult.data.retirementAge,
        ...(isCouple && spouseResult?.success
          ? {
              spouse: {
                ...(state.spouse ?? emptyPersonProfile()),
                birthYear: spouseResult.data.birthYear,
                retirementAge: spouseResult.data.retirementAge,
                incomeStatus: spouseResult.data.incomeStatus,
              },
            }
          : {}),
      },
    });
    trackStepCompleted('profile');
    navigate('/cashflow');
  };

  const renderIncomeOptions = (
    selected: IncomeStatus,
    onSelect: (s: IncomeStatus) => void,
    error?: string,
  ) => (
    <div className="form-group">
      <label className="form-label">소득 상태</label>
      {INCOME_OPTIONS.map((opt) => (
        <div
          key={opt.key}
          className={`option-card${selected === opt.key ? ' selected' : ''}`}
          onClick={() => onSelect(opt.key)}
        >
          <div className="option-card-title">{opt.title}</div>
          <div className="option-card-desc">{opt.desc}</div>
        </div>
      ))}
      {error && <div className="form-error">{error}</div>}
    </div>
  );

  return (
    <>
      <ProgressBar progress={25} />
      <div className="screen-content">
        <h2 className="card-title mb-8">나의 기본 정보</h2>
        <p className="card-subtitle mb-16">진단에 필요한 최소 정보만 입력해요.</p>

        {isCouple && <h3 className="form-label mb-8">본인</h3>}

        <Input
          label="출생연도"
          type="number"
          value={birthYearInput}
          onChange={(v) => setBirthYearInput(v.replace(/[^0-9]/g, '').slice(0, 4))}
          placeholder="예: 1970"
          suffix="년"
          error={errors.birthYear}
          hint={ageHint}
        />

        <Input
          label="희망 퇴직 나이"
          type="number"
          value={retirementAgeInput}
          onChange={(v) =>
            setRetirementAgeInput(v.replace(/[^0-9]/g, '').slice(0, 2))
          }
          placeholder={`예: ${DEFAULT_RETIREMENT_AGE}`}
          suffix="세"
          error={errors.retirementAge}
          hint={retirementHint}
        />

        {renderIncomeOptions(state.incomeStatus, handleIncome, errors.incomeStatus)}

        {isCouple && (
          <>
            <h3 className="form-label mb-8 mt-16">배우자</h3>
            <Input
              label="출생연도"
              type="number"
              value={spouseBirthYearInput}
              onChange={(v) =>
                setSpouseBirthYearInput(v.replace(/[^0-9]/g, '').slice(0, 4))
              }
              placeholder="예: 1972"
              suffix="년"
              error={spouseErrors.birthYear}
              hint={spouseAgeHint}
            />
            <Input
              label="희망 퇴직 나이"
              type="number"
              value={spouseRetirementAgeInput}
              onChange={(v) =>
                setSpouseRetirementAgeInput(v.replace(/[^0-9]/g, '').slice(0, 2))
              }
              placeholder={`예: ${DEFAULT_RETIREMENT_AGE}`}
              suffix="세"
              error={spouseErrors.retirementAge}
              hint={`${MIN_RETIREMENT_AGE}~${MAX_RETIREMENT_AGE}세`}
            />
            {renderIncomeOptions(
              spouse.incomeStatus,
              handleSpouseIncome,
              spouseErrors.incomeStatus,
            )}

            <div className="form-group">
              <label className="form-label">가구원 수</label>
              <HouseholdChips
                value={state.householdSize}
                onChange={(size) =>
                  dispatch({ type: 'UPDATE', payload: { householdSize: size } })
                }
              />
            </div>
          </>
        )}

        <div className="button-row">
          <Button onClick={handleNext}>다음</Button>
        </div>
      </div>
    </>
  );
}
