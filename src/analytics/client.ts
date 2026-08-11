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

/** Amplitude HTTP API: user_id/device_id 최소 5자 */
const AMPLITUDE_MIN_ID_LEN = 5;

/** DB 숫자 id → Amplitude 허용 길이의 user_id */
export function toAmplitudeUserId(rawId: string | number): string {
  return `user_${rawId}`;
}

function isUsableAmplitudeId(id: string | undefined | null): id is string {
  return typeof id === "string" && id.length >= AMPLITUDE_MIN_ID_LEN;
}

export function identifyUser(userId: string | null): void {
  if (!import.meta.env.VITE_AMPLITUDE_API_KEY) return;
  if (userId) {
    // "1", "12" 등 짧은 id는 400 Invalid id length 유발
    amplitude.setUserId(toAmplitudeUserId(userId));
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

/**
 * SDK 큐를 우회해 Amplitude HTTP API로 즉시 전송한다.
 * 저장 전환처럼 navigate 직전 유실이 치명적일 때 사용.
 */
export async function trackViaHttp(
  event: AnalyticsEventName,
  props: EventProps = {},
): Promise<boolean> {
  const apiKey = import.meta.env.VITE_AMPLITUDE_API_KEY;
  if (!apiKey || typeof fetch === "undefined") return false;

  const payload = { ...commonProps(), ...props };
  const cleaned: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v === null || v === undefined) continue;
    cleaned[k] = v;
  }

  const rawUserId = amplitude.getUserId();
  const rawDeviceId = amplitude.getDeviceId();
  // 짧은 id는 omit — device_id는 UUID fallback
  const userId = isUsableAmplitudeId(rawUserId)
    ? rawUserId
    : rawUserId
      ? toAmplitudeUserId(rawUserId)
      : undefined;
  const deviceId = isUsableAmplitudeId(rawDeviceId)
    ? rawDeviceId
    : getOrCreateSessionId();
  const insertId = String(cleaned.event_id ?? createEventId());

  const body = JSON.stringify({
    api_key: apiKey,
    events: [
      {
        ...(userId ? { user_id: userId } : {}),
        device_id: deviceId,
        event_type: event,
        time: Date.now(),
        insert_id: insertId,
        event_properties: cleaned,
        session_id: amplitude.getSessionId() ?? undefined,
      },
    ],
  });

  try {
    const res = await fetch("https://api2.amplitude.com/2/httpapi", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*",
      },
      body,
      keepalive: true,
      signal: AbortSignal.timeout(2000),
    });
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[analytics] http", event, res.status);
    }
    return res.ok;
  } catch {
    return false;
  }
}
