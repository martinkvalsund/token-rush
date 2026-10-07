import { expect, test } from '@playwright/test';

test('menu → countdown → run → game over → retry without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?seed=3');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () =>
      (window as unknown as { __game: { machine: { state: string } } }).__game.machine.state !==
      'Countdown',
    undefined,
    { timeout: 20_000 },
  );
  const state = await page.evaluate(
    () => (window as unknown as { __game: { machine: { state: string } } }).__game.machine.state,
  );
  expect(['Playing', 'Crashing', 'GameOver']).toContain(state);
  await expect(page.getByRole('button', { name: 'Play again' })).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  const after = await page.evaluate(
    () => (window as unknown as { __game: { machine: { state: string } } }).__game.machine.state,
  );
  expect(after).toBe('Countdown');
  expect(errors).toEqual([]);
});
