import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('login page renders and has no serious or critical accessibility violations', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    await route.fulfill({
      status: route.request().method() === 'OPTIONS' ? 204 : 200,
      contentType: 'application/json',
      headers: {
        'access-control-allow-origin': 'http://localhost:3000',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
      },
      body: route.request().method() === 'OPTIONS' ? '' : '[]',
    });
  });
  await page.goto('/login');
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  await expect(page.getByRole('heading', { name: 'Masuk ke JOKGER' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Kata sandi')).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? '')
    )
  ).toEqual([]);
});
