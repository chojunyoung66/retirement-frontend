import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDiagnosis } from '../hooks/useDiagnosis';
import { calculateLongTermProjection } from '../service/retirement-service';
import { formatWan } from '../utils/format';

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

export default function CashFlowPlanScreen() {
  const navigate = useNavigate();
  const { state } = useDiagnosis();
  const [inflationRate, setInflationRate] = useState(0.02);
  const [pensionGrowthRate, setPensionGrowthRate] = useState(0.02);
  const [includeUnemployment, setIncludeUnemployment] = useState(false);
  const [ubMonthly, setUbMonthly] = useState('198');
  const [ubMonths, setUbMonths] = useState('9');

  const unemploymentBenefit = useMemo(() => {
    if (!includeUnemployment) return undefined;
    const monthly = Number(ubMonthly) * 10000;
    const months = Math.min(9, Math.max(1, Number(ubMonths) || 9));
    return monthly > 0 ? { monthlyAmount: monthly, durationMonths: months } : undefined;
  }, [includeUnemployment, ubMonthly, ubMonths]);

  const data = useMemo(
    () => calculateLongTermProjection(state, 20, inflationRate, pensionGrowthRate, unemploymentBenefit),
    [state, inflationRate, pensionGrowthRate, unemploymentBenefit],
  );

  const lastYear = data[data.length - 1];
  const totalCumulative = lastYear?.cumulativeGap ?? 0;
  const positiveYears = data.filter((d) => d.monthlyGap >= 0).length;

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
        <div className="cfp-hero-title">20년 현금 흐름 설계</div>
        <div className="cfp-hero-sub">정년퇴직 60세~79세까지의 재정 흐름을 시뮬레이션합니다</div>
      </div>

      {/* 가정 설정 */}
      <div className="card">
        <div className="card-title">시뮬레이션 가정</div>
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
                  placeholder="198"
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
                  placeholder="9"
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

      {/* 20년 요약 지표 */}
      <div className="cfp-kpi-row">
        <div className="cfp-kpi-card">
          <div className="cfp-kpi-label">흑자 연도</div>
          <div className={`cfp-kpi-value ${positiveYears >= 15 ? 'result-positive' : positiveYears >= 10 ? '' : 'result-negative'}`}>
            {positiveYears}년
          </div>
          <div className="cfp-kpi-sub">/ 20년</div>
        </div>
        <div className="cfp-kpi-card">
          <div className="cfp-kpi-label">20년 누적 잔액</div>
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
                  {d.unemploymentBenefitIncome ? <span style={{ fontSize: 10, color: '#2196F3', marginLeft: 2 }}>실업</span> : null}
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
                <tr key={d.year} style={d.unemploymentBenefitIncome ? { backgroundColor: '#f0f8ff' } : undefined}>
                  <td className="cfp-td-age">
                    {d.age}세
                    {d.unemploymentBenefitIncome ? (
                      <span style={{ display: 'block', fontSize: 10, color: '#2196F3', fontWeight: 500 }}>
                        실업급여 포함
                      </span>
                    ) : null}
                    {!d.nationalPensionStarted ? (
                      <span style={{ display: 'block', fontSize: 10, color: '#e67e22' }}>
                        국민연금 대기
                      </span>
                    ) : null}
                  </td>
                  <td>
                    {formatWan(d.monthlyIncome)}
                    {d.unemploymentBenefitIncome ? (
                      <span style={{ display: 'block', fontSize: 10, color: '#2196F3' }}>
                        (+{formatWan(d.unemploymentBenefitIncome)})
                      </span>
                    ) : null}
                  </td>
                  <td>{formatWan(d.monthlyExpense)}</td>
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
