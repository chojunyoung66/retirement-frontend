import { useState } from "react";
import Input from "../components/Input";
import Button from "../components/Button";
import { useSimulation } from "../hooks/useSimulation";
import { useDiagnosis } from "../hooks/useDiagnosis";
import { ApiError } from "../api/client";
import type { HousingPensionInput } from "../api/simulation-api";

function formatWon(won: number): string {
  return won.toLocaleString("ko-KR");
}

function formatWan(won: number): string {
  return `${Math.round(won / 10000).toLocaleString("ko-KR")}만원`;
}

const PRODUCT_OPTIONS: Array<{ value: HousingPensionInput["productType"]; label: string }> = [
  { value: "GENERAL", label: "일반형" },
  { value: "PREFERENTIAL", label: "우대형" },
  { value: "LOAN_REPAY", label: "주담대 상환용" },
];

const MODE_OPTIONS: Array<{ value: HousingPensionInput["payoutMode"]; label: string }> = [
  { value: "LIFETIME", label: "종신지급" },
  { value: "LIFETIME_MIXED", label: "종신혼합(인출+종신)" },
  { value: "FIXED_TERM_MIXED", label: "확정기간혼합" },
];

const STYLE_OPTIONS: Array<{ value: HousingPensionInput["payoutStyle"]; label: string }> = [
  { value: "FLAT", label: "정액형" },
  { value: "FRONT_LOADED", label: "초기증액형" },
  { value: "STEP_UP", label: "정기증가형" },
];

type HousingOutput = {
  monthlyPayout: number;
  annualPayout: number;
  initialGuaranteeFee: number;
  eligible: boolean;
  ineligibilityReasons: string[];
  notice: string;
  lumpSumWithdrawal?: number;
  monthlyPayoutAfterBoost?: number;
  frontLoadYears?: number;
  stepUpRate?: number;
  payoutScheduleSummary?: string;
  fixedTermYears?: number;
  withdrawLimit?: number;
  mandatoryWithdrawReserve?: number;
  estimatedLoanLimit?: number;
  tableVersion?: string;
};

