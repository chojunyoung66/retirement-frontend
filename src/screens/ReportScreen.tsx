import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { deleteAllAccountAssets } from '../api/account-asset-api';
import { deleteAllWithdrawalScenarios } from '../api/withdrawal-scenario-api';
import type { ReportContent } from '../api/report-api';
import PlanItemCard from '../components/PlanItemCard';
import ExecutionPlanCard from '../components/ExecutionPlanCard';
import ReviewRequestCard from '../components/ReviewRequestCard';
import { useReportDeviceMode } from '../hooks/useReportDeviceMode';
import { useReports } from '../hooks/useReports';
import { showToast } from '../store/toast-slice';
import type { AppDispatch } from '../store/store';
import { getApiErrorMessage } from '../utils/api-error-message';
import { formatWan } from '../utils/format';
import { triggerDownload } from '../utils/download-file';
import {
  canShareFile,
  DEPENDENT_COLOR,
  formatReportDate,
  isShareCancel,
  isShareGestureExpired,
  reportPrintTitle,
  toCompactYearRows,
} from '../utils/report-view';
import {
  ACTION_LABEL,
  DEPENDENT_STATUS_LABEL,
  formatPeriod,
  formatYm,
  summarizeScenarioCard,
  taxBreakdown,
  taxBreakdownText,
} from '../utils/withdrawal-scenario-view';
import { trackReportDownloaded, trackReportPreviewView } from '../analytics';

type ShareStep = 'idle' | 'confirm' | 'ready';

function SummaryCard({ content }: { content: ReportContent }) {
  const { scenario, inputSummary } = content;
  const summary = summarizeScenarioCard(scenario, inputSummary.propertyProvided);
  const taxSplit = taxBreakdownText(scenario.summary.totalTax, scenario.summary.localIncomeTax);
  return (
    <div className="card">
      <div className="card-title">
        {scenario.title}
        {scenario.recommended && (
          <span className="badge badge-success" style={{ marginLeft: 8, verticalAlign: 'middle' }}>
            추천
          </span>
        )}
      </div>
      <p className="card-subtitle">{scenario.goal}</p>
      <div className="item-row">
        <span className="item-row-label">세후 총 인출</span>
        <span className="item-row-value">{summary.netWithdrawal}</span>
      </div>
      <div className="item-row">
        <span className="item-row-label">추정 세금 합계</span>
        <span className="item-row-value">
          {summary.totalTax}
          {taxSplit && <span className="item-row-sub">{taxSplit}</span>}
        </span>
      </div>
      <div className="item-row">
        <span className="item-row-label">자산 소진</span>
        <span className="item-row-value">
          {summary.depletion}
          {scenario.summary.firstShortfallYm ? ` (부족 시작 ${formatYm(scenario.summary.firstShortfallYm)})` : ''}
        </span>
      </div>
      <div className="item-row">
        <span className="item-row-label">피부양자 추정 기간</span>
        <span className="item-row-value">{summary.dependentYears}</span>
      </div>
    </div>
  );
}

