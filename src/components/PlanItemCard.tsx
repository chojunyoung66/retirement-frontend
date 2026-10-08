import type { PlanItem } from '../api/withdrawal-scenario-api';
import { formatWan } from '../utils/format';
import {
  ACTION_LABEL,
  annuityLimitView,
  formatPeriod,
  startBalanceLabel,
  taxBreakdownText,
} from '../utils/withdrawal-scenario-view';

const CAUTION_COLOR = '#e67e22';

export default function PlanItemCard({ item }: { item: PlanItem }) {
  const isIncome = item.actionType === 'INCOME';
  const balance = startBalanceLabel(item);
  const limit = annuityLimitView(item);
  const taxSplit = taxBreakdownText(item.totalTax, item.localIncomeTax);
  return (
    <div className="card plan-item-card">
      <div className="card-title" style={{ marginBottom: 4 }}>
        {item.priority}. {item.label}
        <span className="badge badge-success" style={{ marginLeft: 8, verticalAlign: 'middle' }}>
          {ACTION_LABEL[item.actionType]}
        </span>
      </div>
      <div className="card-subtitle">{formatPeriod(item.startYm, item.endYm)}</div>
      {balance && (
        <div className="item-row">
          <span className="item-row-label">{balance.label}</span>
          <span className="item-row-value">{balance.value}</span>
        </div>
      )}
      {limit?.kind === 'limit' && (
        <div className="item-row">
          <span className="item-row-label">{limit.label}</span>
          <span className="item-row-value">
            {limit.value}
            <span className="item-row-sub">{limit.planned}</span>
          </span>
        </div>
      )}
      {limit?.kind === 'none' && (
        <div className="item-row">
          <span className="item-row-label">연간 수령한도</span>
          <span className="item-row-label">{limit.text}</span>
        </div>
      )}
      {limit?.kind === 'limit' && limit.exceededText && (
        <p className="form-hint" style={{ color: CAUTION_COLOR, margin: '4px 0' }}>
          {limit.exceededText}
        </p>
      )}
      {item.actionType !== 'HOLD' && (
        <>
          <div className="item-row">
            <span className="item-row-label">
              {item.actionType === 'LUMP_SUM' ? '수령액 (세전 / 세후)' : '월 평균 (세전 / 세후)'}
            </span>
            <span className="item-row-value">
              {formatWan(item.monthlyGross)} / {formatWan(item.monthlyNet)}
            </span>
          </div>
          {!isIncome && (
            <div className="item-row">
              <span className="item-row-label">추정 세금 합계</span>
              <span className="item-row-value">
                {formatWan(item.totalTax)}
                {taxSplit && <span className="item-row-sub">{taxSplit}</span>}
              </span>
            </div>
          )}
        </>
      )}
      {limit?.kind === 'limit' && (
        <details className="mt-8">
          <summary className="form-hint" style={{ cursor: 'pointer', marginBottom: 4 }}>
            연차별 한도 보기
          </summary>
          <div className="cfp-table-wrap">
            <table className="cfp-table">
              <thead>
                <tr>
                  <th>연도</th>
                  <th>연차</th>
                  <th>수령한도</th>
                  <th>계획 인출</th>
                </tr>
              </thead>
              <tbody>
                {limit.rows.map((row) => (
                  <tr key={row.year}>
                    <td className="cfp-td-age">{row.year}</td>
                    <td>{row.receiptYear}</td>
                    <td>{row.limit}</td>
                    <td style={row.exceeded ? { color: CAUTION_COLOR, fontWeight: 600 } : undefined}>
                      {row.planned}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      <p className="form-hint mt-8" style={{ marginBottom: 4 }}>
        <strong>실행 방법</strong> {item.method}
      </p>
      <p className="form-hint" style={{ marginBottom: 4 }}>
        <strong>세금</strong> {item.taxNote}
      </p>
      <p className="form-hint" style={{ marginBottom: 0 }}>
        <strong>건강보험</strong> {item.healthInsuranceNote}
      </p>
      {item.cautions.length > 0 && (
        <>
          <p className="form-hint mt-8" style={{ marginBottom: 0 }}>
            <strong>운영 메모</strong>
          </p>
          <ul className="form-hint" style={{ color: CAUTION_COLOR, paddingLeft: 18, marginBottom: 0, marginTop: 2 }}>
            {item.cautions.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
