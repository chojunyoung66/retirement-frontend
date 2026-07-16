import { useCallback, useState } from 'react';
import {
  getRetirementGoal,
  createRetirementGoal,
  updateRetirementGoal,
  deleteRetirementGoal,
  type RetirementGoal,
  type CreateRetirementGoalRequest,
  type UpdateRetirementGoalRequest,
} from '../api/retirement-goal-api';
import { ApiError } from '../api/client';

export function useRetirementGoal() {
  const [goal, setGoal] = useState<RetirementGoal | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 정년 목표 조회
  const fetchGoal = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getRetirementGoal();
      setGoal(result);
      return result;
    } catch (err) {
      const message = err instanceof ApiError
        ? `조회 실패: ${err.errorCode}`
        : '정년 목표 조회 중 오류가 발생했습니다';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 정년 목표 생성
  const createGoal = useCallback(
    async (data: CreateRetirementGoalRequest) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await createRetirementGoal(data);
        setGoal(result);
        return result;
      } catch (err) {
        const message = err instanceof ApiError
          ? `생성 실패: ${err.errorCode}`
          : '정년 목표 생성 중 오류가 발생했습니다';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // 정년 목표 업데이트
  const updateGoal = useCallback(
    async (data: UpdateRetirementGoalRequest) => {
      if (!goal) {
        setError('업데이트할 목표가 없습니다');
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const result = await updateRetirementGoal(data);
        setGoal(result);
        return result;
      } catch (err) {
        const message = err instanceof ApiError
          ? `업데이트 실패: ${err.errorCode}`
          : '정년 목표 업데이트 중 오류가 발생했습니다';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [goal]
  );

  // 정년 목표 저장 (없으면 생성, 있으면 업데이트)
  const saveGoal = useCallback(
    async (data: CreateRetirementGoalRequest) => {
      setIsLoading(true);
      setError(null);
      try {
        let result: RetirementGoal;
        try {
          await getRetirementGoal();
          result = await updateRetirementGoal(data);
        } catch (err) {
          if (err instanceof ApiError && err.errorCode === 'RETIREMENT_GOAL_NOT_FOUND') {
            result = await createRetirementGoal(data);
          } else {
            throw err;
          }
        }
        setGoal(result);
        return result;
      } catch (err) {
        const message = err instanceof ApiError
          ? `저장 실패: ${err.errorCode}`
          : '정년 목표 저장 중 오류가 발생했습니다';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // 정년 목표 삭제
  const deleteGoal = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await deleteRetirementGoal();
      setGoal(null);
    } catch (err) {
      const message = err instanceof ApiError
        ? `삭제 실패: ${err.errorCode}`
        : '정년 목표 삭제 중 오류가 발생했습니다';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    goal,
    isLoading,
    error,
    fetchGoal,
    createGoal,
    updateGoal,
    saveGoal,
    deleteGoal,
  };
}
