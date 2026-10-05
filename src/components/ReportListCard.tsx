import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useReports } from '../hooks/useReports';
import { formatReportDate } from '../utils/report-view';

/** 내 리포트 — 최근 10건까지 보관되는 스냅샷 목록 */
export default function ReportListCard() {
  const { reports, isLoading, error, fetchReports, remove } = useReports();

  useEffect(() => {
    fetchReports().catch(() => undefined);
  }, [fetchReports]);

  const handleDelete = async (id: number) => {
    if (!confirm('이 리포트를 삭제할까요? 되돌릴 수 없어요.')) return;
    await remove(id).catch(() => undefined);
  };

  if (!isLoading && !error && reports.length === 0) return null;

  return (
    <div className="card">
      <div className="card-title">내 리포트</div>
      {error && <div className="form-error mb-8" role="alert">{error}</div>}
      {isLoading && reports.length === 0 && <p className="card-subtitle">불러오는 중...</p>}
      {reports.map((report) => (
        <div key={report.id} className="item-row">
          <Link to={`/report/${report.id}`} className="item-row-label">
            {formatReportDate(report.generatedAt)} · {report.scenarioType}안 실행계획
          </Link>
          <button
            type="button"
            className="btn-back"
            aria-label={`${formatReportDate(report.generatedAt)} 리포트 삭제`}
            style={{ padding: '4px 12px', color: '#e74c3c', whiteSpace: 'nowrap', width: 'auto' }}
            onClick={() => void handleDelete(report.id)}
            disabled={isLoading}
          >
            삭제
          </button>
        </div>
      ))}
      <p className="form-hint" style={{ marginBottom: 0 }}>
        리포트는 만든 시점의 결과로 고정돼 최근 10건까지 보관돼요. 계좌 정보를 지워도 리포트는 남아요.
      </p>
    </div>
  );
}
