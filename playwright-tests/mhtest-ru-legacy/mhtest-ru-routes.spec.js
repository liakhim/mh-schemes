import { test, expect } from '@playwright/test';
import { BASE_URL, ROUTES } from './mhtest-ru.sitemap.js';

test.describe('mhtest.ru — ПРОВЕРКА МАРШРУТОВ: ', () => {
    // Внешний сайт: окружение агента теряет случайный процент исходящих
    // TCP-соединений (net::ERR_CONNECTION_TIMED_OUT), не связано с самим
    // mhtest.ru или нагрузкой от параллельных воркеров — лечится только ретраями.
    test.describe.configure({ retries: 3 });

    for (const route of ROUTES) {
        test(`${route} отвечает успешно`, async ({ page }) => {
            const response = await page.goto(new URL(route, BASE_URL).toString(), { waitUntil: 'domcontentloaded' });
            expect(response, `нет ответа сервера для ${route}`).not.toBeNull();
            expect(response.status(), `${route} вернул ${response.status()}`).toBeLessThan(400);
        });
    }
});
