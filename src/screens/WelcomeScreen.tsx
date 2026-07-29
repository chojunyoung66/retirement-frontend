import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { getWelcomeMetrics } from "../service/retirement-service";
import { useDiagnosis } from "../hooks/useDiagnosis";
import { useAuth } from "../hooks/useAuth";
import {
  getLatestDiagnosis,
  deleteLatestDiagnosis,
  type DiagnosisRecord,
} from "../api/diagnosis-api";
import { showToast } from "../store/toast-slice";
import { formatWan } from "../utils/format";
import Button from "../components/Button";
import type { AppDispatch } from "../store/store";

export default function WelcomeScreen() {
  const navigate = useNavigate();
  const metrics = getWelcomeMetrics();
  const { dispatch: diagnosisDispatch } = useDiagnosis();
  const { isLoggedIn, authStatus } = useAuth();
  const dispatch = useDispatch<AppDispatch>();

  const [savedDiagnosis, setSavedDiagnosis] = useState<
    DiagnosisRecord | null | "loading"
  >("loading");

  const formatAvg = (won: number) => `${Math.round(won / 10000)}만원`;
  const formatCount = (n: number) => `${(n / 10000).toFixed(0)}만명`;

  // 로그인 상태 확정 후 저장된 진단 조회
  useEffect(() => {
    if (!isLoggedIn || authStatus === "checking") {
      setSavedDiagnosis(null);
      return;
    }
    setSavedDiagnosis("loading");
    getLatestDiagnosis()
      .then((record) => setSavedDiagnosis(record))
      .catch(() => setSavedDiagnosis(null));
  }, [isLoggedIn, authStatus]);

  const handleStart = () => {
    diagnosisDispatch({ type: "RESET" });
    navigate("/diagnosis");
  };

  const handleRestoreDiagnosis = () => {
    if (!savedDiagnosis || savedDiagnosis === "loading") return;
    diagnosisDispatch({ type: "LOAD_FROM_SERVER", payload: savedDiagnosis });
    navigate("/result");
  };

  const handleDeleteDiagnosis = async () => {
    try {
      await deleteLatestDiagnosis();
      setSavedDiagnosis(null);
      dispatch(showToast("저장된 진단을 삭제했어요"));
    } catch {
      dispatch(showToast("삭제 중 오류가 발생했어요"));
    }
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

      {/* 로그인 사용자: 저장된 진단 복원 카드 */}
      {isLoggedIn && authStatus !== "checking" && (
        <div className="mt-16">
          {savedDiagnosis === "loading" && (
            <div className="card">
              <div className="card-subtitle" style={{ textAlign: "center" }}>
                저장된 진단을 확인하는 중...
              </div>
            </div>
          )}
          {savedDiagnosis === null && (
            <div className="card">
              <div className="card-subtitle" style={{ textAlign: "center" }}>
                저장된 진단 결과가 없어요
              </div>
            </div>
          )}
          {savedDiagnosis && savedDiagnosis !== "loading" && (
            <div className="card">
              <div className="card-title">저장된 진단 불러오기</div>
              <div className="item-row">
                <span className="item-row-label">출생연도</span>
                <span className="item-row-value">
                  {savedDiagnosis.birthYear}년
                </span>
              </div>
              <div className="item-row">
                <span className="item-row-label">은퇴예정</span>
                <span className="item-row-value">
                  {savedDiagnosis.retirementYear}년
                </span>
              </div>
              <div className="item-row">
                <span className="item-row-label">월 소득</span>
                <span className="item-row-value">
                  {formatWan(savedDiagnosis.monthlyIncome)}
                </span>
              </div>
              <div className="item-row">
                <span className="item-row-label">월 지출</span>
                <span className="item-row-value">
                  {formatWan(savedDiagnosis.monthlyExpense)}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <Button onClick={handleRestoreDiagnosis}>결과 보기</Button>
                <button
                  className="btn btn-secondary"
                  onClick={handleDeleteDiagnosis}
                  style={{ flex: "none" }}
                >
                  삭제
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
        <Button
          variant="secondary"
          onClick={() => navigate("/simulation/dashboard")}
        >
          시뮬레이션 대시보드
        </Button>
      </div>
    </div>
  );
}
