import { useState } from "react";
import Input from "../components/Input";
import Button from "../components/Button";
import { useSimulation } from "../hooks/useSimulation";
import { ApiError } from "../api/client";

function formatWan(won: number): string {
  return `${Math.round(won / 10000).toLocaleString("ko-KR")}만원`;
}

export default function SeverancePaySimulationScreen() {
  const { severancePaySimulation, createSeverancePay, fetchLatestSeverancePay, isLoading, error } =
    useSimulation();

  const [averageMonthlyWage, setAverageMonthlyWage] = useState("");
  const [yearsOfService, setYearsOfService] = useState("");
  const [formError, setFormError] = useState<string | undefined>();
  const [loadNotice, setLoadNotice] = useState<string | undefined>();

  const handleLoadLatest = async () => {
    setLoadNotice(undefined);
    try {
      await fetchLatestSeverancePay();
    } catch (err) {
      if (err instanceof ApiError && err.errorCode === 'SEVERANCE_PAY_SIMULATION_NOT_FOUND') {
        setLoadNotice('저장된 결과가 없습니다');
      }
    }
  };

  const handleSubmit = async () => {
    setFormError(undefined);

    // 임금은 만원 단위, 근속연수는 소수점 허용
    const wageWon = Number(averageMonthlyWage) * 10000;
    const years = Number(yearsOfService);

    if (!wageWon || wageWon <= 0) {
      setFormError("평균 월 임금을 입력하세요");
      return;
    }
    if (!years || years <= 0) {
      setFormError("근속연수를 입력하세요");
      return;
    }

    try {
      await createSeverancePay({
        averageMonthlyWage: wageWon,
        yearsOfService: years,
      });
    } catch {
      // hook에서 error 상태 관리
    }
  };

  const output = severancePaySimulation?.outputData as
    | {
        severancePay: number;
        incomeTax: number;
        afterTaxAmount: number;
        notice: string;
      }
    | undefined;

  return (
    <div className="screen-content">
      <h2 className="card-title mb-8">퇴직금 시뮬레이션</h2>
      <p className="card-subtitle mb-16">
        법정 퇴직금과 예상 세금을 계산합니다.
      </p>

      <Input
        label="평균 월 임금"
        type="number"
        value={averageMonthlyWage}
        onChange={(v) => setAverageMonthlyWage(v.replace(/[^0-9]/g, ""))}
        placeholder="예: 400"
        suffix="만원"
        max={1000}
      />
      <Input
        label="근속연수"
        type="number"
        value={yearsOfService}
        onChange={(v) => setYearsOfService(v.replace(/[^0-9.]/g, ""))}
        placeholder="예: 15.5"
        suffix="년"
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
            <span className="simulation-label">예상 퇴직금</span>
            <span className="simulation-delta">
              {formatWan(output.severancePay)}
            </span>
          </div>
          <div className="simulation-card">
            <span className="simulation-label">예상 세금</span>
            <span className="simulation-delta">
              {formatWan(output.incomeTax)}
            </span>
          </div>
          <div className="simulation-card">
            <span className="simulation-label">세후 금액</span>
            <span className="simulation-delta">
              {formatWan(output.afterTaxAmount)}
            </span>
          </div>
          <p className="form-hint mt-8">{output.notice}</p>
        </div>
      )}

    </div>
  );
}
