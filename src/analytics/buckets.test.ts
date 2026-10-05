import { describe, expect, it } from "vitest";
import { toAssetBucket, toExpenseBucket, toWanBucket } from "./buckets";

describe("toWanBucket", () => {
  it("maps wan ranges", () => {
    expect(toWanBucket(0)).toBe("0");
    expect(toWanBucket(30)).toBe("1-49");
    expect(toWanBucket(50)).toBe("50-99");
    expect(toWanBucket(150)).toBe("100-199");
    expect(toWanBucket(300)).toBe("200-499");
    expect(toWanBucket(800)).toBe("500+");
  });
});

describe("toExpenseBucket", () => {
  it("converts won to wan buckets", () => {
    expect(toExpenseBucket(1_200_000)).toBe("100-199");
  });
});

describe("toAssetBucket", () => {
  it("총자산을 억원 구간으로만 변환한다", () => {
    expect(toAssetBucket(0)).toBe("0");
    expect(toAssetBucket(50_000_000)).toBe("<1억");
    expect(toAssetBucket(250_000_000)).toBe("1-3억");
    expect(toAssetBucket(400_000_000)).toBe("3-5억");
    expect(toAssetBucket(600_000_000)).toBe("5-10억");
    expect(toAssetBucket(1_500_000_000)).toBe("10억+");
    expect(toAssetBucket(-1)).toBe("unknown");
    expect(toAssetBucket(Number.NaN)).toBe("unknown");
  });
});
