import { test, expect } from '@playwright/test';

test.describe('/selection - Wi-Fi mixing units', () => {
    test.beforeEach(async ({ page }) => {
        await page.context().addCookies([{ name: 'PHPSESSID', value: '1', domain: 'localhost', path: '/' }]);
        await page.goto('/selection');
        await page.getByTestId('reset-equipment').click();
        await page.getByTestId('reset-equipment-confirm').click();
    });

    test('Wi-Fi mixing requires Smart2, and three mixing units require PRO', async ({ page }) => {
        await page.getByTestId('mixing-connection-wifi').click();
        await page.getByTestId('add-mixing-unit').click();
        await expect(page.getByTestId('controller-card-smart2')).toHaveAttribute('data-active', 'true');
        await expect(page.locator('.sel-added-label').getByText('Сервопривод 220V с цифровым датчиком с подключением по WI-FI')).toBeVisible();

        await page.getByTestId('mixing-connection-wired').click();
        await page.getByTestId('add-mixing-unit').click();
        await expect(page.getByTestId('controller-card-smart2')).toHaveAttribute('data-active', 'true');

        await page.getByTestId('mixing-sensor-ntc').click();
        await page.getByTestId('add-mixing-unit').click();
        await expect(page.getByTestId('controller-card-pro')).toHaveAttribute('data-active', 'true');
    });

    test('mixing tutorial guides selection through adding and counting units', async ({ page }) => {
        await page.getByTitle('Как настроить смесительный узел').click();
        await expect(page.getByText('Выберите тип подключения смесительного узла')).toBeVisible();

        await page.getByRole('button', { name: 'Далее' }).click();
        await expect(page.getByText('Какой сигнал принимает сервопривод?')).toBeVisible();

        await page.getByRole('button', { name: 'Далее' }).click();
        await expect(page.getByText('Какой датчик установлен в узле?')).toBeVisible();

        await page.getByRole('button', { name: 'Далее' }).click();
        await expect(page.getByText('Проверьте выбранный вариант и добавьте узел')).toBeVisible();

        await page.getByTestId('add-mixing-unit').click();
        await expect(page.getByText('Смесительный узел добавлен в систему')).toBeVisible();

        await page.getByRole('button', { name: 'Далее' }).click();
        await expect(page.getByText('Изменяйте количество смесительных узлов')).toBeVisible();

        await page.getByRole('button', { name: 'Далее' }).click();
        await expect(page.getByText('Добавьте другой вид смесительного узла')).toBeVisible();
        await page.getByTestId('mixing-sensor-ntc').click();
        await expect(page.getByText('Проверьте выбранный вариант и добавьте узел')).toBeVisible();
        await expect(page.getByText('Выбрано: проводное подключение, привод 220V, датчик NTC.')).toBeVisible();

        const maskBox = await page.locator('.tutorial-popover-mask').boundingBox();
        const settingsBox = await page.getByTestId('mixing-connection-wired').locator('..').locator('..').locator('..').boundingBox();
        const addBox = await page.getByTestId('add-mixing-unit').boundingBox();
        expect(maskBox.x).toBeLessThanOrEqual(settingsBox.x);
        expect(maskBox.x + maskBox.width).toBeGreaterThanOrEqual(settingsBox.x + settingsBox.width);
        expect(maskBox.y + maskBox.height).toBeGreaterThanOrEqual(addBox.y + addBox.height);

        await page.getByTestId('add-mixing-unit').click();
        await expect(page.getByText('Смесительный узел добавлен в систему')).toBeVisible();
        await expect(page.getByText('Новая конфигурация добавлена в список смесительных узлов.')).toBeVisible();
        const confirmationMaskBox = await page.locator('.tutorial-popover-mask').boundingBox();
        const addedTitleBox = await page.getByText('Добавленные смесительные узлы:', { exact: true }).boundingBox();
        const addedRowBox = await page.locator('.sel-added-label').filter({ hasText: 'NTC' }).last().boundingBox();
        expect(confirmationMaskBox.x).toBeLessThanOrEqual(addedTitleBox.x);
        expect(confirmationMaskBox.y).toBeLessThanOrEqual(addedTitleBox.y);
        expect(confirmationMaskBox.x + confirmationMaskBox.width).toBeGreaterThanOrEqual(addedRowBox.x + addedRowBox.width);
        expect(confirmationMaskBox.y + confirmationMaskBox.height).toBeGreaterThanOrEqual(addedRowBox.y + addedRowBox.height);
        await page.getByRole('button', { name: 'Далее' }).click();
        await expect(page.getByText('Изменяйте количество смесительных узлов')).toBeVisible();
        await expect(page.getByTitle('Закрыть обучение')).toHaveAttribute('aria-pressed', 'true');
        const counterMaskBox = await page.locator('.tutorial-popover-mask').boundingBox();
        const ntcCounterBox = await page.locator('.sel-added-line').filter({ hasText: 'NTC' }).getByTitle('Добавить ещё').boundingBox();
        expect(counterMaskBox.x).toBeLessThanOrEqual(ntcCounterBox.x);
        expect(counterMaskBox.y).toBeLessThanOrEqual(ntcCounterBox.y);
        expect(counterMaskBox.x + counterMaskBox.width).toBeGreaterThanOrEqual(ntcCounterBox.x + ntcCounterBox.width);
        expect(counterMaskBox.y + counterMaskBox.height).toBeGreaterThanOrEqual(ntcCounterBox.y + ntcCounterBox.height);

        await page.getByRole('button', { name: 'Далее' }).click();
        await page.getByTestId('mixing-sensor-digital').click();
        await expect(page.getByText('Данный вариант уже добавлен в систему')).toBeVisible();
        await expect(page.getByText('Измените его количество в таблице «Добавленные смесительные узлы». Чтобы добавить новый вид смесительного узла, продолжайте менять конфигурацию.')).toBeVisible();
        await expect(page.getByText('Смесительный узел добавлен в систему')).toHaveCount(0);
        const existingVariantMaskBox = await page.locator('.tutorial-popover-mask').boundingBox();
        const existingSettingsBox = await page.getByTestId('mixing-connection-wired').locator('..').locator('..').locator('..').boundingBox();
        expect(existingVariantMaskBox.x).toBeLessThanOrEqual(existingSettingsBox.x);
        expect(existingVariantMaskBox.x + existingVariantMaskBox.width).toBeGreaterThanOrEqual(existingSettingsBox.x + existingSettingsBox.width);
        await page.getByRole('button', { name: 'Далее' }).click();
        await expect(page.getByText('Данный вариант находится в таблице')).toBeVisible();
    });

    test('mixing tutorial finishes on the table when all variants are added', async ({ page }) => {
        await page.getByTestId('add-mixing-unit').click();
        await page.getByTestId('mixing-sensor-ntc').click();
        await page.getByTestId('add-mixing-unit').click();
        await page.getByTestId('mixing-servo-010').click();
        await page.getByTestId('add-mixing-unit').click();
        await page.getByTestId('mixing-connection-wifi').click();
        await page.getByTestId('add-mixing-unit').click();

        await expect(page.getByTestId('mixing-connection-wired')).toHaveCount(0);
        await expect(page.getByTestId('add-mixing-unit')).toHaveCount(0);
        await page.getByTitle('Как настроить смесительный узел').click();
        await expect(page.getByText('Все возможные смесительные узлы уже добавлены')).toBeVisible();
        await expect(page.getByText('Вы можете менять их количество в таблице «Добавленные смесительные узлы».')).toBeVisible();
        await page.getByRole('button', { name: 'Далее' }).click();
        await expect(page.locator('.tutorial-popover')).toBeHidden();
    });

    test('Wi-Fi pump uses the 220V variant', async ({ page }) => {
        await page.getByTestId('pump-connection-wifi').click();
        await expect(page.getByTestId('pump-type-010')).toBeDisabled();

        await page.getByTestId('add-pump').click();
        await expect(page.locator('.sel-added-label').getByText('Насос 220V с подключением по WI-FI')).toBeVisible();
    });

    test('pump tutorial guides selection through adding and counting pumps', async ({ page }) => {
        await page.getByTitle('Как добавить насос').click();
        await expect(page.getByText('Как подключён насос?')).toBeVisible();

        await page.getByRole('button', { name: 'Далее' }).click();
        await expect(page.getByText('Какой тип управления у насоса?')).toBeVisible();

        await page.getByRole('button', { name: 'Далее' }).click();
        await expect(page.getByText('Проверьте выбранный вариант и добавьте насос')).toBeVisible();

        await page.getByTestId('add-pump').click();
        await expect(page.getByText('Насос добавлен в систему')).toBeVisible();

        await page.getByRole('button', { name: 'Далее' }).click();
        await expect(page.getByText('Изменяйте количество насосов')).toBeVisible();
    });

    test('pump tutorial finishes on the table when all variants are added', async ({ page }) => {
        await page.getByTestId('add-pump').click();
        await page.getByTestId('pump-type-010').click();
        await page.getByTestId('add-pump').click();
        await page.getByTestId('pump-connection-wifi').click();
        await page.getByTestId('add-pump').click();

        await expect(page.getByTestId('pump-connection-wired')).toHaveCount(0);
        await expect(page.getByTestId('add-pump')).toHaveCount(0);
        await page.getByTitle('Как добавить насос').click();
        await expect(page.getByText('Все возможные насосы уже добавлены')).toBeVisible();
        await expect(page.getByText('Вы можете менять их количество в таблице «Добавленные насосы».')).toBeVisible();
        await page.getByRole('button', { name: 'Далее' }).click();
        await expect(page.locator('.tutorial-popover')).toBeHidden();
    });

    test('Wi-Fi zone uses a Wi-Fi relay module', async ({ page }) => {
        await page.getByTestId('zone-connection-wifi').click();
        await page.getByTestId('add-zone').click();

        await expect(page.locator('.sel-added-label').getByText('Зона с подключением по WI-FI')).toBeVisible();
    });

    test('zone tutorial guides selection through adding and counting zones', async ({ page }) => {
        await page.getByTitle('Как добавить зону').click();
        await expect(page.getByText('Как подключён сервопривод зоны?')).toBeVisible();

        await page.getByRole('button', { name: 'Далее' }).click();
        await expect(page.getByText('Проверьте вариант и добавьте зону')).toBeVisible();

        await page.getByTestId('add-zone').click();
        await expect(page.getByText('Зона добавлена в систему')).toBeVisible();

        await page.getByRole('button', { name: 'Далее' }).click();
        await expect(page.getByText('Изменяйте количество зон')).toBeVisible();
    });

    test('Wi-Fi other equipment uses a Wi-Fi relay module', async ({ page }) => {
        await page.getByTestId('other-equipment-connection-wifi').click();
        await page.getByTestId('add-other-equipment').click();

        await expect(page.locator('.sel-added-label').getByText('Прочее оборудование с подключением по WI-FI')).toBeVisible();
    });

    test('other equipment tutorial advances only through navigation buttons', async ({ page }) => {
        await page.getByTitle('Как добавить оборудование').click();
        const popover = page.locator('.tutorial-popover.is-visible');

        await expect(popover).toContainText('Как подключено оборудование?');
        await page.getByTestId('other-equipment-connection-wifi').click();
        await expect(popover).toContainText('Как подключено оборудование?');
        await popover.getByRole('button', { name: 'Далее' }).click();

        await page.getByTestId('add-other-equipment').click();
        await expect(popover).toContainText('Оборудование добавлено в систему');
        await popover.getByRole('button', { name: 'Далее' }).click();
        await expect(popover).toContainText('Изменяйте количество оборудования');
        await popover.getByRole('button', { name: 'Далее' }).click();
        await expect(popover).toContainText('Добавьте другой вид оборудования');
        await page.getByTestId('other-equipment-connection-wired').click();
        await expect(popover).toContainText('Проверьте вариант и добавьте оборудование');
        const maskBox = await page.locator('.tutorial-popover-mask').boundingBox();
        const switchBox = await page.getByTestId('other-equipment-connection-wired').locator('..').locator('..').boundingBox();
        const addBox = await page.getByTestId('add-other-equipment').boundingBox();
        expect(maskBox.x).toBeLessThanOrEqual(switchBox.x);
        expect(maskBox.x + maskBox.width).toBeGreaterThanOrEqual(switchBox.x + switchBox.width);
        expect(maskBox.y + maskBox.height).toBeGreaterThanOrEqual(addBox.y + addBox.height);
        await page.getByTestId('add-other-equipment').click();
        await expect(popover).toContainText('Все возможные варианты оборудования уже добавлены');
    });
});
