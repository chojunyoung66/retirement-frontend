import type { PlanItem } from '../api/withdrawal-scenario-api';
import { formatWan } from '../utils/format';
import { ACTION_LABEL, formatPeriod } from '../utils/withdrawal-scenario-view';

export default function PlanItemCard({ item }: { item: PlanItem }) {
  const isIncome = item.actionType === 'INCOME';
  return (
    <div className="card plan-item-card">
      <div className="card-title" style={{ marginBottom: 4 }}>
        {item.priority}. {item.label}
        <span className="badge badge-success" style={{ marginLeft: 8, verticalAlign: 'middle' }}>
          {ACTION_LABEL[item.actionType]}
        </span>
      </div>
      <div className="card-subtitle">{formatPeriod(item.startYm, item.endYm)}</div>
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
              <span className="item-row-value">{formatWan(item.totalTax)}</span>
            </div>
          )}
        </>
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
          <ul className="form-hint" style={{ color: '#e67e22', paddingLeft: 18, marginBottom: 0, marginTop: 2 }}>
            {item.cautions.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
