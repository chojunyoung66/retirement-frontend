import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useDiagnosis } from "../hooks/useDiagnosis";
import {
  calculateLongTermProjection,
  generateRecommendations,
} from "../service/retirement-service";
import Button from "../components/Button";
import SummaryCard from "../components/SummaryCard";
import { DEFAULT_RETIREMENT_AGE, formatWan } from "../utils/format";
import { showToast } from "../store/toast-slice";
import { ApiError } from "../api/client";
import { saveLatestDiagnosis } from "../api/diagnosis-api";
import type { AppDispatch, RootState } from "../store/store";
import {
  persistDiagnosisState,
  resolveDraftFields,
} from "../utils/diagnosis-draft";
import type { DiagnosisState } from "../domain/plan";
import { calculateProjection } from "../service/retirement-service";

function getSaveErrorMessage(code: string): string {
  if (code === "UNAUTHORIZED") return "로그인이 필요해요. 다시 로그인해주세요";
  if (code === "INVALID_BIRTH_YEAR")
    return "출생연도가 올바르지 않아요. 진단을 다시 진행해주세요";
  if (code === "INVALID_RETIREMENT_YEAR")
    return "정년연도 설정이 올바르지 않아요. 진단을 다시 진행해주세요";
  if (code === "INVALID_MONTHLY_EXPENSE")
    return "월 생활비 정보가 올바르지 않아요. 진단을 다시 진행해주세요";
  if (code === "INVALID_NATIONAL_PENSION")
    return "국민연금 정보가 올바르지 않아요. 진단을 다시 진행해주세요";
  if (code === "INVALID_RETIREMENT_ASSET")
    return "퇴직연금 정보가 올바르지 않아요. 진단을 다시 진행해주세요";
  return "저장에 실패했어요. 잠시 후 다시 시도해주세요";
}

interface ResultLocationState {
  intent?: "save";
}

const PENDING_SAVE_KEY = "retirement_pending_result_save";

