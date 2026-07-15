import { useState } from "react";
import Input from "../components/Input";
import Button from "../components/Button";
import { useSimulation } from "../hooks/useSimulation";
import { ApiError } from "../api/client";

function formatWon(won: number): string {
  return won.toLocaleString("ko-KR");
}

function formatWan(won: number): string {
  return `${Math.round(won / 10000).toLocaleString("ko-KR")}만원`;
}

export default function IrpSimulationScreen() {
  const { irpSimulation, createIrp, fetchLatestIrp, isLoading, error } = useSimulation();

  const [annualContribution, setAnnualContribution] = useState("");
  const [expectedReturnRate, setExpectedReturnRate] = useState("");
  const [investmentYears, setInvestmentYears] = useState("");
  const [annualIncome, setAnnualIncome] = useState("");
  const [formError, setFormError] = useState<string | undefined>();
  const [loadNotice, setLoadNotice] = useState<string | undefined>();

  const handleLoadLatest = async () => {
    setLoadNotice(undefined);
    try {
      await fetchLatestIrp();
    } catch (err) {
      if (err instanceof ApiError && err.errorCode === 'IRP_SIMULATION_NOT_FOUND') {
        setLoadNotice('저장된 결과가 없습니다');
      }
    }
  };

  const handleSubmit = async () => {
    setFormError(undefined);

    // 만원 단위 입력을 원 단위로 변환
    const contributionWon = Number(annualContribution) * 10000;
    const rate = Number(expectedReturnRate);
    const years = Number(investmentYears);
    const incomeWon = Number(annualIncome) * 10000;

    if (!contributionWon || contributionWon <= 0) {
      setFormError("연간 납입액을 입력하세요");
      return;
    }
    if (!rate || rate <= 0 || rate > 30) {
      setFormError("기대 수익률은 0 초과 30 이하여야 합니다");
      return;
    }
    if (!Number.isInteger(years) || years < 1 || years > 50) {
      setFormError("투자 기간은 1~50년 사이 정수입니다");
      return;
    }
    if (!incomeWon || incomeWon <= 0) {
      setFormError("연 소득을 입력하세요");
      return;
    }

    try {
      await createIrp({
        annualContribution: contributionWon,
        expectedReturnRate: rate,
        investmentYears: years,
        annualIncome: incomeWon,
      });
    } catch {
      // hook에서 error 상태 관리
    }
  };

  const output = irpSimulation?.outputData as
    | {
        expectedBalance: number;
        annualTaxCredit: number;
        totalTaxCredit: number;
        notice: string;
      }
    | undefined;

  return (
    <div className="screen-content">
      <h2 className="card-title mb-8">IRP 시뮬레이션</h2>
      <p className="card-subtitle mb-16">
        개인형 퇴직연금의 적립금과 세액공제를 계산하세요.
      </p>

      <Input
        label="연간 납입액"
        type="number"
        value={annualContribution}
        onChange={(v) => setAnnualContribution(v.replace(/[^0-9]/g, ""))}
        placeholder="예: 700"
        suffix="만원"
        max={1000}
      />
      <Input
        label="기대 수익률"
        type="number"
        value={expectedReturnRate}
        onChange={(v) => setExpectedReturnRate(v.replace(/[^0-9.]/g, ""))}
        placeholder="예: 5"
        suffix="%"
      />
      <Input
        label="투자 기간"
        type="number"
        value={investmentYears}
        onChange={(v) => setInvestmentYears(v.replace(/[^0-9]/g, ""))}
        placeholder="예: 20"
        suffix="년"
      />
      <Input
        label="연 소득"
        type="number"
        value={annualIncome}
        onChange={(v) => setAnnualIncome(v.replace(/[^0-9]/g, ""))}
        placeholder="예: 5000"
        suffix="만원"
        max={1000}
        error={formError}
      />

      {error && <div className="form-error mb-8">{error}</div>}

      <Button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? "계산 중..." : "계산하기"}
      </Button>

      <button
        className="btn-back"
        style={{ marginTop: 8, width: "100%" }}
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
            <span className="simulation-label">예상 적립금</span>
            <span className="simulation-delta">
              {formatWan(output.expectedBalance)}
            </span>
          </div>
          <div className="simulation-card">
            <span className="simulation-label">연간 세액공제액</span>
            <span className="simulation-delta">
              {formatWon(output.annualTaxCredit)}원
            </span>
          </div>
          <div className="simulation-card">
            <span className="simulation-label">총 세액공제액</span>
            <span className="simulation-delta">
              {formatWan(output.totalTaxCredit)}
            </span>
          </div>
          <p className="form-hint mt-8">{output.notice}</p>
        </div>
      )}

    </div>
  );
}
