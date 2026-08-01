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

describe("auth 새로고침 후 인증 유지", () => {
  it("localStorage에 토큰이 없으면 초기 token은 null", () => {
    const store = freshStore();
    expect(store.getState().auth.token).toBeNull();
  });

  it("초기 authStatus는 쿠키 세션 확인을 위해 checking", () => {
    const store = freshStore();
    expect(store.getState().auth.authStatus).toBe("checking");
  });

  it("signIn은 Redux state에 토큰과 user를 저장하고 authStatus를 authenticated로 설정한다", () => {
    const store = freshStore();
    store.dispatch(signIn({ token: "abc-123", user: TEST_USER }));
    expect(store.getState().auth.token).toBe("abc-123");
    expect(store.getState().auth.user).toEqual(TEST_USER);
    expect(store.getState().auth.authStatus).toBe("authenticated");
  });

  it("signIn은 localStorage에도 토큰을 저장한다", () => {
    const store = freshStore();
    store.dispatch(signIn({ token: "abc-123", user: TEST_USER }));
    expect(localStorage.getItem(STORAGE_KEY)).toBe("abc-123");
  });

  it("signOut은 token/user를 null로 설정하고 authStatus를 unauthenticated로 설정한다", () => {
    const store = freshStore();
    store.dispatch(signIn({ token: "abc-123", user: TEST_USER }));
    store.dispatch(signOut());
    expect(store.getState().auth.token).toBeNull();
    expect(store.getState().auth.user).toBeNull();
    expect(store.getState().auth.authStatus).toBe("unauthenticated");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("새로고침 시뮬레이션: localStorage 토큰이 있으면 store 재생성 후에도 유지된다", async () => {
    const store = freshStore();
    store.dispatch(signIn({ token: "persisted-token", user: TEST_USER }));

    vi.resetModules();
    const { default: freshReducer } = await import("./auth-slice");
    const { configureStore: freshConfigure } = await import("@reduxjs/toolkit");
    const reloadedStore = freshConfigure({ reducer: { auth: freshReducer } });

    expect(reloadedStore.getState().auth.token).toBe("persisted-token");
  });

  it("새로고침 시뮬레이션: authStatus는 항상 checking으로 시작한다", async () => {
    const store = freshStore();
    store.dispatch(signIn({ token: "persisted-token", user: TEST_USER }));

    vi.resetModules();
    const { default: freshReducer } = await import("./auth-slice");
    const { configureStore: freshConfigure } = await import("@reduxjs/toolkit");
    const reloadedStore = freshConfigure({ reducer: { auth: freshReducer } });

    expect(reloadedStore.getState().auth.authStatus).toBe("checking");
  });

  it("localStorage.getItem이 오류를 던져도 초기 token은 null (try-catch 방어)", async () => {
    const original = localStorage.getItem;
    (localStorage as Record<string, unknown>).getItem = () => {
      throw new Error("StorageAccessError");
    };

    vi.resetModules();
    const { default: freshReducer } = await import("./auth-slice");
    const { configureStore: freshConfigure } = await import("@reduxjs/toolkit");
    const store = freshConfigure({ reducer: { auth: freshReducer } });

    expect(store.getState().auth.token).toBeNull();

    (localStorage as Record<string, unknown>).getItem = original;
  });
});

describe("setAuthStatus — checkAuth 결과 반영", () => {
  it("setAuthStatus authenticated는 user를 설정하고 authStatus를 authenticated로 바꾼다", () => {
    const store = freshStore();
    localStorage.setItem(STORAGE_KEY, "some-token");
    store.dispatch(setAuthStatus({ status: "authenticated", user: TEST_USER }));
    expect(store.getState().auth.authStatus).toBe("authenticated");
    expect(store.getState().auth.user).toEqual(TEST_USER);
  });

  it("setAuthStatus unauthenticated는 token/user를 지우고 authStatus를 unauthenticated로 바꾼다", () => {
    const store = freshStore();
    store.dispatch(signIn({ token: "abc-123", user: TEST_USER }));
    store.dispatch(setAuthStatus({ status: "unauthenticated" }));
    expect(store.getState().auth.authStatus).toBe("unauthenticated");
    expect(store.getState().auth.token).toBeNull();
    expect(store.getState().auth.user).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
