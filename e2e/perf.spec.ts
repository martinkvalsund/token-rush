import { expect, test } from '@playwright/test';

/** Budget check: draw calls and triangles per frame while the bot plays through zones. */
test('stays within the draw call and triangle budget', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?seed=5&bot=1');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () =>
      (window as unknown as { __game: { machine: { state: string } } }).__game.machine.state ===
      'Playing',
    undefined,
    { timeout: 20_000 },
  );
  const samples: { calls: number; tris: number; zone: number }[] = [];
  for (let z = 0; z < 5; z++) {
    await page.waitForTimeout(2500);
    samples.push(
      await page.evaluate(() => {
        const g = (
          window as unknown as {
            __game: {
              renderer: { info: { render: { calls: number; triangles: number } } };
              sim: { zone: number };
              skipToNextZone: () => void;
            };
          }
        ).__game;
        const r = {
          calls: g.renderer.info.render.calls,
          tris: g.renderer.info.render.triangles,
          zone: g.sim.zone,
        };
        g.skipToNextZone();
        return r;
      }),
    );
  }
  console.log(JSON.stringify(samples));
  for (const s of samples) {
    expect(s.calls).toBeLessThan(150);
    expect(s.tris).toBeLessThan(300_000);
  }
});
