import { statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('logo asset size regression', () => {
  it('logo.png은 50KB 미만이어야 합니다 (렌더링 크기 36px 기준 최대 4× 해상도)', () => {
    const { size } = statSync(resolve(__dirname, 'logo.png'));
    expect(size).toBeLessThan(50 * 1024);
  });
});
