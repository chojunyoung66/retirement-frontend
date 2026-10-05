import { useEffect, useId, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePortfolio } from "../hooks/usePortfolio";
import { normalizeDecimal } from "../components/Input";
import { formatAllocationTotal, limitAllocationDraft } from "../utils/allocation";
import type {
  Portfolio,
  PortfolioItem,
  CreatePortfolioRequest,
} from "../api/portfolio-api";

// 포트폴리오 항목 편집 폼 컴포넌트
function ItemEditor({
  items,
  onChange,
}: {
  items: PortfolioItem[];
  onChange: (items: PortfolioItem[]) => void;
}) {
  // "33." 같은 입력 중간 상태를 유지하기 위한 비중 문자열
  const [allocationDrafts, setAllocationDrafts] = useState<string[]>(() =>
    items.map((item) => (item.allocation ? String(item.allocation) : ""))
  );

  const addItem = () => {
    onChange([...items, { symbol: "", name: "", allocation: 0 }]);
    setAllocationDrafts([...allocationDrafts, ""]);
  };

  const updateItem = (index: number, field: keyof PortfolioItem, value: string | number) => {
    const next = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange(next);
  };

  const updateAllocation = (index: number, raw: string) => {
    const draft = limitAllocationDraft(normalizeDecimal(raw));
    setAllocationDrafts(allocationDrafts.map((d, i) => (i === index ? draft : d)));
    updateItem(index, "allocation", draft === "" ? 0 : Number(draft));
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
    setAllocationDrafts(allocationDrafts.filter((_, i) => i !== index));
  };

  return (
    <div>
      {items.map((item, i) => (
        <div key={i} className="card" style={{ padding: "12px", marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <input
              className="input"
              aria-label={`${i + 1}번째 종목 코드`}
              placeholder="종목코드 (예: 005930)"
              value={item.symbol}
              onChange={(e) => updateItem(i, "symbol", e.target.value)}
              style={{ flex: 1, minWidth: 0 }}
            />
            <input
              className="input"
              aria-label={`${i + 1}번째 종목명`}
              placeholder="종목명 (예: 삼성전자)"
              value={item.name}
              onChange={(e) => updateItem(i, "name", e.target.value)}
              style={{ flex: 2, minWidth: 0 }}
            />
            <input
              className="input"
              type="text"
              inputMode="decimal"
              aria-label={`${i + 1}번째 종목 비중(%)`}
              placeholder="비중(%)"
              value={allocationDrafts[i] ?? ""}
              onChange={(e) => updateAllocation(i, e.target.value)}
              style={{ flex: 1, minWidth: 0 }}
            />
            <button
              type="button"
              className="btn-back"
              aria-label={`${i + 1}번째 종목 삭제`}
              style={{ padding: "4px 10px", flexShrink: 0 }}
              onClick={() => removeItem(i)}
            >
              삭제
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="btn-back" onClick={addItem} style={{ width: "100%" }}>
        + 종목 추가
      </button>
    </div>
  );
}

// 포트폴리오 생성/수정 폼 컴포넌트
function PortfolioForm({
  initial,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initial?: Portfolio;
  onSubmit: (data: CreatePortfolioRequest) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [accountType, setAccountType] = useState(initial?.accountType ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [items, setItems] = useState<PortfolioItem[]>(initial?.items ?? []);
  const [formError, setFormError] = useState("");
  const fieldId = useId();

  const handleSubmit = () => {
    if (!accountType.trim()) { setFormError("계좌 유형을 선택하세요"); return; }
    if (!name.trim()) { setFormError("포트폴리오 이름을 입력하세요"); return; }
    if (items.length === 0) { setFormError("종목을 1개 이상 추가하세요"); return; }
    if (items.some((item) => !item.symbol.trim() || !item.name.trim() || item.allocation <= 0)) {
      setFormError("모든 종목의 코드·이름·비중을 입력하세요");
      return;
    }
    const totalAllocation = items.reduce((sum, item) => sum + item.allocation, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      setFormError(`비중 합계는 100%여야 합니다 (현재 ${formatAllocationTotal(totalAllocation)}%)`);
      return;
    }
    setFormError("");
    onSubmit({ accountType, name, items });
  };

  return (
    <div className="card">
      <div className="card-title">{initial ? "포트폴리오 수정" : "포트폴리오 추가"}</div>

      <div className="mb-8">
        <label className="form-label" htmlFor={`${fieldId}-account`}>계좌 유형</label>
        <select
          id={`${fieldId}-account`}
          className="input"
          value={accountType}
          onChange={(e) => setAccountType(e.target.value)}
        >
          <option value="">선택하세요</option>
          <option value="IRP">IRP</option>
          <option value="ISA">ISA</option>
          <option value="연금저축">연금저축</option>
          <option value="일반계좌">일반계좌</option>
        </select>
      </div>

      <div className="mb-8">
        <label className="form-label" htmlFor={`${fieldId}-name`}>포트폴리오 이름</label>
        <input
          id={`${fieldId}-name`}
          className="input"
          placeholder="예: 은퇴 안전형 포트폴리오"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="mb-8" role="group" aria-labelledby={`${fieldId}-items`}>
        <div id={`${fieldId}-items`} className="form-label">구성 종목</div>
        <ItemEditor items={items} onChange={setItems} />
      </div>

      {formError && <div className="form-error mb-8" role="alert">{formError}</div>}

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn-cta" onClick={handleSubmit} disabled={isLoading} style={{ flex: 1 }}>
          {isLoading ? "저장 중..." : "저장"}
        </button>
        <button className="btn-back" onClick={onCancel} style={{ flex: 1 }}>
          취소
        </button>
      </div>
    </div>
  );
}

// 포트폴리오 카드 컴포넌트
function PortfolioCard({
  portfolio,
  onEdit,
  onDelete,
}: {
  portfolio: Portfolio;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const totalAllocation = portfolio.items.reduce((s, i) => s + i.allocation, 0);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="card-title" style={{ marginBottom: 4, overflowWrap: "anywhere" }}>
            {portfolio.name}
            <span className="badge badge-success" style={{ marginLeft: 8, verticalAlign: "middle" }}>
              {portfolio.accountType}
            </span>
          </div>
          <div className="card-subtitle">
            종목 수: {portfolio.items.length}개 · 비중 합계: {formatAllocationTotal(totalAllocation)}%
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            className="btn-back"
            aria-label={`${portfolio.name} 수정`}
            style={{ padding: "4px 12px", whiteSpace: "nowrap", width: "auto" }}
            onClick={onEdit}
          >
            수정
          </button>
          <button
            type="button"
            className="btn-back"
            aria-label={`${portfolio.name} 삭제`}
            style={{ padding: "4px 12px", color: "#e74c3c", whiteSpace: "nowrap", width: "auto" }}
            onClick={onDelete}
          >
            삭제
          </button>
        </div>
      </div>

      {portfolio.items.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {portfolio.items.map((item, i) => (
            <div key={i} className="simulation-card">
              <span className="simulation-label">{item.name} ({item.symbol})</span>
              <span className="simulation-delta">{item.allocation}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PortfolioScreen() {
  const navigate = useNavigate();
  const { portfolios, isLoading, error, fetchPortfolios, createNew, update, remove } = usePortfolio();

  const [showForm, setShowForm] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);

  // 화면 진입 시 목록 조회
  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  const handleCreate = async (data: CreatePortfolioRequest) => {
    await createNew(data);
    setShowForm(false);
  };

  const handleUpdate = async (data: CreatePortfolioRequest) => {
    if (!editingPortfolio) return;
    await update(editingPortfolio.id, data);
    setEditingPortfolio(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("이 포트폴리오를 삭제하시겠습니까?")) return;
    await remove(id);
  };

  const handleEdit = (portfolio: Portfolio) => {
    setEditingPortfolio(portfolio);
    setShowForm(false);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingPortfolio(null);
  };

  return (
    <div className="screen-content">
      <section className="hero">
        <h1 className="hero-title">연금 포트폴리오</h1>
        <p className="hero-subtitle">은퇴를 위한 자산 포트폴리오를 관리하세요.</p>
      </section>

      <div className="card" style={{ background: "var(--primary-light)" }}>
        <p className="form-hint" style={{ margin: 0 }}>
          계좌별 잔액과 과세구분을 입력하면 연금 인출 순서 4가지를 비교할 수 있어요.{" "}
          <Link to="/account-assets">계좌별 자산 입력하기 →</Link>
        </p>
      </div>

      {error && <div className="form-error mb-8">{error}</div>}

      {isLoading && !portfolios.length ? (
        <div className="card" style={{ textAlign: "center" }}>불러오는 중...</div>
      ) : (
        <>
          {/* 포트폴리오 목록 */}
          {portfolios.map((p) =>
            editingPortfolio?.id === p.id ? (
              <PortfolioForm
                key={p.id}
                initial={editingPortfolio}
                onSubmit={handleUpdate}
                onCancel={handleCancelForm}
                isLoading={isLoading}
              />
            ) : (
              <PortfolioCard
                key={p.id}
                portfolio={p}
                onEdit={() => handleEdit(p)}
                onDelete={() => handleDelete(p.id)}
              />
            )
          )}

          {portfolios.length === 0 && !showForm && (
            <div className="card" style={{ textAlign: "center" }}>
              <p className="card-subtitle">아직 등록된 포트폴리오가 없습니다.</p>
            </div>
          )}

          {/* 추가 폼 */}
          {showForm ? (
            <PortfolioForm
              onSubmit={handleCreate}
              onCancel={handleCancelForm}
              isLoading={isLoading}
            />
          ) : (
            <button
              className="btn-cta"
              style={{ marginTop: 8 }}
              onClick={() => { setShowForm(true); setEditingPortfolio(null); }}
              disabled={isLoading}
            >
              + 포트폴리오 추가
            </button>
          )}
        </>
      )}

      <div className="mt-16">
        <button className="btn-back" onClick={() => navigate("/")}>홈으로</button>
      </div>
    </div>
  );
}
