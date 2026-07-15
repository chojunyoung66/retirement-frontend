import { useCallback, useState } from 'react';
import {
  getPortfolios,
  getPortfolio,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  type Portfolio,
  type CreatePortfolioRequest,
  type UpdatePortfolioRequest,
} from '../api/portfolio-api';
import { ApiError } from '../api/client';

export function usePortfolio() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 포트폴리오 목록 조회
  const fetchPortfolios = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getPortfolios();
      setPortfolios(result);
      return result;
    } catch (err) {
      const message = err instanceof ApiError
        ? `조회 실패: ${err.errorCode}`
        : '포트폴리오 목록 조회 중 오류가 발생했습니다';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 포트폴리오 단건 조회
  const fetchPortfolio = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getPortfolio(id);
      setSelectedPortfolio(result);
      return result;
    } catch (err) {
      const message = err instanceof ApiError
        ? `조회 실패: ${err.errorCode}`
        : '포트폴리오 조회 중 오류가 발생했습니다';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 포트폴리오 생성
  const createNew = useCallback(
    async (data: CreatePortfolioRequest) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await createPortfolio(data);
        setPortfolios((prev) => [...prev, result]);
        return result;
      } catch (err) {
        const message = err instanceof ApiError
          ? `생성 실패: ${err.errorCode}`
          : '포트폴리오 생성 중 오류가 발생했습니다';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // 포트폴리오 업데이트
  const update = useCallback(
    async (id: number, data: UpdatePortfolioRequest) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await updatePortfolio(id, data);
        setPortfolios((prev) =>
          prev.map((p) => (p.id === id ? result : p))
        );
        if (selectedPortfolio?.id === id) {
          setSelectedPortfolio(result);
        }
        return result;
      } catch (err) {
        const message = err instanceof ApiError
          ? `업데이트 실패: ${err.errorCode}`
          : '포트폴리오 업데이트 중 오류가 발생했습니다';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [selectedPortfolio]
  );

  // 포트폴리오 삭제
  const remove = useCallback(
    async (id: number) => {
      setIsLoading(true);
      setError(null);
      try {
        await deletePortfolio(id);
        setPortfolios((prev) => prev.filter((p) => p.id !== id));
        if (selectedPortfolio?.id === id) {
          setSelectedPortfolio(null);
        }
      } catch (err) {
        const message = err instanceof ApiError
          ? `삭제 실패: ${err.errorCode}`
          : '포트폴리오 삭제 중 오류가 발생했습니다';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [selectedPortfolio]
  );

  return {
    portfolios,
    selectedPortfolio,
    isLoading,
    error,
    fetchPortfolios,
    fetchPortfolio,
    createNew,
    update,
    remove,
  };
}
