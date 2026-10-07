import { expect, test, type Page } from '@playwright/test';

const KEY = 'tokenrush:v1';

async function seedWallet(page: Page, wallet: number) {
  await page.addInitScript(
    ([key, w]) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem(
          key as string,
          JSON.stringify({ version: 1, highScore: 4200, wallet: w }),
        );
        sessionStorage.setItem('seeded', '1');
      }
    },
    [KEY, wallet],
  );
}

const save = (page: Page) =>
  page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, unknown>,
    KEY,
  );

test('shop: browse, try on, buy, equip and daily crate', async ({ page }) => {
  await seedWallet(page, 1000);
  await page.goto('/?seed=5');
  await page.getByRole('button', { name: 'Shop' }).first().click();
  const wallet = page.locator('.wallet b');
  await expect(wallet).toHaveText('1,000');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'screenshots/shop-outfits.png' });

  // Headgear: buy the headlamp (400).
  await page.getByRole('button', { name: 'Headgear' }).click();
  await page.locator('.shop-item[data-id="hat_headlamp"]').click();
  await expect(page.locator('.shop-action')).toContainText('Buy');
  await page.locator('.shop-action').click();
  await expect(wallet).toHaveText('600');
  await expect(page.locator('.shop-action')).toContainText('Equipped');
  let s = await save(page);
  expect(s.owned).toContain('hat_headlamp');
  expect((s.loadout as Record<string, string>).hat).toBe('hat_headlamp');

  // Too expensive: the crown cannot be bought.
  await page.locator('.shop-item[data-id="hat_crown"]').click();
  await expect(page.locator('.shop-action')).toContainText('Need 4,400 more');
  await page.locator('.shop-action').click();
  await expect(wallet).toHaveText('600');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'screenshots/shop-headgear.png' });

  // Daily crate, once.
  await page.locator('.daily').click();
  await expect(wallet).toHaveText('750');
  await expect(page.locator('.daily')).toBeDisabled();

  // Companions and trails.
  await page.getByRole('button', { name: 'Companions' }).click();
  await page.locator('.shop-item[data-id="pet_duck"]').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'screenshots/shop-companion.png' });

  // Leaving the shop puts the equipped loadout back (the duck was only tried on).
  await page.keyboard.press('Escape');
  await expect(page.locator('.menu')).toBeVisible();
  await page.reload();
  s = await save(page);
  expect(s.wallet).toBe(750);
  expect((s.loadout as Record<string, string>).pet).toBe('pet_none');
  expect((s.loadout as Record<string, string>).hat).toBe('hat_headlamp');
});
