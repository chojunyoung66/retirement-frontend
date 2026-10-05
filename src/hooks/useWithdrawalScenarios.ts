import { useCallback, useState } from 'react';
import {
  generateWithdrawalScenarios,
  getLatestWithdrawalScenarios,
  getWithdrawalPlan,
  selectWithdrawalScenario,
  type GenerateScenarioRequest,
  type ScenarioPlan,
  type ScenarioSet,
  type ScenarioType,
} from '../api/withdrawal-scenario-api';
import { getApiErrorMessage } from '../utils/api-error-message';

export function useWithdrawalScenarios() {
  const [scenarioSet, setScenarioSet] = useState<ScenarioSet | null>(null);
  const [plan, setPlan] = useState<ScenarioPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(task: () => Promise<T>, fallback: string): Promise<T> => {
    setIsLoading(true);
    setError(null);
    try {
      return await task();
    } catch (err) {
      setError(getApiErrorMessage(err, fallback));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchLatest = useCallback(
    () =>
      run(async () => {
        const latest = await getLatestWithdrawalScenarios();
        setScenarioSet(latest);
        return latest;
      }, '최근 시나리오를 불러오지 못했어요'),
    [run],
  );

  const generate = useCallback(
    (data: GenerateScenarioRequest) =>
      run(async () => {
        const created = await generateWithdrawalScenarios(data);
        setScenarioSet(created);
        return created;
      }, '시나리오를 만들지 못했어요'),
    [run],
  );

  const fetchPlan = useCallback(
    (setId: number, type: ScenarioType) =>
      run(async () => {
        const result = await getWithdrawalPlan(setId, type);
        setPlan(result);
        return result;
      }, '실행안을 불러오지 못했어요'),
    [run],
  );

  const select = useCallback(
    (setId: number, type: ScenarioType) =>
      run(async () => {
        await selectWithdrawalScenario(setId, type);
        setScenarioSet((prev) => (prev && prev.id === setId ? { ...prev, selectedType: type } : prev));
      }, '선택을 저장하지 못했어요'),
    [run],
  );

  return { scenarioSet, plan, isLoading, error, fetchLatest, generate, fetchPlan, select };
}
