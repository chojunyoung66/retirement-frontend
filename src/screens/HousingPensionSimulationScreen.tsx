import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Input from "../components/Input";
import Button from "../components/Button";
import { useSimulation } from "../hooks/useSimulation";
import { useDiagnosis } from "../hooks/useDiagnosis";
import { ApiError } from "../api/client";
import { showToast } from "../store/toast-slice";
import type { AppDispatch, RootState } from "../store/store";
import type { HousingPensionInput, Simulation } from "../api/simulation-api";
import { calculateHousingPension } from "../service/housing-pension-service";
import {
  mergePensionPreferPositive,
  readPensionDraft,
  writePensionDraft,
} from "../utils/pension-draft";

function formatWan(won: number): string {
  return `${Math.round(won / 10000).toLocaleString("ko-KR")}만원`;
}

/** 억 단위 입력 → 원 */
function eokToWon(eok: string): number {
  const n = Number(eok);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100_000_000) : 0;
}

type SimpleGoal = "lifetime" | "preferential" | "loan_repay";

type HousingOutput = {
  monthlyPayout: number;
  annualPayout: number;
  initialGuaranteeFee: number;
  eligible: boolean;
  ineligibilityReasons: string[];
  notice: string;
  lumpSumWithdrawal?: number;
  tableVersion?: string;
};

const GOAL_OPTIONS: Array<{
  value: SimpleGoal;
  title: string;
  desc: string;
}> = [
  {
    value: "lifetime",
    title: "평생 매달 받기",
    desc: "가장 흔한 방식 · 매월 일정 금액",
  },
  {
    value: "preferential",
    title: "기초연금 + 집값 낮은 편",
    desc: "시가 2.5억 미만 1주택이면 월액이 더 커질 수 있어요",
  },
  {
    value: "loan_repay",
    title: "집에 대출이 있어요",
    desc: "대출을 먼저 갚고 나머지를 연금으로 받아요",
  },
];

const REASON_KO: Record<string, string> = {
  MIN_AGE: "만 55세부터 가입할 수 있어요",
  INVALID_HOUSE_PRICE: "집 시세를 확인해 주세요",
  PREFERENTIAL_NOT_QUALIFIED: "우대형 조건(기초연금·1주택)을 확인해 주세요",
  PREFERENTIAL_PRICE_LIMIT: "우대형은 시가 2.5억 미만 주택만 가능해요",
  FIXED_TERM_AGE: "선택하신 방식은 만 74세까지만 가능해요",
  FIXED_TERM_FLAT_ONLY: "선택하신 방식은 정액형만 가능해요",
  FIXED_TERM_YEARS_REQUIRED: "지급 기간을 선택해 주세요",
};

function reasonMessage(codes: string[]): string {
  return codes.map((c) => REASON_KO[c] ?? c).join(" · ");
}

