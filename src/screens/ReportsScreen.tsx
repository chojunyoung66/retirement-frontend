import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { REPORT_TITLE_MAX, reportDisplayTitle, type ReportSummary } from '../api/report-api';
import Sheet from '../components/Sheet';
import { useReports } from '../hooks/useReports';
import { usePaymentConfig } from '../hooks/usePayment';
import { showToast } from '../store/toast-slice';
import type { AppDispatch } from '../store/store';
import { triggerDownload } from '../utils/download-file';
import { formatReportDate } from '../utils/report-view';
import { trackReportDownloaded, type ReportFormat } from '../analytics';

const REPORT_LIMIT = 50;

type SheetState = { kind: 'rename'; report: ReportSummary } | { kind: 'delete'; report: ReportSummary } | null;

function RenameSheet({
  report,
  busy,
  onClose,
  onSave,
}: {
  report: ReportSummary;
  busy: boolean;
  onClose: () => void;
  onSave: (title: string | null) => void;
}) {
  const [value, setValue] = useState(report.title ?? '');
  const trimmed = value.trim();

  return (
    <Sheet
      title="리포트 이름 바꾸기"
      onClose={busy ? undefined : onClose}
      actions={
        <>
          <button className="btn-back" onClick={onClose} disabled={busy}>
            취소
          </button>
          <button className="btn-cta" onClick={() => onSave(trimmed || null)} disabled={busy}>
            {busy ? '저장 중...' : '저장'}
          </button>
        </>
      }
    >
      <input
        className="form-input"
        value={value}
        maxLength={REPORT_TITLE_MAX}
        placeholder={reportDisplayTitle({ ...report, title: null }, formatReportDate(report.generatedAt))}
        aria-label="리포트 이름"
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />
      <p className="form-hint">
        {trimmed.length}/{REPORT_TITLE_MAX}자 · 비워 두면 기본 이름(날짜·시나리오)으로 돌아가요. 이름에 계좌번호 같은
        개인정보는 넣지 마세요.
      </p>
    </Sheet>
  );
}

export default function ReportsScreen() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { reports, isLoading, error, fetchReports, remove, rename, fetchPdf, fetchXlsx } = useReports();
  const { config } = usePaymentConfig();
  const [sheet, setSheet] = useState<SheetState>(null);
  const [busyFile, setBusyFile] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchReports()
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [fetchReports]);

  const handleDownload = async (report: ReportSummary, format: ReportFormat) => {
    setBusyFile(`${report.id}-${format}`);
    try {
      const file = format === 'pdf' ? await fetchPdf(report.id) : await fetchXlsx(report.id);
      triggerDownload(file);
      trackReportDownloaded('download', format);
    } catch {
      dispatch(showToast(format === 'pdf' ? 'PDF를 받지 못했어요' : '엑셀 파일을 받지 못했어요'));
    } finally {
      setBusyFile(null);
    }
  };

  const handleRename = async (title: string | null) => {
    if (sheet?.kind !== 'rename') return;
    const ok = await rename(sheet.report.id, title).then(
      () => true,
      () => false,
    );
    if (ok) setSheet(null);
  };

  const handleDelete = async () => {
    if (sheet?.kind !== 'delete') return;
    const ok = await remove(sheet.report.id).then(
      () => true,
      () => false,
    );
    if (ok) {
      setSheet(null);
      dispatch(showToast('리포트를 삭제했어요'));
    }
  };

  return (
    <div className="screen-content">
      <section className="hero">
        <h1 className="hero-title">내 리포트</h1>
        <p className="hero-subtitle">
          만든 시점의 결과로 고정된 리포트예요. 최대 {REPORT_LIMIT}개까지 보관돼요
          {reports.length > 0 ? ` (${reports.length}/${REPORT_LIMIT})` : ''}.
        </p>
      </section>

      {error && !sheet && (
        <div className="form-error mb-8" role="alert">
          {error}
        </div>
      )}
      {isLoading && !loaded && (
        <div className="card" style={{ textAlign: 'center' }}>
          불러오는 중...
        </div>
      )}

      {loaded && reports.length === 0 && !error && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="card-subtitle">아직 만든 리포트가 없어요.</p>
          <Link to="/withdrawal-scenarios">인출 시나리오에서 리포트 만들기</Link>
        </div>
      )}

      {reports.map((report) => {
        const date = formatReportDate(report.generatedAt);
        return (
          <div key={report.id} className="card">
            <div className="card-title" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Link to={`/report/${report.id}`}>{reportDisplayTitle(report, date)}</Link>
              {report.isOutdated && <span className="badge badge-warning">기준 변경됨</span>}
            </div>
            <p className="form-hint" style={{ marginTop: 0 }}>
              {date} 생성 · {report.scenarioType}안 · 규칙 버전 {report.ruleVersion}
              {report.firstDownloadedAt ? ` · ${formatReportDate(report.firstDownloadedAt)} 처음 받음` : ''}
            </p>
            {report.isOutdated && (
              <p className="form-hint" style={{ background: 'var(--primary-light)', padding: 8, borderRadius: 8 }}>
                세법·건보 기준이 바뀌었거나 만든 지 6개월이 지났어요.{' '}
                <Link to="/withdrawal-scenarios">최신 기준으로 다시 계산하기</Link>
              </p>
            )}
            <div className="report-list-actions">
              <button
                className="btn-secondary"
                onClick={() => void handleDownload(report, 'pdf')}
                disabled={busyFile !== null}
              >
                {busyFile === `${report.id}-pdf` ? 'PDF 만드는 중...' : 'PDF'}
              </button>
              <button
                className="btn-secondary"
                onClick={() => void handleDownload(report, 'xlsx')}
                disabled={busyFile !== null}
              >
                {busyFile === `${report.id}-xlsx` ? '엑셀 만드는 중...' : '엑셀'}
              </button>
              <button className="btn-back" onClick={() => setSheet({ kind: 'rename', report })}>
                이름 바꾸기
              </button>
              <button
                className="btn-back"
                style={{ color: '#e74c3c' }}
                onClick={() => setSheet({ kind: 'delete', report })}
                aria-label={`${reportDisplayTitle(report, date)} 삭제`}
              >
                삭제
              </button>
            </div>
          </div>
        );
      })}

      <div className="mt-16">
        <button className="btn-back" onClick={() => navigate('/account-assets')}>
          계좌 화면으로
        </button>
      </div>

      {sheet?.kind === 'rename' && (
        <RenameSheet
          report={sheet.report}
          busy={isLoading}
          onClose={() => setSheet(null)}
          onSave={(title) => void handleRename(title)}
        />
      )}

      {sheet?.kind === 'delete' && (
        <Sheet
          title="리포트를 삭제할까요?"
          onClose={isLoading ? undefined : () => setSheet(null)}
          actions={
            <>
              <button className="btn-back" onClick={() => setSheet(null)} disabled={isLoading}>
                취소
              </button>
              <button
                className="btn-cta"
                style={{ background: '#e74c3c' }}
                onClick={() => void handleDelete()}
                disabled={isLoading}
              >
                {isLoading ? '삭제 중...' : '삭제'}
              </button>
            </>
          }
        >
          <p className="form-hint">
            “{reportDisplayTitle(sheet.report, formatReportDate(sheet.report.generatedAt))}” 리포트와 연결된 100일
            체크리스트·검토 요청이 함께 지워지고 되돌릴 수 없어요.
            {config?.enabled ? ' 결제한 리포트는 지워도 같은 결제로 다시 만들 수 없어요.' : ''}
          </p>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}
