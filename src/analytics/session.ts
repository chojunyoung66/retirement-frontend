import type { StepName } from "./types";

const KEYS = {
  diagnosisId: "rc_diagnosis_id",
  sessionId: "rc_session_id",
  completedSteps: "rc_completed_steps",
  diagnosisDone: "rc_diagnosis_completed",
  utm: "rc_utm",
} as const;

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // private mode 등
  }
}

export function getOrCreateSessionId(): string {
  const existing = read(KEYS.sessionId);
  if (existing) return existing;
  const id = newId();
  write(KEYS.sessionId, id);
  return id;
}

export function getOrCreateDiagnosisId(): string {
  const existing = read(KEYS.diagnosisId);
  if (existing) return existing;
  const id = newId();
  write(KEYS.diagnosisId, id);
  return id;
}

/** 새 진단 시작 시 diagnosis_id를 교체한다. */
export function resetDiagnosisId(): string {
  const id = newId();
  write(KEYS.diagnosisId, id);
  try {
    sessionStorage.removeItem(KEYS.completedSteps);
    sessionStorage.removeItem(KEYS.diagnosisDone);
  } catch {
    // ignore
  }
  return id;
}

export function createEventId(): string {
  return newId();
}

export function markStepCompleted(step: StepName): void {
  const diagnosisId = getOrCreateDiagnosisId();
  const raw = read(KEYS.completedSteps);
  const map: Record<string, string[]> = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
  const list = map[diagnosisId] ?? [];
  if (!list.includes(step)) list.push(step);
  map[diagnosisId] = list;
  write(KEYS.completedSteps, JSON.stringify(map));
}

export function wasStepCompleted(step: StepName): boolean {
  const diagnosisId = read(KEYS.diagnosisId);
  if (!diagnosisId) return false;
  const raw = read(KEYS.completedSteps);
  if (!raw) return false;
  try {
    const map = JSON.parse(raw) as Record<string, string[]>;
    return (map[diagnosisId] ?? []).includes(step);
  } catch {
    return false;
  }
}

export function markDiagnosisCompleted(): void {
  write(KEYS.diagnosisDone, getOrCreateDiagnosisId());
}

export function wasDiagnosisCompleted(): boolean {
  const done = read(KEYS.diagnosisDone);
  const current = read(KEYS.diagnosisId);
  return Boolean(done && current && done === current);
}

export type UtmBag = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
};

export function captureUtmFromLocation(search: string = window.location.search): UtmBag {
  const params = new URLSearchParams(search);
  const next: UtmBag = {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_content: params.get("utm_content"),
  };
  // URL에 UTM이 있으면 세션에 보존
  if (next.utm_source || next.utm_medium || next.utm_campaign || next.utm_content) {
    write(KEYS.utm, JSON.stringify(next));
    return next;
  }
  return getStoredUtm();
}

export function getStoredUtm(): UtmBag {
  const raw = read(KEYS.utm);
  if (!raw) {
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
    };
  }
  try {
    return JSON.parse(raw) as UtmBag;
  } catch {
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
    };
  }
}