export default function ProjectionScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch: diagnosisDispatch } = useDiagnosis();
  const dispatch = useDispatch<AppDispatch>();
  const isLoggedIn = useSelector(
    (s: RootState) => s.auth.authStatus === "authenticated",
  );
  const authStatus = useSelector((s: RootState) => s.auth.authStatus);
  const [isSaving, setIsSaving] = useState(false);
  // 로그인 복귀 후 자동 저장은 한 번만
  const autoSaveStarted = useRef(false);

  const projection = state.projection;

  const longTermSummary = useMemo(() => {
    if (!projection) return null;
    const data = calculateLongTermProjection(state, 20);
    const totalIncome = data.reduce((s, d) => s + d.monthlyIncome * 12, 0);
    const totalExpense = data.reduce((s, d) => s + d.monthlyExpense * 12, 0);
    const totalGap = totalIncome - totalExpense;
    return { totalIncome, totalExpense, totalGap };
  }, [state, projection]);

  const recommendations = useMemo(() => {
    if (!longTermSummary) return [];
    return generateRecommendations(state, longTermSummary.totalGap);
  }, [state, longTermSummary]);

  const chartValues = useMemo(() => {
    if (!projection) return null;
    const max = Math.max(projection.totalIncome, projection.totalExpense, 1);
    return {
      incomePct: (projection.totalIncome / max) * 100,
      expensePct: (projection.totalExpense / max) * 100,
      gapPct: Math.min(100, (Math.abs(projection.gap) / max) * 100),
    };
  }, [projection]);

  const handleSave = async () => {
    // 로그인 리다이렉트·리로드로 메모리가 비었으면 세션 초안에서 동기 복구
    let snap: DiagnosisState = state;
    if (!snap.birthYear) {
      const draft = resolveDraftFields();
      if (!draft?.birthYear) {
        dispatch(showToast("진단 결과가 없어요. 진단을 다시 진행해주세요"));
        return;
      }
      diagnosisDispatch({ type: "HYDRATE_FROM_DRAFT" });
      snap = {
        ...state,
        ...draft,
        projection: calculateProjection({ ...state, ...draft }),
      };
    }

    // 로그인 전에도 초안을 남겨 복귀 후 자동 저장 가능하게 함
    persistDiagnosisState(snap);

    const birthYear = snap.birthYear;
    if (birthYear == null) {
      dispatch(showToast("진단 결과가 없어요. 진단을 다시 진행해주세요"));
      return;
    }

    if (!isLoggedIn) {
      try {
        sessionStorage.setItem(PENDING_SAVE_KEY, "1");
      } catch {
        // ignore
      }
      dispatch(showToast("로그인 후 결과를 저장할 수 있어요"));
      navigate("/signin", {
        state: { from: "/result", intent: "save" satisfies "save" },
      });
      return;
    }

    setIsSaving(true);
    try {
      const retirementYear =
        birthYear + (snap.retirementAge ?? DEFAULT_RETIREMENT_AGE);
      // MVP: 예상은퇴 소득(연금)은 서버에 실값 저장 안 함 — 0만 전송
      await saveLatestDiagnosis({
        householdType: snap.diagnosisType,
        birthYear,
        retirementYear,
        nationalPension: 0,
        retirementPension: 0,
        personalPension: 0,
        housingPension: 0,
        monthlyExpense: snap.livingExpense.desiredMonthly,
        healthInsurance: snap.medicalExpense.healthInsurance,
        privateInsurance: snap.medicalExpense.privateInsurance,
      });
      try {
        sessionStorage.removeItem(PENDING_SAVE_KEY);
      } catch {
        // ignore
      }
      // 로컬 세션의 연금 금액은 유지 (서버 0 응답으로 덮지 않음)
      dispatch(
        showToast(
          "진단 요약을 저장했어요. 예상 은퇴 소득 금액은 서버에 저장하지 않아요",
        ),
      );
      navigate("/summary");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? getSaveErrorMessage(err.errorCode)
          : "일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요";
      dispatch(showToast(message));
    } finally {
      setIsSaving(false);
    }
  };

  // 저장 의도(세션 플래그 또는 location state) + 로그인 확정 시 자동 저장
  useEffect(() => {
    const locState = location.state as ResultLocationState | null;
    let pending = locState?.intent === "save";
    try {
      pending = pending || sessionStorage.getItem(PENDING_SAVE_KEY) === "1";
    } catch {
      // ignore
    }
    if (!pending) return;
    if (authStatus === "checking" || authStatus === "error" || !isLoggedIn)
      return;

    // 메모리 유실 시 세션 초안으로 복구 후 저장
    if (!state.birthYear || !projection) {
      const draft = resolveDraftFields();
      if (draft?.birthYear) {
        diagnosisDispatch({ type: "HYDRATE_FROM_DRAFT" });
      }
      return;
    }

    if (autoSaveStarted.current || isSaving) return;
    autoSaveStarted.current = true;
    if (locState?.intent === "save") {
      navigate("/result", { replace: true, state: {} });
    }
    void handleSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, isLoggedIn, location.state, projection, state.birthYear]);

  if (!projection || !chartValues) {
    return (
      <>
        <div className="screen-content">
          <div className="card">
            <div className="card-title">진단 데이터가 없습니다</div>
            <div className="card-subtitle">진단을 처음부터 시작해주세요.</div>
            <div className="mt-16">
              <Button onClick={() => navigate("/diagnosis")}>
                진단 시작하기
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const isNegative = projection.gap < 0;
  const gapLabel = isNegative ? "월 부족액" : "월 여유금액";
  const retirementAge = state.retirementAge ?? DEFAULT_RETIREMENT_AGE;
  const longTermEndAge = retirementAge + 19;

  return (
    <>
      <div className="screen-content">
        <div className="big-gap">
          <div className="big-gap-label">{gapLabel}</div>
          <div
            className={`big-gap-value ${isNegative ? "result-negative" : "result-positive"}`}
          >
            {isNegative ? "-" : "+"}
            {formatWan(Math.abs(projection.gap))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">월 현금흐름</div>
          <div className="bar-chart">
            <div className="bar-row">
              <div className="bar-header">
                <span>수입</span>
                <span>{formatWan(projection.totalIncome)}</span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill bar-fill-income"
                  style={{ width: `${chartValues.incomePct}%` }}
                />
              </div>
            </div>
            <div className="bar-row">
              <div className="bar-header">
                <span>지출</span>
                <span>{formatWan(projection.totalExpense)}</span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill bar-fill-expense"
                  style={{ width: `${chartValues.expensePct}%` }}
                />
              </div>
            </div>
            <div className="bar-row">
              <div className="bar-header">
                <span>{gapLabel}</span>
                <span>{formatWan(Math.abs(projection.gap))}</span>
              </div>
              <div className="bar-track">
                <div
                  className={`bar-fill ${isNegative ? "bar-fill-gap-neg" : "bar-fill-gap-pos"}`}
                  style={{ width: `${chartValues.gapPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">수입 세부</div>
          {projection.incomeItems.length === 0 ? (
            <div className="card-subtitle">등록된 수입이 없어요.</div>
          ) : (
            projection.incomeItems.map((item) => (
              <div key={item.label} className="item-row">
                <span className="item-row-label">{item.label}</span>
                <span className="item-row-value">{formatWan(item.amount)}</span>
              </div>
            ))
          )}
          {projection.pendingNationalPension && (
            <div
              className="item-row"
              style={{
                borderTop: "1px dashed var(--border)",
                marginTop: 8,
                paddingTop: 10,
                opacity: 0.75,
              }}
            >
              <span className="item-row-label" style={{ color: "#e67e22" }}>
                국민연금 ({projection.pendingNationalPension.startAge}세~)
              </span>
              <span className="item-row-value" style={{ color: "#e67e22" }}>
                {formatWan(projection.pendingNationalPension.amount)}
              </span>
            </div>
          )}
          {projection.pendingNationalPension && (
            <div style={{ fontSize: 11, color: "#e67e22", marginTop: 4 }}>
              ※ 국민연금은 {projection.pendingNationalPension.startAge}세부터
              수급 — 위 수입 합계에 미포함
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">지출 세부</div>
          {projection.expenseItems.length === 0 ? (
            <div className="card-subtitle">등록된 지출이 없어요.</div>
          ) : (
            projection.expenseItems.map((item) => (
              <div key={item.label} className="item-row">
                <span className="item-row-label">{item.label}</span>
                <span className="item-row-value">{formatWan(item.amount)}</span>
              </div>
            ))
          )}
        </div>

        {projection.causeAnalysis.length > 0 && (
          <div className="card">
            <div className="card-title">부족 원인 분석</div>
            {projection.causeAnalysis.map((cause) => (
              <div key={cause.cause} className="item-row">
                <span className="item-row-label">{cause.cause}</span>
                <span className="item-row-value">{cause.weight}%</span>
              </div>
            ))}
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="card">
            <div className="card-title">
              {longTermSummary && longTermSummary.totalGap >= 0
                ? "여유자금 활용 제안"
                : "개선 시뮬레이션"}
            </div>
            {longTermSummary && (
              <div
                className={`sim-target-banner ${longTermSummary.totalGap < 0 ? "sim-target-banner-neg" : "sim-target-banner-pos"}`}
              >
                {longTermSummary.totalGap < 0
                  ? `20년간 ${formatWan(Math.abs(longTermSummary.totalGap))} 부족 · 매월 ${formatWan(Math.round(Math.abs(longTermSummary.totalGap) / 240))} 개선 필요`
                  : `20년간 ${formatWan(longTermSummary.totalGap)} 여유 · 월 ${formatWan(Math.round(longTermSummary.totalGap / 240))} 활용 가능`}
              </div>
            )}
            {recommendations.map((sim) => (
              <div key={sim.label} className="simulation-card">
                <span className="simulation-label">{sim.label}</span>
                <div style={{ textAlign: "right" }}>
                  <div className="simulation-delta">
                    +{formatWan(sim.delta)}/월
                  </div>
                  {sim.twentyYearImpact && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--success)",
                        marginTop: 2,
                      }}
                    >
                      20년 누적 +{formatWan(sim.twentyYearImpact)}
                    </div>
                  )}
                  {sim.detail && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        marginTop: 2,
                      }}
                    >
                      {sim.detail}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {longTermSummary && (
          <div className="card">
            <div className="card-title">20년 총 현금흐름 요약</div>
            <div className="card-subtitle" style={{ marginBottom: 12 }}>
              {retirementAge}~{longTermEndAge}세 · 기본 가정(물가 2%, 연금 2%) 기준
            </div>
            <div className="item-row">
              <span className="item-row-label">20년 수입 합계</span>
              <span className="item-row-value result-positive">
                +{formatWan(longTermSummary.totalIncome)}
              </span>
            </div>
            <div className="item-row">
              <span className="item-row-label">20년 지출 합계</span>
              <span className="item-row-value result-negative">
                -{formatWan(longTermSummary.totalExpense)}
              </span>
            </div>
            <div
              className="item-row"
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: 10,
                marginTop: 4,
              }}
            >
              <span className="item-row-label" style={{ fontWeight: 700 }}>
                {longTermSummary.totalGap >= 0
                  ? "20년 여유 합계"
                  : "20년 부족 합계"}
              </span>
              <span
                className={`item-row-value ${longTermSummary.totalGap >= 0 ? "result-positive" : "result-negative"}`}
                style={{ fontWeight: 700, fontSize: "1.05rem" }}
              >
                {longTermSummary.totalGap >= 0 ? "+" : "-"}
                {formatWan(Math.abs(longTermSummary.totalGap))}
              </span>
            </div>
          </div>
        )}

        <SummaryCard
          label="가구 유형"
          value={state.diagnosisType === "couple" ? "부부" : "개인"}
        />

        <button
          className="btn-cta"
          style={{ marginBottom: 12, background: "var(--primary-dark)" }}
          onClick={() => navigate("/cashflow-plan")}
        >
          📊 장기 현금 흐름 설계 보기 (최대 100세)
        </button>

        <div className="button-row">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving
              ? "저장 중..."
              : isLoggedIn
                ? "결과 저장하기"
                : "로그인하고 결과 저장하기"}
          </Button>
        </div>
        <p className="form-hint mt-8" style={{ textAlign: "center" }}>
          {isLoggedIn
            ? "저장 시 계정·진단 요약(출생 연도·은퇴 시점·생활비 등)이 서버에 보관됩니다. 예상 은퇴 소득(연금) 금액은 저장하지 않아요."
            : "결과는 이 기기에서만 보여요. 저장하려면 로그인하세요. 예상 은퇴 소득 금액은 서버에 저장하지 않아요."}{" "}
          <Link to="/privacy">개인정보처리방침</Link>
          {" · "}
          <Link to="/terms">이용약관</Link>
        </p>
      </div>
    </>
  );
}
