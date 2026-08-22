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
        await expect(page.getByText('Сервопривод 220V с цифровым датчиком с подключением по WI-FI')).toBeVisible();

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

        await page.getByRole('button', { name: 'Далее без изменений' }).click();
        await expect(page.getByText('Какой сигнал принимает сервопривод?')).toBeVisible();

        await page.getByRole('button', { name: 'Далее без изменений' }).click();
        await expect(page.getByText('Какой датчик установлен в узле?')).toBeVisible();

        await page.getByRole('button', { name: 'Далее без изменений' }).click();
        await expect(page.getByText('Проверьте выбранный вариант и добавьте узел')).toBeVisible();

        await page.getByTestId('add-mixing-unit').click();
        await expect(page.getByText('Смесительный узел добавлен в систему')).toBeVisible();

        await page.getByRole('button', { name: 'Далее' }).click();
        await expect(page.getByText('Изменяйте количество смесительных узлов')).toBeVisible();

        await page.getByRole('button', { name: 'Далее' }).click();
        await expect(page.getByText('Добавьте другой вид смесительного узла')).toBeVisible();
        await page.getByTestId('mixing-sensor-ntc').click();
        await expect(page.getByText('Добавьте новую конфигурацию')).toBeVisible();
    });

    test('Wi-Fi pump uses the 220V variant', async ({ page }) => {
        await page.getByTestId('pump-connection-wifi').click();
        await expect(page.getByTestId('pump-type-010')).toBeDisabled();

        await page.getByTestId('add-pump').click();
        await expect(page.getByText('Насос 220V с подключением по WI-FI')).toBeVisible();
    });

    test('pump tutorial guides selection through adding and counting pumps', async ({ page }) => {
        await page.getByTitle('Как добавить насос').click();
        await expect(page.getByText('Как подключён насос?')).toBeVisible();

        await page.getByRole('button', { name: 'Далее без изменений' }).click();
        await expect(page.getByText('Какой тип управления у насоса?')).toBeVisible();

        await page.getByRole('button', { name: 'Далее без изменений' }).click();
        await expect(page.getByText('Проверьте выбранный вариант и добавьте насос')).toBeVisible();

        await page.getByTestId('add-pump').click();
        await expect(page.getByText('Насос добавлен в систему')).toBeVisible();

        await page.getByRole('button', { name: 'Далее' }).click();
        await expect(page.getByText('Изменяйте количество насосов')).toBeVisible();
    });

    test('Wi-Fi zone uses a Wi-Fi relay module', async ({ page }) => {
        await page.getByTestId('zone-connection-wifi').click();
        await page.getByTestId('add-zone').click();

        await expect(page.getByText('Зона с подключением по WI-FI')).toBeVisible();
    });

    test('zone tutorial guides selection through adding and counting zones', async ({ page }) => {
        await page.getByTitle('Как добавить зону').click();
        await expect(page.getByText('Как подключён сервопривод зоны?')).toBeVisible();

        await page.getByRole('button', { name: 'Далее без изменений' }).click();
        await expect(page.getByText('Проверьте вариант и добавьте зону')).toBeVisible();

        await page.getByTestId('add-zone').click();
        await expect(page.getByText('Зона добавлена в систему')).toBeVisible();

        await page.getByRole('button', { name: 'Далее' }).click();
        await expect(page.getByText('Изменяйте количество зон')).toBeVisible();
    });

    test('Wi-Fi other equipment uses a Wi-Fi relay module', async ({ page }) => {
        await page.getByTestId('other-equipment-connection-wifi').click();
        await page.getByTestId('add-other-equipment').click();

        await expect(page.getByText('Прочее оборудование с подключением по WI-FI')).toBeVisible();
    });
});
