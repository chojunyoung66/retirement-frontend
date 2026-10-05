import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDiagnosis } from '../hooks/useDiagnosis';
import { runTaxHealthCheck, type TaxHealthCheckResult } from '../api/tax-health-check-api';
import { trackTaxHealthCheckRun } from '../analytics';
import { formatWan } from '../utils/format';
import { getApiErrorMessage } from '../utils/api-error-message';
import {
  EMPTY_TAX_HEALTH_FORM,
  PREMIUM_COMPARISON_TEXT,
  buildTaxHealthCheckRequest,
  type TaxHealthCheckForm,
} from '../utils/tax-health-check-form';

const FIELD_LABEL: Record<keyof TaxHealthCheckForm, string> = {
  publicPensionWan: '공적연금(국민연금 등) 연액',
  laborWan: '근로소득 연액',
  businessWan: '사업소득 연액',
  financialWan: '이자·배당 연액',
  otherWan: '기타소득 연액',
  propertyWan: '재산 과세표준',
  carWan: '차량가액',
  actualPremiumWon: '실제 고지 월 보험료',
  spouseIncomeWan: '배우자 연 소득',
};

const STATUS_COLOR: Record<TaxHealthCheckResult['dependent']['status'], string> = {
  LIKELY: 'var(--success)',
  CAUTION: 'var(--danger)',
  CHECK_NEEDED: 'var(--text-secondary)',
};

const wanString = (won: number): string => (won > 0 ? String(Math.round(won / 10_000)) : '');

