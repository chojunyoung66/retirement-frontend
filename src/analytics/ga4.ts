type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
  }
}

let gaReady = false;

/** GA4 gtag 스크립트를 로드한다. */
export function initGa4(measurementId: string): void {
  if (typeof document === "undefined" || gaReady) return;
  gaReady = true;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { send_page_view: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
}

/** Amplitude와 동일 이벤트명을 GA4로 미러링한다. */
export function mirrorToGa4(
  event: string,
  props: Record<string, string | number | boolean>,
): void {
  if (!import.meta.env.VITE_GA4_MEASUREMENT_ID) return;
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", event, props);
}
