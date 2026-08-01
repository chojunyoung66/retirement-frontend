import { isAxiosError } from "axios";
import z from "zod";
import client, { ApiError } from "./client";
import { calculateHousingPension } from "../service/housing-pension-service";

// 시뮬레이션 데이터 스키마
const simulationSchema = z.object({
  id: z.number(),
  userId: z.number(),
  type: z.enum([
    "HEALTH_INSURANCE",
    "ISA",
    "NATIONAL_PENSION",
    "IRP",
    "SEVERANCE_PAY",
    "UNEMPLOYMENT_BENEFIT",
    "HOUSING_PENSION",
  ]),
  inputData: z.record(z.unknown()),
  outputData: z.record(z.unknown()),
  createdAt: z.string().or(z.date()),
});

// 건강보험 시뮬레이션 입력 스키마 (지역가입자 점수제 기준)
const healthInsuranceInputSchema = z.object({
  pensionIncome: z.number(),
  laborIncome: z.number(),
  businessIncome: z.number(),
  interestDividendIncome: z.number(),
  otherIncome: z.number(),
  propertyValue: z.number(),
  carValue: z.number(),
});

// ISA 시뮬레이션 입력 스키마
const isaInputSchema = z.object({
  annualContribution: z.number(),
  expectedReturnRate: z.number(),
  investmentYears: z.number(),
});

// 국민연금 시뮬레이션 입력 스키마
const nationalPensionInputSchema = z.object({
  monthlyIncome: z.number(),
  contributionYears: z.number(),
  birthYear: z.number(),
});

// IRP 시뮬레이션 입력 스키마
const irpInputSchema = z.object({
  annualContribution: z.number(),
  expectedReturnRate: z.number(),
  investmentYears: z.number(),
  annualIncome: z.number(),
});

// 퇴직금 시뮬레이션 입력 스키마
const severancePayInputSchema = z.object({
  averageMonthlyWage: z.number(),
  yearsOfService: z.number(),
});

// 실업급여 시뮬레이션 입력 스키마
const unemploymentBenefitInputSchema = z.object({
  averageMonthlyWage: z.number(),
  insuranceYears: z.number(),
  age: z.number(),
});

// 주택연금 시뮬레이션 입력 스키마
const housingPensionInputSchema = z.object({
  youngerSpouseAge: z.number().min(55).max(90),
  housePrice: z.number().positive(),
  productType: z.enum(["GENERAL", "PREFERENTIAL", "LOAN_REPAY"]),
  payoutMode: z.enum(["LIFETIME", "LIFETIME_MIXED", "FIXED_TERM_MIXED"]),
  payoutStyle: z.enum(["FLAT", "FRONT_LOADED", "STEP_UP"]),
  isBasicPensionRecipient: z.boolean(),
  isSingleHomeUnder250m: z.boolean(),
  existingMortgageBalance: z.number().nonnegative().optional(),
  frontLoadYears: z.union([z.literal(3), z.literal(5), z.literal(7), z.literal(10)]).optional(),
  fixedTermYears: z.union([z.literal(10), z.literal(15), z.literal(20)]).optional(),
  withdrawalRatio: z.number().min(0).max(0.5).optional(),
});

export type Simulation = z.infer<typeof simulationSchema>;
export type HealthInsuranceInput = z.infer<typeof healthInsuranceInputSchema>;
export type IsaInput = z.infer<typeof isaInputSchema>;
export type NationalPensionInput = z.infer<typeof nationalPensionInputSchema>;
export type IrpInput = z.infer<typeof irpInputSchema>;
export type SeverancePayInput = z.infer<typeof severancePayInputSchema>;
export type UnemploymentBenefitInput = z.infer<typeof unemploymentBenefitInputSchema>;
export type HousingPensionInput = z.infer<typeof housingPensionInputSchema>;

// 건강보험 시뮬레이션 생성
export const createHealthInsuranceSimulation = async (
  inputData: HealthInsuranceInput,
): Promise<Simulation> => {
  try {
    const parsedReq = healthInsuranceInputSchema.safeParse(inputData);
    if (!parsedReq.success) {
      throw new ApiError("VALIDATION_ERROR");
    }

    const res = await client.post("/simulations/health-insurance", parsedReq.data);
    const parsed = simulationSchema.safeParse(res.data.data);
    if (!parsed.success) {
      throw new Error("유효하지 않은 응답 형식입니다");
    }
    return parsed.data;
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      throw new ApiError(err.response?.data?.error?.code || "UNKNOWN_ERROR");
    }
    throw err;
  }
};