export default function HousingPensionSimulationScreen() {
  const {
    housingPensionSimulation,
    createHousingPension,
    fetchLatestHousingPension,
    isLoading,
    error,
  } = useSimulation();
  const { state, dispatch } = useDiagnosis();

  const [age, setAge] = useState("");
  const [housePriceWan, setHousePriceWan] = useState("");
  const [productType, setProductType] =
    useState<HousingPensionInput["productType"]>("GENERAL");
  const [payoutMode, setPayoutMode] =
    useState<HousingPensionInput["payoutMode"]>("LIFETIME");
  const [payoutStyle, setPayoutStyle] =
    useState<HousingPensionInput["payoutStyle"]>("FLAT");
  const [frontLoadYears, setFrontLoadYears] = useState<3 | 5 | 7 | 10>(10);
  const [fixedTermYears, setFixedTermYears] = useState<10 | 15 | 20>(10);
  const [withdrawalRatioPct, setWithdrawalRatioPct] = useState("50");
  const [isBasicPensionRecipient, setIsBasicPensionRecipient] = useState(false);
  const [isSingleHomeUnder250m, setIsSingleHomeUnder250m] = useState(false);
  const [mortgageWan, setMortgageWan] = useState("");
  const [formError, setFormError] = useState<string | undefined>();
  const [loadNotice, setLoadNotice] = useState<string | undefined>();
  const [applyNotice, setApplyNotice] = useState<string | undefined>();

  // 확정기간혼합은 정액형만 허용 — 모드 변경 시 스타일 보정
  const handleModeChange = (mode: HousingPensionInput["payoutMode"]) => {
    setPayoutMode(mode);
    if (mode === "FIXED_TERM_MIXED") setPayoutStyle("FLAT");
  };

  const handleSubmit = async () => {
    setFormError(undefined);
    setApplyNotice(undefined);

    const ageNum = Number(age);
    const housePrice = Number(housePriceWan) * 10000;
    const existingMortgageBalance =
      productType === "LOAN_REPAY" ? Number(mortgageWan) * 10000 : undefined;
    const withdrawalRatio = Number(withdrawalRatioPct) / 100;

    if (!Number.isInteger(ageNum) || ageNum < 55 || ageNum > 90) {
      setFormError("연소자 만 나이를 55~90세로 입력하세요");
      return;
    }
    if (!housePrice || housePrice <= 0) {
      setFormError("주택 시세를 입력하세요");
      return;
    }
    if (
      (payoutMode === "LIFETIME_MIXED" || payoutMode === "FIXED_TERM_MIXED") &&
      (!Number.isFinite(withdrawalRatio) || withdrawalRatio < 0 || withdrawalRatio > 0.5)
    ) {
      setFormError("인출비율은 0~50%로 입력하세요");
      return;
    }

    try {
      await createHousingPension({
        youngerSpouseAge: ageNum,
        housePrice,
        productType,
        payoutMode,
        payoutStyle: payoutMode === "FIXED_TERM_MIXED" ? "FLAT" : payoutStyle,
        isBasicPensionRecipient,
        isSingleHomeUnder250m,
        ...(existingMortgageBalance !== undefined ? { existingMortgageBalance } : {}),
        ...(payoutStyle === "FRONT_LOADED" && payoutMode !== "FIXED_TERM_MIXED"
          ? { frontLoadYears }
          : {}),
        ...(payoutMode === "FIXED_TERM_MIXED" ? { fixedTermYears } : {}),
        ...(payoutMode === "LIFETIME_MIXED" || payoutMode === "FIXED_TERM_MIXED"
          ? { withdrawalRatio }
          : {}),
      });
    } catch {
      // hook에서 error 상태 관리
    }
  };

  const handleLoadLatest = async () => {
    setLoadNotice(undefined);
    try {
      await fetchLatestHousingPension();
    } catch (err) {
      if (err instanceof ApiError && err.errorCode === "HOUSING_PENSION_SIMULATION_NOT_FOUND") {
        setLoadNotice("저장된 결과가 없습니다");
      }
    }
  };

  // 진단 반영은 첫 구간 월지급금(초기증액·정기증가 최초액) 기준
  const handleApplyToDiagnosis = () => {
    const output = housingPensionSimulation?.outputData as HousingOutput | undefined;
    if (!output?.eligible || !output.monthlyPayout) {
      setApplyNotice("자격 있는 결과가 있을 때만 반영할 수 있습니다");
      return;
    }
    dispatch({
      type: "UPDATE",
      payload: {
        pension: {
          ...state.pension,
          housing: output.monthlyPayout,
        },
      },
    });
    setApplyNotice(`진단 수입에 주택연금 월 ${formatWan(output.monthlyPayout)}을 반영했습니다`);
  };

  const output = housingPensionSimulation?.outputData as HousingOutput | undefined;
  const styleDisabled = payoutMode === "FIXED_TERM_MIXED";
  const showMixed = payoutMode === "LIFETIME_MIXED" || payoutMode === "FIXED_TERM_MIXED";

  return (
    <div className="screen-content">
      <h2 className="card-title mb-8">주택연금 시뮬레이션</h2>
      <p className="card-subtitle mb-16">
        HF 종신·정액 표 보간 + 초기증액·정기증가·확정기간 규칙을 적용합니다.
        <br />
        <span className="form-hint">참고용 · 실제 가입액은 공사 조회 필수</span>
      </p>

      <Input
        label="부부 중 연소자 만 나이"
        type="number"
        value={age}
        onChange={(v) => setAge(v.replace(/[^0-9]/g, ""))}
        placeholder="예: 60"
        suffix="세"
      />
      <Input
        label="담보 주택 시세"
        type="number"
        value={housePriceWan}
        onChange={(v) => setHousePriceWan(v.replace(/[^0-9]/g, ""))}
        placeholder="예: 40000"
        suffix="만원"
        hint="월액 산정용 시세 · 가입 가능 여부는 공시가 12억 기준"
      />

      <label className="form-label" htmlFor="housing-product-type">
        상품 유형
      </label>
      <select
        id="housing-product-type"
        className="form-input mb-12"
        value={productType}
        onChange={(e) =>
          setProductType(e.target.value as HousingPensionInput["productType"])
        }
      >
        {PRODUCT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <label className="form-label" htmlFor="housing-payout-mode">
        지급방식
      </label>
      <select
        id="housing-payout-mode"
        className="form-input mb-12"
        value={payoutMode}
        onChange={(e) =>
          handleModeChange(e.target.value as HousingPensionInput["payoutMode"])
        }
      >
        {MODE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <label className="form-label" htmlFor="housing-payout-style">
        지급유형
      </label>
      <select
        id="housing-payout-style"
        className="form-input mb-12"
        value={styleDisabled ? "FLAT" : payoutStyle}
        disabled={styleDisabled}
        onChange={(e) =>
          setPayoutStyle(e.target.value as HousingPensionInput["payoutStyle"])
        }
      >
        {STYLE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {styleDisabled && (
        <p className="form-hint mb-12">확정기간혼합은 정액형만 선택할 수 있습니다.</p>
      )}

      {payoutStyle === "FRONT_LOADED" && !styleDisabled && (
        <>
          <label className="form-label" htmlFor="housing-front-years">
            초기증액 기간
          </label>
          <select
            id="housing-front-years"
            className="form-input mb-12"
            value={frontLoadYears}
            onChange={(e) =>
              setFrontLoadYears(Number(e.target.value) as 3 | 5 | 7 | 10)
            }
          >
            {[3, 5, 7, 10].map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
        </>
      )}

      {payoutMode === "FIXED_TERM_MIXED" && (
        <>
          <label className="form-label" htmlFor="housing-fixed-years">
            확정 지급기간
          </label>
          <select
            id="housing-fixed-years"
            className="form-input mb-12"
            value={fixedTermYears}
            onChange={(e) =>
              setFixedTermYears(Number(e.target.value) as 10 | 15 | 20)
            }
          >
            {[10, 15, 20].map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <p className="form-hint mb-12">확정기간혼합은 연소자 만 55~74세만 가능합니다.</p>
        </>
      )}

      {showMixed && (
        <Input
          label="인출한도 비율"
          type="number"
          value={withdrawalRatioPct}
          onChange={(v) => setWithdrawalRatioPct(v.replace(/[^0-9.]/g, ""))}
          placeholder="예: 50"
          suffix="%"
          hint="대출한도 대비 0~50% (확정기간은 중 5% 의무인출 포함)"
        />
      )}

      {productType === "PREFERENTIAL" && (
        <div className="mb-12">
          <label className="form-hint" style={{ display: "block", marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={isBasicPensionRecipient}
              onChange={(e) => setIsBasicPensionRecipient(e.target.checked)}
            />{" "}
            기초연금 수급권자
          </label>
          <label className="form-hint" style={{ display: "block" }}>
            <input
              type="checkbox"
              checked={isSingleHomeUnder250m}
              onChange={(e) => setIsSingleHomeUnder250m(e.target.checked)}
            />{" "}
            시가 2.5억 미만 1주택
          </label>
        </div>
      )}

      {productType === "LOAN_REPAY" && (
        <Input
          label="기존 주택담보대출 잔액"
          type="number"
          value={mortgageWan}
          onChange={(v) => setMortgageWan(v.replace(/[^0-9]/g, ""))}
          placeholder="예: 10000"
          suffix="만원"
          hint="인출은 대출한도의 50~90% 구간으로 조정됩니다"
        />
      )}

      {formError && <div className="form-error mb-8">{formError}</div>}
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
          {!output.eligible ? (
            <p className="form-error">
              가입 요건 미충족: {(output.ineligibilityReasons ?? []).join(", ")}
            </p>
          ) : (
            <>
              <div className="simulation-card">
                <span className="simulation-label">예상 월지급금(최초)</span>
                <span className="simulation-delta" style={{ fontWeight: 700 }}>
                  {formatWan(output.monthlyPayout)}
                </span>
              </div>
              {output.monthlyPayoutAfterBoost !== undefined && (
                <div className="simulation-card">
                  <span className="simulation-label">
                    증액기간 이후 월액({output.frontLoadYears}년 후)
                  </span>
                  <span className="simulation-delta">
                    {formatWan(output.monthlyPayoutAfterBoost)}
                  </span>
                </div>
              )}
              <div className="simulation-card">
                <span className="simulation-label">연간 수령액(최초 기준)</span>
                <span className="simulation-delta">{formatWan(output.annualPayout)}</span>
              </div>
              <div className="simulation-card">
                <span className="simulation-label">초기보증료(1.0%)</span>
                <span className="simulation-delta">
                  {formatWon(output.initialGuaranteeFee)}원
                </span>
              </div>
              {output.lumpSumWithdrawal !== undefined && (
                <div className="simulation-card">
                  <span className="simulation-label">예상 일시인출</span>
                  <span className="simulation-delta">
                    {formatWan(output.lumpSumWithdrawal)}
                  </span>
                </div>
              )}
              {output.withdrawLimit !== undefined && (
                <div className="simulation-card">
                  <span className="simulation-label">인출한도</span>
                  <span className="simulation-delta">{formatWan(output.withdrawLimit)}</span>
                </div>
              )}
              {output.mandatoryWithdrawReserve !== undefined && (
                <div className="simulation-card">
                  <span className="simulation-label">의무설정인출(5%)</span>
                  <span className="simulation-delta">
                    {formatWan(output.mandatoryWithdrawReserve)}
                  </span>
                </div>
              )}
              {output.payoutScheduleSummary && (
                <p className="form-hint mt-8">{output.payoutScheduleSummary}</p>
              )}
            </>
          )}
          <p className="form-hint mt-8">{output.notice}</p>
          {output.tableVersion && (
            <p className="form-hint">표 버전: {output.tableVersion}</p>
          )}

          {output.eligible && (
            <button
              className="btn-cta mt-12"
              style={{ width: "100%" }}
              onClick={handleApplyToDiagnosis}
            >
              진단 수입에 반영
            </button>
          )}
          {applyNotice && <p className="form-hint mt-4">{applyNotice}</p>}
        </div>
      )}
    </div>
  );
}
