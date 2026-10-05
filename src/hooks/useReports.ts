import { useCallback, useState } from 'react';
import {
  createReport,
  deleteReport,
  downloadReportPdf,
  getReport,
  getReports,
  type Report,
  type ReportSummary,
} from '../api/report-api';
import type { ScenarioType } from '../api/withdrawal-scenario-api';
import { getApiErrorMessage } from '../utils/api-error-message';

export function useReports() {
  const [report, setReport] = useState<Report | null>(null);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
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

  const create = useCallback(
    (scenarioSetId: number, scenarioType: ScenarioType) =>
      run(async () => {
        const created = await createReport(scenarioSetId, scenarioType);
        setReport(created);
        return created;
      }, '리포트를 만들지 못했어요'),
    [run],
  );

  const fetchReport = useCallback(
    (id: number) =>
      run(async () => {
        const result = await getReport(id);
        setReport(result);
        return result;
      }, '리포트를 불러오지 못했어요'),
    [run],
  );

  const fetchReports = useCallback(
    () =>
      run(async () => {
        const list = await getReports();
        setReports(list);
        return list;
      }, '리포트 목록을 불러오지 못했어요'),
    [run],
  );

  const remove = useCallback(
    (id: number) =>
      run(async () => {
        await deleteReport(id);
        setReports((prev) => prev.filter((r) => r.id !== id));
      }, '리포트를 삭제하지 못했어요'),
    [run],
  );

  // PDF는 화면 전체 로딩과 분리해 버튼만 잠근다
  const fetchPdf = useCallback(async (id: number): Promise<File> => {
    setIsPdfLoading(true);
    setError(null);
    try {
      return await downloadReportPdf(id);
    } catch (err) {
      setError(getApiErrorMessage(err, 'PDF를 만들지 못했어요. 잠시 후 다시 시도해 주세요'));
      throw err;
    } finally {
      setIsPdfLoading(false);
    }
  }, []);

  return {
    report,
    reports,
    isLoading,
    isPdfLoading,
    error,
    create,
    fetchReport,
    fetchReports,
    remove,
    fetchPdf,
  };
}
