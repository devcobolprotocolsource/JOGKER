import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const adminEmail = 'e2e-admin@jokger.local';
const adminPassword = 'E2e-admin-2026!';

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Transactional E2E runs once in Chromium.');
});

async function signInAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(adminEmail);
  await page.getByLabel('Kata sandi').fill(adminPassword);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page).toHaveURL(/\/shift$/);
}

test('admin receives forbidden page on staff settings', async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto('/settings/staff');
  await expect(page).toHaveURL(/\/403$/);
  await expect(page.getByRole('heading', { name: 'Akses ditolak' })).toBeVisible();
});

test('admin opens a shift and completes a cash order', async ({ page }) => {
  await signInAsAdmin(page);
  await page.getByRole('button', { name: 'Buka shift' }).click();
  await expect(page.getByText('Kasir berhasil dibuka.')).toBeVisible();

  await page.goto('/pos');
  await page.getByRole('button', { name: /Americano/ }).click();
  await page.getByRole('button', { name: 'Bayar' }).click();
  const paymentDialog = page.getByRole('dialog');
  await expect(paymentDialog).toBeVisible();
  await paymentDialog.getByRole('button', { name: 'Selesai & Cetak' }).click();

  await expect(page.getByRole('heading', { name: 'Pesanan berhasil dibuat.' })).toBeVisible();
  const orderNumber = await page.locator('.order-number').innerText();
  expect(orderNumber).toMatch(/^JKG-\d{8}-\d{4}$/);

  await page.goto('/orders');
  await expect(page.getByText(orderNumber, { exact: true })).toBeVisible();
});
