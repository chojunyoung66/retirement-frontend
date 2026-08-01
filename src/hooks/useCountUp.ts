import { useEffect, useState } from 'react';

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));

  useEffect(() => {
    // 모션 최소화 설정에서는 애니메이션 없이 최종값만 표시
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }

    let frame = 0;
    let start: number | null = null;

    // 시작 시각은 첫 프레임 타임스탬프로 잡아야 진행률이 음수로 튀지 않음
    const tick = (now: number) => {
      start ??= now;
      const progress = Math.min(Math.max((now - start) / durationMs, 0), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}
