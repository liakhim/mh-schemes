import { test, expect } from '@playwright/test';

/**
 * Поиск котлов на /selection. Внешний интеграционный сервис здесь подменен
 * заглушкой на /api/integration, поэтому тест локальный и детерминированный:
 * проверяется поведение выпадашки, а не содержимое каталога mhtest.
 *
 * Правила: выбор котла закрывает список, строка поиска и найденное при этом
 * сохраняются, а новый запрос уходит только при изменении текста в поле.
 */
test.describe('/selection — поиск котлов', () => {
    /** Счетчик ушедших запросов: по нему видно, что поиск не перезапускается сам. */
    let searchCount = 0;

    test.beforeEach(async ({ page }) => {
        searchCount = 0;
        await page.route('**/api/integration', async (route) => {
            searchCount += 1;
            const body = JSON.parse(route.request().postData() || '{}');
            const name = String(body?.data?.name || '');
            const items = name.toLowerCase().startsWith('bax')
                ? [
                    { id: 1, name: `${name} Slim 1.230`, bus_type: 1 },
                    { id: 2, name: `${name} Eco Four`, bus_type: 127 },
                ]
                : [];
            await route.fulfill({ json: { data: items } });
        });

        await page.goto('/selection');
        await page.getByTestId('reset-equipment').click();
        await page.getByTestId('reset-equipment-confirm').click();
    });

    test('выбор котла закрывает выпадашку и не запускает новый поиск', async ({ page }) => {
        const input = page.getByPlaceholder('Введите название котла...');
        const dropdown = page.getByTestId('boiler-search-results');

        await input.fill('Baxi');
        await expect(dropdown).toBeVisible();
        expect(searchCount).toBe(1);

        await dropdown.getByTestId('boiler-search-option').first().click();

        await expect(dropdown).toBeHidden();                          // выпадашка закрылась
        await expect(input).toHaveValue('Baxi');                      // строка поиска сохранилась
        await expect(page.getByTestId('boiler-search-empty')).toBeHidden();
        // Котел действительно добавлен — закрытие списка не отменило выбор.
        await expect(page.getByText('Baxi Slim 1.230')).toBeVisible();

        // Ждем заведомо дольше debounce: сам по себе поиск не перезапускается
        // и список не всплывает обратно.
        await page.waitForTimeout(1200);
        expect(searchCount).toBe(1);
        await expect(dropdown).toBeHidden();
    });

    test('изменение текста в поле снова открывает выпадашку', async ({ page }) => {
        const input = page.getByPlaceholder('Введите название котла...');
        const dropdown = page.getByTestId('boiler-search-results');

        await input.fill('Baxi');
        await dropdown.getByTestId('boiler-search-option').first().click();
        await expect(dropdown).toBeHidden();

        await input.fill('Baxi Luna');                                // изменили надпись — новый поиск
        await expect(dropdown).toBeVisible();
        await expect(dropdown.getByText('Baxi Luna Slim 1.230')).toBeVisible();
        expect(searchCount).toBe(2);
    });

    test('пустой результат показывает «Котлы не найдены» и закрывается очисткой', async ({ page }) => {
        const input = page.getByPlaceholder('Введите название котла...');

        await input.fill('Неизвестный котёл');
        await expect(page.getByTestId('boiler-search-empty')).toBeVisible();
        await expect(page.getByTestId('boiler-search-results')).toBeHidden();

        await page.getByTestId('boiler-search-clear').click();
        await expect(page.getByTestId('boiler-search-empty')).toBeHidden();
        await expect(input).toHaveValue('');
    });
});
