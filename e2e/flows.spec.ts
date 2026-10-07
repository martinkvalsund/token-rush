import { expect, test, type Page } from '@playwright/test';

const state = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __game: { machine: { state: string } } }).__game.machine.state,
  );

async function waitState(page: Page, s: string) {
  await page.waitForFunction(
    (want) =>
      (window as unknown as { __game: { machine: { state: string } } }).__game.machine.state ===
      want,
    s,
    { timeout: 20_000 },
  );
}

test('settings persist across reloads', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.locator('#set-controls').selectOption('trackpad');
  await page.locator('#set-music-volume').fill('0.2');
  await page.locator('#set-show-fps').check();
  await page.locator('#set-graphics').selectOption('low');
  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.locator('#set-controls')).toHaveValue('trackpad');
  await expect(page.locator('#set-music-volume')).toHaveValue('0.2');
  await expect(page.locator('#set-show-fps')).toBeChecked();
  await expect(page.locator('#set-graphics')).toHaveValue('low');
});

test('pause → settings → back → resume, and resizing mid-run', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?seed=4&bot=1');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await page.keyboard.press('Enter');
  await waitState(page, 'Playing');
  await page.keyboard.press('Escape');
  expect(await state(page)).toBe('Paused');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  expect(await state(page)).toBe('Playing');
  await page.setViewportSize({ width: 900, height: 600 });
  await page.waitForTimeout(800);
  await page.setViewportSize({ width: 1440, height: 810 });
  await page.waitForTimeout(800);
  expect(await state(page)).toBe('Playing');
  expect(errors).toEqual([]);
});

test('the Konami code on the menu unlocks an achievement', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  for (const k of [
    'ArrowUp',
    'ArrowUp',
    'ArrowDown',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'ArrowLeft',
    'ArrowRight',
    'KeyB',
    'KeyA',
  ])
    await page.keyboard.press(k);
  await expect(page.getByText('Achievement unlocked')).toBeVisible();
});

test('trackpad scheme: a one-finger flick changes lane without clicking', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/?seed=4');
  await page.evaluate(() => {
    localStorage.setItem(
      'tokenrush:v1',
      JSON.stringify({ version: 1, settings: { controls: 'trackpad' } }),
    );
  });
  await page.reload();
  await page.getByRole('button', { name: 'Play', exact: true }).waitFor();
  await page.mouse.move(640, 360);
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () =>
      (window as unknown as { __game: { machine: { state: string } } }).__game.machine.state ===
      'Playing',
    undefined,
    { timeout: 20_000 },
  );
  await page.evaluate(() => {
    (window as unknown as { __game: { sim: { god: boolean } } }).__game.sim.god = true;
  });
  await page.waitForTimeout(300);
  await page.mouse.move(900, 360, { steps: 6 }); // quick flick right, no button pressed
  await page.waitForTimeout(400);
  const lane = await page.evaluate(
    () =>
      (window as unknown as { __game: { sim: { player: { lane: number } } } }).__game.sim.player
        .lane,
  );
  expect(lane).toBe(2);
});
