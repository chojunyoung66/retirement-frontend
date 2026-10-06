import { useCallback, useState } from 'react';
import {
  createReport,
  deleteReport,
  downloadReportPdf,
  downloadReportXlsx,
  getReport,
  getReports,
  renameReport,
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
  const [isXlsxLoading, setIsXlsxLoading] = useState(false);
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

  const rename = useCallback(
    (id: number, title: string | null) =>
      run(async () => {
        const updated = await renameReport(id, title);
        setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
        setReport((prev) => (prev && prev.id === id ? { ...prev, ...updated } : prev));
        return updated;
      }, '이름을 바꾸지 못했어요'),
    [run],
  );

  /** 첫 다운로드 시각을 목록에 반영 — 환불 가능 여부 표시에 쓴다 */
  const markDownloaded = useCallback((id: number) => {
    const now = new Date().toISOString();
    const apply = <T extends ReportSummary>(r: T): T =>
      r.id === id && !r.firstDownloadedAt ? { ...r, firstDownloadedAt: now } : r;
    setReports((prev) => prev.map(apply));
    setReport((prev) => (prev ? apply(prev) : prev));
  }, []);

  // 파일은 화면 전체 로딩과 분리해 버튼만 잠근다
  const fetchPdf = useCallback(
    async (id: number): Promise<File> => {
      setIsPdfLoading(true);
      setError(null);
      try {
        const file = await downloadReportPdf(id);
        markDownloaded(id);
        return file;
      } catch (err) {
        setError(getApiErrorMessage(err, 'PDF를 만들지 못했어요. 잠시 후 다시 시도해 주세요'));
        throw err;
      } finally {
        setIsPdfLoading(false);
      }
    },
    [markDownloaded],
  );

  const fetchXlsx = useCallback(
    async (id: number): Promise<File> => {
      setIsXlsxLoading(true);
      setError(null);
      try {
        const file = await downloadReportXlsx(id);
        markDownloaded(id);
        return file;
      } catch (err) {
        setError(getApiErrorMessage(err, '엑셀 파일을 만들지 못했어요. 잠시 후 다시 시도해 주세요'));
        throw err;
      } finally {
        setIsXlsxLoading(false);
      }
    },
    [markDownloaded],
  );

  return {
    report,
    reports,
    isLoading,
    isPdfLoading,
    isXlsxLoading,
    error,
    create,
    fetchReport,
    fetchReports,
    remove,
    rename,
    fetchPdf,
    fetchXlsx,
  };
}
