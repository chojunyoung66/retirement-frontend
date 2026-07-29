import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./client", () => ({
  default: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {
    errorCode: string;
    constructor(code: string) {
      super();
      this.errorCode = code;
    }
  },
}));

vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  return {
    ...actual,
    isAxiosError: (e: unknown) =>
      (e as Record<string, unknown>)?.isAxiosError === true,
  };
});

import client, { ApiError } from "./client";
import {
  getLatestDiagnosis,
  saveLatestDiagnosis,
  deleteLatestDiagnosis,
} from "./diagnosis-api";

const mockGet = client.get as ReturnType<typeof vi.fn>;
const mockPut = client.put as ReturnType<typeof vi.fn>;
const mockDelete = client.delete as ReturnType<typeof vi.fn>;

const SAMPLE_RECORD = {
  id: 1,
  userId: 10,
  householdType: "individual",
  birthYear: 1970,
  retirementYear: 2030,
  monthlyIncome: 1200000,
  monthlyExpense: 2000000,
  updatedAt: "2026-07-29T00:00:00.000Z",
};

beforeEach(() => vi.clearAllMocks());

describe("getLatestDiagnosis — GET /diagnoses/me/latest", () => {
  it("저장된 진단이 있으면 DiagnosisRecord를 반환한다", async () => {
    mockGet.mockResolvedValue({ data: { data: SAMPLE_RECORD } });

    const result = await getLatestDiagnosis();

    expect(mockGet).toHaveBeenCalledWith("/diagnoses/me/latest");
    expect(result).toMatchObject({
      birthYear: 1970,
      householdType: "individual",
    });
  });

  it("저장된 진단이 없으면 null을 반환한다", async () => {
    mockGet.mockResolvedValue({ data: { data: null } });

    const result = await getLatestDiagnosis();

    expect(result).toBeNull();
  });
});

describe("saveLatestDiagnosis — PUT /diagnoses/me/latest", () => {
  it("유효한 데이터로 저장 요청 후 저장된 record를 반환한다", async () => {
    mockPut.mockResolvedValue({ data: { data: SAMPLE_RECORD } });
    const payload = {
      householdType: "individual",
      birthYear: 1970,
      retirementYear: 2030,
      monthlyIncome: 1200000,
      monthlyExpense: 2000000,
    };

    const result = await saveLatestDiagnosis(payload);

    expect(mockPut).toHaveBeenCalledWith("/diagnoses/me/latest", payload);
    expect(result.id).toBe(1);
  });
});

describe("deleteLatestDiagnosis — DELETE /diagnoses/me/latest", () => {
  it("삭제 요청이 성공하면 undefined를 반환한다", async () => {
    mockDelete.mockResolvedValue({});

    const result = await deleteLatestDiagnosis();

    expect(mockDelete).toHaveBeenCalledWith("/diagnoses/me/latest");
    expect(result).toBeUndefined();
  });

  it("진단이 없을 때 삭제하면 ApiError를 던진다", async () => {
    const axiosError = Object.assign(new Error(), {
      isAxiosError: true,
      response: { data: { error: { code: "DIAGNOSIS_NOT_FOUND" } } },
    });
    mockDelete.mockRejectedValue(axiosError);

    await expect(deleteLatestDiagnosis()).rejects.toBeInstanceOf(ApiError);
  });
});
