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

export default function UnemploymentBenefitSimulationScreen() {
  const {
    unemploymentBenefitSimulation,
    createUnemploymentBenefit,
    fetchLatestUnemploymentBenefit,
    isLoading,
    error,
  } = useSimulation();

  const [averageMonthlyWage, setAverageMonthlyWage] = useState("");
  const [insuranceYears, setInsuranceYears] = useState("");
  const [age, setAge] = useState("");
  const [formError, setFormError] = useState<string | undefined>();
  const [loadNotice, setLoadNotice] = useState<string | undefined>();

  const handleSubmit = async () => {
    setFormError(undefined);

    const wageWon = Number(averageMonthlyWage) * 10000;
    const years = Number(insuranceYears);
    const ageNum = Number(age);

    if (!wageWon || wageWon <= 0) {
      setFormError("직전 월 평균 임금을 입력하세요");
      return;
    }
    if (!years || years <= 0) {
      setFormError("고용보험 가입 기간을 입력하세요");
      return;
    }
    if (!Number.isInteger(ageNum) || ageNum < 18 || ageNum > 100) {
      setFormError("만 나이를 올바르게 입력하세요 (18~100)");
      return;
    }

    try {
      await createUnemploymentBenefit({
        averageMonthlyWage: wageWon,
        insuranceYears: years,
        age: ageNum,
      });
    } catch {
      // hook에서 error 상태 관리
    }
  };

  const handleLoadLatest = async () => {
    setLoadNotice(undefined);
    try {
      await fetchLatestUnemploymentBenefit();
    } catch (err) {
      if (err instanceof ApiError && err.errorCode === "UNEMPLOYMENT_BENEFIT_SIMULATION_NOT_FOUND") {
        setLoadNotice("저장된 결과가 없습니다");
      }
    }
  };

  const output = unemploymentBenefitSimulation?.outputData as
    | {
        benefitDays: number;
        dailyBenefit: number;
        monthlyBenefit: number;
        totalBenefit: number;
        notice: string;
      }
    | undefined;

  return (
    <div className="screen-content">
      <h2 className="card-title mb-8">실업급여 시뮬레이션</h2>
      <p className="card-subtitle mb-16">
        정년퇴직 후 수령 가능한 구직급여를 계산합니다.
        <br />
        <span className="form-hint">2024년 기준 · 50세 이상/미만 수급일수 이원화 적용</span>
      </p>

      <Input
        label="직전 3개월 월 평균 임금"
        type="number"
        value={averageMonthlyWage}
        onChange={(v) => setAverageMonthlyWage(v.replace(/[^0-9]/g, ""))}
        placeholder="예: 400"
        suffix="만원"
        max={1000}
      />
      <Input
        label="고용보험 가입 기간"
        type="number"
        value={insuranceYears}
        onChange={(v) => setInsuranceYears(v.replace(/[^0-9.]/g, ""))}
        placeholder="예: 20"
        suffix="년"
      />
      <Input
        label="만 나이"
        type="number"
        value={age}
        onChange={(v) => setAge(v.replace(/[^0-9]/g, ""))}
        placeholder="예: 60"
        suffix="세"
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
            <span className="simulation-label">소정급여일수</span>
            <span className="simulation-delta">{output.benefitDays}일 (약 {Math.round(output.benefitDays / 30)}개월)</span>
          </div>
          <div className="simulation-card">
            <span className="simulation-label">1일 구직급여액</span>
            <span className="simulation-delta">{formatWon(output.dailyBenefit)}원</span>
          </div>
          <div className="simulation-card">
            <span className="simulation-label">월 예상 수령액</span>
            <span className="simulation-delta">{formatWan(output.monthlyBenefit)}</span>
          </div>
          <div className="simulation-card" style={{ borderTop: "1px solid #eee", paddingTop: 8, marginTop: 4 }}>
            <span className="simulation-label" style={{ fontWeight: 600 }}>총 예상 수령액</span>
            <span className="simulation-delta" style={{ fontWeight: 700, fontSize: "1.1rem" }}>{formatWan(output.totalBenefit)}</span>
          </div>
          <p className="form-hint mt-8">{output.notice}</p>
        </div>
      )}

    </div>
  );
}
