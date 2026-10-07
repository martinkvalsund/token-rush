import { expect, test } from '@playwright/test';

// The Vite dev server has no Worker, so the leaderboard API is mocked here. The Worker itself
// is unit-tested in tests/leaderboard.test.ts.
test('game over → enter a name → post the run → see it on the leaderboard', async ({ page }) => {
  test.setTimeout(150_000);
  const posted: Record<string, unknown>[] = [];
  await page.route('**/api/score', async (route) => {
    posted.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({ json: { rank: 3, improved: true, best: posted.at(-1)?.score } });
  });
  await page.route('**/api/leaderboard*', async (route) => {
    const me = posted.at(-1);
    await route.fulfill({
      json: {
        entries: [
          {
            rank: 1,
            name: 'Ada',
            score: 90000,
            distance: 30000,
            hat: 'hat_crown',
            outfit: 'outfit_gold',
          },
          {
            rank: 2,
            name: 'Linus',
            score: 50000,
            distance: 20000,
            hat: 'hat_viking',
            outfit: 'outfit_night',
          },
          {
            rank: 3,
            name: String(me?.name ?? '?'),
            score: Number(me?.score ?? 0),
            distance: Number(me?.distance ?? 0),
            hat: 'hat_hardhat',
            outfit: 'outfit_classic',
            you: true,
          },
        ],
        me: null,
        total: 3,
      },
    });
  });

  await page.goto('/?seed=3');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await page.keyboard.press('Enter');
  // Standing still in the middle lane ends the run quickly.
  await page.getByRole('button', { name: 'Play again' }).waitFor({ timeout: 120_000 });

  const input = page.getByRole('textbox', { name: 'Your name' });
  await expect(input).toBeVisible();
  await input.fill('a');
  await page.getByRole('button', { name: 'Post score' }).click();
  await expect(page.locator('.name-msg')).toContainText('letters or numbers');
  // Typing must not restart the run (Space and Enter are game keys).
  await input.fill('Test Runner');
  await input.press('Enter');
  await expect(page.locator('.run-board')).toContainText('#3 worldwide');
  expect(posted).toHaveLength(1);
  expect(posted[0]).toMatchObject({
    name: 'Test Runner',
    hat: 'hat_hardhat',
    outfit: 'outfit_classic',
  });
  expect(Number(posted[0]?.score)).toBeGreaterThan(0);
  expect(String(posted[0]?.id)).toMatch(/^[a-z0-9-]{16,}$/);

  await page.getByRole('button', { name: 'View leaderboard' }).click();
  await expect(page.locator('.lb-row')).toHaveCount(3);
  await expect(page.locator('.lb-row.you')).toContainText('Test Runner');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'screenshots/leaderboard.png' });

  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('tokenrush:v1') ?? '{}'));
  expect(save.playerName).toBe('Test Runner');
  expect(save.postedBest).toBe(posted[0]?.score);
});
