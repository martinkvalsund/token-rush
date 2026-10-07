import { test, type Page } from '@playwright/test';

type G = {
  skipToNextZone: () => void;
  machine: { state: string; go: (s: string) => boolean };
  sim: {
    god: boolean;
    distance: number;
    activate: (t: string) => void;
    generator: { addObstacle: (id: string, lane: number, at: number, zone: number) => void };
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
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.waitForTimeout(300);
  await shot(page, 'settings');
  await page.getByRole('button', { name: 'Back', exact: true }).first().click();
  await page.getByRole('button', { name: 'How to play' }).click();
  await page.waitForTimeout(300);
  await shot(page, 'help');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
  await shot(page, 'countdown');
  await page.evaluate(() => {
    (window as unknown as { __game: G }).__game.sim.god = true;
  });
  await page.waitForTimeout(4000);
  await shot(page, 'playing');
  await page.evaluate(() => {
    const sim = (window as unknown as { __game: G }).__game.sim;
    for (const t of ['magnet', 'double', 'shield', 'boots']) sim.activate(t);
  });
  await page.waitForTimeout(1500);
  await shot(page, 'powerups');
  await page.evaluate(() => (window as unknown as { __game: G }).__game.sim.activate('jetpack'));
  await page.waitForTimeout(2000);
  await shot(page, 'jetpack');
  await page.evaluate(() => {
    const sim = (window as unknown as { __game: G }).__game.sim;
    sim.generator.addObstacle('oncoming_truck', 0, sim.distance + 70, 0);
    sim.generator.addObstacle('ramp', 1, sim.distance + 40, 0);
    for (const k of [44, 48, 52, 56])
      sim.generator.addObstacle('container_platform', 1, sim.distance + k, 0);
  });
  await page.waitForTimeout(1300);
  await shot(page, 'oncoming');
  await page.waitForTimeout(900);
  await shot(page, 'rooftop');
  for (let z = 1; z <= 4; z++) {
    await page.evaluate(() => (window as unknown as { __game: G }).__game.skipToNextZone());
    await page.waitForTimeout(3500);
    await shot(page, `zone-${z}`);
  }
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
