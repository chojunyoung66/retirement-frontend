type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
  }
}

let gaReady = false;
let measurementId: string | null = null;
const pending: Array<{
  event: string;
  props: Record<string, string | number | boolean>;
}> = [];

const GA_DEBUG_SESSION_KEY = "rc_ga_debug";

/** DEV 또는 ?debug_mode=1 / ?ga_debug=1 — DebugView 전용 (일반 보고와 별개) */
function isDebugMode(): boolean {
  if (import.meta.env.DEV === true) return true;
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (
      params.get("debug_mode") === "1" ||
      params.get("ga_debug") === "1"
    ) {
      sessionStorage.setItem(GA_DEBUG_SESSION_KEY, "1");
      return true;
    }
    return sessionStorage.getItem(GA_DEBUG_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/** GA4 gtag 스크립트를 동기적으로 준비한다. */
export function initGa4(id: string): void {
  if (typeof document === "undefined" || gaReady) return;
  gaReady = true;
  measurementId = id;

  window.dataLayer = window.dataLayer ?? [];
  // 공식 스니펫과 동일: arguments 객체로 push (배열 push 시 gtag가 이벤트 무시)
  // rest parameter를 쓰면 arguments 동작이 어긋날 수 있어 사용하지 않음
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", id, {
    send_page_view: false,
    ...(isDebugMode() ? { debug_mode: true } : {}),
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);

  // init 전에 쌓인 이벤트 flush
  for (const item of pending.splice(0)) {
    send(item.event, item.props);
  }
}

function send(
  event: string,
  props: Record<string, string | number | boolean>,
): void {
  if (!window.gtag || !measurementId) return;

  // DebugView는 이벤트 파라미터의 debug_mode=true가 가장 확실
  const debugProps = isDebugMode() ? { debug_mode: true as const } : {};

  // GA4 권장 page_view 필드 매핑 (트래픽·페이지 보고서에 잡히게)
  if (event === "page_view") {
    const path = String(props.path ?? window.location.pathname);
    window.gtag("event", "page_view", {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
      ...props,
      ...debugProps,
    });
    return;
  }

  window.gtag("event", event, { ...props, ...debugProps });
}

/** Amplitude와 동일 이벤트명을 GA4로 미러링한다. */
export function mirrorToGa4(
  event: string,
  props: Record<string, string | number | boolean>,
): void {
  if (!import.meta.env.VITE_GA4_MEASUREMENT_ID) return;
  if (typeof window === "undefined") return;

  // gtag 준비 전이면 큐에 보관
  if (!gaReady || !window.gtag) {
    pending.push({ event, props });
    return;
  }

  send(event, props);
}
