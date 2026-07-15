import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortfolio } from "../hooks/usePortfolio";
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
  const addItem = () =>
    onChange([...items, { symbol: "", name: "", allocation: 0 }]);

  const updateItem = (index: number, field: keyof PortfolioItem, value: string | number) => {
    const next = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange(next);
  };

  const removeItem = (index: number) =>
    onChange(items.filter((_, i) => i !== index));

  return (
    <div>
      {items.map((item, i) => (
        <div key={i} className="card" style={{ padding: "12px", marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <input
              className="input"
              placeholder="종목코드 (예: 005930)"
              value={item.symbol}
              onChange={(e) => updateItem(i, "symbol", e.target.value)}
              style={{ flex: 1 }}
            />
            <input
              className="input"
              placeholder="종목명 (예: 삼성전자)"
              value={item.name}
              onChange={(e) => updateItem(i, "name", e.target.value)}
              style={{ flex: 2 }}
            />
            <input
              className="input"
              type="number"
              placeholder="비중(%)"
              value={item.allocation || ""}
              onChange={(e) => updateItem(i, "allocation", Number(e.target.value.replace(/[^0-9]/g, '')))}
              onKeyDown={(e) => { if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
              style={{ flex: 1 }}
            />
            <button
              className="btn-back"
              style={{ padding: "4px 10px" }}
              onClick={() => removeItem(i)}
            >
              삭제
            </button>
          </div>
        </div>
      ))}
      <button className="btn-back" onClick={addItem} style={{ width: "100%" }}>
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

  const handleSubmit = () => {
    if (!accountType.trim()) { setFormError("계좌 유형을 선택하세요"); return; }
    if (!name.trim()) { setFormError("포트폴리오 이름을 입력하세요"); return; }
    const totalAllocation = items.reduce((sum, item) => sum + item.allocation, 0);
    if (items.length > 0 && Math.abs(totalAllocation - 100) > 0.01) {
      setFormError(`비중 합계는 100%여야 합니다 (현재 ${totalAllocation}%)`);
      return;
    }
    setFormError("");
    onSubmit({ accountType, name, items });
  };

  return (
    <div className="card">
      <div className="card-title">{initial ? "포트폴리오 수정" : "포트폴리오 추가"}</div>

      <div className="mb-8">
        <label className="form-label">계좌 유형</label>
        <select
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
        <label className="form-label">포트폴리오 이름</label>
        <input
          className="input"
          placeholder="예: 은퇴 안전형 포트폴리오"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="mb-8">
        <label className="form-label">구성 종목</label>
        <ItemEditor items={items} onChange={setItems} />
      </div>

      {formError && <div className="form-error mb-8">{formError}</div>}

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="card-title" style={{ marginBottom: 4 }}>
            {portfolio.name}
            <span className="badge badge-success" style={{ marginLeft: 8, verticalAlign: "middle" }}>
              {portfolio.accountType}
            </span>
          </div>
          <div className="card-subtitle">종목 수: {portfolio.items.length}개 · 비중 합계: {totalAllocation}%</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-back" style={{ padding: "4px 12px" }} onClick={onEdit}>수정</button>
          <button className="btn-back" style={{ padding: "4px 12px", color: "#e74c3c" }} onClick={onDelete}>삭제</button>
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