export default function TaxHealthCheckScreen() {
  const navigate = useNavigate();
  const fieldId = useId();
  const { state } = useDiagnosis();
  const spouse = state.diagnosisType === 'couple' ? state.spouse : null;
  // 진단 세션의 국민연금 월액을 연액으로 미리 채운다 (서버는 연금 금액을 저장하지 않음)
  const [form, setForm] = useState<TaxHealthCheckForm>(() => ({
    ...EMPTY_TAX_HEALTH_FORM,
    publicPensionWan: wanString(state.pension.national * 12),
    spouseIncomeWan: spouse ? wanString(spouse.pension.national * 12) : '',
  }));
  const [result, setResult] = useState<TaxHealthCheckResult | null>(null);
  const [propertyValue, setPropertyValue] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (field: keyof TaxHealthCheckForm) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleRun = async () => {
    const built = buildTaxHealthCheckRequest(form, spouse != null);
    if (!built.ok) {
      setError(`${FIELD_LABEL[built.field]}을(를) 0 이상의 숫자로 입력하세요`);
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const next = await runTaxHealthCheck(built.request);
      setResult(next);
      setPropertyValue(built.request.propertyValue);
      trackTaxHealthCheckRun({
        hasPropertyInput: built.request.propertyValue !== null,
        hasFinancialIncomeInput: built.request.financialIncome > 0,
        hasActualPremiumInput: built.request.actualMonthlyPremium !== null,
      });
    } catch (err) {
      setError(getApiErrorMessage(err, '일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요'));
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (field: keyof TaxHealthCheckForm, suffix: string, placeholder = '0') => (
    <div className="mb-8">
      <label className="form-label" htmlFor={`${fieldId}-${field}`}>
        {FIELD_LABEL[field]} ({suffix})
      </label>
      <input
        id={`${fieldId}-${field}`}
        className="input"
        inputMode="decimal"
        placeholder={placeholder}
        value={form[field]}
        onChange={(e) => update(field)(e.target.value)}
      />
    </div>
  );

  return (
    <div className="screen-content">
      <section className="hero">
        <h1 className="hero-title">세금·건강보험 체크</h1>
        <p className="hero-subtitle">
          자녀의 건강보험 피부양자로 남을 수 있는지, 지역가입자가 되면 보험료가 얼마인지 추정해요. 입력값은 서버에 저장하지 않아요.
        </p>
      </section>

      <div className="card">
        <div className="card-title">소득·재산 (연 기준)</div>
        {renderField('publicPensionWan', '만원')}
        {renderField('laborWan', '만원')}
        {renderField('businessWan', '만원')}
        {renderField('financialWan', '만원')}
        {renderField('otherWan', '만원')}
        {renderField('propertyWan', '만원', '모르면 비워 두세요')}
        {renderField('carWan', '만원')}
        {spouse && renderField('spouseIncomeWan', '만원')}
        {renderField('actualPremiumWon', '원', '고지서 금액, 모르면 비워 두세요')}
        <p className="form-hint">
          연금저축·IRP·퇴직연금 수령액은 피부양자 소득과 지역보험료에 반영되지 않아 입력하지 않아요.
        </p>
        {error && <div className="form-error mb-8" role="alert">{error}</div>}
        <button className="btn-cta" onClick={() => void handleRun()} disabled={isLoading}>
          {isLoading ? '계산 중...' : '체크하기'}
        </button>
      </div>

      {result && (
        <>
          <div className="card">
            <div className="card-title">
              피부양자 추정: <span style={{ color: STATUS_COLOR[result.dependent.status] }}>{result.dependent.statusLabel}</span>
            </div>
            {result.dependent.reasons.length > 0 ? (
              <ul className="form-hint" style={{ paddingLeft: 18, margin: 0 }}>
                {result.dependent.reasons.map((r) => (
                  <li key={r.code}>{r.label}</li>
                ))}
              </ul>
            ) : (
              <p className="form-hint" style={{ margin: 0 }}>입력한 소득·재산 기준으로는 요건을 넘는 항목이 없어요.</p>
            )}
          </div>

          <div className="card">
            <div className="card-title">지역가입자 보험료 (월, 장기요양 포함)</div>
            <div className="item-row">
              <span className="item-row-label">추정 보험료</span>
              <span className="item-row-value">{result.premium.estimatedMonthly.toLocaleString()}원</span>
            </div>
            <div className="item-row">
              <span className="item-row-label">소득분 · 재산분 · 차량분</span>
              <span className="item-row-value">
                {result.premium.incomePremium.toLocaleString()} · {result.premium.propertyPremium.toLocaleString()} ·{' '}
                {result.premium.carPremium.toLocaleString()}원
              </span>
            </div>
            {result.premium.actualMonthly !== null && (
              <div className="item-row">
                <span className="item-row-label">실제 고지 (차이)</span>
                <span className="item-row-value">
                  {result.premium.actualMonthly.toLocaleString()}원 ({(result.premium.differenceMonthly ?? 0) >= 0 ? '+' : ''}
                  {(result.premium.differenceMonthly ?? 0).toLocaleString()}원)
                </span>
              </div>
            )}
            <p className="form-hint mt-8" style={{ marginBottom: 0 }}>{PREMIUM_COMPARISON_TEXT[result.premium.comparison]}</p>
          </div>

          <div className="card">
            <div className="card-title">확인할 일</div>
            <ul className="form-hint" style={{ paddingLeft: 18, margin: 0 }}>
              {result.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <button
            className="btn-cta"
            onClick={() => navigate('/withdrawal-scenarios', { state: { propertyValue } })}
          >
            {propertyValue !== null
              ? `재산 ${formatWan(propertyValue)}으로 4개 시나리오 계산하기`
              : '4개 시나리오로 이동'}
          </button>

          <div className="card mt-16">
            <div className="card-title" style={{ fontSize: '0.95rem' }}>기준일·규칙</div>
            <p className="form-hint" style={{ margin: 0 }}>
              규칙 버전 {result.ruleVersion} · {result.basisDate.domain} {result.basisDate.effectiveDate} ({result.basisDate.source})
            </p>
            <ul className="form-hint" style={{ paddingLeft: 18, marginBottom: 0 }}>
              {result.notices.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </div>
        </>
      )}

      <div className="mt-16">
        <Link to="/account-assets" className="btn-back">계좌 입력으로</Link>
      </div>
    </div>
  );
}
