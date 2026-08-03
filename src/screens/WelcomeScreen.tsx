import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  getWelcomeMetrics,
  getCashflowTrendSample,
} from "../service/retirement-service";
import { useDiagnosis } from "../hooks/useDiagnosis";
import { useAuth } from "../hooks/useAuth";
import { useCountUp } from "../hooks/useCountUp";
import {
  getLatestDiagnosis,
  type DiagnosisRecord,
} from "../api/diagnosis-api";
import { showToast } from "../store/toast-slice";
import { formatWan } from "../utils/format";
import Button from "../components/Button";
import MiniBarChart from "../components/MiniBarChart";
import AvatarStack from "../components/AvatarStack";
import type { AppDispatch } from "../store/store";

const LABEL_POSITIONS = [0, 3, 6, 9, 12];

const PROCESS_STEPS = [
  {
    num: "01",
    title: "기본 정보",
    desc: "출생연도와 희망 퇴직 나이만 입력하면 돼요.",
  },
  {
    num: "02",
    title: "연금·자산",
    desc: "국민·퇴직·개인연금과 주택연금을 한 번에 모아요.",
  },
  {
    num: "03",
    title: "결과 확인",
    desc: "은퇴 후 월 현금흐름과 부족액을 숫자로 확인해요.",
  },
];

