/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import {
  PENDING_SAVE_KEY,
  PENDING_SAVE_TTL_MS,
  clearPendingSave,
  hasPendingSave,
  markPendingSave,
  pendingSaveNext,
} from "./pending-save";

describe("pending-save", () => {
  afterEach(() => sessionStorage.clear());

  it("표시 직후에는 유효", () => {
    markPendingSave("/summary", 1_000);
    expect(hasPendingSave(1_000 + 60_000)).toBe(true);
  });

  it("TTL 경과 시 무효이며 키를 지운다", () => {
    markPendingSave("/account-assets", 1_000);
    expect(hasPendingSave(1_000 + PENDING_SAVE_TTL_MS)).toBe(false);
    expect(sessionStorage.getItem(PENDING_SAVE_KEY)).toBeNull();
    expect(pendingSaveNext()).toBe("/summary");
  });

  it("구버전 '1' 플래그는 만료로 처리", () => {
    sessionStorage.setItem(PENDING_SAVE_KEY, "1");
    expect(hasPendingSave(Date.now())).toBe(false);
    expect(sessionStorage.getItem(PENDING_SAVE_KEY)).toBeNull();
  });

  it("이전 형식(시각 숫자)도 유효 판정하고 요약 화면으로 보낸다", () => {
    sessionStorage.setItem(PENDING_SAVE_KEY, "1000");
    expect(hasPendingSave(1_000 + 60_000)).toBe(true);
    expect(pendingSaveNext()).toBe("/summary");
  });

  it("clearPendingSave 후 무효", () => {
    markPendingSave();
    clearPendingSave();
    expect(hasPendingSave()).toBe(false);
  });

  it("저장 후 이동 경로를 기억한다", () => {
    markPendingSave("/account-assets");
    expect(hasPendingSave()).toBe(true);
    expect(pendingSaveNext()).toBe("/account-assets");
  });

  it("기본 이동 경로는 요약 화면", () => {
    markPendingSave();
    expect(pendingSaveNext()).toBe("/summary");
  });

  it("허용 목록 밖 경로나 깨진 값은 요약 화면", () => {
    sessionStorage.setItem(PENDING_SAVE_KEY, JSON.stringify({ at: Date.now(), next: "https://evil.example" }));
    expect(pendingSaveNext()).toBe("/summary");
    sessionStorage.setItem(PENDING_SAVE_KEY, "{broken");
    expect(pendingSaveNext()).toBe("/summary");
    expect(hasPendingSave()).toBe(false);
  });

  it("플래그가 없으면 요약 화면", () => {
    expect(pendingSaveNext()).toBe("/summary");
  });
});
