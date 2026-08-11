import * as amplitude from "@amplitude/analytics-browser";
import type { AnalyticsEventName, EventProps } from "./types";
import {
  createEventId,
  getOrCreateDiagnosisId,
  getOrCreateSessionId,
  getStoredUtm,
} from "./session";
import { mirrorToGa4, initGa4 } from "./ga4";

let initialized = false;

function appVersion(): string {
  return import.meta.env.VITE_APP_VERSION ?? "1.0.0";
}

function environment(): string {
  return import.meta.env.PROD ? "production" : "development";
}

function commonProps(): EventProps {
  const utm = getStoredUtm();
  return {
    event_id: createEventId(),
    diagnosis_id: getOrCreateDiagnosisId(),
    session_id: getOrCreateSessionId(),
    environment: environment(),
    app_version: appVersion(),
    path: typeof window !== "undefined" ? window.location.pathname : null,
    utm_source: utm.utm_source,
    utm_medium: utm.utm_medium,
    utm_campaign: utm.utm_campaign,
    utm_content: utm.utm_content,
  };
}

/** Amplitude·GA4를 초기화한다. API Key 없으면 no-op. */
export function initAnalytics(): void {
  if (initialized) return;
  initialized = true;

  const apiKey = import.meta.env.VITE_AMPLITUDE_API_KEY;
  if (apiKey) {
    amplitude.init(apiKey, undefined, {
      defaultTracking: false,
      autocapture: false,
      // 전환 이벤트는 flush()로 즉시 전송
      flushIntervalMillis: 1000,
      flushQueueSize: 5,
    });
  }

  const gaId = import.meta.env.VITE_GA4_MEASUREMENT_ID;
  // 동적 import 없이 즉시 초기화 — 첫 page_view 유실 방지
  if (gaId) {
    initGa4(gaId);
  }
}

export function track(event: AnalyticsEventName, props: EventProps = {}): void {
  const payload = { ...commonProps(), ...props };
  // null 속성 제거
  const cleaned: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v === null || v === undefined) continue;
    cleaned[k] = v;
  }

  if (import.meta.env.VITE_AMPLITUDE_API_KEY) {
    amplitude.track(event, cleaned);
  } else if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", event, cleaned);
  }

  mirrorToGa4(event, cleaned);
}

export function identifyUser(userId: string | null): void {
  if (!import.meta.env.VITE_AMPLITUDE_API_KEY) return;
  if (userId) {
    amplitude.setUserId(userId);
  } else {
    amplitude.setUserId(undefined);
  }
}

export function setUserProperties(props: Record<string, string | null>): void {
  if (!import.meta.env.VITE_AMPLITUDE_API_KEY) return;
  const identify = new amplitude.Identify();
  for (const [key, value] of Object.entries(props)) {
    if (value == null) continue;
    identify.set(key, value);
  }
  amplitude.identify(identify);
}

/** 전환 이벤트 직후 네비게이션 전 전송 보장 */
export async function flushAnalytics(): Promise<void> {
  if (!import.meta.env.VITE_AMPLITUDE_API_KEY) return;
  try {
    await amplitude.flush().promise;
  } catch {
    // 전송 실패해도 UX는 막지 않음
  }
}
