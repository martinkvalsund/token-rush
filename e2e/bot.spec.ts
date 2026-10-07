import { expect, test } from '@playwright/test';

test('the autoplay bot plays without errors and keeps running', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/?seed=7&bot=1');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await page.keyboard.press('Enter');
  const read = () =>
    page.evaluate(() => {
      const g = (
        window as unknown as { __game: { machine: { state: string }; sim: { distance: number } } }
      ).__game;
      return { state: g.machine.state, distance: g.sim.distance };
    });
  await page.waitForFunction(
    () =>
      (window as unknown as { __game: { machine: { state: string } } }).__game.machine.state ===
      'Playing',
    undefined,
    { timeout: 20_000 },
  );
  await page.waitForTimeout(10_000);
  const s = await read();
  expect(s.state).toBe('Playing');
  expect(s.distance).toBeGreaterThan(30);
  await page.screenshot({ path: 'screenshots/bot.png' });
  expect(errors).toEqual([]);
});
