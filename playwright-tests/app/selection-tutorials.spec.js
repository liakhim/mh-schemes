import { test, expect } from '@playwright/test';

const resetSelection = async (page) => {
    await page.context().addCookies([{ name: 'PHPSESSID', value: '1', domain: 'localhost', path: '/' }]);
    await page.goto('/selection');
    await page.getByTestId('reset-equipment').click();
    await page.getByTestId('reset-equipment-confirm').click();
};

test.describe('/selection - tutorial scenarios', () => {
    test.beforeEach(async ({ page }) => {
        await resetSelection(page);
    });

    test('thermostat tutorial preserves values and exercises popover geometry and blocker', async ({ page }) => {
        await page.getByTestId('thermostat-connection-wireless').click();
        await page.getByTitle('Как добавить термостат').click();

        const popover = page.locator('.tutorial-popover.is-visible');
        const header = page.locator('.sel-liquid-header');
        const mask = page.locator('.tutorial-popover-mask');
        const connectionField = page.getByTestId('thermostat-connection-wireless').locator('..').locator('..');
        await expect(popover).toContainText('Выберите тип подключения термостата');
        const geometry = await Promise.all([popover.boundingBox(), connectionField.boundingBox()]);
        expect(geometry[0].y + geometry[0].height).toBeLessThanOrEqual(geometry[1].y);
        await expect(mask).not.toHaveClass(/is-solid/);
        const initialScrollY = await page.evaluate(() => window.scrollY);
        const headerBox = await header.boundingBox();
        const overlapScroll = Math.max(0, geometry[0].y - (headerBox.y + headerBox.height - 12));
        await page.evaluate((distance) => window.scrollBy(0, distance), overlapScroll);
        await expect(popover).toBeVisible();
        await expect(mask).not.toHaveClass(/is-solid/);
        await expect.poll(async () => (await popover.boundingBox())?.y ?? Infinity).toBeLessThan(headerBox.y + headerBox.height);
        const overlappingBox = await popover.boundingBox();
        await page.evaluate((distance) => window.scrollBy(0, distance), overlappingBox.y + 24);
        await expect(mask).not.toHaveClass(/is-solid/);
        await expect(popover).toBeVisible();
        const highlightedBox = await connectionField.boundingBox();
        await page.evaluate((distance) => window.scrollBy(0, distance), highlightedBox.y + highlightedBox.height + 12);
        await expect(mask).toHaveClass(/is-solid/);
        await expect(popover).toBeHidden();
        await page.evaluate((scrollY) => window.scrollTo(0, scrollY), initialScrollY);
        await expect(mask).not.toHaveClass(/is-solid/);
        await expect(popover).toBeVisible();

        await expect(popover.getByRole('button', { name: 'Назад' })).toHaveCount(0);
        await popover.getByRole('button', { name: 'Далее' }).click();
        await expect(page.getByTestId('thermostat-connection-wireless')).toHaveAttribute('data-active', 'true');
        await page.getByRole('button', { name: 'Белый' }).click();
        await expect(popover).toContainText('Выберите цвет термостата');
        await popover.getByRole('button', { name: 'Далее' }).click();
        await page.getByLabel('Добавить датчик пола').check();
        await expect(popover).toContainText('Нужен ли датчик пола?');
        await popover.getByRole('button', { name: 'Далее' }).click();
        await page.getByTestId('add-thermostat').click();
        await expect(popover).toContainText('Термостат добавлен в систему');
        const blocker = page.locator('.tutorial-popover-content-blocker');
        await expect(blocker).toBeVisible();
        await blocker.click({ position: { x: 2, y: 2 } });
        await expect(popover).toHaveClass(/is-attention-requested/);

        await popover.getByRole('button', { name: 'Далее' }).click();
        await expect(popover).toContainText('Изменяйте количество термостатов');
        await popover.getByRole('button', { name: 'Назад' }).click();
        await expect(popover).toContainText('Термостат добавлен в систему');
        await popover.getByRole('button', { name: 'Далее' }).click();
        await popover.getByRole('button', { name: 'Далее' }).click();
        await expect(popover).toContainText('Добавьте другой вид термостата');
        await page.getByRole('button', { name: 'Серебристый' }).click();
        await expect(popover).toContainText('Проверьте новую конфигурацию и добавьте термостат');
        await expect(popover.getByRole('button', { name: 'Далее' })).toBeDisabled();
        await page.getByTestId('add-thermostat').click();
        await expect(popover).toContainText('Новая конфигурация добавлена в таблицу «Добавленные термостаты»');
        await popover.getByRole('button', { name: 'Далее' }).click();
        await expect(popover).toContainText('Изменяйте количество термостатов');
    });

    test('temperature sensor tutorial uses the added list when the current variant already exists', async ({ page }) => {
        const startTutorial = () => page.getByTitle('Как добавить датчик температуры').click();
        const advanceToAdd = async () => {
            await page.locator('.tutorial-popover.is-visible').getByRole('button', { name: 'Далее' }).click();
            await page.getByTestId('temperature-sensor-placement-wall').click();
            await page.locator('.tutorial-popover.is-visible').getByRole('button', { name: 'Далее' }).click();
            await page.getByTestId('temperature-sensor-kind-digital').click();
            await page.locator('.tutorial-popover.is-visible').getByRole('button', { name: 'Далее' }).click();
        };

        await startTutorial();
        await advanceToAdd();
        await page.getByTestId('add-temperature-sensor').click();
        await expect(page.getByText('Датчик добавлен в систему')).toBeVisible();
        await page.locator('.tutorial-popover.is-visible').getByRole('button', { name: 'Далее' }).click();
        await page.locator('.tutorial-popover.is-visible').getByRole('button', { name: 'Далее' }).click();

        await startTutorial();
        await advanceToAdd();
        await expect(page.getByText('Датчик добавлен в систему')).toBeVisible();
        await page.locator('.tutorial-popover.is-visible').getByRole('button', { name: 'Далее' }).click();
        await expect(page.getByText('Изменяйте количество датчиков')).toBeVisible();
    });

    test('leak tutorial covers zone and valve counters', async ({ page }) => {
        await page.getByTitle('Как настроить контроль протечки').click();
        await expect(page.getByText('Добавьте группу датчиков протечки', { exact: true })).toBeVisible();
        await page.getByTestId('add-leak-zone').click();
        await expect(page.getByText('Группа датчиков добавлена')).toBeVisible();
        await page.locator('.tutorial-popover.is-visible').getByRole('button', { name: 'Далее' }).click();
        await expect(page.getByText('Укажите количество датчиков в группе')).toBeVisible();
        await page.getByRole('button', { name: 'Далее' }).click();
        await expect(page.getByText('Укажите количество запорных клапанов')).toBeVisible();
        await page.getByRole('button', { name: 'Далее' }).click();
        await expect(page.locator('.tutorial-popover')).toBeHidden();
    });
});

