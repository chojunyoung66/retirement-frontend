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

/** 원 단위 금액을 만원 버킷으로 변환한다. */
export function toExpenseBucket(won: number): string {
  return toWanBucket(Math.round(won / 10000));
}
