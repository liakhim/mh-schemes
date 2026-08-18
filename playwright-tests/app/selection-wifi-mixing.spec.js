import { test, expect } from '@playwright/test';

test.describe('/selection - Wi-Fi mixing units', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/selection');
        await page.getByTestId('reset-equipment').click();
        await page.getByTestId('reset-equipment-confirm').click();
    });

    test('Wi-Fi mixing requires Smart2, and three mixing units require PRO', async ({ page }) => {
        await page.getByTestId('mixing-connection-wifi').click();
        await page.getByTestId('add-mixing-unit').click();
        await expect(page.getByTestId('controller-card-smart2')).toHaveAttribute('data-active', 'true');

        await page.getByTestId('mixing-connection-wired').click();
        await page.getByTestId('add-mixing-unit').click();
        await expect(page.getByTestId('controller-card-smart2')).toHaveAttribute('data-active', 'true');

        await page.getByTestId('mixing-sensor-ntc').click();
        await page.getByTestId('add-mixing-unit').click();
        await expect(page.getByTestId('controller-card-pro')).toHaveAttribute('data-active', 'true');
    });
});
