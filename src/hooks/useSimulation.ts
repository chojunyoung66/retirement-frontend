import { useCallback, useState } from "react";
import {
  createHealthInsuranceSimulation,
  getLatestHealthInsuranceSimulation,
  createIsaSimulation,
  getLatestIsaSimulation,
  createNationalPensionSimulation,
  getLatestNationalPensionSimulation,
  createIrpSimulation,
  getLatestIrpSimulation,
  createSeverancePaySimulation,
  getLatestSeverancePaySimulation,
  createUnemploymentBenefitSimulation,
  getLatestUnemploymentBenefitSimulation,
  type Simulation,
  type HealthInsuranceInput,
  type IsaInput,
  type NationalPensionInput,
  type IrpInput,
  type SeverancePayInput,
  type UnemploymentBenefitInput,
} from "../api/simulation-api";
import { ApiError } from "../api/client";

export function useSimulation() {
  const [healthInsuranceSimulation, setHealthInsuranceSimulation] =
    useState<Simulation | null>(null);
  const [isaSimulation, setIsaSimulation] = useState<Simulation | null>(null);
  const [nationalPensionSimulation, setNationalPensionSimulation] =
    useState<Simulation | null>(null);
  const [irpSimulation, setIrpSimulation] = useState<Simulation | null>(null);
  const [severancePaySimulation, setSeverancePaySimulation] =
    useState<Simulation | null>(null);
  const [unemploymentBenefitSimulation, setUnemploymentBenefitSimulation] =
    useState<Simulation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 건강보험 시뮬레이션 생성
  const createHealthInsurance = useCallback(
    async (inputData: HealthInsuranceInput) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await createHealthInsuranceSimulation(inputData);
        setHealthInsuranceSimulation(result);
        return result;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? `생성 실패: ${err.errorCode}`
            : "건강보험 시뮬레이션 생성 중 오류가 발생했습니다";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // 최신 건강보험 시뮬레이션 조회
  const fetchLatestHealthInsurance = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getLatestHealthInsuranceSimulation();
      setHealthInsuranceSimulation(result);
      return result;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? `조회 실패: ${err.errorCode}`
          : "건강보험 시뮬레이션 조회 중 오류가 발생했습니다";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ISA 시뮬레이션 생성
  const createIsa = useCallback(async (inputData: IsaInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await createIsaSimulation(inputData);
      setIsaSimulation(result);
      return result;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? `생성 실패: ${err.errorCode}`
          : "ISA 시뮬레이션 생성 중 오류가 발생했습니다";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 최신 ISA 시뮬레이션 조회
  const fetchLatestIsa = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getLatestIsaSimulation();
      setIsaSimulation(result);
      return result;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? `조회 실패: ${err.errorCode}`
          : "ISA 시뮬레이션 조회 중 오류가 발생했습니다";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 국민연금 시뮬레이션 생성
  const createNationalPension = useCallback(
    async (inputData: NationalPensionInput) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await createNationalPensionSimulation(inputData);
        setNationalPensionSimulation(result);
        return result;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? `생성 실패: ${err.errorCode}`
            : "국민연금 시뮬레이션 생성 중 오류가 발생했습니다";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // 최신 국민연금 시뮬레이션 조회
  const fetchLatestNationalPension = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getLatestNationalPensionSimulation();
      setNationalPensionSimulation(result);
      return result;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? `조회 실패: ${err.errorCode}`
          : "국민연금 시뮬레이션 조회 중 오류가 발생했습니다";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // IRP 시뮬레이션 생성
  const createIrp = useCallback(async (inputData: IrpInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await createIrpSimulation(inputData);
      setIrpSimulation(result);
      return result;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? `생성 실패: ${err.errorCode}`
          : "IRP 시뮬레이션 생성 중 오류가 발생했습니다";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 최신 IRP 시뮬레이션 조회
  const fetchLatestIrp = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getLatestIrpSimulation();
      setIrpSimulation(result);
      return result;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? `조회 실패: ${err.errorCode}`
          : "IRP 시뮬레이션 조회 중 오류가 발생했습니다";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 퇴직금 시뮬레이션 생성
  const createSeverancePay = useCallback(
    async (inputData: SeverancePayInput) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await createSeverancePaySimulation(inputData);
        setSeverancePaySimulation(result);
        return result;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? `생성 실패: ${err.errorCode}`
            : "퇴직금 시뮬레이션 생성 중 오류가 발생했습니다";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // 최신 퇴직금 시뮬레이션 조회
  const fetchLatestSeverancePay = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getLatestSeverancePaySimulation();
      setSeverancePaySimulation(result);
      return result;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? `조회 실패: ${err.errorCode}`
          : "퇴직금 시뮬레이션 조회 중 오류가 발생했습니다";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 실업급여 시뮬레이션 생성
  const createUnemploymentBenefit = useCallback(
    async (inputData: UnemploymentBenefitInput) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await createUnemploymentBenefitSimulation(inputData);
        setUnemploymentBenefitSimulation(result);
        return result;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? `생성 실패: ${err.errorCode}`
            : "실업급여 시뮬레이션 생성 중 오류가 발생했습니다";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // 최신 실업급여 시뮬레이션 조회
  const fetchLatestUnemploymentBenefit = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getLatestUnemploymentBenefitSimulation();
      setUnemploymentBenefitSimulation(result);
      return result;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? `조회 실패: ${err.errorCode}`
          : "실업급여 시뮬레이션 조회 중 오류가 발생했습니다";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    healthInsuranceSimulation,
    isaSimulation,
    nationalPensionSimulation,
    irpSimulation,
    severancePaySimulation,
    unemploymentBenefitSimulation,
    isLoading,
    error,
    createHealthInsurance,
    fetchLatestHealthInsurance,
    createIsa,
    fetchLatestIsa,
    createNationalPension,
    fetchLatestNationalPension,
    createIrp,
    fetchLatestIrp,
    createSeverancePay,
    fetchLatestSeverancePay,
    createUnemploymentBenefit,
    fetchLatestUnemploymentBenefit,
  };
}