// 최신 건강보험 시뮬레이션 조회
export const getLatestHealthInsuranceSimulation =
  async (): Promise<Simulation> => {
    try {
      const res = await client.get("/simulations/health-insurance/latest");
      const parsed = simulationSchema.safeParse(res.data.data);
      if (!parsed.success) {
        throw new Error("유효하지 않은 응답 형식입니다");
      }
      return parsed.data;
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        throw new ApiError(err.response?.data?.error?.code || "UNKNOWN_ERROR");
      }
      throw err;
    }
  };

// ISA 시뮬레이션 생성
export const createIsaSimulation = async (
  inputData: IsaInput,
): Promise<Simulation> => {
  try {
    const parsedReq = isaInputSchema.safeParse(inputData);
    if (!parsedReq.success) {
      throw new ApiError("VALIDATION_ERROR");
    }

    const res = await client.post("/simulations/isa", parsedReq.data);
    const parsed = simulationSchema.safeParse(res.data.data);
    if (!parsed.success) {
      throw new Error("유효하지 않은 응답 형식입니다");
    }
    return parsed.data;
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      throw new ApiError(err.response?.data?.error?.code || "UNKNOWN_ERROR");
    }
    throw err;
  }
};

// 최신 ISA 시뮬레이션 조회
export const getLatestIsaSimulation = async (): Promise<Simulation> => {
  try {
    const res = await client.get("/simulations/isa/latest");
    const parsed = simulationSchema.safeParse(res.data.data);
    if (!parsed.success) {
      throw new Error("유효하지 않은 응답 형식입니다");
    }
    return parsed.data;
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      throw new ApiError(err.response?.data?.error?.code || "UNKNOWN_ERROR");
    }
    throw err;
  }
};

// 국민연금 시뮬레이션 생성
export const createNationalPensionSimulation = async (
  inputData: NationalPensionInput,
): Promise<Simulation> => {
  try {
    const parsedReq = nationalPensionInputSchema.safeParse(inputData);
    if (!parsedReq.success) {
      throw new ApiError("VALIDATION_ERROR");
    }

    const res = await client.post("/simulations/national-pension", parsedReq.data);
    const parsed = simulationSchema.safeParse(res.data.data);
    if (!parsed.success) {
      throw new Error("유효하지 않은 응답 형식입니다");
    }
    return parsed.data;
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      throw new ApiError(err.response?.data?.error?.code || "UNKNOWN_ERROR");
    }
    throw err;
  }
};

// 최신 국민연금 시뮬레이션 조회
export const getLatestNationalPensionSimulation =
  async (): Promise<Simulation> => {
    try {
      const res = await client.get("/simulations/national-pension/latest");
      const parsed = simulationSchema.safeParse(res.data.data);
      if (!parsed.success) {
        throw new Error("유효하지 않은 응답 형식입니다");
      }
      return parsed.data;
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        throw new ApiError(err.response?.data?.error?.code || "UNKNOWN_ERROR");
      }
      throw err;
    }
  };

// IRP 시뮬레이션 생성
export const createIrpSimulation = async (
  inputData: IrpInput,
): Promise<Simulation> => {
  try {
    const parsedReq = irpInputSchema.safeParse(inputData);
    if (!parsedReq.success) {
      throw new ApiError("VALIDATION_ERROR");
    }

    const res = await client.post("/simulations/irp", parsedReq.data);
    const parsed = simulationSchema.safeParse(res.data.data);
    if (!parsed.success) {
      throw new Error("유효하지 않은 응답 형식입니다");
    }
    return parsed.data;
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      throw new ApiError(err.response?.data?.error?.code || "UNKNOWN_ERROR");
    }
    throw err;
  }
};

// 최신 IRP 시뮬레이션 조회
export const getLatestIrpSimulation = async (): Promise<Simulation> => {
  try {
    const res = await client.get("/simulations/irp/latest");
    const parsed = simulationSchema.safeParse(res.data.data);
    if (!parsed.success) {
      throw new Error("유효하지 않은 응답 형식입니다");
    }
    return parsed.data;
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      throw new ApiError(err.response?.data?.error?.code || "UNKNOWN_ERROR");
    }
    throw err;
  }
};

