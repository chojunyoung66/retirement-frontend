import { useState } from 'react';
import Button from '../components/Button';
import { useSimulation } from '../hooks/useSimulation';
import { ApiError } from '../api/client';

function formatWon(won: number): string {
  return won.toLocaleString('ko-KR');
}

function WonInput({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-8">
      <label className="form-label">{label}</label>
      {hint && <p className="form-hint" style={{ marginBottom: 4 }}>{hint}</p>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          className="input"
          type="number"
          value={value}
          onChange={(e) => {
            onChange(e.target.value.replace(/[^0-9]/g, ''));
          }}
          onKeyDown={(e) => { if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
          placeholder="0"
          style={{ flex: 1 }}
        />
        <span style={{ whiteSpace: 'nowrap', color: '#666' }}>만원/년</span>
      </div>
    </div>
  );
}

export default function HealthInsuranceSimulationScreen() {
  const { healthInsuranceSimulation, createHealthInsurance, fetchLatestHealthInsurance, isLoading, error } = useSimulation();

  const [pensionIncome, setPensionIncome] = useState('');
  const [laborIncome, setLaborIncome] = useState('');
  const [businessIncome, setBusinessIncome] = useState('');
  const [interestDividendIncome, setInterestDividendIncome] = useState('');
  const [otherIncome, setOtherIncome] = useState('');
  const [propertyValue, setPropertyValue] = useState('');
  const [carValue, setCarValue] = useState('');
  const [formError, setFormError] = useState<string | undefined>();
  const [loadNotice, setLoadNotice] = useState<string | undefined>();

  const toWon = (v: string) => Number(v) * 10000;

  const handleSubmit = async () => {
    setFormError(undefined);
    const totalIncome =
      toWon(pensionIncome) + toWon(laborIncome) + toWon(businessIncome) +
      toWon(interestDividendIncome) + toWon(otherIncome);

    if (totalIncome === 0 && toWon(propertyValue) === 0 && toWon(carValue) === 0) {
      setFormError('소득, 재산, 차량 중 하나 이상 입력하세요');
      return;
    }

    try {
      await createHealthInsurance({
        pensionIncome: toWon(pensionIncome),
        laborIncome: toWon(laborIncome),
        businessIncome: toWon(businessIncome),
        interestDividendIncome: toWon(interestDividendIncome),
        otherIncome: toWon(otherIncome),
        propertyValue: toWon(propertyValue),
        carValue: toWon(carValue),
      });
    } catch {
      // hook에서 error 상태 관리
    }
  };

  const handleLoadLatest = async () => {
    setLoadNotice(undefined);
    try {
      await fetchLatestHealthInsurance();
    } catch (err) {
      if (err instanceof ApiError && err.errorCode === 'HEALTH_INSURANCE_SIMULATION_NOT_FOUND') {
        setLoadNotice('저장된 결과가 없습니다');
      }
    }
  };

  const output = healthInsuranceSimulation?.outputData as
    | {
        recognizedAnnualIncome: number;
        recognizedMonthlyIncome: number;
        incomePremium: number;
        propertyPremium: number;
        carPremium: number;
        canBeDependent: boolean;
        estimatedMonthlyPremium: number;
        notice: string;
      }
    | undefined;

  return (
    <div className="screen-content">
      <h2 className="card-title mb-8">건강보험료 시뮬레이션</h2>
      <p className="card-subtitle mb-16">
        퇴직 후 지역가입자 건강보험료를 소득 유형별로 정확하게 계산합니다.
      </p>

      <div className="card">
        <div className="card-title" style={{ fontSize: '1rem', marginBottom: 12 }}>소득 정보 (연간)</div>
        <WonInput
          label="공적연금소득 (국민연금·공무원연금 등)"
          hint="인정률 50% 적용"
          value={pensionIncome}
          onChange={setPensionIncome}
        />
        <WonInput
          label="근로소득 (퇴직 후 파트타임 등)"
          hint="인정률 50% 적용"
          value={laborIncome}
          onChange={setLaborIncome}
        />
        <WonInput
          label="사업소득"
          hint="인정률 100% 적용"
          value={businessIncome}
          onChange={setBusinessIncome}
        />
        <WonInput
          label="이자·배당소득"
          hint="1,000만원 초과분만 100% 인정"
          value={interestDividendIncome}
          onChange={setInterestDividendIncome}
        />
        <WonInput
          label="기타소득"
          hint="필요경비 80% 공제 후 20% 인정"
          value={otherIncome}
          onChange={setOtherIncome}
        />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-title" style={{ fontSize: '1rem', marginBottom: 12 }}>재산·차량 정보</div>
        <WonInput
          label="재산 과표액 (공시지가 기준)"
          hint="기본공제 5,000만원 차감 후 보험료 산정"
          value={propertyValue}
          onChange={setPropertyValue}
        />
        <WonInput
          label="차량 가액"
          hint="4,000만원 이상 차량만 보험료 부과"
          value={carValue}
          onChange={setCarValue}
        />
      </div>

      {formError && <div className="form-error mb-8">{formError}</div>}
      {error && <div className="form-error mb-8">{error}</div>}

      <Button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? '계산 중...' : '계산하기'}
      </Button>

      <button
        className="btn-back"
        style={{ marginTop: 8, width: '100%' }}
        onClick={handleLoadLatest}
        disabled={isLoading}
      >
        이전 결과 불러오기
      </button>
      {loadNotice && <p className="form-hint mt-4">{loadNotice}</p>}

      {output && (
        <div className="card mt-16">
          {/* 피부양자 여부 강조 */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              marginBottom: 12,
              backgroundColor: output.canBeDependent ? '#e8f5e9' : '#fff3e0',
              color: output.canBeDependent ? '#2e7d32' : '#e65100',
              fontWeight: 600,
            }}
          >
            {output.canBeDependent
              ? '✓ 피부양자 조건 충족 — 가족 직장보험에 등록 시 보험료 없음'
              : '✗ 피부양자 조건 미충족 — 지역가입자 보험료 납부 대상'}
          </div>

          <div className="card-title">계산 결과</div>
          <div className="simulation-card">
            <span className="simulation-label">소득인정액 (월)</span>
            <span className="simulation-delta">{formatWon(output.recognizedMonthlyIncome)}원</span>
          </div>

          <div style={{ marginTop: 8, marginBottom: 4, fontSize: '0.85rem', color: '#888' }}>보험료 구성</div>
          <div className="simulation-card">
            <span className="simulation-label">소득보험료</span>
            <span className="simulation-delta">{formatWon(output.incomePremium)}원</span>
          </div>
          <div className="simulation-card">
            <span className="simulation-label">재산보험료</span>
            <span className="simulation-delta">{formatWon(output.propertyPremium)}원</span>
          </div>
          <div className="simulation-card">
            <span className="simulation-label">차량보험료</span>
            <span className="simulation-delta">{formatWon(output.carPremium)}원</span>
          </div>
          <div className="simulation-card" style={{ borderTop: '1px solid #eee', paddingTop: 8, marginTop: 4 }}>
            <span className="simulation-label" style={{ fontWeight: 600 }}>예상 월 납부액 (장기요양 포함)</span>
            <span className="simulation-delta" style={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatWon(output.estimatedMonthlyPremium)}원</span>
          </div>
          <div className="simulation-card">
            <span className="simulation-label">연간 납부액</span>
            <span className="simulation-delta">{formatWon(output.estimatedMonthlyPremium * 12)}원</span>
          </div>

          <p className="form-hint mt-8">{output.notice}</p>
        </div>
      )}

    </div>
  );
}
