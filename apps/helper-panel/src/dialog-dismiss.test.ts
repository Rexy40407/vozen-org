import { describe, expect, it } from 'vitest';
import { isOutsideDialog } from './dialog-dismiss';

describe('dialog backdrop geometry', () => {
  const bounds = { left: 20, right: 220, top: 30, bottom: 330 };
  for (const [name, clientX, clientY] of [
    ['left', 19, 100], ['right', 221, 100], ['top', 100, 29], ['bottom', 100, 331],
  ] as const) {
    it(`recognizes a pointer outside the ${name} edge`, () => {
      expect(isOutsideDialog(bounds, { clientX, clientY })).toBe(true);
    });
  }
  for (const [clientX, clientY] of [[100, 100], [20, 100], [220, 100], [100, 30], [100, 330]]) {
    it(`keeps content, padding and border at ${clientX},${clientY} inside`, () => {
      expect(isOutsideDialog(bounds, { clientX, clientY })).toBe(false);
    });
  }
});
