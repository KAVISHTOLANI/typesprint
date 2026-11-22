import { expect, test } from '@playwright/test';
import { checkMobile, snap } from './helpers';

test('take a timed test and see it in history', async ({ page }) => {
  await page.clock.install();
  await page.goto('./');
  await page.clock.runFor(2000);
  await snap(page, 'landing');
  await checkMobile(page, 'landing-mobile');
  await page.getByRole('link', { name: 'Start a test' }).first().click();
  await page.getByRole('radio', { name: '15 s' }).click();
  const area = page.getByLabel(/Start typing/);
  await area.pressSequentially('The boats rokc gently as the sun', { delay: 0 });
  await page.clock.runFor(5000);
  await snap(page, 'test');
  await page.clock.runFor(11000);
  await expect(page.getByTestId('wpm')).toBeVisible();
  await snap(page, 'result');
  await checkMobile(page);
  await page.reload();
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'History' }).click();
  await expect(page.getByRole('img', { name: /Net WPM for the last 11 tests/ })).toBeVisible();
});
