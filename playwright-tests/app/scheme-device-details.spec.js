import { test, expect } from '@playwright/test';

test.describe('/scheme - device details', () => {
    test.beforeEach(async ({ page }) => {
        await page.context().addCookies([{ name: 'PHPSESSID', value: '1', domain: 'localhost', path: '/' }]);
        await page.goto('/scheme');

        const introButton = page.getByRole('button', { name: 'Понятно' });
        if (await introButton.isVisible().catch(() => false)) await introButton.click();

        await page.getByRole('button', { name: 'Схема', exact: true }).click();
    });

    test('opens device details only after an explicit request', async ({ page }) => {
        await expect(page.locator('#spa-device-preview')).toHaveCount(0);

        const detailsButton = page.locator('button[aria-controls="spa-device-preview"]');
        await expect(detailsButton).toHaveAccessibleName('Развернуть детали устройства');
        await expect(detailsButton).toHaveAttribute('aria-expanded', 'false');
        await detailsButton.click();

        await expect(page.locator('#spa-device-preview')).toBeVisible();
        await expect(detailsButton).toHaveAccessibleName('Свернуть детали устройства');
        await expect(detailsButton).toHaveAttribute('aria-expanded', 'true');
    });
});
