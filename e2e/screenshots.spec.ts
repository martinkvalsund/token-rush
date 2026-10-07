import { test, type Page } from '@playwright/test';

type G = {
  machine: { state: string; go: (s: string) => boolean };
  sim: {
    god: boolean;
    distance: number;
    step: (dt: number) => void;
    events: { clear: () => void };
  };
};
async function shot(page: Page, name: string) {
  await page.screenshot({ path: `screenshots/${name}.png` });
}

test('capture screenshots', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?seed=11');
  await page.waitForTimeout(800);
  await shot(page, 'menu');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
  await shot(page, 'countdown');
  await page.evaluate(() => {
    (window as unknown as { __game: G }).__game.sim.god = true;
  });
  await page.waitForTimeout(4000);
  await shot(page, 'playing');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await shot(page, 'pause');
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    (window as unknown as { __game: G }).__game.sim.god = false;
  });
  await page.getByRole('button', { name: 'Play again' }).waitFor({ timeout: 60_000 });
  await shot(page, 'gameover');
});
