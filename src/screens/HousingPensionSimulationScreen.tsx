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
  const [isBasicPensionRecipient, setIsBasicPensionRecipient] = useState(false);
  const [isSingleHomeUnder250m, setIsSingleHomeUnder250m] = useState(false);
  const [mortgageWan, setMortgageWan] = useState("");
  const [formError, setFormError] = useState<string | undefined>();
  const [loadNotice, setLoadNotice] = useState<string | undefined>();
  const [applyNotice, setApplyNotice] = useState<string | undefined>();

  const handleSubmit = async () => {
    setFormError(undefined);
    setApplyNotice(undefined);

    const ageNum = Number(age);
    const housePrice = Number(housePriceWan) * 10000;
    const existingMortgageBalance =
      productType === "LOAN_REPAY" ? Number(mortgageWan) * 10000 : undefined;

    if (!Number.isInteger(ageNum) || ageNum < 55 || ageNum > 90) {
      setFormError("연소자 만 나이를 55~90세로 입력하세요");
      return;
    }
    if (!housePrice || housePrice <= 0) {
      setFormError("주택 시세를 입력하세요");
      return;
    }

    try {
      await createHousingPension({
        youngerSpouseAge: ageNum,
        housePrice,
        productType,
        payoutMode: "LIFETIME",
        payoutStyle: "FLAT",
        isBasicPensionRecipient,
        isSingleHomeUnder250m,
        ...(existingMortgageBalance !== undefined
          ? { existingMortgageBalance }
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

  // 계산된 월지급금을 진단 상태의 주택연금 수입으로 옵트인 반영
  const handleApplyToDiagnosis = () => {
    const output = housingPensionSimulation?.outputData as
      | { monthlyPayout?: number; eligible?: boolean }
      | undefined;
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

  const output = housingPensionSimulation?.outputData as
    | {
        monthlyPayout: number;
        annualPayout: number;
        initialGuaranteeFee: number;
        eligible: boolean;
        ineligibilityReasons: string[];
        notice: string;
        lumpSumWithdrawal?: number;
        tableVersion?: string;
      }
    | undefined;

  return (
    <div className="screen-content">
      <h2 className="card-title mb-8">주택연금 시뮬레이션</h2>
      <p className="card-subtitle mb-16">
        HF 종신·정액 공개표(2026.03.01) 보간으로 예상 월지급금을 계산합니다.
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
                <span className="simulation-label">예상 월지급금</span>
                <span className="simulation-delta" style={{ fontWeight: 700 }}>
                  {formatWan(output.monthlyPayout)}
                </span>
              </div>
              <div className="simulation-card">
                <span className="simulation-label">연간 수령액</span>
                <span className="simulation-delta">{formatWan(output.annualPayout)}</span>
              </div>
              <div className="simulation-card">
                <span className="simulation-label">초기보증료(1.0%)</span>
                <span className="simulation-delta">{formatWon(output.initialGuaranteeFee)}원</span>
              </div>
              {output.lumpSumWithdrawal !== undefined && (
                <div className="simulation-card">
                  <span className="simulation-label">예상 일시인출(상환용)</span>
                  <span className="simulation-delta">{formatWan(output.lumpSumWithdrawal)}</span>
                </div>
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
