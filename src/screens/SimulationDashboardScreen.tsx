import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSimulation } from "../hooks/useSimulation";
import type { Simulation } from "../api/simulation-api";

function formatWon(won: number): string {
  return won.toLocaleString("ko-KR");
}

function formatWan(won: number): string {
  return `${Math.round(won / 10000).toLocaleString("ko-KR")}만원`;
}

// 시뮬레이션 타입별 요약 렌더링
function SimulationSummary({ simulation }: { simulation: Simulation }) {
  const output = simulation.outputData;

  if (simulation.type === "HEALTH_INSURANCE") {
    const data = output as { estimatedMonthlyPremium: number; notice: string };
    return (
      <>
        <div className="simulation-card">
          <span className="simulation-label">예상 월 보험료</span>
          <span className="simulation-delta">{formatWon(data.estimatedMonthlyPremium)}원</span>
        </div>
        <p className="form-hint mt-4">{data.notice}</p>
      </>
    );
  }

  if (simulation.type === "ISA") {
    const data = output as { expectedProfit: number; estimatedTaxSaving: number; notice: string };
    return (
      <>
        <div className="simulation-card">
          <span className="simulation-label">예상 수익</span>
          <span className="simulation-delta">{formatWan(data.expectedProfit)}</span>
        </div>
        <div className="simulation-card">
          <span className="simulation-label">예상 절세액</span>
          <span className="simulation-delta">{formatWan(data.estimatedTaxSaving)}</span>
        </div>
        <p className="form-hint mt-4">{data.notice}</p>
      </>
    );
  }

  if (simulation.type === "NATIONAL_PENSION") {
    const data = output as { estimatedMonthlyPension: number; pensionStartAge: number; notice: string };
    return (
      <>
        <div className="simulation-card">
          <span className="simulation-label">예상 월 수령액</span>
          <span className="simulation-delta">{formatWon(data.estimatedMonthlyPension)}원</span>
        </div>
        <div className="simulation-card">
          <span className="simulation-label">연금 시작 나이</span>
          <span className="simulation-delta">{data.pensionStartAge}세</span>
        </div>
        <p className="form-hint mt-4">{data.notice}</p>
      </>
    );
  }

  if (simulation.type === "IRP") {
    const data = output as { expectedBalance: number; annualTaxCredit: number; totalTaxCredit: number; notice: string };
    return (
      <>
        <div className="simulation-card">
          <span className="simulation-label">예상 적립금</span>
          <span className="simulation-delta">{formatWan(data.expectedBalance)}</span>
        </div>
        <div className="simulation-card">
          <span className="simulation-label">총 세액공제액</span>
          <span className="simulation-delta">{formatWan(data.totalTaxCredit)}</span>
        </div>
        <p className="form-hint mt-4">{data.notice}</p>
      </>
    );
  }

  if (simulation.type === "SEVERANCE_PAY") {
    const data = output as { severancePay: number; incomeTax: number; afterTaxAmount: number; notice: string };
    return (
      <>
        <div className="simulation-card">
          <span className="simulation-label">예상 퇴직금</span>
          <span className="simulation-delta">{formatWan(data.severancePay)}</span>
        </div>
        <div className="simulation-card">
          <span className="simulation-label">세후 금액</span>
          <span className="simulation-delta">{formatWan(data.afterTaxAmount)}</span>
        </div>
        <p className="form-hint mt-4">{data.notice}</p>
      </>
    );
  }

  if (simulation.type === "UNEMPLOYMENT_BENEFIT") {
    const data = output as { benefitDays: number; dailyBenefit: number; totalBenefit: number; notice: string };
    return (
      <>
        <div className="simulation-card">
          <span className="simulation-label">소정급여일수</span>
          <span className="simulation-delta">{data.benefitDays}일 (약 {Math.round(data.benefitDays / 30)}개월)</span>
        </div>
        <div className="simulation-card">
          <span className="simulation-label">총 예상 수령액</span>
          <span className="simulation-delta">{formatWan(data.totalBenefit)}</span>
        </div>
        <p className="form-hint mt-4">{data.notice}</p>
      </>
    );
  }

  return null;
}

const SIMULATION_META: Record<string, { label: string; path: string }> = {
  HEALTH_INSURANCE: { label: "건강보험", path: "/simulation/health-insurance" },
  ISA: { label: "ISA", path: "/simulation/isa" },
  NATIONAL_PENSION: { label: "국민연금", path: "/simulation/national-pension" },
  IRP: { label: "IRP", path: "/simulation/irp" },
  SEVERANCE_PAY: { label: "퇴직금", path: "/simulation/severance-pay" },
  UNEMPLOYMENT_BENEFIT: { label: "실업급여", path: "/simulation/unemployment-benefit" },
};

export default function SimulationDashboardScreen() {
  const navigate = useNavigate();
  const {
    healthInsuranceSimulation,
    isaSimulation,
    nationalPensionSimulation,
    irpSimulation,
    severancePaySimulation,
    fetchLatestHealthInsurance,
    fetchLatestIsa,
    fetchLatestNationalPension,
    fetchLatestIrp,
    fetchLatestSeverancePay,
    unemploymentBenefitSimulation,
    fetchLatestUnemploymentBenefit,
    isLoading,
  } = useSimulation();

  // 화면 진입 시 5개 최신 결과 병렬 조회 (없으면 무시)
  useEffect(() => {
    Promise.allSettled([
      fetchLatestHealthInsurance(),
      fetchLatestIsa(),
      fetchLatestNationalPension(),
      fetchLatestIrp(),
      fetchLatestSeverancePay(),
      fetchLatestUnemploymentBenefit(),
    ]);
  }, []);

  const results: Array<{ type: string; simulation: Simulation | null }> = [
    { type: "HEALTH_INSURANCE", simulation: healthInsuranceSimulation },
    { type: "ISA", simulation: isaSimulation },
    { type: "NATIONAL_PENSION", simulation: nationalPensionSimulation },
    { type: "IRP", simulation: irpSimulation },
    { type: "SEVERANCE_PAY", simulation: severancePaySimulation },
    { type: "UNEMPLOYMENT_BENEFIT", simulation: unemploymentBenefitSimulation },
  ];

  const doneCount = results.filter((r) => r.simulation !== null).length;

  return (
    <div className="screen-content">
      <section className="hero">
        <h1 className="hero-title">시뮬레이션 대시보드</h1>
        <p className="hero-subtitle">
          은퇴 준비 시뮬레이션 결과를 한눈에 확인하세요.
          <br />
          {isLoading ? "조회 중..." : `${doneCount}/6 완료`}
        </p>
      </section>

      {results.map(({ type, simulation }) => {
        const meta = SIMULATION_META[type];
        return (
          <div key={type} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="card-title">{meta.label}</div>
              <button
                className="btn-back"
                style={{ padding: "4px 14px" }}
                onClick={() => navigate(meta.path)}
              >
                {simulation ? "재계산" : "시작하기"}
              </button>
            </div>

            {simulation ? (
              <SimulationSummary simulation={simulation} />
            ) : (
              <p className="card-subtitle" style={{ marginTop: 8 }}>
                아직 시뮬레이션을 진행하지 않았습니다.
              </p>
            )}
          </div>
        );
      })}

      <div className="mt-16">
        <button className="btn-back" onClick={() => navigate("/")}>홈으로</button>
      </div>
    </div>
  );
}
