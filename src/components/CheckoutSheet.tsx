import { useState } from 'react';
import { Link } from 'react-router-dom';
import Sheet from './Sheet';
import { formatWon } from '../utils/format';

interface CheckoutSheetProps {
  price: number;
  isStarting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

/** 결제 전 환불 규정 동의 — 동의해야 결제창을 열 수 있다 */
export default function CheckoutSheet({ price, isStarting, error, onClose, onConfirm }: CheckoutSheetProps) {
  const [agreed, setAgreed] = useState(false);

  return (
    <Sheet
      title={`리포트 1건 · ${formatWon(price)}`}
      onClose={isStarting ? undefined : onClose}
      actions={
        <>
          <button className="btn-back" onClick={onClose} disabled={isStarting}>
            취소
          </button>
          <button className="btn-cta" onClick={onConfirm} disabled={!agreed || isStarting}>
            {isStarting ? '결제창 여는 중...' : `${formatWon(price)} 결제하기`}
          </button>
        </>
      }
    >
      <ul className="form-hint" style={{ paddingLeft: 18 }}>
        <li>지금 실행안을 PDF·엑셀로 받을 수 있는 리포트로 고정해 보관해요.</li>
        <li>카드·간편결제만 가능해요. 결제는 토스페이먼츠가 처리하고, 카드 정보는 저장하지 않아요.</li>
        <li>
          결제 후 7일 안에 리포트를 내려받거나 인쇄하지 않았다면 전액 환불돼요. 서비스 오류로 리포트를 쓸 수 없으면
          기간과 관계없이 환불해 드려요.
        </li>
      </ul>
      <label className="form-hint" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          aria-label="환불 규정 동의"
        />
        <span>
          <Link to="/terms#refund" target="_blank" rel="noopener">
            환불 규정
          </Link>
          을 확인했고 결제에 동의해요.
        </span>
      </label>
      {error && (
        <div className="form-error mt-8" role="alert">
          {error}
        </div>
      )}
    </Sheet>
  );
}
