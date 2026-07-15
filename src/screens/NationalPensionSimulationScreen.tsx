import { useState } from "react";
import Input from "../components/Input";
import Button from "../components/Button";
import { useSimulation } from "../hooks/useSimulation";
import { ApiError } from "../api/client";

function formatWon(won: number): string {
  return won.toLocaleString("ko-KR");
}

export default function NationalPensionSimulationScreen() {
  const { nationalPensionSimulation, createNationalPension, fetchLatestNationalPension, isLoading, error } =
    useSimulation();

  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [contributionYears, setContributionYears] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [formError, setFormError] = useState<string | undefined>();
  const [loadNotice, setLoadNotice] = useState<string | undefined>();

  const handleLoadLatest = async () => {
    setLoadNotice(undefined);
    try {
      await fetchLatestNationalPension();
    } catch (err) {
      if (err instanceof ApiError && err.errorCode === 'NATIONAL_PENSION_SIMULATION_NOT_FOUND') {
        setLoadNotice('저장된 결과가 없습니다');
      }
    }
  };

  const handleSubmit = async () => {
    setFormError(undefined);

    // 입력 값 파싱: 소득은 만원 단위, 년도는 정수
    const incomeWon = Number(monthlyIncome) * 10000;
    const years = Number(contributionYears);
    const birth = Number(birthYear);

    if (!incomeWon || incomeWon <= 0) {
      setFormError("월 소득을 입력하세요");
      return;
    }
    if (!Number.isInteger(years) || years < 1 || years > 45) {
      setFormError("가입 기간은 1~45년 사이 정수입니다");
      return;
    }
    if (!Number.isInteger(birth) || birth < 1950 || birth > 2000) {
      setFormError("출생연도는 1950~2000 사이여야 합니다");
      return;
    }

    try {
      await createNationalPension({
        monthlyIncome: incomeWon,
        contributionYears: years,
        birthYear: birth,
      });
    } catch {
      // hook에서 error 상태 관리
    }
  };

  const output = nationalPensionSimulation?.outputData as
    | {
        estimatedMonthlyPension: number;
        pensionStartAge: number;
        notice: string;
      }
    | undefined;

  return (
    <div className="screen-content">
      <h2 className="card-title mb-8">국민연금 시뮬레이션</h2>
      <p className="card-subtitle mb-16">
        가입기간과 소득 기준 예상 월 수령액을 확인하세요.
      </p>

      <Input
        label="월 소득"
        type="number"
        value={monthlyIncome}
        onChange={(v) => setMonthlyIncome(v.replace(/[^0-9]/g, ""))}
        placeholder="예: 300"
        suffix="만원"
        max={1000}
      />
      <Input
        label="가입 기간"
        type="number"
        value={contributionYears}
        onChange={(v) => setContributionYears(v.replace(/[^0-9]/g, ""))}
        placeholder="예: 20"
        suffix="년"
      />
      <Input
        label="출생연도"
        type="number"
        value={birthYear}
        onChange={(v) => setBirthYear(v.replace(/[^0-9]/g, ""))}
        placeholder="예: 1970"
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
            <span className="simulation-label">예상 월 수령액</span>
            <span className="simulation-delta">
              {formatWon(output.estimatedMonthlyPension)}원
            </span>
          </div>
          <div className="simulation-card">
            <span className="simulation-label">연금 시작 나이</span>
            <span className="simulation-delta">{output.pensionStartAge}세</span>
          </div>
          <p className="form-hint mt-8">{output.notice}</p>
        </div>
      )}

    </div>
  );
}
