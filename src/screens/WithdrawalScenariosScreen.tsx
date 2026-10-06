import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAccountAssets } from '../hooks/useAccountAssets';
import { useWithdrawalScenarios } from '../hooks/useWithdrawalScenarios';
import { useDiagnosis } from '../hooks/useDiagnosis';
import OptionCardGroup, { type OptionCardItem } from '../components/OptionCard';
import { getPensionStartAge } from '../service/retirement-service';
import { formatWan } from '../utils/format';
import {
  VALUE_SOURCE_LABEL,
  formatYm,
  scenarioOptionDesc,
  summarizeScenarioCard,
} from '../utils/withdrawal-scenario-view';
import type {
  GenerateScenarioRequest,
  ScenarioSet,
  ScenarioType,
} from '../api/withdrawal-scenario-api';
import { claimScenarioCompareView, trackScenarioCompareView, trackScenarioSelected } from '../analytics';

type UnemploymentMode = 'simulation' | 'none';

export default function WithdrawalScenariosScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const fieldId = useId();
  const { state } = useDiagnosis();
  const { assets, fetchAssets } = useAccountAssets();
  const { scenarioSet, isLoading, error, fetchLatest, generate, select } = useWithdrawalScenarios();
  const [unemploymentMode, setUnemploymentMode] = useState<UnemploymentMode>('simulation');
  const [unemploymentStartYm, setUnemploymentStartYm] = useState('');
  const [yearsOfService, setYearsOfService] = useState('');
  // 세금·건보 체크에서 넘어오면 입력한 재산값을 미리 채운다
  const [propertyWan, setPropertyWan] = useState(() => {
    const value = (location.state as { propertyValue?: unknown } | null)?.propertyValue;
    return typeof value === 'number' && value >= 0 ? String(Math.round(value / 10000)) : '';
  });
  const [formError, setFormError] = useState('');
  const viewedSetId = useRef<number | null>(null);

  useEffect(() => {
    fetchAssets().catch(() => undefined);
    fetchLatest().catch(() => undefined);
  }, [fetchAssets, fetchLatest]);

  // 비교 화면 노출은 세트당 1회 — 화면을 다시 열어도 같은 세트는 보내지 않는다
  useEffect(() => {
    if (!scenarioSet || viewedSetId.current === scenarioSet.id) return;
    viewedSetId.current = scenarioSet.id;
    if (!claimScenarioCompareView(scenarioSet.id)) return;
    trackScenarioCompareView({
      diagnosisType: state.diagnosisType,
      hasSpouse: state.spouse != null,
      totalBalanceWon: scenarioSet.result.inputSummary.totalBalance,
    });
  }, [scenarioSet, state.diagnosisType, state.spouse]);

  // 진단 세션에 국민연금 월액이 있으면 그 값을 쓴다 (서버는 연금 금액을 저장하지 않음)
  const sessionNationalPension =
    state.pension.national > 0 && !state.needsPensionReinput
      ? { monthlyAmount: Math.round(state.pension.national), startAge: getPensionStartAge(state.birthYear) }
      : null;
  const spouse = state.diagnosisType === 'couple' ? state.spouse : null;
  const sessionSpousePension =
    spouse && spouse.pension.national > 0 && spouse.birthYear != null && !state.needsPensionReinput
      ? { monthlyAmount: Math.round(spouse.pension.national), startAge: getPensionStartAge(spouse.birthYear) }
      : null;

  const handleGenerate = async () => {
    const body: GenerateScenarioRequest = {};
    if (sessionNationalPension) body.nationalPension = sessionNationalPension;
    if (sessionSpousePension) body.spouseNationalPension = sessionSpousePension;
    if (unemploymentMode === 'none') body.unemployment = null;
    else if (unemploymentStartYm) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(unemploymentStartYm)) {
        setFormError('실업급여 시작월을 YYYY-MM 형식으로 입력하세요');
        return;
      }
      body.unemploymentStartYm = unemploymentStartYm;
    }
    if (yearsOfService.trim()) {
      const years = Number(yearsOfService);
      if (!Number.isFinite(years) || years <= 0 || years > 50) {
        setFormError('근속연수는 0보다 크고 50 이하인 숫자로 입력하세요');
        return;
      }
      body.yearsOfService = years;
    }
    if (propertyWan.trim()) {
      const wan = Number(propertyWan);
      if (!Number.isFinite(wan) || wan < 0 || wan > 10_000_000) {
        setFormError('재산 과세표준을 만원 단위 숫자로 입력하세요');
        return;
      }
      body.propertyValue = Math.round(wan * 10000);
    }
    setFormError('');
    await generate(body).catch(() => undefined);
  };

  const handleSelect = (set: ScenarioSet, type: ScenarioType) => {
    trackScenarioSelected(type);
    select(set.id, type).catch(() => undefined);
  };

  const selectedType = scenarioSet ? (scenarioSet.selectedType ?? scenarioSet.result.recommendedType) : null;
  const options: OptionCardItem<ScenarioType>[] =
    scenarioSet?.result.scenarios.map((card) => ({
      value: card.type,
      title: `${card.title}${card.recommended ? ' (추천)' : ''}`,
      desc: scenarioOptionDesc(card, scenarioSet.result.inputSummary.propertyProvided),
    })) ?? [];

  return (
    <div className="screen-content">
      <section className="hero">
        <h1 className="hero-title">4개 인출 시나리오 비교</h1>
        <p className="hero-subtitle">
          같은 자산·지출 조건에서 계좌를 어떤 순서로 쓰느냐에 따라 세금과 자산 소진 시점이 달라져요.
        </p>
      </section>

      <div className="card">
        <div className="card-title">입력 점검</div>
        <div className="item-row">
          <span className="item-row-label">계좌 자산</span>
          <span className="item-row-value">
            {assets.length}개 · {formatWan(assets.reduce((s, a) => s + a.balance, 0))}{' '}
            <Link to="/account-assets">수정</Link>
          </span>
        </div>
        <div className="item-row">
          <span className="item-row-label">국민연금 월액</span>
          <span className="item-row-value">
            {sessionNationalPension
              ? `진단 입력값 ${formatWan(sessionNationalPension.monthlyAmount)} (${sessionNationalPension.startAge}세~)`
              : '최근 국민연금 시뮬레이션 결과 사용 (없으면 0원)'}
          </span>
        </div>
        {spouse && (
          <div className="item-row">
            <span className="item-row-label">배우자 국민연금</span>
            <span className="item-row-value">
              {sessionSpousePension
                ? `진단 입력값 ${formatWan(sessionSpousePension.monthlyAmount)} (${sessionSpousePension.startAge}세~)`
                : '진단에 입력하지 않아 반영 안 함'}
            </span>
          </div>
        )}

        <div className="mt-8" id={`${fieldId}-ub`} role="group" aria-label="실업급여 반영">
          <span className="form-label">실업급여</span>
          <div className="cfp-chip-group">
            <button
              type="button"
              className={`cfp-chip${unemploymentMode === 'simulation' ? ' cfp-chip-active' : ''}`}
              aria-pressed={unemploymentMode === 'simulation'}
              onClick={() => setUnemploymentMode('simulation')}
            >
              최근 시뮬레이션 반영
            </button>
            <button
              type="button"
              className={`cfp-chip${unemploymentMode === 'none' ? ' cfp-chip-active' : ''}`}
              aria-pressed={unemploymentMode === 'none'}
              onClick={() => setUnemploymentMode('none')}
            >
              반영 안 함
            </button>
          </div>
          {unemploymentMode === 'simulation' && (
            <div className="mt-8">
              <label className="form-label" htmlFor={`${fieldId}-ub-start`}>실업급여 시작월 (선택)</label>
              <input
                id={`${fieldId}-ub-start`}
                className="input"
                type="month"
                value={unemploymentStartYm}
                onChange={(e) => setUnemploymentStartYm(e.target.value)}
              />
              <p className="form-hint">비워 두면 퇴직한 달부터 받는다고 보고 계산해요.</p>
            </div>
          )}
        </div>

        <div className="mt-8" style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label className="form-label" htmlFor={`${fieldId}-years`}>근속연수 (선택)</label>
            <input
              id={`${fieldId}-years`}
              className="input"
              inputMode="decimal"
              placeholder="퇴직금 시뮬레이션 값 사용"
              value={yearsOfService}
              onChange={(e) => setYearsOfService(e.target.value)}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label className="form-label" htmlFor={`${fieldId}-property`}>재산 과세표준 (선택, 만원)</label>
            <input
              id={`${fieldId}-property`}
              className="input"
              inputMode="decimal"
              placeholder="피부양자 판단용"
              value={propertyWan}
              onChange={(e) => setPropertyWan(e.target.value)}
            />
          </div>
        </div>
        <p className="form-hint mt-8">
          근속연수는 DC 퇴직소득세 계산에, 재산은 건강보험 피부양자 추정에만 씁니다. 비워 두면 최근 시뮬레이션 값이나
          기본값을 쓰고 결과에 출처를 표시해요. 재산 기준이 헷갈리면{' '}
          <Link to="/tax-health-check">세금·건보 체크</Link>에서 먼저 확인하세요.
        </p>

        {formError && <div className="form-error mb-8" role="alert">{formError}</div>}
        {error && (
          <div className="form-error mb-8" role="alert">
            {error}
            {error.includes('진단') &&
              (state.projection ? (
                <> · <Link to="/result">결과 화면에서 진단 저장하기</Link></>
              ) : (
                <> · <Link to="/diagnosis">진단하러 가기</Link></>
              ))}
            {error.includes('계좌') && <> · <Link to="/account-assets">계좌 입력하기</Link></>}
          </div>
        )}

        <button
          className="btn-cta"
          onClick={() => void handleGenerate()}
          disabled={isLoading || assets.length === 0}
        >
          {isLoading ? '계산 중...' : scenarioSet ? '다시 계산하기' : '시나리오 생성'}
        </button>
        {assets.length === 0 && (
          <p className="form-hint mt-8">
            먼저 <Link to="/account-assets">계좌별 자산</Link>을 1개 이상 입력하세요.
          </p>
        )}
      </div>

      {scenarioSet && (
        <>
          <div className="card">
            <div className="card-title">추천 기본안: {scenarioSet.result.recommendedType}안</div>
            <p className="form-hint" style={{ margin: 0 }}>{scenarioSet.result.recommendationNote}</p>
            <p className="form-hint mt-8" style={{ marginBottom: 0 }}>
              계산 기간 {formatYm(scenarioSet.result.startYm)} ~ {formatYm(scenarioSet.result.endYm)} · 국민연금{' '}
              {VALUE_SOURCE_LABEL[scenarioSet.result.inputSummary.nationalPensionSource]} · 실업급여{' '}
              {VALUE_SOURCE_LABEL[scenarioSet.result.inputSummary.unemploymentSource]} · 근속연수{' '}
              {VALUE_SOURCE_LABEL[scenarioSet.result.inputSummary.yearsOfServiceSource]}
            </p>
          </div>

          <div className="card">
            <div className="card-title" id={`${fieldId}-scenarios`}>시나리오 선택</div>
            <OptionCardGroup
              labelledBy={`${fieldId}-scenarios`}
              options={options}
              selected={selectedType}
              onSelect={(type) => handleSelect(scenarioSet, type)}
            />
          </div>

          <div className="card">
            <div className="card-title">한눈에 비교</div>
            <div className="cfp-table-wrap">
              <table className="cfp-table">
                <thead>
                  <tr>
                    <th>항목</th>
                    {scenarioSet.result.scenarios.map((card) => (
                      <th key={card.type}>{card.type}안</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ['세후 총 인출', 'netWithdrawal'],
                      ['추정 세금', 'totalTax'],
                      ['자산 소진', 'depletion'],
                      ['피부양자 추정', 'dependentYears'],
                    ] as const
                  ).map(([label, key]) => (
                    <tr key={key}>
                      <td className="cfp-td-age">{label}</td>
                      {scenarioSet.result.scenarios.map((card) => (
                        <td key={card.type}>
                          {summarizeScenarioCard(card, scenarioSet.result.inputSummary.propertyProvided)[key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {scenarioSet.result.isaStrategy.length > 0 && (
            <div className="card">
              <div className="card-title">ISA 만기·연금계좌 전환</div>
              {scenarioSet.result.isaStrategy.map((isa) => (
                <div key={isa.accountId} className="mb-8">
                  <div className="item-row">
                    <span className="item-row-label">{isa.label}</span>
                    <span className="item-row-value">
                      추가 공제대상 {formatWan(isa.extraCreditBase)} · 세액공제 최대 약 {formatWan(isa.maxTaxCreditEstimate)}
                    </span>
                  </div>
                  <ul className="form-hint" style={{ paddingLeft: 18, margin: 0 }}>
                    {isa.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {selectedType && (
            <button
              className="btn-cta"
              onClick={() => navigate(`/withdrawal-plan/${scenarioSet.id}/${selectedType}`)}
            >
              {selectedType}안 계좌별 실행안 보기
            </button>
          )}

          <div className="card mt-16">
            <div className="card-title" style={{ fontSize: '0.95rem' }}>기준일·규칙</div>
            <p className="form-hint" style={{ margin: 0 }}>
              규칙 버전 {scenarioSet.ruleVersion} ·{' '}
              {scenarioSet.result.basisDates.map((b) => `${b.domain} ${b.effectiveDate}`).join(' · ')}
            </p>
            <ul className="form-hint" style={{ paddingLeft: 18, marginBottom: 0 }}>
              {scenarioSet.result.disclaimers.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </div>
        </>
      )}

      <div className="mt-16">
        <button className="btn-back" onClick={() => navigate('/account-assets')}>계좌 입력으로</button>
      </div>
    </div>
  );
}
