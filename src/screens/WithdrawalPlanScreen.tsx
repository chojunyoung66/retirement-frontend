import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useWithdrawalScenarios } from '../hooks/useWithdrawalScenarios';
import { useReports } from '../hooks/useReports';
import { usePayment, usePaymentConfig } from '../hooks/usePayment';
import { isScenarioType } from '../api/withdrawal-scenario-api';
import PlanItemCard from '../components/PlanItemCard';
import CheckoutSheet from '../components/CheckoutSheet';
import { formatWan, formatWon } from '../utils/format';
import {
  DEPENDENT_STATUS_LABEL,
  dependentReasonText,
  formatYm,
  groupMonthlyByYear,
} from '../utils/withdrawal-scenario-view';
import { DEPENDENT_COLOR } from '../utils/report-view';
import { trackReportCheckoutStarted, trackReportCreated, trackWithdrawalPlanView } from '../analytics';

export default function WithdrawalPlanScreen() {
  const navigate = useNavigate();
  const params = useParams();
  const setId = Number(params.setId);
  const type = params.type;
  const validParams = Number.isSafeInteger(setId) && setId > 0 && isScenarioType(type);
  const { plan, isLoading, error, fetchPlan } = useWithdrawalScenarios();
  const { create: createReport, isLoading: isCreatingReport, error: reportError } = useReports();
  const { config: paymentConfig, isLoaded: isPaymentConfigLoaded } = usePaymentConfig();
  const { startCheckout, isStarting, error: checkoutError } = usePayment();
  const [showCheckout, setShowCheckout] = useState(false);
  const tracked = useRef<string | null>(null);
  const isPaid = paymentConfig?.enabled === true;

  const handleCreateReport = async () => {
    if (!plan) return;
    if (isPaid) {
      setShowCheckout(true);
      return;
    }
    const report = await createReport(plan.setId, plan.scenario.type).catch(() => null);
    if (!report) return;
    trackReportCreated(report.scenarioType);
    navigate(`/report/${report.id}`, { state: { justCreated: true } });
  };

  const handleCheckout = async () => {
    if (!plan) return;
    trackReportCheckoutStarted(plan.scenario.type);
    const opened = await startCheckout(
      plan.setId,
      plan.scenario.type,
      `/withdrawal-plan/${plan.setId}/${plan.scenario.type}`,
    );
    if (opened) setShowCheckout(false);
  };

  useEffect(() => {
    if (!validParams) return;
    fetchPlan(setId, type).catch(() => undefined);
  }, [validParams, setId, type, fetchPlan]);

  useEffect(() => {
    if (!plan) return;
    const key = `${plan.setId}-${plan.scenario.type}`;
    if (tracked.current === key) return;
    tracked.current = key;
    trackWithdrawalPlanView(plan.scenario.type);
  }, [plan]);

  if (!validParams) {
    return (
      <div className="screen-content">
        <div className="card">
          <p className="card-subtitle">잘못된 주소예요.</p>
          <Link to="/withdrawal-scenarios">시나리오 비교로 돌아가기</Link>
        </div>
      </div>
    );
  }

  const scenario = plan?.scenario;
  const checkNeeded = plan?.accountChecks.filter((c) => c.nonDeductibleStatus === 'CHECK_NEEDED') ?? [];
  const hasSpousePension = scenario?.yearly.some((row) => row.spouseNationalPension > 0) ?? false;
  const monthlyGroups = scenario ? groupMonthlyByYear(scenario.monthly) : [];

  return (
    <div className="screen-content">
      {error && <div className="form-error mb-8" role="alert">{error}</div>}
      {isLoading && !plan && <div className="card" style={{ textAlign: 'center' }}>불러오는 중...</div>}

      {plan && scenario && (
        <>
          <section className="hero">
            <h1 className="hero-title">
              {scenario.title}
              {scenario.recommended && (
                <span className="badge badge-success" style={{ marginLeft: 8, verticalAlign: 'middle' }}>
                  추천
                </span>
              )}
            </h1>
            <p className="hero-subtitle">{scenario.goal}</p>
          </section>

          <div className="card">
            <div className="card-title">인출 우선순위</div>
            <ol className="form-hint" style={{ paddingLeft: 18, margin: 0 }}>
              {scenario.priorityOrder.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="item-row mt-8">
              <span className="item-row-label">세후 총 인출 / 추정 세금</span>
              <span className="item-row-value">
                {formatWan(scenario.summary.netWithdrawal)} / {formatWan(scenario.summary.totalTax)}
              </span>
            </div>
            <div className="item-row">
              <span className="item-row-label">자산 소진</span>
              <span className="item-row-value">
                {scenario.summary.depletionAge === null ? '계산 기간 내 없음' : `${scenario.summary.depletionAge}세`}
                {scenario.summary.firstShortfallYm ? ` (부족 시작 ${formatYm(scenario.summary.firstShortfallYm)})` : ''}
              </span>
            </div>
          </div>

          {checkNeeded.length > 0 && (
            <div className="card" style={{ background: 'var(--primary-light)' }}>
              <p className="form-hint" style={{ margin: 0 }}>
                {checkNeeded.map((c) => c.label).join(', ')} 계좌는 비공제 원금 확인이 필요해요. 금융사의 연금 과세구분
                조회 결과를 <Link to="/account-assets">계좌 입력</Link>에 반영하면 세금이 더 정확해집니다.
              </p>
            </div>
          )}

          <h2 className="card-title mt-16">계좌별 실행안</h2>
          {scenario.planItems.map((item) => (
            <PlanItemCard key={`${item.accountType}-${item.accountId ?? 'x'}`} item={item} />
          ))}

          <div className="card">
            <div className="card-title">연도별 현금흐름 (연간 합계)</div>
            <div className="cfp-table-wrap">
              <table className="cfp-table">
                <thead>
                  <tr>
                    <th>나이</th>
                    <th>지출</th>
                    <th>세전 인출</th>
                    <th>세금</th>
                    <th>세후 인출</th>
                    <th>국민연금</th>
                    {hasSpousePension && <th>배우자 연금</th>}
                    <th>실업급여</th>
                    <th>건보료</th>
                    <th>부족</th>
                    <th>연말 잔액</th>
                    <th>피부양자</th>
                  </tr>
                </thead>
                <tbody>
                  {scenario.yearly.map((row) => {
                    const reasonText = dependentReasonText(row.dependentReasons);
                    return (
                      <tr key={row.year}>
                        <td className="cfp-td-age">
                          {row.age}세
                          <span style={{ display: 'block', fontSize: 10 }}>{row.year}</span>
                        </td>
                        <td>{formatWan(row.expense)}</td>
                        <td>{formatWan(row.grossWithdrawal)}</td>
                        <td>{formatWan(row.tax)}</td>
                        <td>{formatWan(row.netWithdrawal)}</td>
                        <td>{formatWan(row.nationalPension)}</td>
                        {hasSpousePension && <td>{formatWan(row.spouseNationalPension)}</td>}
                        <td>{formatWan(row.unemployment)}</td>
                        <td>{formatWan(row.healthPremium)}</td>
                        <td style={row.shortfall > 0 ? { color: '#e74c3c' } : undefined}>{formatWan(row.shortfall)}</td>
                        <td>{formatWan(row.endingBalance)}</td>
                        <td style={{ color: DEPENDENT_COLOR[row.dependentStatus] }} title={reasonText || undefined}>
                          {DEPENDENT_STATUS_LABEL[row.dependentStatus]}
                          {reasonText && (
                            <span style={{ display: 'block', fontSize: 10, color: 'var(--text-secondary)' }}>
                              {reasonText}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="form-hint mt-8" style={{ marginBottom: 0 }}>
              지출에는 피부양자 탈락 연도의 지역 건강보험료(건보료 열)가 포함돼요. 피부양자는 “추정 가능 / 주의 / 확인
              필요” 세 단계로만 표시하며, 실제 자격은 건강보험공단에서 확인하세요.
            </p>
          </div>

          <div className="card">
            <div className="card-title">월별 상세</div>
            <p className="form-hint" style={{ marginTop: 0 }}>연도를 누르면 그해 월별 세전·세금·세후·부족을 볼 수 있어요.</p>
            {monthlyGroups.map((group) => (
              <details key={group.year} className="mb-8">
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{group.year}년</summary>
                <div className="cfp-table-wrap mt-4">
                  <table className="cfp-table">
                    <thead>
                      <tr>
                        <th>월</th>
                        <th>세전 인출</th>
                        <th>세금</th>
                        <th>세후 인출</th>
                        <th>부족</th>
                        <th>잔액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((m) => (
                        <tr key={m.ym}>
                          <td className="cfp-td-age">{Number(m.ym.slice(5))}월</td>
                          <td>{formatWan(m.gross)}</td>
                          <td>{formatWan(m.tax)}</td>
                          <td>{formatWan(m.net)}</td>
                          <td style={m.shortfall > 0 ? { color: '#e74c3c' } : undefined}>{formatWan(m.shortfall)}</td>
                          <td>{formatWan(m.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </div>

          {scenario.notes.length > 0 && (
            <div className="card">
              <div className="card-title" style={{ fontSize: '0.95rem' }}>참고</div>
              <ul className="form-hint" style={{ paddingLeft: 18, margin: 0 }}>
                {scenario.notes.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="card">
            <div className="card-title" style={{ fontSize: '0.95rem' }}>기준일·규칙</div>
            <p className="form-hint" style={{ margin: 0 }}>
              규칙 버전 {plan.ruleVersion} · {plan.basisDates.map((b) => `${b.domain} ${b.effectiveDate}`).join(' · ')}
            </p>
            <ul className="form-hint" style={{ paddingLeft: 18, marginBottom: 0 }}>
              {plan.disclaimers.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </div>

          {reportError && <div className="form-error mb-8" role="alert">{reportError}</div>}
          <button
            className="btn-cta"
            onClick={() => void handleCreateReport()}
            disabled={isCreatingReport || !isPaymentConfigLoaded}
          >
            {isCreatingReport
              ? '리포트 만드는 중...'
              : isPaid && paymentConfig
                ? `리포트 만들기 · ${formatWon(paymentConfig.price)}`
                : '이 실행안으로 리포트 만들기'}
          </button>
          <p className="form-hint mt-8">
            지금 결과를 리포트로 고정해 보관해요. PDF·엑셀로 받거나 PC에서 인쇄할 수 있고, 리포트에서 100일 실행
            체크리스트와 무료 검토 요청을 이용할 수 있어요.
          </p>
        </>
      )}

      {showCheckout && paymentConfig && (
        <CheckoutSheet
          price={paymentConfig.price}
          isStarting={isStarting}
          error={checkoutError}
          onClose={() => setShowCheckout(false)}
          onConfirm={() => void handleCheckout()}
        />
      )}

      <div className="mt-16">
        <button className="btn-back" onClick={() => navigate('/withdrawal-scenarios')}>
          시나리오 비교로
        </button>
      </div>
    </div>
  );
}
