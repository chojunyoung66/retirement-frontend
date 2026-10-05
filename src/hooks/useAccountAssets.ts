import { useCallback, useState } from 'react';
import {
  createAccountAsset,
  deleteAccountAsset,
  deleteAllAccountAssets,
  getAccountAssets,
  updateAccountAsset,
  type AccountAsset,
  type AccountAssetRequest,
} from '../api/account-asset-api';
import { getApiErrorMessage } from '../utils/api-error-message';

export function useAccountAssets() {
  const [assets, setAssets] = useState<AccountAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 공통: 로딩·오류 상태를 관리하며 요청 실행
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

  const fetchAssets = useCallback(
    () =>
      run(async () => {
        const result = await getAccountAssets();
        setAssets(result);
        return result;
      }, '계좌 목록을 불러오지 못했어요'),
    [run],
  );

  const addAsset = useCallback(
    (data: AccountAssetRequest, options?: { detailDataConsent?: boolean }) =>
      run(async () => {
        const created = await createAccountAsset(data, options);
        setAssets((prev) => [...prev, created]);
        return created;
      }, '계좌를 저장하지 못했어요'),
    [run],
  );

  const editAsset = useCallback(
    (id: number, data: AccountAssetRequest) =>
      run(async () => {
        const updated = await updateAccountAsset(id, data);
        setAssets((prev) => prev.map((a) => (a.id === id ? updated : a)));
        return updated;
      }, '계좌를 수정하지 못했어요'),
    [run],
  );

  const removeAsset = useCallback(
    (id: number) =>
      run(async () => {
        await deleteAccountAsset(id);
        setAssets((prev) => prev.filter((a) => a.id !== id));
      }, '계좌를 삭제하지 못했어요'),
    [run],
  );

  const removeAll = useCallback(
    () =>
      run(async () => {
        const count = await deleteAllAccountAssets();
        setAssets([]);
        return count;
      }, '계좌 정보를 삭제하지 못했어요'),
    [run],
  );

  return {
    assets,
    isLoading,
    error,
    setError,
    fetchAssets,
    addAsset,
    editAsset,
    removeAsset,
    removeAll,
  };
}