function NextActionsCard({ content }: { content: ReportContent }) {
  return (
    <div className="card report-next-actions">
      <div className="card-title">지금 할 일</div>
      {content.nextActions.length === 0 ? (
        <p className="form-hint" style={{ margin: 0 }}>지금 바로 실행할 항목이 없어요.</p>
      ) : (
        <ol className="report-action-list">
          {content.nextActions.map((action) => (
            <li key={`${action.label}-${action.startYm ?? 'start'}`}>
              <strong>{formatYm(action.startYm ?? content.startYm)}부터</strong> {action.label} ·{' '}
              {ACTION_LABEL[action.actionType]}
              {action.monthlyNet > 0 && <> · 월 평균 세후 {formatWan(action.monthlyNet)}</>}
              <span className="form-hint" style={{ display: 'block', margin: 0 }}>
                {action.method}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function ReportScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const params = useParams();
  const id = Number(params.id);
  const validId = Number.isSafeInteger(id) && id > 0;
  const mode = useReportDeviceMode();
  const isPc = mode === 'pc';
  const { report, isLoading, isPdfLoading, isXlsxLoading, error, fetchReport, fetchPdf, fetchXlsx } = useReports();

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [shareStep, setShareStep] = useState<ShareStep>('idle');
  const [canShare, setCanShare] = useState(false);
  const [showFullTable, setShowFullTable] = useState(false);
  const [rawDataStep, setRawDataStep] = useState<'ask' | 'deleting' | null>(
    (location.state as { justCreated?: boolean } | null)?.justCreated ? 'ask' : null,
  );
  const reportRef = useRef<HTMLDivElement>(null);
  const trackedPreview = useRef<number | null>(null);

  useEffect(() => {
    if (!validId) return;
    fetchReport(id).catch(() => undefined);
  }, [validId, id, fetchReport]);

  // 공유 버튼은 파일 공유를 지원하는 기기에서만 보인다
  useEffect(() => {
    const probe = new File([''], 'probe.pdf', { type: 'application/pdf' });
    setCanShare(canShareFile(navigator, probe));
  }, []);

  useEffect(() => {
    if (!report || trackedPreview.current === report.id) return;
    trackedPreview.current = report.id;
    trackReportPreviewView(mode);
  }, [report, mode]);

  // 인쇄(버튼·Ctrl+P 공통): 접힌 구역을 펼치고 파일명이 될 제목을 바꾼 뒤 되돌린다
  useEffect(() => {
    if (!report) return;
    let closed: HTMLDetailsElement[] = [];
    let previousTitle = document.title;
    const handleBeforePrint = () => {
      const root = reportRef.current;
      closed = root ? Array.from(root.querySelectorAll('details')).filter((d) => !d.open) : [];
      closed.forEach((d) => {
        d.open = true;
      });
      previousTitle = document.title;
      document.title = reportPrintTitle(report.id);
      trackReportDownloaded('print');
    };
    const handleAfterPrint = () => {
      closed.forEach((d) => {
        d.open = false;
      });
      closed = [];
      document.title = previousTitle;
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [report]);

  const ensurePdf = useCallback(async (): Promise<File | null> => {
    if (pdfFile) return pdfFile;
    if (!report) return null;
    try {
      const file = await fetchPdf(report.id);
      setPdfFile(file);
      return file;
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err, 'PDF를 만들지 못했어요. 잠시 후 다시 시도해 주세요')));
      return null;
    }
  }, [pdfFile, report, fetchPdf, dispatch]);

  const handleSaveFile = async () => {
    const file = await ensurePdf();
    if (!file) return;
    triggerDownload(file);
    trackReportDownloaded('download');
  };

  const handleSaveXlsx = async () => {
    if (!report) return;
    try {
      triggerDownload(await fetchXlsx(report.id));
      trackReportDownloaded('download', 'xlsx');
    } catch (err) {
      dispatch(showToast(getApiErrorMessage(err, '엑셀 파일을 만들지 못했어요. 잠시 후 다시 시도해 주세요')));
    }
  };

  // 공유 전에 금융정보 안내를 한 번 보여주고, 그동안 PDF를 미리 받아 둔다
  const handleShareStart = () => {
    setShareStep('confirm');
    void ensurePdf();
  };

  const handleShareConfirm = async () => {
    const file = await ensurePdf();
    if (!file) {
      setShareStep('idle');
      return;
    }
    try {
      await navigator.share({ files: [file], title: report?.content.title });
      trackReportDownloaded('share');
      setShareStep('idle');
    } catch (err) {
      if (isShareCancel(err)) {
        setShareStep('idle');
      } else if (isShareGestureExpired(err)) {
        // PDF를 기다리는 사이 사용자 제스처가 만료됨 — 한 번 더 누르면 바로 공유된다
        setShareStep('ready');
      } else {
        setShareStep('idle');
        dispatch(showToast('공유하지 못했어요. PDF 저장을 이용해 주세요'));
      }
    }
  };

  const handleKeepRawData = () => {
    setRawDataStep(null);
    navigate(location.pathname, { replace: true, state: null });
  };

  const handleDeleteRawData = async () => {
    setRawDataStep('deleting');
    try {
      await Promise.all([deleteAllAccountAssets(), deleteAllWithdrawalScenarios()]);
      dispatch(showToast('입력한 계좌 금액과 계산 기록을 삭제했어요. 리포트는 그대로 보관돼요'));
    } catch {
      dispatch(showToast('계좌 정보를 삭제하지 못했어요. 계좌 화면에서 다시 시도해 주세요'));
    }
    setRawDataStep(null);
    navigate(location.pathname, { replace: true, state: null });
  };

  if (!validId) {
    return (
      <div className="screen-content">
        <div className="card">
          <p className="card-subtitle">잘못된 주소예요.</p>
          <Link to="/account-assets">계좌 화면으로 돌아가기</Link>
        </div>
      </div>
    );
  }

  const content = report?.content;
  const tableFull = isPc || showFullTable;
  const checkNeeded =
    content?.accountChecks.filter((c) => c.nonDeductibleStatus === 'CHECK_NEEDED') ?? [];

  return (
    <div className={`screen-content report-page${isPc ? ' report-page-pc' : ' report-page-mobile'}`}>
      {error && !report && <div className="form-error mb-8" role="alert">{error}</div>}
      {isLoading && !report && <div className="card" style={{ textAlign: 'center' }}>불러오는 중...</div>}

      {report && content && (
        <div ref={reportRef}>
          <section className="hero report-hero">
            <h1 className="hero-title">{report.title ?? content.title}</h1>
            <p className="hero-subtitle">
              생성일 {formatReportDate(content.generatedAt)} · 규칙 버전 {content.ruleVersion}
              <br />
              계산 기간 {formatPeriod(content.startYm, content.endYm)}
            </p>
          </section>

          {report.isOutdated && (
            <div className="card no-print" style={{ background: 'var(--primary-light)' }} role="note">
              <p className="form-hint" style={{ margin: 0 }}>
                <span className="badge badge-warning" style={{ marginRight: 6 }}>
                  기준 변경됨
                </span>
                세법·건보 기준이 바뀌었거나 만든 지 6개월이 지났어요. 실행 전에{' '}
                <Link to="/withdrawal-scenarios">최신 기준으로 다시 계산</Link>해 보세요.
              </p>
            </div>
          )}

          {isPc && (
            <div className="card report-toolbar no-print">
              <div className="report-toolbar-actions">
                <button className="btn-cta" onClick={() => window.print()}>
                  인쇄 / PDF로 저장
                </button>
                <button className="btn-back" onClick={() => void handleSaveFile()} disabled={isPdfLoading}>
                  {isPdfLoading ? 'PDF 만드는 중...' : 'PDF 파일 받기'}
                </button>
                <button className="btn-back" onClick={() => void handleSaveXlsx()} disabled={isXlsxLoading}>
                  {isXlsxLoading ? '엑셀 만드는 중...' : '엑셀 받기'}
                </button>
              </div>
              <p className="form-hint" style={{ margin: '8px 0 0' }}>
                인쇄 창에서 대상을 “PDF로 저장”으로 고르세요. 머리글·바닥글 옵션을 끄면 주소와 날짜가 빠져
                깔끔해요.
              </p>
            </div>
          )}

          <div className="report-grid">
            <SummaryCard content={content} />
            <NextActionsCard content={content} />
          </div>

          <details className="card report-section" open={isPc}>
            <summary className="card-title">A~D 시나리오 비교</summary>
            <div className="cfp-table-wrap">
              <table className="cfp-table">
                <thead>
                  <tr>
                    <th>항목</th>
                    {content.comparison.map((row) => (
                      <th key={row.type}>
                        {row.type}안{row.recommended ? ' (추천)' : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ['netWithdrawal', '세후 총 인출'],
                      ['totalTax', '추정 세금'],
                      ['localIncomeTax', '지방소득세(포함)'],
                      ['depletion', '자산 소진'],
                      ['dependentYears', '피부양자 추정'],
                    ] as const
                  ).map(([key, label]) => (
                    <tr key={key}>
                      <td className="cfp-td-age">{label}</td>
                      {content.comparison.map((row) => (
                        <td key={row.type}>
                          {summarizeScenarioCard(row, content.inputSummary.propertyProvided)[key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="form-hint mt-8" style={{ marginBottom: 0 }}>
              {content.recommendationNote}
            </p>
          </details>

          <details className="report-section report-section-long" open>
            <summary className="card-title report-summary-plain">계좌별 실행안</summary>
            <div className="card">
              <div className="card-title" style={{ fontSize: '0.95rem' }}>인출 우선순위</div>
              <ol className="form-hint" style={{ paddingLeft: 18, margin: 0 }}>
                {content.scenario.priorityOrder.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
            {checkNeeded.length > 0 && (
              <div className="card" style={{ background: 'var(--primary-light)' }}>
                <p className="form-hint" style={{ margin: 0 }}>
                  {checkNeeded.map((c) => c.label).join(', ')} 계좌는 비공제 원금 확인이 필요해요. 금융사의 연금
                  과세구분 조회 결과를 반영하면 세금이 더 정확해집니다.
                </p>
              </div>
            )}
            <div className="report-plan-grid">
              {content.scenario.planItems.map((item) => (
                <PlanItemCard key={`${item.accountType}-${item.accountId ?? 'x'}-${item.priority}`} item={item} />
              ))}
            </div>
          </details>

          <details className="card report-section report-section-long" open={isPc}>
            <summary className="card-title">연도별 현금흐름 (연간 합계)</summary>
            <div className={`report-yearly${tableFull ? ' report-yearly-full' : ''}`}>
              <div className="cfp-table-wrap report-compact-table">
                <table className="cfp-table" style={{ minWidth: 0 }}>
                  <thead>
                    <tr>
                      <th>나이</th>
                      <th>세후 인출</th>
                      <th>연말 잔액</th>
                      <th>피부양자</th>
                    </tr>
                  </thead>
                  <tbody>
                    {toCompactYearRows(content.scenario.yearly).map((row) => (
                      <tr key={row.year}>
                        <td className="cfp-td-age">{row.age}세</td>
                        <td>{formatWan(row.netWithdrawal)}</td>
                        <td>{formatWan(row.endingBalance)}</td>
                        <td style={{ color: DEPENDENT_COLOR[row.dependentStatus] }}>
                          {DEPENDENT_STATUS_LABEL[row.dependentStatus]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="cfp-table-wrap report-full-table">
                <table className="cfp-table">
                  <thead>
                    <tr>
                      <th>나이</th>
                      <th>지출</th>
                      <th>세후 인출</th>
                      <th>세금</th>
                      <th>지방소득세</th>
                      <th>부족</th>
                      <th>연말 잔액</th>
                      <th>피부양자</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.scenario.yearly.map((row) => (
                      <tr key={row.year}>
                        <td className="cfp-td-age">
                          {row.age}세
                          <span style={{ display: 'block', fontSize: 10 }}>{row.year}</span>
                        </td>
                        <td>{formatWan(row.expense)}</td>
                        <td>{formatWan(row.netWithdrawal)}</td>
                        <td>{formatWan(row.tax)}</td>
                        <td>{formatWan(taxBreakdown(row.tax, row.localIncomeTax).localIncomeTax)}</td>
                        <td style={row.shortfall > 0 ? { color: '#e74c3c' } : undefined}>
                          {formatWan(row.shortfall)}
                        </td>
                        <td>{formatWan(row.endingBalance)}</td>
                        <td style={{ color: DEPENDENT_COLOR[row.dependentStatus] }}>
                          {DEPENDENT_STATUS_LABEL[row.dependentStatus]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {!isPc && (
              <button
                className="btn-back no-print mt-8"
                style={{ width: '100%' }}
                onClick={() => setShowFullTable((v) => !v)}
              >
                {showFullTable ? '요약해서 보기' : '지출·세금·부족 열까지 자세히 보기'}
              </button>
            )}
            <p className="form-hint mt-8" style={{ marginBottom: 0 }}>
              피부양자는 “추정 가능 / 주의 / 확인 필요” 세 단계로만 표시하며, 실제 자격은 건강보험공단에서 확인하세요.
            </p>
          </details>

          {content.scenario.notes.length > 0 && (
            <details className="card report-section" open={isPc}>
              <summary className="card-title">주의사항</summary>
              <ul className="form-hint" style={{ paddingLeft: 18, margin: 0 }}>
                {content.scenario.notes.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </details>
          )}

          <div className="card report-section">
            <div className="card-title" style={{ fontSize: '0.95rem' }}>기준일·규칙</div>
            <p className="form-hint" style={{ margin: 0 }}>
              규칙 버전 {content.ruleVersion} ·{' '}
              {content.basisDates.map((b) => `${b.domain} ${b.effectiveDate}`).join(' · ')}
            </p>
            <ul className="form-hint" style={{ paddingLeft: 18, marginBottom: 0 }}>
              {content.disclaimers.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {report && (
        <>
          <ExecutionPlanCard reportId={report.id} scenarioType={report.scenarioType} />
          <ReviewRequestCard reportId={report.id} scenarioType={report.scenarioType} />
        </>
      )}

      {report && !isPc && (
        <div className="card no-print">
          <button
            className="btn-back"
            style={{ width: '100%' }}
            onClick={() => void handleSaveXlsx()}
            disabled={isXlsxLoading}
          >
            {isXlsxLoading ? '엑셀 만드는 중...' : '엑셀 파일 받기 (xlsx)'}
          </button>
          <p className="form-hint" style={{ marginBottom: 0 }}>
            월별 현금흐름까지 표로 정리돼 있어 PC에서 보기 좋아요.
          </p>
        </div>
      )}

      <div className="mt-16 no-print report-sheet-actions">
        <button className="btn-back" onClick={() => navigate('/account-assets')}>
          계좌 화면으로
        </button>
        <button className="btn-back" onClick={() => navigate('/reports')}>
          내 리포트 전체
        </button>
      </div>

      {report && !isPc && (
        <div className="report-bottom-bar no-print">
          {isPdfLoading && (
            <p className="report-bottom-hint" role="status">
              PDF 만드는 중… 처음엔 최대 1분 걸릴 수 있어요
            </p>
          )}
          <div className="report-bottom-actions">
            {canShare && (
              <button className="btn-cta" onClick={handleShareStart} disabled={isPdfLoading && shareStep === 'idle'}>
                PDF 공유
              </button>
            )}
            <button
              className={canShare ? 'btn-secondary' : 'btn-cta'}
              onClick={() => void handleSaveFile()}
              disabled={isPdfLoading}
            >
              PDF 저장
            </button>
          </div>
        </div>
      )}

      {shareStep !== 'idle' && (
        <div className="report-sheet-backdrop no-print" role="presentation" onClick={() => setShareStep('idle')}>
          <div
            className="report-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-sheet-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-title" id="share-sheet-title">
              {shareStep === 'ready' ? 'PDF가 준비됐어요' : '금융 정보가 들어 있어요'}
            </div>
            <p className="form-hint">
              {shareStep === 'ready'
                ? '한 번 더 누르면 공유 창이 열려요.'
                : '리포트에는 계좌별 금액과 인출 계획이 들어 있어요. 믿을 수 있는 사람에게만 보내 주세요.'}
            </p>
            <div className="report-sheet-actions">
              <button className="btn-back" onClick={() => setShareStep('idle')}>
                취소
              </button>
              <button className="btn-cta" onClick={() => void handleShareConfirm()} disabled={isPdfLoading}>
                {isPdfLoading ? 'PDF 준비 중...' : '공유하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {rawDataStep && report && (
        <div className="report-sheet-backdrop no-print" role="presentation">
          <div className="report-sheet" role="dialog" aria-modal="true" aria-labelledby="raw-sheet-title">
            <div className="card-title" id="raw-sheet-title">
              리포트를 보관했어요
            </div>
            <p className="form-hint">
              리포트는 그대로 두고, 입력한 계좌 금액과 시나리오 계산 기록은 삭제할까요? 삭제하면 다음에 시나리오를 다시
              계산할 때 계좌를 새로 입력해야 해요.
            </p>
            <div className="report-sheet-actions">
              <button className="btn-back" onClick={handleKeepRawData} disabled={rawDataStep === 'deleting'}>
                계좌 금액 유지
              </button>
              <button
                className="btn-cta"
                onClick={() => void handleDeleteRawData()}
                disabled={rawDataStep === 'deleting'}
              >
                {rawDataStep === 'deleting' ? '삭제 중...' : '계좌 금액 삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