export default function HousingPensionSimulationScreen() {
  const navigate = useNavigate();
  const toastDispatch = useDispatch<AppDispatch>();
  const isLoggedIn = useSelector(
    (s: RootState) => s.auth.authStatus === "authenticated",
  );
  const {
    housingPensionSimulation,
    createHousingPension,
    fetchLatestHousingPension,
    isLoading,
    error,
  } = useSimulation();
  const { state, dispatch } = useDiagnosis();
  // 게스트: 서버 없이 로컬 HF 산식 결과 보관
  const [guestSimulation, setGuestSimulation] = useState<Simulation | null>(
    null,
  );
  const [guestCalculating, setGuestCalculating] = useState(false);

  // 진단에 출생연도가 있으면 만 나이를 기본값으로 채움
  const defaultAge = useMemo(() => {
    if (!state.birthYear) return "";
    const age = new Date().getFullYear() - state.birthYear;
    return age >= 55 && age <= 90 ? String(age) : "";
  }, [state.birthYear]);

  const [age, setAge] = useState(defaultAge);
  const [houseEok, setHouseEok] = useState("");
  const [goal, setGoal] = useState<SimpleGoal>("lifetime");
  const [mortgageEok, setMortgageEok] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [payoutStyle, setPayoutStyle] =
    useState<HousingPensionInput["payoutStyle"]>("FLAT");
  const [formError, setFormError] = useState<string | undefined>();
  const [loadNotice, setLoadNotice] = useState<string | undefined>();
  const [applyNotice, setApplyNotice] = useState<string | undefined>();

  const buildInput = (): HousingPensionInput | null => {
    const ageNum = Number(age);
    const housePrice = eokToWon(houseEok);

    if (!Number.isInteger(ageNum) || ageNum < 55 || ageNum > 90) {
      setFormError("만 나이를 55~90세로 입력해 주세요");
      return null;
    }
    if (!housePrice) {
      setFormError("집 시세를 억 단위로 입력해 주세요 (예: 4)");
      return null;
    }

    const base: HousingPensionInput = {
      youngerSpouseAge: ageNum,
      housePrice,
      productType: "GENERAL",
      payoutMode: "LIFETIME",
      payoutStyle: showAdvanced ? payoutStyle : "FLAT",
      isBasicPensionRecipient: false,
      isSingleHomeUnder250m: false,
    };

    if (goal === "preferential") {
      return {
        ...base,
        productType: "PREFERENTIAL",
        isBasicPensionRecipient: true,
        isSingleHomeUnder250m: true,
        payoutStyle: "FLAT",
      };
    }

    if (goal === "loan_repay") {
      const mortgage = eokToWon(mortgageEok);
      if (!mortgage) {
        setFormError("남은 대출액을 억 단위로 입력해 주세요");
        return null;
      }
      return {
        ...base,
        productType: "LOAN_REPAY",
        existingMortgageBalance: mortgage,
        payoutStyle: "FLAT",
      };
    }

    return base;
  };

  const handleSubmit = async () => {
    setFormError(undefined);
    setApplyNotice(undefined);
    const input = buildInput();
    if (!input) return;

    // 게스트는 로컬 산식만 사용 (서버 시뮬 API는 인증 필요)
    if (!isLoggedIn) {
      setGuestCalculating(true);
      try {
        const outputData = calculateHousingPension(input);
        setGuestSimulation({
          id: -1,
          userId: 0,
          type: "HOUSING_PENSION",
          inputData: input as unknown as Record<string, unknown>,
          outputData: outputData as unknown as Record<string, unknown>,
          createdAt: new Date().toISOString(),
        });
      } finally {
        setGuestCalculating(false);
      }
      return;
    }

    try {
      setGuestSimulation(null);
      await createHousingPension(input);
    } catch {
      // hook에서 error 상태 관리
    }
  };

  const handleLoadLatest = async () => {
    setLoadNotice(undefined);
    try {
      await fetchLatestHousingPension();
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.errorCode === "HOUSING_PENSION_SIMULATION_NOT_FOUND"
      ) {
        setLoadNotice("저장된 결과가 없어요");
      }
    }
  };

  const handleApplyToDiagnosis = () => {
    const active = isLoggedIn ? housingPensionSimulation : guestSimulation;
    const out = active?.outputData as HousingOutput | undefined;
    if (!out?.eligible || !out.monthlyPayout) {
      setApplyNotice("계산된 월 수령액이 있을 때만 반영할 수 있어요");
      return;
    }
    // 세션이 비어도 초안의 국민·퇴직·개인연금을 유지한 채 주택연금만 갱신
    const pension = {
      ...mergePensionPreferPositive(state.pension, readPensionDraft()),
      housing: out.monthlyPayout,
    };
    writePensionDraft(pension);
    dispatch({
      type: "UPDATE",
      payload: { pension },
    });
    toastDispatch(
      showToast(
        `주택연금 월 ${formatWan(out.monthlyPayout)}을 현금흐름에 넣었어요`,
      ),
    );
    navigate("/cashflow");
  };

  const activeSimulation = isLoggedIn
    ? housingPensionSimulation
    : guestSimulation;
  const output = activeSimulation?.outputData as HousingOutput | undefined;
  const calculating = isLoading || guestCalculating;

  return (
    <div className="screen-content">
      <h2 className="card-title mb-8">주택연금, 얼마 받을까요?</h2>
      <p className="card-subtitle mb-16">
        나이와 집값만 넣으면 예상 월 수령액을 바로 보여드려요.
        <br />
        <span className="form-hint">참고용 예상액이에요. 실제 가입은 주택금융공사에서 확인하세요.</span>
      </p>

      <Input
        label="만 나이"
        type="number"
        value={age}
        onChange={(v) => setAge(v.replace(/[^0-9]/g, ""))}
        placeholder="예: 60"
        suffix="세"
        hint="부부라면 더 어린 분의 나이"
      />
      <Input
        label="집 시세"
        type="number"
        value={houseEok}
        onChange={(v) => setHouseEok(v.replace(/[^0-9.]/g, ""))}
        placeholder="예: 4"
        suffix="억원"
        hint="KB·부동산원 시세 기준 · 대략 값으로도 괜찮아요"
      />

      <p className="form-label mb-8">어떤 상황에 가까워요?</p>
      <div className="mb-16" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {GOAL_OPTIONS.map((opt) => {
          const selected = goal === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              className="card"
              onClick={() => setGoal(opt.value)}
              style={{
                textAlign: "left",
                cursor: "pointer",
                border: selected ? "2px solid var(--primary)" : undefined,
                padding: "12px 14px",
                background: selected ? "var(--primary-light)" : undefined,
              }}
            >
              <div className="card-title" style={{ fontSize: "1rem", marginBottom: 4 }}>
                {opt.title}
              </div>
              <div className="card-subtitle" style={{ marginBottom: 0 }}>
                {opt.desc}
              </div>
            </button>
          );
        })}
      </div>

      {goal === "loan_repay" && (
        <Input
          label="남은 주택담보대출"
          type="number"
          value={mortgageEok}
          onChange={(v) => setMortgageEok(v.replace(/[^0-9.]/g, ""))}
          placeholder="예: 1"
          suffix="억원"
        />
      )}

      <button
        type="button"
        className="btn-back mb-12"
        style={{ width: "100%" }}
        onClick={() => setShowAdvanced((v) => !v)}
      >
        {showAdvanced ? "간단히 보기" : "받는 방식 더 고르기 (선택)"}
      </button>

      {showAdvanced && goal === "lifetime" && (
        <div className="mb-12">
          <label className="form-label" htmlFor="housing-simple-style">
            매월 금액 형태
          </label>
          <select
            id="housing-simple-style"
            className="form-input mb-8"
            value={payoutStyle}
            onChange={(e) =>
              setPayoutStyle(e.target.value as HousingPensionInput["payoutStyle"])
            }
          >
            <option value="FLAT">처음부터 끝까지 같은 금액 (추천)</option>
            <option value="FRONT_LOADED">처음 몇 년은 더 많이, 이후 줄어요</option>
            <option value="STEP_UP">처음엔 적고, 3년마다 조금씩 늘어요</option>
          </select>
          <p className="form-hint">잘 모르겠으면 &apos;같은 금액&apos;을 고르세요.</p>
        </div>
      )}

      {formError && <div className="form-error mb-8">{formError}</div>}
      {error && <div className="form-error mb-8">{error}</div>}

      <Button onClick={handleSubmit} disabled={calculating}>
        {calculating ? "계산 중..." : "예상액 보기"}
      </Button>
      {isLoggedIn && (
        <p className="form-hint mt-8" style={{ textAlign: "center" }}>
          로그인 상태에서 계산하면 입력·결과가 서버에 저장될 수 있어요.{" "}
          <Link to="/privacy">개인정보처리방침</Link>
        </p>
      )}

      {isLoggedIn && (
        <button
          className="btn-back"
          style={{ marginTop: 8, width: "100%" }}
          onClick={handleLoadLatest}
          disabled={calculating}
        >
          이전 결과 불러오기
        </button>
      )}
      {loadNotice && <p className="form-hint mt-4">{loadNotice}</p>}

      {output && (
        <div className="card mt-16">
          <div className="card-title">예상 결과</div>
          {!output.eligible ? (
            <p className="form-error">{reasonMessage(output.ineligibilityReasons ?? [])}</p>
          ) : (
            <>
              <div className="simulation-card" style={{ marginTop: 8 }}>
                <span className="simulation-label">매월 받을 수 있는 금액</span>
                <span
                  className="simulation-delta"
                  style={{ fontWeight: 700, fontSize: "1.35rem" }}
                >
                  {formatWan(output.monthlyPayout)}
                </span>
              </div>
              <div className="simulation-card">
                <span className="simulation-label">1년이면</span>
                <span className="simulation-delta">{formatWan(output.annualPayout)}</span>
              </div>
              <div className="simulation-card">
                <span className="simulation-label">가입 시 보증료(약)</span>
                <span className="simulation-delta">
                  {formatWan(output.initialGuaranteeFee)}
                </span>
              </div>
              {output.lumpSumWithdrawal !== undefined && (
                <div className="simulation-card">
                  <span className="simulation-label">대출 정리에 쓸 목돈(약)</span>
                  <span className="simulation-delta">
                    {formatWan(output.lumpSumWithdrawal)}
                  </span>
                </div>
              )}
              <p className="form-hint mt-8">
                집값·나이·상품에 따라 달라요. 정확한 금액은 한국주택금융공사에서
                확인해 주세요.
              </p>
            </>
          )}

          {activeSimulation && activeSimulation.id < 0 && (
            <p className="form-hint mt-4">
              지금은 이 기기에서만 계산 결과를 보여드려요. 진단 반영은 가능하고,
              서버 저장·불러오기는 로그인 후 이용할 수 있어요.
            </p>
          )}

          {output.eligible && (
            <button
              className="btn-cta mt-12"
              style={{ width: "100%" }}
              onClick={handleApplyToDiagnosis}
            >
              내 은퇴 진단에 반영하기
            </button>
          )}
          {applyNotice && <p className="form-hint mt-4">{applyNotice}</p>}
        </div>
      )}
    </div>
  );
}
