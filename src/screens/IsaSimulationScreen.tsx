import { useState } from 'react';
import Input from '../components/Input';
import Button from '../components/Button';
import { useSimulation } from '../hooks/useSimulation';
import { ApiError } from '../api/client';

function formatWan(won: number): string {
  return `${Math.round(won / 10000).toLocaleString('ko-KR')}만원`;
}

export default function IsaSimulationScreen() {
  const { isaSimulation, createIsa, fetchLatestIsa, isLoading, error } = useSimulation();

  // 입력 단위: 만원 / API 전송 단위: 원 (handleSubmit에서 ×10000 변환)
  const [annualContribution, setAnnualContribution] = useState('');
  const [expectedReturnRate, setExpectedReturnRate] = useState('');
  const [investmentYears, setInvestmentYears] = useState('');
  const [formError, setFormError] = useState<string | undefined>();
  const [loadNotice, setLoadNotice] = useState<string | undefined>();

  const handleLoadLatest = async () => {
    setLoadNotice(undefined);
    try {
      await fetchLatestIsa();
    } catch (err) {
      if (err instanceof ApiError && err.errorCode === 'ISA_SIMULATION_NOT_FOUND') {
        setLoadNotice('저장된 결과가 없습니다');
      }
    }
  };

  const handleSubmit = async () => {
    setFormError(undefined);

    const contributionWon = Number(annualContribution) * 10000;
    const rate = Number(expectedReturnRate);
    const years = Number(investmentYears);

    if (!contributionWon || contributionWon <= 0) {
      setFormError('연간 납입액을 입력하세요');
      return;
    }
    if (!rate || rate <= 0 || rate > 30) {
      setFormError('기대 수익률은 0 초과 30 이하여야 합니다');
      return;
    }
    if (!Number.isInteger(years) || years < 1 || years > 50) {
      setFormError('투자 기간은 1~50년 사이 정수입니다');
      return;
    }

    try {
      await createIsa({
        annualContribution: contributionWon,
        expectedReturnRate: rate,
        investmentYears: years,
      });
    } catch {
      // hook에서 error 상태 관리
    }
  };

  const output = isaSimulation?.outputData as
    | { expectedProfit: number; estimatedTaxSaving: number; notice: string }
    | undefined;

  return (
    <div className="screen-content">
      <h2 className="card-title mb-8">ISA 시뮬레이션</h2>
      <p className="card-subtitle mb-16">ISA 계좌의 예상 수익과 절세 효과를 확인하세요.</p>

      <Input
        label="연간 납입액"
        type="number"
        value={annualContribution}
        onChange={setAnnualContribution}
        placeholder="예: 2000"
        suffix="만원"
        max={2000}
        error={formError}
      />
      <Input
        label="기대 수익률"
        type="decimal"
        value={expectedReturnRate}
        onChange={setExpectedReturnRate}
        placeholder="예: 5"
        suffix="%"
      />
      <Input
        label="투자 기간"
        type="number"
        value={investmentYears}
        onChange={setInvestmentYears}
        placeholder="예: 10"
        suffix="년"
      />

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
          <div className="card-title">계산 결과</div>
          <div className="simulation-card">
            <span className="simulation-label">예상 수익</span>
            <span className="simulation-delta">{formatWan(output.expectedProfit)}</span>
          </div>
          <div className="simulation-card">
            <span className="simulation-label">예상 절세액</span>
            <span className="simulation-delta">{formatWan(output.estimatedTaxSaving)}</span>
          </div>
          <p className="form-hint mt-8">{output.notice}</p>
        </div>
      )}

    </div>
  );
}
