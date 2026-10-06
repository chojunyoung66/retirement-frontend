import { useEffect, useId, type ReactNode } from 'react';

interface SheetProps {
  title: string;
  children: ReactNode;
  actions: ReactNode;
  /** 없으면 바깥 클릭·Esc로 닫히지 않는다 (처리 중인 작업이 있을 때) */
  onClose?: () => void;
}

/** 화면 아래(모바일)·가운데(PC)에 뜨는 확인 시트 — report-sheet 스타일을 쓴다 */
export default function Sheet({ title, children, actions, onClose }: SheetProps) {
  const titleId = useId();

  useEffect(() => {
    if (!onClose) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="report-sheet-backdrop no-print" role="presentation" onClick={onClose}>
      <div
        className="report-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-title" id={titleId}>
          {title}
        </div>
        {children}
        <div className="report-sheet-actions">{actions}</div>
      </div>
    </div>
  );
}
