import { test, expect } from '@playwright/test';

test.describe('Error Pages', () => {
  test('404 page renders for non-existent URL', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.locator('h1')).toContainText('Page Not Found');
    await expect(page.getByRole('link', { name: 'Back to Home' })).toBeVisible();
    await expect(page.locator('a[href="/#services"]')).toBeVisible();
    await expect(page.locator('a[href="/#contact"]').first()).toBeVisible();
    const robotsMeta = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robotsMeta).toBe('noindex, nofollow');
  });

  test('404 page has Back to Home CTA', async ({ page }) => {
    await page.goto('/nonexistent-page');
    const backHome = page.getByRole('link', { name: 'Back to Home' });
    await expect(backHome).toBeVisible();
    await expect(backHome).toHaveAttribute('href', '/');
  });

  test('404 page has quick links to Services, About, Contact', async ({ page }) => {
    await page.goto('/nonexistent-page');
    await expect(page.locator('a[href="/#services"]', { hasText: 'Services' })).toBeVisible();
    await expect(page.locator('a[href="/#about"]', { hasText: 'About' })).toBeVisible();
    await expect(page.locator('a[href="/#contact"]', { hasText: 'Contact' })).toBeVisible();
  });
});