test.describe('/selection - boiler tutorial', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('**/api/integration', async (route) => {
            await route.fulfill({
                json: { data: [{ id: 1, name: 'Baxi Tutorial', bus_type: 1 }] },
            });
        });
        await resetSelection(page);
    });

    test('guides a smart boiler from search through adding another boiler', async ({ page }) => {
        await page.getByTitle('Как добавить котёл').click();
        await expect(page.getByText('Введите название котла или производителя в это поле')).toBeVisible();

        await page.getByPlaceholder('Введите название котла...').fill('Baxi');
        await expect(page.getByText('Выберите нужный котел')).toBeVisible();
        const dropdownBox = await page.getByTestId('boiler-search-results').boundingBox();
        const maskBox = await page.locator('.tutorial-popover-mask').boundingBox();
        expect(maskBox.y + maskBox.height).toBeLessThanOrEqual(dropdownBox.y + dropdownBox.height + 8);
        await page.getByTestId('boiler-search-option').click();
        await expect(page.getByText('Выбранный котел добавлен в список котлов Вашей системы')).toBeVisible();
        await page.getByRole('button', { name: 'Назад' }).click();
        await expect(page.getByText('Выберите нужный котел')).toBeVisible();
        await expect(page.getByTestId('boiler-search-results')).toBeVisible();
        await page.getByTestId('boiler-search-option').click();
        await expect(page.getByText('Выбранный котел добавлен в список котлов Вашей системы')).toBeVisible();
        await page.getByRole('button', { name: 'Далее' }).click();
        await expect(page.getByText('Выберите тип подключения котла')).toBeVisible();
        await page.getByTitle('Подключение: BUS').last().click();
        await expect(page.getByText('Выберите тип подключения котла')).toBeVisible();
        await page.getByRole('button', { name: 'Далее' }).click();
        await expect(page.getByText('Добавьте другие котлы, если это требуется')).toBeVisible();
        await expect(page.locator('.tutorial-popover.is-visible').getByRole('button', { name: 'Далее' })).toHaveCount(0);
        await page.getByTestId('boiler-search-restart').click();
        await expect(page.getByText('Добавьте дополнительный котел из списка')).toBeVisible();
        await page.getByRole('button', { name: 'Закрыть подсказку' }).click();
    });
});
