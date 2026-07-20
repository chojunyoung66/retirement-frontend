import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { signIn, signOut } from './auth-slice';

const STORAGE_KEY = 'retirement_token';

function freshStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('auth 새로고침 후 인증 유지', () => {
  it('localStorage에 토큰이 없으면 초기 token은 null', () => {
    const store = freshStore();
    expect(store.getState().auth.token).toBeNull();
  });

  it('signIn은 Redux state에 토큰을 저장한다', () => {
    const store = freshStore();
    store.dispatch(signIn('abc-123'));
    expect(store.getState().auth.token).toBe('abc-123');
  });

  it('signIn은 localStorage에도 토큰을 저장한다', () => {
    const store = freshStore();
    store.dispatch(signIn('abc-123'));
    expect(localStorage.getItem(STORAGE_KEY)).toBe('abc-123');
  });

  it('signOut은 token을 null로 설정하고 localStorage에서 제거한다', () => {
    const store = freshStore();
    store.dispatch(signIn('abc-123'));
    store.dispatch(signOut());
    expect(store.getState().auth.token).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('새로고침 시뮬레이션: localStorage 토큰이 있으면 store 재생성 후에도 유지된다', async () => {
    // signIn으로 토큰 저장 (localStorage에 기록됨)
    const store = freshStore();
    store.dispatch(signIn('persisted-token'));

    // 모듈 캐시를 초기화해 새 탭/새로고침 환경 재현
    vi.resetModules();
    const { default: freshReducer } = await import('./auth-slice');
    const { configureStore: freshConfigure } = await import('@reduxjs/toolkit');
    const reloadedStore = freshConfigure({ reducer: { auth: freshReducer } });

    expect(reloadedStore.getState().auth.token).toBe('persisted-token');
  });

  it('localStorage.getItem이 오류를 던져도 초기 token은 null (try-catch 방어)', async () => {
    // mock localStorage의 getItem을 일시적으로 throw하도록 교체
    const original = localStorage.getItem;
    (localStorage as Record<string, unknown>).getItem = () => { throw new Error('StorageAccessError'); };

    vi.resetModules();
    const { default: freshReducer } = await import('./auth-slice');
    const { configureStore: freshConfigure } = await import('@reduxjs/toolkit');
    const store = freshConfigure({ reducer: { auth: freshReducer } });

    expect(store.getState().auth.token).toBeNull();

    (localStorage as Record<string, unknown>).getItem = original;
  });
});
