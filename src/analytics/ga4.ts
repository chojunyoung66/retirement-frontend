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

/** GA4 gtag 스크립트를 동기적으로 준비한다. */
export function initGa4(id: string): void {
  if (typeof document === "undefined" || gaReady) return;
  gaReady = true;
  measurementId = id;

  window.dataLayer = window.dataLayer ?? [];
  // 공식 스니펫과 동일: 스크립트 로드 전에도 dataLayer에 적재
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", id, {
    send_page_view: false,
    debug_mode: import.meta.env.DEV,
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

  // GA4 권장 page_view 필드 매핑 (트래픽·페이지 보고서에 잡히게)
  if (event === "page_view") {
    const path = String(props.path ?? window.location.pathname);
    window.gtag("event", "page_view", {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
      ...props,
    });
    return;
  }

  window.gtag("event", event, props);
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
