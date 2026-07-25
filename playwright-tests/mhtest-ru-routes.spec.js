import { test, expect } from '@playwright/test';
import { BASE_URL, ROUTES } from './mhtest-ru.sitemap.js';

test.describe('mhtest.ru — ПРОВЕРКА МАРШРУТОВ: ', () => {
    for (const route of ROUTES) {
        test(`${route} отвечает успешно`, async ({ page }) => {
            const response = await page.goto(new URL(route, BASE_URL).toString(), { waitUntil: 'domcontentloaded' });
            expect(response, `нет ответа сервера для ${route}`).not.toBeNull();
            expect(response.status(), `${route} вернул ${response.status()}`).toBeLessThan(400);
        });
    }
});
