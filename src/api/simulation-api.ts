import { isAxiosError } from "axios";
import z from "zod";
import client, { ApiError } from "./client";

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

export type Simulation = z.infer<typeof simulationSchema>;
export type HealthInsuranceInput = z.infer<typeof healthInsuranceInputSchema>;
export type IsaInput = z.infer<typeof isaInputSchema>;
export type NationalPensionInput = z.infer<typeof nationalPensionInputSchema>;
export type IrpInput = z.infer<typeof irpInputSchema>;
export type SeverancePayInput = z.infer<typeof severancePayInputSchema>;
export type UnemploymentBenefitInput = z.infer<typeof unemploymentBenefitInputSchema>;

// 건강보험 시뮬레이션 생성
export const createHealthInsuranceSimulation = async (
  inputData: HealthInsuranceInput,
): Promise<Simulation> => {
  try {
    const res = await client.post("/simulations/health-insurance", inputData);
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
    const res = await client.post("/simulations/isa", inputData);
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
    const res = await client.post("/simulations/national-pension", inputData);
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
    const res = await client.post("/simulations/irp", inputData);
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
    const res = await client.post("/simulations/severance-pay", inputData);
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
    const res = await client.post("/simulations/unemployment-benefit", inputData);
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
