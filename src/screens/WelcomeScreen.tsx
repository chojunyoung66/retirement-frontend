import { useNavigate } from "react-router-dom";
import { getWelcomeMetrics } from "../service/retirement-service";
import { useDiagnosis } from "../hooks/useDiagnosis";
import Button from "../components/Button";

export default function WelcomeScreen() {
  const navigate = useNavigate();
  const metrics = getWelcomeMetrics();
  const { dispatch } = useDiagnosis();

  const formatAvg = (won: number) => `${Math.round(won / 10000)}만원`;
  const formatCount = (n: number) => `${(n / 10000).toFixed(0)}만명`;

  const handleStart = () => {
    dispatch({ type: "RESET" });
    navigate("/diagnosis");
  };

  return (
    <div className="screen-content">
      <section className="hero">
        <h1 className="hero-title">
          은퇴 후 월 수입은
          <br />
          얼마인가요?
        </h1>
        <p className="hero-subtitle">
          3분이면 끝나는 은퇴현금 진단으로
          <br />
          나의 노후 준비 상태를 확인하세요.
        </p>
      </section>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">
            {formatAvg(metrics.averageMonthlyPension)}
          </div>
          <div className="stat-label">평균 수령액</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {formatCount(metrics.completedDiagnoses)}
          </div>
          <div className="stat-label">완료자</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{metrics.accuracyRate}%</div>
          <div className="stat-label">정확도</div>
        </div>
      </div>

      <Button onClick={handleStart}>1분 진단 시작하기</Button>

      <div className="mt-16">
        <Button variant="secondary" onClick={() => navigate("/simulation")}>
          시뮬레이션
        </Button>
      </div>

      <div className="mt-16">
        <Button variant="secondary" onClick={() => navigate("/portfolio")}>
          연금 포트폴리오
        </Button>
      </div>

      <div className="mt-16">
        <Button variant="secondary" onClick={() => navigate("/simulation/dashboard")}>
          시뮬레이션 대시보드
        </Button>
      </div>
    </div>
  );
}
