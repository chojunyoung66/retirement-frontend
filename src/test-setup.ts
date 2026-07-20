/**
 * Node 26의 experimental localStorage는 --localstorage-file 없이는 undefined를 반환합니다.
 * 테스트 전용 인메모리 구현으로 globalThis.localStorage를 덮어씁니다.
 */
const _store = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string): string | null => _store.get(key) ?? null,
  setItem: (key: string, value: string): void => { _store.set(key, String(value)); },
  removeItem: (key: string): void => { _store.delete(key); },
  clear: (): void => { _store.clear(); },
  get length() { return _store.size; },
  key: (index: number): string | null => [..._store.keys()][index] ?? null,
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});
