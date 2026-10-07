import { test, type Page } from '@playwright/test';

// README media. Run with: npm run media  (skipped in normal e2e runs)
const enabled = !!(globalThis as { process?: { env: Record<string, string | undefined> } }).process
  ?.env.MEDIA;

type G = {
  skipToNextZone: () => void;
  sim: { activate: (t: string) => void; god: boolean };
};

async function jpg(page: Page, name: string) {
  await page.screenshot({ path: `docs/media/${name}.jpg`, type: 'jpeg', quality: 78 });
}

test.skip(!enabled, 'media capture only with MEDIA=1');

test('capture README screenshots and GIF frames', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/?seed=21&bot=1');
  await page.getByRole('button', { name: 'Play', exact: true }).waitFor();
  await page.waitForTimeout(1500);
  await jpg(page, 'menu');
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () =>
      (window as unknown as { __game: { machine: { state: string } } }).__game.machine.state ===
      'Playing',
    undefined,
    { timeout: 20_000 },
  );
  await page.evaluate(() => {
    (window as unknown as { __game: G }).__game.sim.god = true;
  });
  // GIF frames from the road works zone.
  await page.setViewportSize({ width: 640, height: 360 });
  await page.waitForTimeout(2500);
  for (let i = 0; i < 40; i++) {
    await page.screenshot({ path: `docs/media/frames/f${String(i).padStart(3, '0')}.png` });
    await page.waitForTimeout(90);
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(1500);
  await jpg(page, 'road-works');
  const zones = ['tunnel', 'building-site', 'drill-site', 'bridge-night'];
  for (const z of zones) {
    await page.evaluate(() => (window as unknown as { __game: G }).__game.skipToNextZone());
    await page.waitForTimeout(3500);
    await jpg(page, z);
  }
  await page.evaluate(() => {
    const sim = (window as unknown as { __game: G }).__game.sim;
    sim.activate('jetpack');
    sim.activate('magnet');
    sim.activate('double');
  });
  await page.waitForTimeout(2200);
  await jpg(page, 'powerups');
});
