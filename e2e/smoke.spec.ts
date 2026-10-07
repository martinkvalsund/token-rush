import { expect, test } from '@playwright/test';

test('game loads, runs and renders without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?debug=1&seed=1');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'screenshots/smoke.png' });
  expect(errors).toEqual([]);
  const nonBlank = await page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>('#game');
    return !!c && c.width > 0;
  });
  expect(nonBlank).toBe(true);
});
