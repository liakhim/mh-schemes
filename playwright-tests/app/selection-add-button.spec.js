import { test, expect } from '@playwright/test';

/**
 * Кнопка добавления в карточках /selection живёт по правилу карточки «Бойлер ГВС»:
 * как только конфигурация попала в список добавленного, количество меняется
 * счётчиком в её строке, а большая кнопка убирается. В карточках с несколькими
 * конфигурациями (термостаты, датчики температуры) правило действует на текущую
 * конфигурацию: переключение на ещё не добавленную возвращает кнопку, а её
 * подпись описывает именно выбранный вариант.
 *
 * Тесты локальные: внешний mhtest.ru здесь не используется.
 */
test.describe('/selection — кнопка добавления и список добавленного', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/selection');
        await page.getByTestId('reset-equipment').click();
        await page.getByTestId('reset-equipment-confirm').click();
    });

    test('термостаты: кнопка скрывается для добавленной конфигурации и возвращается на новой', async ({ page }) => {
        const add = page.getByTestId('add-thermostat');
        await expect(add).toBeVisible();
        await expect(add).toHaveText('Добавить проводной черный термостат');

        await add.click();
        await expect(add).toBeHidden();                                        // конфигурация уже в списке
        await page.getByTestId('thermostat-wired-black-no-floor-qty-inc').click();

        await page.getByTestId('thermostat-connection-wireless').click();       // ещё не добавленная конфигурация
        await expect(add).toBeVisible();
        await expect(add).toHaveText('Добавить беспроводной черный термостат');
        await add.click();
        await expect(add).toBeHidden();

        await page.getByTestId('thermostat-connection-wired').click();          // возврат к добавленной
        await expect(add).toBeHidden();

        const offer = await openOffer(page);
        expect(offer).toContain('Термостат проводной, черный');
        expect(offer).toContain('Термостат беспроводной, черный');
    });

    test('датчики температуры: подпись кнопки зависит от настроек, кнопка скрывается', async ({ page }) => {
        const add = page.getByTestId('add-temperature-sensor');
        await expect(add).toHaveText('Добавить проводной цифровой настенный датчик температуры');
        await add.click();
        await expect(add).toBeHidden();
        await page.getByTestId('temperature-sensor-wired-wall-digital-qty-inc').click();

        await page.getByTestId('temperature-sensor-placement-flask').click();
        await expect(add).toHaveText('Добавить проводной цифровой датчик температуры в колбе');
        await expect(add).toBeVisible();

        await page.getByTestId('temperature-sensor-kind-ntc').click();
        await expect(add).toHaveText('Добавить проводной NTC-датчик температуры в колбе');

        await page.getByTestId('temperature-sensor-connection-wireless').click();
        await expect(add).toHaveText('Добавить беспроводной настенный датчик температуры');
        await add.click();
        await expect(add).toBeHidden();

        // Беспроводной датчик попал в список карточки (в КП он поглощается
        // комплектом GO+ строкой «Комплектный», поэтому проверяем саму карточку).
        await expect(page.getByTestId('temperature-sensor-wireless-wall-qty-inc')).toBeVisible();
        await expect(page.getByTestId('temperature-sensor-wired-wall-digital-qty-inc')).toBeVisible();
    });

    test('прочее оборудование: кнопка скрывается после первого добавления', async ({ page }) => {
        const add = page.getByTestId('add-other-equipment');
        await expect(add).toBeVisible();
        await add.click();
        await expect(add).toBeHidden();
        await page.getByTestId('other-equipment-qty-inc').click();
        await page.getByTestId('other-equipment-qty-dec').click();
        await page.getByTestId('other-equipment-qty-dec').click();
        await expect(add).toBeVisible();   // список опустел — кнопка вернулась
    });
});

const openOffer = async (page) => {
    await page.getByTestId('open-commercial-offer').click();
    const dialog = page.getByRole('dialog', { name: 'Коммерческое предложение' });
    await expect(dialog).toBeVisible();
    return dialog.innerText();
};
