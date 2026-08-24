import { test, expect } from '@playwright/test';

test.describe('/selection - GVS boiler tutorial', () => {
    test.beforeEach(async ({ page }) => {
        await page.context().addCookies([{ name: 'PHPSESSID', value: '1', domain: 'localhost', path: '/' }]);
        await page.goto('/selection');
        await page.getByTestId('reset-equipment').click();
        await page.getByTestId('reset-equipment-confirm').click();
    });

    test('guides adding and counting indirect GVS boilers', async ({ page }) => {
        await page.getByTitle('Как добавить бойлер ГВС').click();
        await expect(page.getByText('Добавьте бойлер косвенного нагрева')).toBeVisible();

        await page.getByTestId('add-gvs-boiler').click();
        await expect(page.getByText('Бойлер ГВС уже добавлен в систему')).toBeVisible();
        await page.getByRole('button', { name: 'Далее' }).click();
        await expect(page.getByText('Бойлер ГВС добавлен в систему')).toBeVisible();

        await page.getByRole('button', { name: 'Далее' }).click();
        await expect(page.getByText('Укажите количество бойлеров ГВС')).toBeVisible();
    });
});
