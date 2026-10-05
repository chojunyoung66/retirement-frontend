/** 만원 단위 금액을 분석용 구간으로 변환한다. */
export function toWanBucket(wan: number): string {
  if (!Number.isFinite(wan) || wan < 0) return "unknown";
  if (wan === 0) return "0";
  if (wan < 50) return "1-49";
  if (wan < 100) return "50-99";
  if (wan < 200) return "100-199";
  if (wan < 500) return "200-499";
  return "500+";
}

/** 원 단위 총자산을 억원 구간으로 변환한다. 원문 금액은 보내지 않는다. */
export function toAssetBucket(won: number): string {
  if (!Number.isFinite(won) || won < 0) return "unknown";
  if (won === 0) return "0";
  const eok = won / 100_000_000;
  if (eok < 1) return "<1억";
  if (eok < 3) return "1-3억";
  if (eok < 5) return "3-5억";
  if (eok < 10) return "5-10억";
  return "10억+";
}

/** 원 단위 금액을 만원 버킷으로 변환한다. */
export function toExpenseBucket(won: number): string {
  return toWanBucket(Math.round(won / 10000));
}
