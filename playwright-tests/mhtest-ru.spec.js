import { test, expect } from '@playwright/test';

const BASE_URL = 'https://mhtest.ru';

test.describe('mhtest.ru (внешний сайт)', () => {
    test('главная страница открывается и содержит ключевой контент', async ({ page }) => {
        const response = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        expect(response?.ok()).toBeTruthy();

        await expect(page).toHaveTitle(/MyHeat/i);
        await expect(page.getByRole('heading', { name: 'Управляйте отоплением из любой точки мира' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Подбор оборудования' }).first()).toBeVisible();
    });
});
