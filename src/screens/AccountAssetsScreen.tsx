import { useEffect, useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAccountAssets } from '../hooks/useAccountAssets';
import ReportListCard from '../components/ReportListCard';
import {
  ACCOUNT_ASSET_TYPES,
  IRP_SOURCES,
  type AccountAsset,
  type AccountAssetRequest,
  type AccountAssetType,
  type IrpSource,
} from '../api/account-asset-api';
import {
  ACCOUNT_TYPE_LABEL,
  BUCKET_LABEL,
  IRP_SOURCE_LABEL,
  draftFromAccountAsset,
  emptyAccountAssetDraft,
  toAccountAssetRequest,
  unknownNonDeductibleOf,
  visibleFieldsOf,
  type AccountAssetDraft,
  type BucketField,
} from '../utils/account-asset-form';
import { formatWan } from '../utils/format';

function AccountAssetForm({
  initial,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initial?: AccountAsset;
  onSubmit: (data: AccountAssetRequest) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [draft, setDraft] = useState<AccountAssetDraft>(() =>
    initial ? draftFromAccountAsset(initial) : emptyAccountAssetDraft(),
  );
  const [formError, setFormError] = useState('');
  const fieldId = useId();
  const visible = draft.accountType ? visibleFieldsOf(draft.accountType) : null;

  const setBucket = (field: BucketField, value: string) =>
    setDraft((prev) => ({ ...prev, bucketsWan: { ...prev.bucketsWan, [field]: value } }));

  const handleSubmit = async () => {
    const result = toAccountAssetRequest(draft);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setFormError('');
    try {
      await onSubmit(result.request);
    } catch {
      // 오류 문구는 훅에서 표시
    }
  };

  return (
    <div className="card">
      <div className="card-title">{initial ? '계좌 수정' : '계좌 추가'}</div>

      <div className="mb-8">
        <label className="form-label" htmlFor={`${fieldId}-type`}>계좌 유형</label>
        <select
          id={`${fieldId}-type`}
          className="input"
          value={draft.accountType}
          onChange={(e) => setDraft((prev) => ({ ...prev, accountType: e.target.value as AccountAssetType | '' }))}
        >
          <option value="">선택하세요</option>
          {ACCOUNT_ASSET_TYPES.map((type) => (
            <option key={type} value={type}>{ACCOUNT_TYPE_LABEL[type]}</option>
          ))}
        </select>
      </div>

      <div className="mb-8" style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <label className="form-label" htmlFor={`${fieldId}-name`}>별칭 (선택)</label>
          <input
            id={`${fieldId}-name`}
            className="input"
            maxLength={50}
            placeholder="예: 회사 DC"
            value={draft.accountName}
            onChange={(e) => setDraft((prev) => ({ ...prev, accountName: e.target.value }))}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <label className="form-label" htmlFor={`${fieldId}-inst`}>금융사 (선택)</label>
          <input
            id={`${fieldId}-inst`}
            className="input"
            maxLength={50}
            placeholder="예: OO증권"
            value={draft.institution}
            onChange={(e) => setDraft((prev) => ({ ...prev, institution: e.target.value }))}
          />
        </div>
      </div>

      <div className="mb-8">
        <label className="form-label" htmlFor={`${fieldId}-balance`}>현재 잔액 (만원)</label>
        <input
          id={`${fieldId}-balance`}
          className="input"
          inputMode="decimal"
          placeholder="예: 30000 (3억원)"
          value={draft.balanceWan}
          onChange={(e) => setDraft((prev) => ({ ...prev, balanceWan: e.target.value }))}
        />
      </div>

      {visible && visible.buckets.length > 0 && (
        <div className="mb-8" role="group" aria-labelledby={`${fieldId}-buckets`}>
          <div id={`${fieldId}-buckets`} className="form-label">과세구분 (만원, 아는 만큼만)</div>
          {visible.buckets.map((field) => (
            <div key={field} className="mb-8">
              <label className="form-hint" htmlFor={`${fieldId}-${field}`}>{BUCKET_LABEL[field]}</label>
              <input
                id={`${fieldId}-${field}`}
                className="input"
                inputMode="decimal"
                value={draft.bucketsWan[field]}
                onChange={(e) => setBucket(field, e.target.value)}
              />
            </div>
          ))}
          <p className="form-hint">
            {draft.accountType === 'DC'
              ? 'DC는 비과세가 아니에요. 전액을 이연퇴직소득으로 보고 퇴직소득세를 계산합니다.'
              : '확인되지 않은 금액은 세액공제 받은 금액으로 보고 보수적으로 계산합니다. 금융사 앱의 “연금 과세구분 조회”에서 확인할 수 있어요.'}
          </p>
        </div>
      )}

      {visible?.irpSource && (
        <div className="mb-8">
          <label className="form-label" htmlFor={`${fieldId}-irp`}>IRP 재원</label>
          <select
            id={`${fieldId}-irp`}
            className="input"
            value={draft.irpSource}
            onChange={(e) => setDraft((prev) => ({ ...prev, irpSource: e.target.value as IrpSource | '' }))}
          >
            <option value="">선택 안 함</option>
            {IRP_SOURCES.map((source) => (
              <option key={source} value={source}>{IRP_SOURCE_LABEL[source]}</option>
            ))}
          </select>
        </div>
      )}

      {visible?.pensionSavingsLegacy && (
        <label className="form-hint mb-8" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={draft.pensionSavingsLegacy}
            onChange={(e) => setDraft((prev) => ({ ...prev, pensionSavingsLegacy: e.target.checked }))}
          />
          2013년 3월 이전 가입한 구 연금저축 계좌예요
        </label>
      )}

      {visible?.isaMaturityYm && (
        <div className="mb-8">
          <label className="form-label" htmlFor={`${fieldId}-isa`}>ISA 만기월 (선택)</label>
          <input
            id={`${fieldId}-isa`}
            className="input"
            type="month"
            value={draft.isaMaturityYm}
            onChange={(e) => setDraft((prev) => ({ ...prev, isaMaturityYm: e.target.value }))}
          />
        </div>
      )}

      {formError && <div className="form-error mb-8" role="alert">{formError}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-cta" onClick={() => void handleSubmit()} disabled={isLoading} style={{ flex: 1 }}>
          {isLoading ? '저장 중...' : '저장'}
        </button>
        <button className="btn-back" onClick={onCancel} style={{ flex: 1 }}>
          취소
        </button>
      </div>
    </div>
  );
}

function AccountAssetCard({
  asset,
  onEdit,
  onDelete,
}: {
  asset: AccountAsset;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const label = asset.accountName || ACCOUNT_TYPE_LABEL[asset.accountType];
  const unknown = unknownNonDeductibleOf(asset);
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="card-title" style={{ marginBottom: 4, overflowWrap: 'anywhere' }}>
            {label}
            <span className="badge badge-success" style={{ marginLeft: 8, verticalAlign: 'middle' }}>
              {ACCOUNT_TYPE_LABEL[asset.accountType]}
            </span>
          </div>
          <div className="card-subtitle">
            잔액 {formatWan(asset.balance)}
            {asset.institution ? ` · ${asset.institution}` : ''}
          </div>
          {unknown > 0 && (
            <div className="form-hint" style={{ color: '#e67e22' }}>
              비공제 원금 확인 필요 — 과세구분이 확인되지 않은 금액 {formatWan(unknown)}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            className="btn-back"
            aria-label={`${label} 수정`}
            style={{ padding: '4px 12px', whiteSpace: 'nowrap', width: 'auto' }}
            onClick={onEdit}
          >
            수정
          </button>
          <button
            type="button"
            className="btn-back"
            aria-label={`${label} 삭제`}
            style={{ padding: '4px 12px', color: '#e74c3c', whiteSpace: 'nowrap', width: 'auto' }}
            onClick={onDelete}
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccountAssetsScreen() {
  const navigate = useNavigate();
  const { assets, isLoading, error, setError, fetchAssets, addAsset, editAsset, removeAsset, removeAll } =
    useAccountAssets();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const consentId = useId();

  useEffect(() => {
    fetchAssets().catch(() => undefined);
  }, [fetchAssets]);

  const totalBalance = assets.reduce((sum, a) => sum + a.balance, 0);
  const needsConsent = assets.length === 0;

  const handleCreate = async (data: AccountAssetRequest) => {
    if (needsConsent && !consentChecked) {
      setError('계좌 잔액·과세구분 저장에 동의해 주세요');
      throw new Error('CONSENT_REQUIRED');
    }
    await addAsset(data, { detailDataConsent: needsConsent && consentChecked });
    setShowForm(false);
  };

  const handleUpdate = async (data: AccountAssetRequest) => {
    if (editingId === null) return;
    await editAsset(editingId, data);
    setEditingId(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('이 계좌를 삭제할까요?')) return;
    await removeAsset(id).catch(() => undefined);
  };

  const handleDeleteAll = async () => {
    if (!confirm('저장된 계좌 정보를 모두 삭제할까요? 되돌릴 수 없어요.')) return;
    await removeAll().catch(() => undefined);
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="screen-content">
      <section className="hero">
        <h1 className="hero-title">계좌별 자산</h1>
        <p className="hero-subtitle">
          퇴직연금·연금저축·IRP·ISA·주식·현금을 계좌별로 입력하면 4가지 인출 순서를 비교할 수 있어요.
        </p>
      </section>

      <div className="card" style={{ background: 'var(--primary-light)' }}>
        <p className="form-hint" style={{ margin: 0 }}>
          입력한 잔액과 과세구분은 인출 시나리오 계산을 위해 서버에 저장됩니다. 계좌번호는 받지 않으며,
          아래 “계좌 정보 전체 삭제”나 회원 탈퇴로 언제든 지울 수 있어요.{' '}
          <Link to="/privacy">개인정보처리방침</Link>
        </p>
      </div>

      {error && <div className="form-error mb-8" role="alert">{error}</div>}

      {isLoading && assets.length === 0 && !showForm ? (
        <div className="card" style={{ textAlign: 'center' }}>불러오는 중...</div>
      ) : (
        <>
          {assets.length > 0 && (
            <div className="card-subtitle mb-8">
              {assets.length}개 계좌 · 합계 {formatWan(totalBalance)}
            </div>
          )}
          {assets.map((asset) =>
            editingId === asset.id ? (
              <AccountAssetForm
                key={asset.id}
                initial={asset}
                onSubmit={handleUpdate}
                onCancel={() => setEditingId(null)}
                isLoading={isLoading}
              />
            ) : (
              <AccountAssetCard
                key={asset.id}
                asset={asset}
                onEdit={() => {
                  setEditingId(asset.id);
                  setShowForm(false);
                }}
                onDelete={() => void handleDelete(asset.id)}
              />
            ),
          )}

          {assets.length === 0 && !showForm && (
            <div className="card" style={{ textAlign: 'center' }}>
              <p className="card-subtitle">아직 등록된 계좌가 없어요.</p>
            </div>
          )}

          {showForm ? (
            <>
              {needsConsent && (
                <div className="card" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <input
                    id={consentId}
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => {
                      setConsentChecked(e.target.checked);
                      if (e.target.checked) setError(null);
                    }}
                    style={{ marginTop: 4 }}
                  />
                  <label htmlFor={consentId} className="form-hint" style={{ margin: 0 }}>
                    (필수) 인출 시나리오 계산을 위해 계좌별 잔액·과세구분을 서버에 저장하는 데 동의해요. 계좌번호는
                    받지 않으며, 언제든 전체 삭제할 수 있어요.
                  </label>
                </div>
              )}
              <AccountAssetForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} isLoading={isLoading} />
            </>
          ) : (
            <button
              className="btn-back"
              style={{ marginTop: 8, width: '100%' }}
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
              }}
              disabled={isLoading || assets.length >= 20}
            >
              + 계좌 추가 {assets.length >= 20 ? '(최대 20개)' : ''}
            </button>
          )}

          <button
            className="btn-cta mt-16"
            disabled={assets.length === 0}
            onClick={() => navigate('/withdrawal-scenarios')}
          >
            4개 인출 시나리오 비교하기
          </button>
          <p className="form-hint mt-8" style={{ textAlign: 'center' }}>
            피부양자 유지 여부와 지역보험료가 궁금하면 <Link to="/tax-health-check">세금·건보 체크</Link>
          </p>
        </>
      )}

      <div className="mt-16">
        <ReportListCard />
      </div>

      <div className="mt-16" style={{ display: 'flex', gap: 8 }}>
        <button className="btn-back" style={{ flex: 1 }} onClick={() => navigate('/portfolio')}>
          포트폴리오로
        </button>
        {assets.length > 0 && (
          <button
            className="btn-back"
            style={{ flex: 1, color: '#e74c3c' }}
            onClick={() => void handleDeleteAll()}
            disabled={isLoading}
          >
            계좌 정보 전체 삭제
          </button>
        )}
      </div>
    </div>
  );
}
