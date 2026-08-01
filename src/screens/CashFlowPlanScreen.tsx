import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDiagnosis } from '../hooks/useDiagnosis';
import { calculateLongTermProjection, getPensionStartAge, type SecondaryIncome, type HealthEscalationMode } from '../service/retirement-service';
import { formatWan } from '../utils/format';

interface SecondaryIncomeInput {
  startAge: string;
  endAge: string;
  monthlyAmount: string;
}

const INFLATION_OPTIONS = [
  { label: '0%', value: 0 },
  { label: '2%', value: 0.02 },
  { label: '3%', value: 0.03 },
];

const PENSION_GROWTH_OPTIONS = [
  { label: '0%', value: 0 },
  { label: '1%', value: 0.01 },
  { label: '2%', value: 0.02 },
];

const LIFE_OPTIONS = [
  { label: '85세', value: 85 },
  { label: '90세', value: 90 },
  { label: '95세', value: 95 },
  { label: '100세', value: 100 },
];

const HEALTH_ESCALATION_OPTIONS: { label: string; value: HealthEscalationMode }[] = [
  { label: '없음', value: 'none' },
  { label: '일반 증가', value: 'moderate' },
  { label: '급격 증가', value: 'steep' },
];

export default function CashFlowPlanScreen() {
  const navigate = useNavigate();
  const { state } = useDiagnosis();
  const [inflationRate, setInflationRate] = useState(0.02);
  const [pensionGrowthRate, setPensionGrowthRate] = useState(0.02);
  const [lifeExpectancy, setLifeExpectancy] = useState(90);
  const [initialSavings, setInitialSavings] = useState('');
  const [secondaryInputs, setSecondaryInputs] = useState<SecondaryIncomeInput[]>([]);
  const [healthEscalation, setHealthEscalation] = useState<HealthEscalationMode>('none');
  const [includeUnemployment, setIncludeUnemployment] = useState(false);
  const [ubMonthly, setUbMonthly] = useState('');
  const [ubMonths, setUbMonths] = useState('');

  const retirementAge = state.retirementAge ?? 60;
  const years = Math.max(lifeExpectancy - retirementAge, 5);

  const updateSecondary = (index: number, field: keyof SecondaryIncomeInput, value: string) => {
    setSecondaryInputs((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value.replace(/[^0-9]/g, '') } : item)),
    );
  };

  const unemploymentBenefit = useMemo(() => {
    if (!includeUnemployment) return undefined;
    const monthly = Number(ubMonthly) * 10000;
    const months = Number(ubMonths);
    if (monthly <= 0 || months <= 0) return undefined;
    return { monthlyAmount: monthly, durationMonths: Math.min(9, months) };
  }, [includeUnemployment, ubMonthly, ubMonths]);

  const secondaryIncomes = useMemo<SecondaryIncome[]>(() => {
    return secondaryInputs
      .filter(
        (s) => Number(s.startAge) > 0 && Number(s.endAge) >= Number(s.startAge) && Number(s.monthlyAmount) > 0,
      )
      .map((s) => ({
        startAge: Number(s.startAge),
        endAge: Number(s.endAge),
        monthlyAmount: Number(s.monthlyAmount) * 10000,
      }));
  }, [secondaryInputs]);

  const data = useMemo(
    () => calculateLongTermProjection(state, years, inflationRate, pensionGrowthRate, unemploymentBenefit, secondaryIncomes, healthEscalation),
    [state, years, inflationRate, pensionGrowthRate, unemploymentBenefit, secondaryIncomes, healthEscalation],
  );

  const pensionStartAge = useMemo(() => getPensionStartAge(state.birthYear ?? null), [state.birthYear]);
  const privatePensionEndAge = retirementAge + 20;
  const hasPrivatePension = (state.pension.retirement + state.pension.personal) > 0;

  const lastYear = data[data.length - 1];
  const totalCumulative = lastYear?.cumulativeGap ?? 0;
  const positiveYears = data.filter((d) => d.monthlyGap >= 0).length;

  // 자산 소진 분석 — 보유 금융자산(만원)을 원 단위로 환산
  const savingsWon = Number(initialSavings) * 10000;
  const hasValidSavings = savingsWon > 0;
  const depletionRow = hasValidSavings
    ? data.find((d) => savingsWon + d.cumulativeGap < 0)
    : null;
  const currentAge = state.birthYear ? new Date().getFullYear() - state.birthYear : null;
  const yearsUntilDepletion =
    depletionRow && currentAge ? depletionRow.age - currentAge : null;

  const maxAbs = useMemo(
    () => Math.max(...data.map((d) => Math.abs(d.cumulativeGap)), 1),
    [data],
  );

  if (!state.projection) {
    return (
      <div className="screen-content">
        <div className="card">
          <div className="card-title">진단 데이터가 없습니다</div>
          <div className="card-subtitle">진단을 먼저 완료해주세요.</div>
          <div className="mt-16">
            <button className="btn-cta" onClick={() => navigate('/diagnosis')}>
              진단 시작하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-content">
      <div className="cfp-hero">
        <div className="cfp-hero-title">{years}년 현금 흐름 설계</div>
        <div className="cfp-hero-sub">
          {retirementAge}세~{lifeExpectancy - 1}세 · 기대수명 {lifeExpectancy}세 기준
        </div>
      </div>

      {/* 시뮬레이션 가정 */}
      <div className="card">
        <div className="card-title">시뮬레이션 가정</div>

        {/* 기대수명 */}
        <div className="cfp-assumption-row">
          <span className="cfp-assumption-label">기대수명</span>
          <div className="cfp-chip-group">
            {LIFE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`cfp-chip ${lifeExpectancy === opt.value ? 'cfp-chip-active' : ''}`}
                onClick={() => setLifeExpectancy(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 물가 상승률 */}
        <div className="cfp-assumption-row">
          <span className="cfp-assumption-label">물가 상승률</span>
          <div className="cfp-chip-group">
            {INFLATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`cfp-chip ${inflationRate === opt.value ? 'cfp-chip-active' : ''}`}
                onClick={() => setInflationRate(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 연금 인상률 */}
        <div className="cfp-assumption-row">
          <span className="cfp-assumption-label">연금 인상률</span>
          <div className="cfp-chip-group">
            {PENSION_GROWTH_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`cfp-chip ${pensionGrowthRate === opt.value ? 'cfp-chip-active' : ''}`}
                onClick={() => setPensionGrowthRate(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 의료비 증가 시나리오 */}
        <div className="cfp-assumption-row">
          <span className="cfp-assumption-label">의료비 증가</span>
          <div className="cfp-chip-group">
            {HEALTH_ESCALATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`cfp-chip ${healthEscalation === opt.value ? 'cfp-chip-active' : ''}`}
                onClick={() => setHealthEscalation(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {healthEscalation !== 'none' && (
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 8px', lineHeight: 1.5, textAlign: 'right' }}>
            {healthEscalation === 'moderate'
              ? '70세 ×1.5 → 75세 ×2.0 → 80세 ×2.5 → 85세 ×3.0 (물가 상승 별도)'
              : '70세 ×2.0 → 75세 ×3.0 → 80세 ×4.0 → 85세 ×5.0 (물가 상승 별도)'}
          </p>
        )}

        {/* 제2 수입 (파트타임 · 프리랜서 · 창업 등) */}
        <div className="cfp-assumption-row" style={{ alignItems: 'flex-start' }}>
          <span className="cfp-assumption-label" style={{ paddingTop: 6 }}>제2 수입</span>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            {secondaryInputs.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <input
                  type="number"
                  value={s.startAge}
                  onChange={(e) => updateSecondary(i, 'startAge', e.target.value)}
                  className="cfp-ub-input cfp-ub-input-sm"
                  placeholder="시작"
                  style={{ width: 52 }}
                />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>~</span>
                <input
                  type="number"
                  value={s.endAge}
                  onChange={(e) => updateSecondary(i, 'endAge', e.target.value)}
                  className="cfp-ub-input cfp-ub-input-sm"
                  placeholder="종료"
                  style={{ width: 52 }}
                />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>세,</span>
                <input
                  type="number"
                  value={s.monthlyAmount}
                  onChange={(e) => updateSecondary(i, 'monthlyAmount', e.target.value)}
                  className="cfp-ub-input"
                  placeholder="월 수입"
                  style={{ width: 80 }}
                />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>만원/월</span>
                <button
                  onClick={() => setSecondaryInputs((prev) => prev.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 16, padding: '0 2px' }}
                >
                  ✕
                </button>
              </div>
            ))}
            {secondaryInputs.length < 3 && (
              <button
                onClick={() => setSecondaryInputs((prev) => [...prev, { startAge: '', endAge: '', monthlyAmount: '' }])}
                style={{
                  fontSize: 13, color: 'var(--primary)', background: 'none', border: '1px dashed var(--primary)',
                  borderRadius: 6, padding: '4px 12px', cursor: 'pointer',
                }}
              >
                + 수입 구간 추가
              </button>
            )}
            {secondaryInputs.length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                파트타임·컨설팅·프리랜서 등 퇴직 후 추가 수입
              </span>
            )}
          </div>
        </div>

        {/* 보유 금융자산 */}
        <div className="cfp-assumption-row">
          <span className="cfp-assumption-label">보유 금융자산</span>
          <div className="cfp-ub-inputs">
            <div className="cfp-ub-field">
              <input
                type="number"
                value={initialSavings}
                onChange={(e) => setInitialSavings(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={(e) => { if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
                className="cfp-ub-input"
                placeholder="예: 30000"
                style={{ width: 100 }}
              />
              <span className="cfp-ub-unit">만원 (자산 소진 분석용)</span>
            </div>
          </div>
        </div>

        {/* 실업급여 */}
        <div className="cfp-assumption-row">
          <span className="cfp-assumption-label">실업급여</span>
          <div className="cfp-chip-group">
            <button
              className={`cfp-chip ${!includeUnemployment ? 'cfp-chip-active' : ''}`}
              onClick={() => setIncludeUnemployment(false)}
            >
              미포함
            </button>
            <button
              className={`cfp-chip ${includeUnemployment ? 'cfp-chip-active' : ''}`}
              onClick={() => setIncludeUnemployment(true)}
            >
              포함
            </button>
          </div>
        </div>
        {includeUnemployment && (
          <div className="cfp-ub-extra">
            <div className="cfp-ub-inputs">
              <div className="cfp-ub-field">
                <input
                  type="number"
                  value={ubMonthly}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, '');
                    setUbMonthly(Number(v) > 198 ? '198' : v);
                  }}
                  onKeyDown={(e) => { if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
                  className="cfp-ub-input"
                  placeholder="예: 198"
                  max={198}
                />
                <span className="cfp-ub-unit">만원/월 (최대 198)</span>
              </div>
              <div className="cfp-ub-field">
                <input
                  type="number"
                  value={ubMonths}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, '');
                    setUbMonths(Number(v) > 9 ? '9' : v);
                  }}
                  onKeyDown={(e) => { if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
                  className="cfp-ub-input cfp-ub-input-sm"
                  placeholder="예: 9"
                  min={1}
                  max={9}
                />
                <span className="cfp-ub-unit">개월 (최대 9)</span>
              </div>
            </div>
            <p className="cfp-ub-hint">실업급여 시뮬레이션 결과를 입력하세요. 60세 연도에 일괄 반영됩니다.</p>
          </div>
        )}
      </div>

      {/* 자산 소진 분석 카드 */}
      {hasValidSavings && (
        <div
          className="card"
          style={{
            borderLeft: `4px solid ${depletionRow ? '#e74c3c' : 'var(--success)'}`,
            background: depletionRow ? '#fff8f8' : '#f8fff9',
          }}
        >
          {depletionRow ? (
            <>
              <div className="card-title" style={{ color: '#e74c3c' }}>
                자산 소진 경고
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                {depletionRow.age}세에 보유 금융자산이 소진될 것으로 예상됩니다
              </div>
              {yearsUntilDepletion !== null && (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  지금으로부터 약 {yearsUntilDepletion}년 후 · 수입 증가 또는 지출 절감이 필요해요
                </div>
              )}
            </>
          ) : (
            <>
              <div className="card-title" style={{ color: 'var(--success)' }}>
                자산 유지
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                기대수명 {lifeExpectancy}세까지 보유 금융자산이 유지됩니다
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {years}년 누적 현금흐름 기준 · 자산 소진 위험 없음
              </div>
            </>
          )}
        </div>
      )}

      {/* 요약 KPI */}
      <div className="cfp-kpi-row">
        <div className="cfp-kpi-card">
          <div className="cfp-kpi-label">흑자 연도</div>
          <div className={`cfp-kpi-value ${positiveYears >= years * 0.75 ? 'result-positive' : positiveYears >= years * 0.5 ? '' : 'result-negative'}`}>
            {positiveYears}년
          </div>
          <div className="cfp-kpi-sub">/ {years}년</div>
        </div>
        <div className="cfp-kpi-card">
          <div className="cfp-kpi-label">{years}년 누적 잔액</div>
          <div className={`cfp-kpi-value ${totalCumulative >= 0 ? 'result-positive' : 'result-negative'}`}>
            {totalCumulative >= 0 ? '+' : ''}{formatWan(Math.round(totalCumulative / 10000) * 10000)}
          </div>
          <div className="cfp-kpi-sub">연간 합산</div>
        </div>
      </div>

      {/* 누적 잔액 시각화 */}
      <div className="card">
        <div className="card-title">누적 잔액 추이</div>
        <div className="cfp-chart">
          {data.map((d) => {
            const pct = Math.min(100, (Math.abs(d.cumulativeGap) / maxAbs) * 100);
            const isPos = d.cumulativeGap >= 0;
            return (
              <div key={d.year} className="cfp-chart-row">
                <div className="cfp-chart-age">
                  {d.age}세
                  {d.unemploymentBenefitIncome ? <span style={{ fontSize: 10, color: 'var(--primary)', marginLeft: 2 }}>실업</span> : null}
                </div>
                <div className="cfp-chart-track">
                  <div
                    className={`cfp-chart-fill ${isPos ? 'cfp-chart-fill-pos' : 'cfp-chart-fill-neg'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className={`cfp-chart-val ${isPos ? 'result-positive' : 'result-negative'}`}>
                  {isPos ? '+' : ''}{formatWan(Math.round(d.cumulativeGap / 10000) * 10000)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 연도별 상세 테이블 */}
      <div className="card">
        <div className="card-title">연도별 현금 흐름 상세</div>
        <div className="cfp-table-wrap">
          <table className="cfp-table">
            <thead>
              <tr>
                <th>나이</th>
                <th>월 수입</th>
                <th>월 지출</th>
                <th>월 갭</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.year} style={d.unemploymentBenefitIncome ? { backgroundColor: 'var(--primary-light)' } : undefined}>
                  <td className="cfp-td-age">
                    {d.age}세
                    {d.unemploymentBenefitIncome ? (
                      <span style={{ display: 'block', fontSize: 10, color: 'var(--primary)', fontWeight: 500 }}>
                        실업급여 포함
                      </span>
                    ) : null}
                    {d.secondaryIncome ? (
                      <span style={{ display: 'block', fontSize: 10, color: '#27ae60', fontWeight: 500 }}>
                        제2 수입 포함
                      </span>
                    ) : null}
                    {!d.nationalPensionStarted ? (
                      <span style={{ display: 'block', fontSize: 10, color: '#e67e22' }}>
                        국민연금 {pensionStartAge}세 수급 예정
                      </span>
                    ) : null}
                    {hasPrivatePension && d.age === privatePensionEndAge ? (
                      <span style={{ display: 'block', fontSize: 10, color: '#e74c3c' }}>
                        퇴직·개인연금 수령 종료
                      </span>
                    ) : null}
                  </td>
                  <td>
                    {formatWan(d.monthlyIncome)}
                    {d.unemploymentBenefitIncome ? (
                      <span style={{ display: 'block', fontSize: 10, color: 'var(--primary)' }}>
                        (실업 +{formatWan(d.unemploymentBenefitIncome)})
                      </span>
                    ) : null}
                    {d.secondaryIncome ? (
                      <span style={{ display: 'block', fontSize: 10, color: '#27ae60' }}>
                        (제2 +{formatWan(d.secondaryIncome)})
                      </span>
                    ) : null}
                  </td>
                  <td>
                    {formatWan(d.monthlyExpense)}
                    {healthEscalation !== 'none' && d.monthlyMedicalExpense > 0 && d.age >= 70 && (
                      <span style={{ display: 'block', fontSize: 10, color: '#e74c3c' }}>
                        (의료비 {formatWan(d.monthlyMedicalExpense)})
                      </span>
                    )}
                  </td>
                  <td className={d.monthlyGap >= 0 ? 'result-positive' : 'result-negative'}>
                    {d.monthlyGap >= 0 ? '+' : ''}{formatWan(d.monthlyGap)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button className="btn-back" style={{ width: '100%', marginBottom: 24 }} onClick={() => navigate('/result')}>
        ← 결과 화면으로
      </button>
    </div>
  );
}