// 퇴직금 시뮬레이션 생성
export const createSeverancePaySimulation = async (
  inputData: SeverancePayInput,
): Promise<Simulation> => {
  try {
    const parsedReq = severancePayInputSchema.safeParse(inputData);
    if (!parsedReq.success) {
      throw new ApiError("VALIDATION_ERROR");
    }

    const res = await client.post("/simulations/severance-pay", parsedReq.data);
    const parsed = simulationSchema.safeParse(res.data.data);
    if (!parsed.success) {
      throw new Error("유효하지 않은 응답 형식입니다");
    }
    return parsed.data;
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      throw new ApiError(err.response?.data?.error?.code || "UNKNOWN_ERROR");
    }
    throw err;
  }
};

// 최신 퇴직금 시뮬레이션 조회
export const getLatestSeverancePaySimulation =
  async (): Promise<Simulation> => {
    try {
      const res = await client.get("/simulations/severance-pay/latest");
      const parsed = simulationSchema.safeParse(res.data.data);
      if (!parsed.success) {
        throw new Error("유효하지 않은 응답 형식입니다");
      }
      return parsed.data;
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        throw new ApiError(err.response?.data?.error?.code || "UNKNOWN_ERROR");
      }
      throw err;
    }
  };

// 실업급여 시뮬레이션 생성
export const createUnemploymentBenefitSimulation = async (
  inputData: UnemploymentBenefitInput,
): Promise<Simulation> => {
  try {
    const parsedReq = unemploymentBenefitInputSchema.safeParse(inputData);
    if (!parsedReq.success) throw new ApiError("VALIDATION_ERROR");

    const res = await client.post("/simulations/unemployment-benefit", parsedReq.data);
    const parsed = simulationSchema.safeParse(res.data.data);
    if (!parsed.success) throw new Error("유효하지 않은 응답 형식입니다");
    return parsed.data;
  } catch (err: unknown) {
    if (isAxiosError(err)) throw new ApiError(err.response?.data?.error?.code || "UNKNOWN_ERROR");
    throw err;
  }
};

// 최신 실업급여 시뮬레이션 조회
export const getLatestUnemploymentBenefitSimulation = async (): Promise<Simulation> => {
  try {
    const res = await client.get("/simulations/unemployment-benefit/latest");
    const parsed = simulationSchema.safeParse(res.data.data);
    if (!parsed.success) throw new Error("유효하지 않은 응답 형식입니다");
    return parsed.data;
  } catch (err: unknown) {
    if (isAxiosError(err)) throw new ApiError(err.response?.data?.error?.code || "UNKNOWN_ERROR");
    throw err;
  }
};

// 주택연금 시뮬레이션 생성
// 서버에 엔드포인트가 없으면(P2 미배포) 로컬 HF 표 산식으로 폴백해 UI는 동작시킨다.
export const createHousingPensionSimulation = async (
  inputData: HousingPensionInput,
): Promise<Simulation> => {
  const parsedReq = housingPensionInputSchema.safeParse(inputData);
  if (!parsedReq.success) throw new ApiError("VALIDATION_ERROR");

  const localOutput = calculateHousingPension(parsedReq.data);

  try {
    const res = await client.post("/simulations/housing-pension", parsedReq.data);
    const parsed = simulationSchema.safeParse(res.data.data);
    if (parsed.success) return parsed.data;
  } catch (err: unknown) {
    // 인증 실패는 폴백하지 않고 그대로 전달
    if (isAxiosError(err)) {
      const code = err.response?.data?.error?.code as string | undefined;
      const status = err.response?.status;
      if (
        status === 401 ||
        code === "UNAUTHORIZED" ||
        code === "INVALID_TOKEN"
      ) {
        throw new ApiError(code || "UNAUTHORIZED");
      }
    } else {
      throw err;
    }
  }

  return {
    id: -Date.now(),
    userId: 0,
    type: "HOUSING_PENSION",
    inputData: parsedReq.data as unknown as Record<string, unknown>,
    outputData: localOutput as unknown as Record<string, unknown>,
    createdAt: new Date().toISOString(),
  };
};

// 최신 주택연금 시뮬레이션 조회
export const getLatestHousingPensionSimulation = async (): Promise<Simulation> => {
  try {
    const res = await client.get("/simulations/housing-pension/latest");
    const parsed = simulationSchema.safeParse(res.data.data);
    if (!parsed.success) throw new Error("유효하지 않은 응답 형식입니다");
    return parsed.data;
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      const status = err.response?.status;
      const code = err.response?.data?.error?.code as string | undefined;
      // 엔드포인트 없음(404)도 NOT_FOUND로 정규화
      if (status === 404) {
        throw new ApiError(code || "HOUSING_PENSION_SIMULATION_NOT_FOUND");
      }
      throw new ApiError(code || "UNKNOWN_ERROR");
    }
    throw err;
  }
};
