import { describe, expect, it } from "vitest";
import { toExpenseBucket, toWanBucket } from "./buckets";

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