export default function WelcomeScreen() {
  const navigate = useNavigate();
  const metrics = getWelcomeMetrics();
  const { dispatch: diagnosisDispatch } = useDiagnosis();
  const { isLoggedIn, authStatus } = useAuth();
  const dispatch = useDispatch<AppDispatch>();

  const [savedDiagnosis, setSavedDiagnosis] = useState<
    DiagnosisRecord | null | "loading"
  >("loading");

  const trend = useMemo(
    () => getCashflowTrendSample(new Date().getFullYear()),
    [],
  );
  const monthlyWan = Math.round(metrics.averageMonthlyPension / 10000);
  const displayedWan = useCountUp(monthlyWan);

  const chartLabels = LABEL_POSITIONS.map((position, i) => {
    const year = trend.points[position].year;
    // 양 끝만 연도 전체 표기, 사이는 두 자리로 축약
    return i === 0 || i === LABEL_POSITIONS.length - 1
      ? String(year)
      : `'${String(year).slice(2)}`;
  });
  const highlightIndex = trend.points.findIndex(
    (point) => point.year === trend.highlightYear,
  );

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
    // 로그인 + 저장된 진단이 있으면 입력란에 미리 채우고, 없으면 처음부터
    if (savedDiagnosis && savedDiagnosis !== "loading") {
      diagnosisDispatch({ type: "LOAD_FROM_SERVER", payload: savedDiagnosis });
      dispatch(
        showToast("저장된 진단으로 채워 두었어요. 바꿀 부분만 수정하세요"),
      );
    } else {
      diagnosisDispatch({ type: "RESET" });
    }
    navigate("/diagnosis");
  };

  const handleRestoreDiagnosis = () => {
    if (!savedDiagnosis || savedDiagnosis === "loading") return;
    diagnosisDispatch({ type: "LOAD_FROM_SERVER", payload: savedDiagnosis });
    navigate("/result");
  };

  return (
    <div className="screen-content lp">
      <p className="lp-eyebrow">Estimated Cashflow</p>
      <h1 className="lp-title">
        내 연금으로
        <br />
        매달 얼마 들어와요?
      </h1>
      <p className="lp-lead">
        국민·퇴직·개인연금과 주택연금까지 한 번에 계산.
        <br />
        1분 진단으로 은퇴 후 월 현금흐름을 숫자로 확인하세요.
        <br />
        결과는 로그인 없이 볼 수 있고, 저장·불러오기만 계정이 필요해요.
      </p>

      <div className="lp-figure">
        <span className="lp-figure-value">{displayedWan}</span>
        <span className="lp-figure-unit">만원</span>
        <span className="lp-figure-per">/ 월</span>
      </div>
      <div className="lp-rule" />

      <section className="lp-card">
        <div className="lp-card-head">
          <span className="lp-card-head-title">예상 월 현금흐름 추이</span>
          <span className="lp-badge">+{trend.yoyPercent}% YoY</span>
        </div>
        <MiniBarChart
          values={trend.points.map((point) => point.amount)}
          labels={chartLabels}
          highlightIndex={highlightIndex}
          ariaLabel={`${trend.points[0].year}년부터 ${trend.points[trend.points.length - 1].year}년까지 예상 월 현금흐름 추이`}
        />
      </section>

      <div className="lp-social">
        <AvatarStack initials={["김", "이", "박"]} />
        <span className="lp-social-text">
          지금까지 <strong>{metrics.completedDiagnoses.toLocaleString()}명</strong>이
          진단을 완료했어요
        </span>
      </div>

      <section className="lp-why">
        <svg
          className="lp-why-rings"
          width="150"
          height="150"
          viewBox="0 0 150 150"
          aria-hidden="true"
        >
          <g fill="none" stroke="#b9a377" strokeWidth="1">
            <circle cx="75" cy="75" r="26" />
            <circle cx="75" cy="75" r="41" />
            <circle cx="75" cy="75" r="56" />
            <circle cx="75" cy="75" r="71" />
          </g>
        </svg>
        <p className="lp-eyebrow">Why here</p>
        <p className="lp-why-title">
          흩어진 연금을 한 화면에
          <br />
          금융사 수준 신뢰성으로
        </p>
      </section>

      <section className="lp-section">
        <p className="lp-eyebrow">Process</p>
        <h2 className="lp-section-title">3단계로 끝나는 진단</h2>
        <div className="lp-steps">
          {PROCESS_STEPS.map((step) => (
            <div className="lp-step" key={step.num}>
              <span className="lp-step-num">{step.num}</span>
              <div>
                <div className="lp-step-title">{step.title}</div>
                <div className="lp-step-desc">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 로그인 사용자 전용 진입점 — 비로그인 홈은 시안과 동일하게 유지 */}
      {isLoggedIn && authStatus !== "checking" && (
        <section className="lp-section">
          <p className="lp-eyebrow">My diagnosis</p>
          <h2 className="lp-section-title">내 진단 이어보기</h2>

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
                  <span className="item-row-label">출생 연도</span>
                  <span className="item-row-value">
                    {savedDiagnosis.birthYear}년
                  </span>
                </div>
                <div className="item-row">
                  <span className="item-row-label">
                    {savedDiagnosis.retirementYear <= new Date().getFullYear()
                      ? "퇴직 연도"
                      : "은퇴 예정 연도"}
                  </span>
                  <span className="item-row-value">
                    {savedDiagnosis.retirementYear}년
                  </span>
                </div>
                <p className="form-hint" style={{ margin: "8px 0" }}>
                  예상 은퇴 소득(국민·퇴직·개인·주택연금) 금액은 서버에
                  저장하지 않아요.
                </p>
                <div className="item-row">
                  <span className="item-row-label">월 생활비</span>
                  <span className="item-row-value">
                    {formatWan(savedDiagnosis.monthlyExpense)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <div style={{ flex: 1 }}>
                    <Button onClick={handleRestoreDiagnosis}>결과 보기</Button>
                  </div>
                </div>
              </div>
            )}
          </div>

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
          <div className="mt-16">
            <Button variant="secondary" onClick={() => navigate("/account")}>
              계정 · 회원 탈퇴
            </Button>
          </div>
        </section>
      )}

      <div className="lp-cta-bar">
        <button className="lp-cta" onClick={handleStart}>
          {savedDiagnosis && savedDiagnosis !== "loading"
            ? "저장된 값으로 다시 진단하기"
            : "1분 진단 시작하기"}{" "}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
