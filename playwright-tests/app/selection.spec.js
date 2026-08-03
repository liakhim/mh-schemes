import { test, expect } from '@playwright/test'; // импортируем test/expect из Playwright

/**
 * Читает и суммирует цены всех отображённых строк коммерческого предложения,
 * чтобы свериться с итоговой суммой в футере модалки без хардкода конкретной цифры.
 */
const sumOfferRowPrices = async (dialog) => { // хелпер: принимает локатор модалки КП
    const priceTexts = await dialog.locator('.equipment-offer-row strong').allTextContents(); // текст цены (<strong>) из каждой видимой строки КП
    return priceTexts.reduce((sum, text) => sum + Number(text.replace(/\D/g, '') || 0), 0); // убираем всё, кроме цифр (пробелы, ₽), и суммируем
};

test.describe('/selection — подбор оборудования', () => { // группа тестов для страницы подбора
    test.beforeEach(async ({ page }) => { // перед КАЖДЫМ тестом в группе:
        await page.goto('/selection'); // открываем страницу подбора
        await page.getByTestId('reset-equipment').click(); // жмём "Сбросить схему" — открывает диалог подтверждения
        await page.getByTestId('reset-equipment-confirm').click(); // подтверждаем сброс в диалоге — схема становится чистой
    });

    test('добавление 5 зон отражается в коммерческом предложении', async ({ page }) => {
        // Первая зона добавляется большой кнопкой; после этого она исчезает,
        // и количество набирается "+" в списке "Добавленные зоны".
        await page.getByTestId('add-zone').click(); // добавляет устройство zoneServo в схему
        for (let i = 1; i < 5; i += 1) { // добираем до 5
            await page.getByTestId('zone-qty-inc').click();
        }

        // 5 зон (relay | relay-s) превышают релейную ёмкость go/go+ (1 слот) и требуют
        // подбора smart2 с двумя модулями RL2 для покрытия дефицита.
        await expect(page.getByTestId('controller-card-smart2')).toHaveAttribute('data-active', 'true'); // карточка smart2 должна стать выбранной (data-active="true")

        await page.getByTestId('open-commercial-offer').click(); // открываем кнопку "Коммерческое предложение"
        const dialog = page.getByRole('dialog', { name: 'Коммерческое предложение' }); // локатор самой модалки КП (role="dialog")
        await expect(dialog).toBeVisible(); // модалка реально появилась на экране

        const zonesSection = dialog.locator('section', { hasText: 'Зоны' }); // <section> внутри модалки, где заголовок "Зоны"
        await expect(zonesSection.getByText('Зона', { exact: true })).toBeVisible(); // строка с точным текстом "Зона" видна
        await expect(zonesSection.getByText('5 шт', { exact: true })).toBeVisible(); // и счётчик рядом показывает ровно "5 шт"

        // zoneServo не продаётся MyHeat (нет цены в MYHEAT_PRICES), строка зон не должна нести цену.
        await expect(zonesSection.locator('.equipment-offer-row', { hasText: 'Зона' })).toHaveClass(/equipment-offer-row-disabled/); // строка помечена как "без цены" CSS-классом

        const expectedTotal = await sumOfferRowPrices(dialog); // сумма цен всех строк, посчитанная нами по DOM
        const totalText = await dialog.locator('.equipment-offer-total').innerText(); // текст из футера модалки ("Итого ... ₽")
        const actualTotal = Number(totalText.replace(/\D/g, '') || 0); // превращаем этот текст в число
        expect(actualTotal).toBe(expectedTotal); // футер должен совпадать с суммой строк (не разъезжаться при пересчёте)
        // smart2 (18 990) + 2 модуля RL2 (по 3 890), докупленные подборщиком под 5 зон.
        expect(actualTotal).toBe(26770); // и совпадать с конкретной ожидаемой суммой для этого сценария
    });

    test('добавление 5 "Прочего оборудования" отражается в коммерческом предложении', async ({ page }) => {
        // Большая кнопка "Добавить оборудование" исчезает после первого добавления —
        // дальше количество набирается "+" в списке "Добавленное оборудование".
        await page.getByTestId('add-other-equipment').click(); // добавляет одно устройство otherEquipment (connection_type: relay)
        for (let i = 1; i < 5; i += 1) { // добираем до 5 счётчиком
            await page.getByTestId('other-equipment-qty-inc').click();
        }

        // 5 устройств relay так же, как и 5 зон, превышают релейную ёмкость go/go+ (1 слот)
        // и требуют подбора smart2 с двумя модулями RL2 для покрытия дефицита.
        await expect(page.getByTestId('controller-card-smart2')).toHaveAttribute('data-active', 'true'); // карточка smart2 должна стать выбранной

        await page.getByTestId('open-commercial-offer').click(); // открываем "Коммерческое предложение"
        const dialog = page.getByRole('dialog', { name: 'Коммерческое предложение' });
        await expect(dialog).toBeVisible();

        // Заголовок секции и подпись строки здесь совпадают дословно ("Прочее оборудование"),
        // поэтому проверяем не текст секции целиком, а саму строку .equipment-offer-row.
        const otherSection = dialog.locator('section', { hasText: 'Прочее оборудование' }); // <section> с заголовком "Прочее оборудование"
        const otherRow = otherSection.locator('.equipment-offer-row', { hasText: 'Прочее оборудование' }); // конкретная строка устройства внутри секции
        await expect(otherRow).toBeVisible(); // строка устройства видна
        await expect(otherRow.getByText('5 шт', { exact: true })).toBeVisible(); // счётчик внутри строки показывает ровно "5 шт"

        // otherEquipment не продаётся MyHeat (нет цены в MYHEAT_PRICES), строка не должна нести цену.
        await expect(otherRow).toHaveClass(/equipment-offer-row-disabled/);

        const expectedTotal = await sumOfferRowPrices(dialog);
        const totalText = await dialog.locator('.equipment-offer-total').innerText();
        const actualTotal = Number(totalText.replace(/\D/g, '') || 0);
        expect(actualTotal).toBe(expectedTotal); // футер должен совпадать с суммой строк
        // smart2 (18 990) + 2 модуля RL2 (по 3 890) — тот же дефицит relay-ёмкости, что и у зон.
        expect(actualTotal).toBe(26770);
    });

    test('добавление датчика протечки и запорного клапана отражается в коммерческом предложении', async ({ page }) => {
        await page.getByTestId('add-leak-sensor').click(); // добавляем 1 "Датчик защиты от протечки" (сенсор, connection_type: di)
        await page.getByTestId('add-valve').click(); // добавляем 1 "Запорный клапан" (equipment, connection_type: double_relay, 2 relay-слота)

        // Клапан на double_relay так же, как 5 зон/прочего оборудования, превышает
        // релейную ёмкость go/go+ (1 слот) и требует подбора smart2 с одним модулем RL2.
        await expect(page.getByTestId('controller-card-smart2')).toHaveAttribute('data-active', 'true'); // карточка smart2 должна стать выбранной

        await page.getByTestId('open-commercial-offer').click(); // открываем "Коммерческое предложение"
        const dialog = page.getByRole('dialog', { name: 'Коммерческое предложение' });
        await expect(dialog).toBeVisible();

        const leakSection = dialog.locator('section', { hasText: 'Контроль протечки воды' }); // <section> с заголовком "Контроль протечки воды"
        const leakSensorRow = leakSection.locator('.equipment-offer-row', { hasText: 'Датчик протечки' }); // строка датчика (подпись в КП отличается от текста кнопки)
        const valveRow = leakSection.locator('.equipment-offer-row', { hasText: 'Запорный клапан' }); // строка клапана

        await expect(leakSensorRow).toBeVisible(); // строка датчика видна
        await expect(leakSensorRow.getByText('1 шт', { exact: true })).toBeVisible(); // ровно 1 штука
        await expect(valveRow).toBeVisible(); // строка клапана видна
        await expect(valveRow.getByText('1 шт', { exact: true })).toBeVisible(); // ровно 1 штука

        // Ни датчик протечки, ни клапан не продаются MyHeat (нет цены в MYHEAT_PRICES) — обе строки без цены.
        await expect(leakSensorRow).toHaveClass(/equipment-offer-row-disabled/);
        await expect(valveRow).toHaveClass(/equipment-offer-row-disabled/);

        const expectedTotal = await sumOfferRowPrices(dialog);
        const totalText = await dialog.locator('.equipment-offer-total').innerText();
        const actualTotal = Number(totalText.replace(/\D/g, '') || 0);
        expect(actualTotal).toBe(expectedTotal); // футер должен совпадать с суммой строк
        // smart2 (18 990) + 1 модуль RL2 (3 890) для двух дополнительных relay-слотов клапана.
        expect(actualTotal).toBe(22880);
    });

    test('добавление 5 бойлеров ГВС отражается в коммерческом предложении', async ({ page }) => {
        // Первый бойлер добавляется большой кнопкой; после этого она исчезает,
        // и количество набирается "+" в списке "Добавленные бойлеры ГВС".
        await page.getByTestId('add-gvs-boiler').click(); // boilerPump (relay|relay-s) + датчик flask-sensor-gvs-boiler
        for (let i = 1; i < 5; i += 1) { // добираем до 5
            await page.getByTestId('gvs-qty-inc').click();
        }

        // 5 насосов relay|relay-s так же превышают релейную ёмкость go/go+ (1 слот)
        // и требуют подбора smart2 с двумя модулями RL2.
        await expect(page.getByTestId('controller-card-smart2')).toHaveAttribute('data-active', 'true'); // карточка smart2 должна стать выбранной

        await page.getByTestId('open-commercial-offer').click(); // открываем "Коммерческое предложение"
        const dialog = page.getByRole('dialog', { name: 'Коммерческое предложение' });
        await expect(dialog).toBeVisible();

        const gvsSection = dialog.locator('section', { hasText: 'Бойлеры ГВС' }); // <section> с заголовком "Бойлеры ГВС"
        const gvsRow = gvsSection.locator('.equipment-offer-row', { hasText: 'Бойлер ГВС' }); // строка самого насоса бойлера
        await expect(gvsRow).toBeVisible(); // строка видна
        await expect(gvsRow.getByText('5 шт', { exact: true })).toBeVisible(); // ровно 5 штук
        // boilerPump не продаётся MyHeat отдельно (нет цены в MYHEAT_PRICES) — строка без цены.
        await expect(gvsRow).toHaveClass(/equipment-offer-row-disabled/);

        // Датчик бойлера (flask-sensor-gvs-boiler), добавляемый вместе с насосом, попадает
        // в отдельную секцию "Датчики температуры" и там уже платный (1 450 ₽ за штуку).
        const sensorsSection = dialog.locator('section', { hasText: 'Датчики температуры' });
        const boilerSensorRow = sensorsSection.locator('.equipment-offer-row', { hasText: 'Датчик бойлера' });
        await expect(boilerSensorRow).toBeVisible(); // строка датчика видна
        await expect(boilerSensorRow.getByText('5 шт', { exact: true })).toBeVisible(); // ровно 5 штук
        await expect(boilerSensorRow).not.toHaveClass(/equipment-offer-row-disabled/); // в отличие от насоса, у датчика есть цена

        const expectedTotal = await sumOfferRowPrices(dialog);
        const totalText = await dialog.locator('.equipment-offer-total').innerText();
        const actualTotal = Number(totalText.replace(/\D/g, '') || 0);
        expect(actualTotal).toBe(expectedTotal); // футер должен совпадать с суммой строк
        // smart2 (18 990) + 2 модуля RL2 (7 780) + 5 датчиков бойлера по 1 450 (7 250).
        expect(actualTotal).toBe(34020);
    });
});
