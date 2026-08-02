import { describe, it, expect, beforeEach, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import authReducer, { signIn, signOut, setAuthStatus } from "./auth-slice";

const STORAGE_KEY = "retirement_token";
const TEST_USER = { id: 1, email: "test@example.com", name: "테스트" };

function freshStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("auth 쿠키 전용 세션", () => {
  it("초기 authStatus는 쿠키 세션 확인을 위해 checking", () => {
    const store = freshStore();
    expect(store.getState().auth.authStatus).toBe("checking");
    expect(store.getState().auth.user).toBeNull();
  });

  it("모듈 로드 시 잔여 localStorage 토큰을 제거한다", async () => {
    localStorage.setItem(STORAGE_KEY, "legacy-token");
    vi.resetModules();
    await import("./auth-slice");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("signIn은 user만 저장하고 authStatus를 authenticated로 설정한다", () => {
    const store = freshStore();
    store.dispatch(signIn({ user: TEST_USER }));
    expect(store.getState().auth.user).toEqual(TEST_USER);
    expect(store.getState().auth.authStatus).toBe("authenticated");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("signOut은 user를 null로 설정하고 authStatus를 unauthenticated로 설정한다", () => {
    const store = freshStore();
    store.dispatch(signIn({ user: TEST_USER }));
    store.dispatch(signOut());
    expect(store.getState().auth.user).toBeNull();
    expect(store.getState().auth.authStatus).toBe("unauthenticated");
  });

  it("새로고침 시뮬레이션: authStatus는 항상 checking으로 시작한다", async () => {
    const store = freshStore();
    store.dispatch(signIn({ user: TEST_USER }));

    vi.resetModules();
    const { default: freshReducer } = await import("./auth-slice");
    const { configureStore: freshConfigure } = await import("@reduxjs/toolkit");
    const reloadedStore = freshConfigure({ reducer: { auth: freshReducer } });

    expect(reloadedStore.getState().auth.authStatus).toBe("checking");
    expect(reloadedStore.getState().auth.user).toBeNull();
  });
});

describe("setAuthStatus — checkAuth 결과 반영", () => {
  it("setAuthStatus authenticated는 user를 설정하고 authStatus를 authenticated로 바꾼다", () => {
    const store = freshStore();
    store.dispatch(setAuthStatus({ status: "authenticated", user: TEST_USER }));
    expect(store.getState().auth.authStatus).toBe("authenticated");
    expect(store.getState().auth.user).toEqual(TEST_USER);
  });

  it("setAuthStatus unauthenticated는 user를 지우고 authStatus를 unauthenticated로 바꾼다", () => {
    const store = freshStore();
    store.dispatch(signIn({ user: TEST_USER }));
    store.dispatch(setAuthStatus({ status: "unauthenticated" }));
    expect(store.getState().auth.authStatus).toBe("unauthenticated");
    expect(store.getState().auth.user).toBeNull();
  });
});
