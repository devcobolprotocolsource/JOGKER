import { expect, test } from '@playwright/test';

test('application shell loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'JOKGER' })).toBeVisible();
});
