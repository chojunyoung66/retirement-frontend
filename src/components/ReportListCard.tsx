import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reportDisplayTitle } from '../api/report-api';
import { useReports } from '../hooks/useReports';
import { formatReportDate } from '../utils/report-view';

const PREVIEW_COUNT = 3;

/** 계좌 화면의 최근 리포트 미리보기 — 관리(이름·삭제·다운로드)는 /reports에서 */
export default function ReportListCard() {
  const { reports, isLoading, error, fetchReports } = useReports();

  useEffect(() => {
    fetchReports().catch(() => undefined);
  }, [fetchReports]);

  if (!isLoading && !error && reports.length === 0) return null;

  return (
    <div className="card">
      <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>내 리포트</span>
        {reports.length > 0 && (
          <Link to="/reports" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
            전체 보기{reports.length > PREVIEW_COUNT ? ` (${reports.length})` : ''}
          </Link>
        )}
      </div>
      {error && <div className="form-error mb-8" role="alert">{error}</div>}
      {isLoading && reports.length === 0 && <p className="card-subtitle">불러오는 중...</p>}
      {reports.slice(0, PREVIEW_COUNT).map((report) => (
        <div key={report.id} className="item-row">
          <Link to={`/report/${report.id}`} className="item-row-label">
            {reportDisplayTitle(report, formatReportDate(report.generatedAt))}
          </Link>
          {report.isOutdated && <span className="badge badge-warning">기준 변경됨</span>}
        </div>
      ))}
      <p className="form-hint" style={{ marginBottom: 0 }}>
        리포트는 만든 시점의 결과로 고정돼 보관돼요. 계좌 정보를 지워도 리포트는 남아요.
      </p>
    </div>
  );
}
