/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import {
  PENDING_SAVE_KEY,
  PENDING_SAVE_TTL_MS,
  clearPendingSave,
  hasPendingSave,
  markPendingSave,
} from "./pending-save";

describe("pending-save", () => {
  afterEach(() => sessionStorage.clear());

  it("표시 직후에는 유효", () => {
    markPendingSave(1_000);
    expect(hasPendingSave(1_000 + 60_000)).toBe(true);
  });

  it("TTL 경과 시 무효이며 키를 지운다", () => {
    markPendingSave(1_000);
    expect(hasPendingSave(1_000 + PENDING_SAVE_TTL_MS)).toBe(false);
    expect(sessionStorage.getItem(PENDING_SAVE_KEY)).toBeNull();
  });

  it("구버전 '1' 플래그는 만료로 처리", () => {
    sessionStorage.setItem(PENDING_SAVE_KEY, "1");
    expect(hasPendingSave(Date.now())).toBe(false);
    expect(sessionStorage.getItem(PENDING_SAVE_KEY)).toBeNull();
  });

  it("clearPendingSave 후 무효", () => {
    markPendingSave();
    clearPendingSave();
    expect(hasPendingSave()).toBe(false);
  });
});
