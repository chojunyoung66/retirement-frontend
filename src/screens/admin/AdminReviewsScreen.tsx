import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAdminReviews, type AdminReviewSummary } from '../../api/admin-api';
import { REVIEW_STATUSES, type ReviewStatus } from '../../api/concierge-api';
import AdminNav from '../../components/AdminNav';
import { getApiErrorMessage } from '../../utils/api-error-message';
import { REVIEW_STATUS_LABEL } from '../../utils/concierge-view';
import { formatReportDate } from '../../utils/report-view';

export default function AdminReviewsScreen() {
  const [status, setStatus] = useState<ReviewStatus | ''>('REQUESTED');
  const [rows, setRows] = useState<AdminReviewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listAdminReviews(status || undefined)
      .then((list) => {
        if (active) setRows(list);
      })
      .catch((err) => {
        if (active) setError(getApiErrorMessage(err, '검토 요청을 불러오지 못했어요'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [status]);

  return (
    <div className="screen-content screen-wide">
      <AdminNav />
      <div className="card">
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          검토 요청
          <select
            className="form-input"
            style={{ width: 'auto' }}
            value={status}
            onChange={(e) => setStatus(e.target.value as ReviewStatus | '')}
            aria-label="상태 필터"
          >
            <option value="">전체</option>
            {REVIEW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {REVIEW_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <div className="form-error mb-8" role="alert">
            {error}
          </div>
        )}
        {loading && <p className="card-subtitle">불러오는 중...</p>}
        {!loading && rows.length === 0 && !error && <p className="card-subtitle">요청이 없어요.</p>}
        {rows.length > 0 && (
          <div className="cfp-table-wrap">
            <table className="cfp-table admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>상태</th>
                  <th>요청일</th>
                  <th>사용자</th>
                  <th>리포트</th>
                  <th>질문</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link to={`/admin/reviews/${row.id}`}>{row.id}</Link>
                    </td>
                    <td>{REVIEW_STATUS_LABEL[row.status]}</td>
                    <td>{formatReportDate(row.createdAt)}</td>
                    <td>{row.userEmail}</td>
                    <td>
                      {row.reportTitle ?? `${row.scenarioType}안`} · {formatReportDate(row.reportGeneratedAt)}
                    </td>
                    <td style={{ whiteSpace: 'normal', minWidth: 200, textAlign: 'left' }}>
                      <Link to={`/admin/reviews/${row.id}`}>
                        {row.question.length > 60 ? `${row.question.slice(0, 60)}…` : row.question}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
