import { useSyncExternalStore } from 'react';
import { resolveReportDeviceMode, type ReportDeviceMode } from '../utils/report-view';

const HOVER_FINE_QUERY = '(hover: hover) and (pointer: fine)';

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(HOVER_FINE_QUERY);
  media.addEventListener('change', onChange);
  window.addEventListener('resize', onChange);
  return () => {
    media.removeEventListener('change', onChange);
    window.removeEventListener('resize', onChange);
  };
}

function getSnapshot(): ReportDeviceMode {
  return resolveReportDeviceMode({
    hoverFine: window.matchMedia(HOVER_FINE_QUERY).matches,
    width: window.innerWidth,
  });
}

/** 리포트 화면의 PC(인쇄)·모바일(공유) 모드 */
export function useReportDeviceMode(): ReportDeviceMode {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'mobile');
}
