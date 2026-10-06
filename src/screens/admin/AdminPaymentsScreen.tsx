import { useEffect, useState } from 'react';
import { listAdminPayments, PAYMENT_STATUSES, refundAdminPayment, type AdminPayment, type PaymentStatus } from '../../api/admin-api';
import AdminNav from '../../components/AdminNav';
import Sheet from '../../components/Sheet';
import { getApiErrorMessage } from '../../utils/api-error-message';
import { formatWon } from '../../utils/format';
import { formatReportDate } from '../../utils/report-view';
import { isWithinRefundPolicy, PAYMENT_STATUS_LABEL } from '../../utils/admin-view';

export default function AdminPaymentsScreen() {
  const [status, setStatus] = useState<PaymentStatus | ''>('PAID');
  const [rows, setRows] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<AdminPayment | null>(null);
  const [reason, setReason] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listAdminPayments(status || undefined)
      .then((list) => {
        if (active) setRows(list);
      })
      .catch((err) => {
        if (active) setError(getApiErrorMessage(err, '결제 내역을 불러오지 못했어요'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [status]);

  const openRefund = (payment: AdminPayment) => {
    setTarget(payment);
    setReason(isWithinRefundPolicy(payment) ? '7일 이내 미사용 환불' : '');
    setRefundError(null);
  };

  const handleRefund = async () => {
    if (!target) return;
    setRefunding(true);
    setRefundError(null);
    try {
      const updated = await refundAdminPayment(target.id, reason.trim());
      setRows((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated, userEmail: p.userEmail } : p)));
      setTarget(null);
    } catch (err) {
      setRefundError(getApiErrorMessage(err, '환불하지 못했어요'));
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div className="screen-content screen-wide">
      <AdminNav />
      <div className="card">
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          결제·환불
          <select
            className="form-input"
            style={{ width: 'auto' }}
            value={status}
            onChange={(e) => setStatus(e.target.value as PaymentStatus | '')}
            aria-label="상태 필터"
          >
            <option value="">전체</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PAYMENT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <p className="form-hint" style={{ marginTop: 0 }}>
          환불은 토스페이먼츠에서 전액 취소돼요. “환불 대상”은 결제 후 7일 이내이고 PDF·엑셀을 받지 않은 결제예요(인쇄는
          기록되지 않아요). 서비스 오류는 기간과 관계없이 환불하세요.
        </p>
        {error && (
          <div className="form-error mb-8" role="alert">
            {error}
          </div>
        )}
        {loading && <p className="card-subtitle">불러오는 중...</p>}
        {!loading && rows.length === 0 && !error && <p className="card-subtitle">결제 내역이 없어요.</p>}
        {rows.length > 0 && (
          <div className="cfp-table-wrap">
            <table className="cfp-table admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>상태</th>
                  <th>결제일</th>
                  <th>사용자</th>
                  <th>금액</th>
                  <th>수단</th>
                  <th>리포트</th>
                  <th>첫 다운로드</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td title={row.orderId}>{row.id}</td>
                    <td>
                      {PAYMENT_STATUS_LABEL[row.status]}
                      {row.failureCode && (
                        <span style={{ display: 'block', fontSize: 10 }}>{row.failureCode}</span>
                      )}
                      {row.cancelReason && (
                        <span style={{ display: 'block', fontSize: 10 }}>{row.cancelReason}</span>
                      )}
                    </td>
                    <td>{formatReportDate(row.approvedAt ?? row.createdAt)}</td>
                    <td>{row.userEmail ?? '(탈퇴)'}</td>
                    <td>{formatWon(row.amount)}</td>
                    <td>
                      {row.receiptUrl ? (
                        <a href={row.receiptUrl} target="_blank" rel="noopener noreferrer">
                          {row.method ?? '영수증'}
                        </a>
                      ) : (
                        (row.method ?? '-')
                      )}
                    </td>
                    <td>{row.reportId ? `#${row.reportId}` : '-'}</td>
                    <td>{row.reportDownloadedAt ? formatReportDate(row.reportDownloadedAt) : '-'}</td>
                    <td>
                      {row.status === 'PAID' && (
                        <button
                          className={isWithinRefundPolicy(row) ? 'btn-secondary' : 'btn-back'}
                          style={{ padding: '4px 10px', width: 'auto' }}
                          onClick={() => openRefund(row)}
                        >
                          {isWithinRefundPolicy(row) ? '환불 대상' : '환불'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {target && (
        <Sheet
          title={`결제 #${target.id} 환불`}
          onClose={refunding ? undefined : () => setTarget(null)}
          actions={
            <>
              <button className="btn-back" onClick={() => setTarget(null)} disabled={refunding}>
                취소
              </button>
              <button
                className="btn-cta"
                onClick={() => void handleRefund()}
                disabled={refunding || reason.trim().length < 2}
              >
                {refunding ? '환불 중...' : `${formatWon(target.amount)} 환불`}
              </button>
            </>
          }
        >
          <p className="form-hint">
            {target.userEmail ?? '(탈퇴한 사용자)'} · {formatReportDate(target.approvedAt ?? target.createdAt)} 결제 ·{' '}
            {target.reportDownloadedAt ? '리포트를 받은 적 있음' : '리포트를 받은 적 없음'}. 환불해도 리포트는 지워지지
            않아요.
          </p>
          <input
            className="form-input"
            value={reason}
            maxLength={200}
            onChange={(e) => setReason(e.target.value)}
            placeholder="환불 사유 (결제사에 전달돼요)"
            aria-label="환불 사유"
            style={{ marginBottom: 12 }}
          />
          {refundError && (
            <div className="form-error mt-8" role="alert">
              {refundError}
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}
