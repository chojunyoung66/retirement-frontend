import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useDiagnosis } from '../hooks/useDiagnosis';
import { useRetirementGoal } from '../hooks/useRetirementGoal';
import { calculateLongTermProjection, generateRecommendations } from '../service/retirement-service';
import Button from '../components/Button';
import SummaryCard from '../components/SummaryCard';
import { formatWan } from '../utils/format';
import { showToast } from '../store/toast-slice';
import type { AppDispatch } from '../store/store';

export default function ProjectionScreen() {
  const navigate = useNavigate();
  const { state } = useDiagnosis();
  const dispatch = useDispatch<AppDispatch>();
  const { saveGoal, isLoading: isSaving } = useRetirementGoal();

  const projection = state.projection;

  const longTermSummary = useMemo(() => {
    if (!projection) return null;
    const data = calculateLongTermProjection(state, 20);
    const totalIncome = data.reduce((s, d) => s + d.monthlyIncome * 12, 0);
    const totalExpense = data.reduce((s, d) => s + d.monthlyExpense * 12, 0);
    const totalGap = totalIncome - totalExpense;
    return { totalIncome, totalExpense, totalGap };
  }, [state, projection]);

  const recommendations = useMemo(() => {
    if (!longTermSummary) return [];
    return generateRecommendations(state, longTermSummary.totalGap);
  }, [state, longTermSummary]);

  const chartValues = useMemo(() => {
    if (!projection) return null;
    const max = Math.max(projection.totalIncome, projection.totalExpense, 1);
    return {
      incomePct: (projection.totalIncome / max) * 100,
      expensePct: (projection.totalExpense / max) * 100,
      gapPct: Math.min(100, (Math.abs(projection.gap) / max) * 100),
    };
  }, [projection]);

  if (!projection || !chartValues) {
    return (
      <>
        <div className="screen-content">
          <div className="card">
            <div className="card-title">진단 데이터가 없습니다</div>
            <div className="card-subtitle">진단을 처음부터 시작해주세요.</div>
            <div className="mt-16">
              <Button onClick={() => navigate('/diagnosis')}>진단 시작하기</Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const isNegative = projection.gap < 0;
  const gapLabel = isNegative ? '월 부족액' : '월 여유금액';

  const handleSave = async () => {
    if (state.birthYear) {
      try {
        await saveGoal({
          birthYear: state.birthYear,
          retirementYear: state.birthYear + 60,
          monthlyLivingExpense: state.livingExpense.desiredMonthly,
          nationalPension: state.pension.national,
          // TODO: 백엔드 계약에 monthlyRetirementPension 필드 추가 후 분리 필요
          // 현재는 월 퇴직연금액을 retirementAsset에 임시 저장
          retirementAsset: state.pension.retirement,
        });
        dispatch(showToast('진단 결과를 서버에 저장했어요'));
      } catch {
        dispatch(showToast('서버 저장에 실패했어요. 다시 시도해 주세요.'));
        return;
      }
    } else {
      dispatch(showToast('진단 결과를 저장했어요'));
    }

    navigate('/summary');
  };

  return (
    <>
      <div className="screen-content">
        <div className="big-gap">
          <div className="big-gap-label">{gapLabel}</div>
          <div className={`big-gap-value ${isNegative ? 'result-negative' : 'result-positive'}`}>
            {isNegative ? '-' : '+'}
            {formatWan(Math.abs(projection.gap))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">월 현금흐름</div>
          <div className="bar-chart">
            <div className="bar-row">
              <div className="bar-header">
                <span>수입</span>
                <span>{formatWan(projection.totalIncome)}</span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill bar-fill-income"
                  style={{ width: `${chartValues.incomePct}%` }}
                />
              </div>
            </div>
            <div className="bar-row">
              <div className="bar-header">
                <span>지출</span>
                <span>{formatWan(projection.totalExpense)}</span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill bar-fill-expense"
                  style={{ width: `${chartValues.expensePct}%` }}
                />
              </div>
            </div>
            <div className="bar-row">
              <div className="bar-header">
                <span>{gapLabel}</span>
                <span>{formatWan(Math.abs(projection.gap))}</span>
              </div>
              <div className="bar-track">
                <div
                  className={`bar-fill ${isNegative ? 'bar-fill-gap-neg' : 'bar-fill-gap-pos'}`}
                  style={{ width: `${chartValues.gapPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">수입 세부</div>
          {projection.incomeItems.length === 0 ? (
            <div className="card-subtitle">등록된 수입이 없어요.</div>
          ) : (
            projection.incomeItems.map((item) => (
              <div key={item.label} className="item-row">
                <span className="item-row-label">{item.label}</span>
                <span className="item-row-value">{formatWan(item.amount)}</span>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-title">지출 세부</div>
          {projection.expenseItems.length === 0 ? (
            <div className="card-subtitle">등록된 지출이 없어요.</div>
          ) : (
            projection.expenseItems.map((item) => (
              <div key={item.label} className="item-row">
                <span className="item-row-label">{item.label}</span>
                <span className="item-row-value">{formatWan(item.amount)}</span>
              </div>
            ))
          )}
        </div>

        {projection.causeAnalysis.length > 0 && (
          <div className="card">
            <div className="card-title">부족 원인 분석</div>
            {projection.causeAnalysis.map((cause) => (
              <div key={cause.cause} className="item-row">
                <span className="item-row-label">{cause.cause}</span>
                <span className="item-row-value">{cause.weight}%</span>
              </div>
            ))}
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="card">
            <div className="card-title">개선 시뮬레이션</div>
            {longTermSummary && (
              <div className={`sim-target-banner ${longTermSummary.totalGap < 0 ? 'sim-target-banner-neg' : 'sim-target-banner-pos'}`}>
                {longTermSummary.totalGap < 0
                  ? `20년간 ${formatWan(Math.abs(longTermSummary.totalGap))} 부족 · 매월 ${formatWan(Math.round(Math.abs(longTermSummary.totalGap) / 240))} 개선 필요`
                  : `20년간 ${formatWan(longTermSummary.totalGap)} 여유 · 현재 계획 양호`}
              </div>
            )}
            {recommendations.map((sim) => (
              <div key={sim.label} className="simulation-card">
                <span className="simulation-label">{sim.label}</span>
                <div style={{ textAlign: 'right' }}>
                  <div className="simulation-delta">+{formatWan(sim.delta)}/월</div>
                  {sim.twentyYearImpact && (
                    <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 2 }}>
                      20년 누적 +{formatWan(sim.twentyYearImpact)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {longTermSummary && (
          <div className="card">
            <div className="card-title">20년 총 현금흐름 요약</div>
            <div className="card-subtitle" style={{ marginBottom: 12 }}>60~79세 · 기본 가정(물가 2%, 연금 2%) 기준</div>
            <div className="item-row">
              <span className="item-row-label">20년 수입 합계</span>
              <span className="item-row-value result-positive">+{formatWan(longTermSummary.totalIncome)}</span>
            </div>
            <div className="item-row">
              <span className="item-row-label">20년 지출 합계</span>
              <span className="item-row-value result-negative">-{formatWan(longTermSummary.totalExpense)}</span>
            </div>
            <div className="item-row" style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
              <span className="item-row-label" style={{ fontWeight: 700 }}>
                {longTermSummary.totalGap >= 0 ? '20년 여유 합계' : '20년 부족 합계'}
              </span>
              <span className={`item-row-value ${longTermSummary.totalGap >= 0 ? 'result-positive' : 'result-negative'}`} style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                {longTermSummary.totalGap >= 0 ? '+' : '-'}{formatWan(Math.abs(longTermSummary.totalGap))}
              </span>
            </div>
          </div>
        )}

        <SummaryCard
          label="가구 유형"
          value={state.diagnosisType === 'couple' ? '부부' : '개인'}
        />

        <button
          className="btn-cta"
          style={{ marginBottom: 12, background: 'var(--primary-dark)' }}
          onClick={() => navigate('/cashflow-plan')}
        >
          📊 20년 현금 흐름 설계 보기
        </button>

        <div className="button-row">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? '저장 중...' : '결과 저장하기'}
          </Button>
        </div>
      </div>
    </>
  );
}
