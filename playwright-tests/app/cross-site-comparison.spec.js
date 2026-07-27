import { test, expect } from '@playwright/test'; // импортируем test/expect из Playwright

/**
 * Сравнение небольших конфигураций оборудования между локальной страницей
 * подбора (/selection) и живым сайтом mhtest.ru/podbor-oborudovaniya: собираем
 * одну и ту же небольшую схему на обеих сторонах и сверяем итоговую цену
 * и состав оборудования, которое реально продаёт MyHeat (см. также
 * playwright-tests/app/selection-button-map.js — справочная таблица
 * соответствия кнопок и MYHEAT_PRICES в resources/js/selection.jsx).
 *
 * Числа в тестах не придуманы — каждый сценарий вручную прогнан на обеих
 * страницах через браузер 2026-07-27 перед тем, как попасть в assert.
 *
 * Внешний сайт (mhtest.ru) — реальная прод-страница, не наш стенд:
 * - иногда роняет исходящие TCP-соединения агента (см. mhtest-ru-legacy),
 *   поэтому retries выше, чем в остальных тестах;
 * - хранит состояние формы в localStorage/sessionStorage — обязательно
 *   чистим перед каждым сценарием, иначе значения предыдущего теста
 *   («Количество зон» и т.п.) утекут в следующий;
 * - "Подобрать оборудование" имеет data-test-id="confirm-equipment" и
 *   открывает модалку "Комплект для системы отопления №..." с ценами —
 *   это и есть точка сравнения, а не КП (Кнопки/модалки КП на этой
 *   странице нет вовсе, см. selection-button-map.js, секция "0. Общие действия").
 */

const MHTEST_URL = 'https://mhtest.ru/podbor-oborudovaniya';

test.describe.configure({ retries: 3 });

test.describe('/selection vs mhtest.ru — сравнение итоговой цены и состава', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/selection');
        await page.getByTestId('reset-equipment').click();
        await page.getByTestId('reset-equipment-confirm').click();
    });

    /** Открывает локальное КП и возвращает {total, text}. */
    const readLocalOffer = async (page) => {
        await page.getByTestId('open-commercial-offer').click();
        const dialog = page.getByRole('dialog', { name: 'Коммерческое предложение' });
        await expect(dialog).toBeVisible();
        const totalText = await dialog.locator('.equipment-offer-total').innerText();
        const text = await dialog.innerText();
        return { total: Number(totalText.replace(/\D/g, '') || 0), text };
    };

    /** Открывает mhtest.ru и чистит localStorage/sessionStorage (форма там персистентна). */
    const openLiveClean = async (page) => {
        await page.goto(MHTEST_URL, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.goto(MHTEST_URL, { waitUntil: 'domcontentloaded' });
    };

    /**
     * Кликает "+" у числового степпера live-формы по подписи (например "Количество зон").
     * DOM живого сайта: <label class="form-label">подпись</label> лежит внутри
     * ближайшего предка с классом form-number, который и содержит кнопки +/-.
     */
    const clickLiveStepperPlus = async (page, labelText, times = 1) => {
        await page.evaluate(({ labelText, times }) => {
            const label = Array.from(document.querySelectorAll('*'))
                .find((e) => e.children.length === 0 && e.innerText && e.innerText.trim() === labelText);
            const group = label.closest('.form-number');
            const plus = Array.from(group.querySelectorAll('button')).find((b) => b.querySelector('i.fa-plus'));
            for (let i = 0; i < times; i += 1) plus.click();
        }, { labelText, times });
    };

    /** Кликает toggle (checkbox) по подписи в отдельной строке (например ИБП). */
    const clickLiveToggleByLabel = async (page, labelText) => {
        await page.evaluate((labelText) => {
            const label = Array.from(document.querySelectorAll('*'))
                .find((e) => e.children.length === 0 && e.innerText && e.innerText.trim() === labelText);
            let row = label;
            for (let i = 0; i < 4 && row; i += 1) row = row.parentElement;
            row.querySelector('input[type=checkbox]').click();
        }, labelText);
    };

    /** Жмёт "confirm-equipment" и возвращает {total, text} из модалки "Комплект для системы отопления". */
    const readLiveKit = async (page) => {
        await page.locator('[data-test-id="confirm-equipment"]').click();
        const modal = page.locator('.modal.show');
        await expect(modal).toContainText('Комплект для системы отопления', { timeout: 15000 });
        const text = await modal.innerText();
        const match = text.match(/([\d\s]+)\s*₽\s*\n\s*Заказать комплект/);
        return { total: Number((match?.[1] || '0').replace(/\D/g, '')), text };
    };

    test('ИБП: обе стороны переключаются на GO+ вместо доплаты за отдельный модуль', async ({ page }) => {
        // Локально: тумблер data-test-id="ups-toggle" переключает GO -> GO+ (втроенный ИБП), без наценки.
        await page.getByTestId('ups-toggle').click({ force: true }); // кастомный toggle визуально перекрыт своим label
        const local = await readLocalOffer(page);
        expect(local.total).toBe(22490); // MYHEAT_PRICES.controllers['go+']

        // Live: тумблер "Источник бесперебойного питания" в разделе "Питание".
        await openLiveClean(page);
        await clickLiveToggleByLabel(page, 'Источник бесперебойного питания');
        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat GO!+');
        expect(live.total).toBe(22490);

        expect(local.total).toBe(live.total);
    });

    test('5 зон: relay-ёмкость go/go+ не хватает, обе стороны добирают smart2 + 2 модуля', async ({ page }) => {
        // Локально: data-test-id="add-zone", 5 кликов — воспроизводит сценарий из selection.spec.js.
        const addZoneButton = page.getByTestId('add-zone');
        for (let i = 0; i < 5; i += 1) await addZoneButton.click();
        const local = await readLocalOffer(page);
        // smart2 (18 990) + 2 модуля RL2 (по 3 890) — см. selection.spec.js.
        expect(local.total).toBe(26770);

        // Live: степпер "Количество зон" x5. Живой сайт добирает не RL2, а RL2S — но
        // цена модуля идентична (3 890 ₽ что за RL2, что за RL2S), поэтому итог совпадает
        // несмотря на разный выбор конкретной SKU модуля.
        await openLiveClean(page);
        await clickLiveStepperPlus(page, 'Количество зон', 5);
        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat Smart 2');
        expect(live.total).toBe(26770);

        expect(local.total).toBe(live.total);
    });

    test('проводной термостат с датчиком пола: правильная позиция каталога (3 м, 3690₽), не обычный flask-sensor', async ({ page }) => {
        // Регрессионный тест на фикс 2026-07-27: датчик пола термостата раньше молча
        // "съедал" один из комплектных flask-digital слотов PRO вместо отдельной оплаты.
        await page.getByTestId('controller-card-go').click();
        const addLabel = page.getByText('Добавить датчик пола').first();
        await addLabel.locator('input[type=checkbox]').check();
        await page.getByRole('button', { name: 'Добавить термостат' }).first().click();
        const local = await readLocalOffer(page);
        expect(local.text).toContain('Датчик пола (в колбе, 3 м)');
        // GO (16 990) + термостат (9 490) + датчик пола 3м (3 690, код 6304).
        expect(local.total).toBe(30170);

        // Live: модалка "Термостат" -> Проводной / Черный / toggle "Датчик пола" -> Добавить.
        await openLiveClean(page);
        await page.evaluate(() => {
            const heading = Array.from(document.querySelectorAll('*')).find((e) => e.innerText?.trim() === 'Термостат');
            heading.parentElement.parentElement.querySelector('button')?.click();
        });
        const modal = page.locator('.modal.show');
        await expect(modal).toContainText('Добавление нового термостата');
        await modal.getByText('Не выбрано').first().click();
        await page.getByText('Проводной', { exact: true }).click();
        await modal.getByText('Не выбрано').first().click();
        await page.getByText('Черный', { exact: true }).click();
        await modal.getByText('Датчик пола').locator('xpath=following-sibling::*[1]').click();
        await modal.getByRole('button', { name: 'Добавить' }).click();
        const live = await readLiveKit(page);
        expect(live.text).toContain('Датчик температуры в колбе MyHeat (3 метра)');
        expect(live.text).toContain('Код товара 6304');
        expect(live.total).toBe(30170);

        expect(local.total).toBe(live.total);
    });

    test('3 проводных датчика температуры: NTC-датчик требует отдельный модуль NTC 1-Wire', async ({ page }) => {
        // Локально: настенный цифровой (уходит в комплект GO бесплатно) + цифровой в колбе + NTC в колбе.
        const addWiredSensor = async (typeLabel) => {
            await page.getByRole('button', { name: typeLabel, exact: true }).click();
            const card = page.locator('div')
                .filter({ hasText: typeLabel })
                .filter({ has: page.getByRole('button', { name: 'Добавить датчик' }) })
                .last();
            await card.getByRole('button', { name: 'Добавить датчик' }).click();
        };
        await addWiredSensor('Настенный цифровой датчик');
        await addWiredSensor('Цифровой датчик в колбе');
        await addWiredSensor('NTC-датчик в колбе');
        const local = await readLocalOffer(page);
        expect(local.text).toContain('Модуль NTC 1-Wire');
        expect(local.text).toContain('Комплектный'); // настенный цифровой поглощён комплектом GO
        // GO (16 990) + модуль NTC 1-Wire (4 190) + датчик в колбе (1 450) + NTC-датчик (3 190).
        expect(local.total).toBe(25820);

        // Live: три раза модалка "Датчики температуры" с разными комбинациями select'ов.
        await openLiveClean(page);
        const addLiveSensor = async (mount, kind) => {
            await page.evaluate(() => {
                const heading = Array.from(document.querySelectorAll('*')).find((e) => e.innerText?.trim() === 'Датчики температуры');
                heading.parentElement.parentElement.querySelector('button')?.click();
            });
            const modal = page.locator('.modal.show');
            await expect(modal).toContainText('Тип подключения');
            await modal.getByText('Не выбрано').nth(0).click();
            await page.getByText('Проводной', { exact: true }).click();
            await modal.getByText('Не выбрано').nth(0).click();
            await page.getByText(mount, { exact: true }).click();
            await modal.getByText('Не выбрано').nth(0).click();
            await page.getByText(kind, { exact: true }).click();
            await modal.getByRole('button', { name: 'Добавить' }).click();
        };
        await addLiveSensor('Настенный', 'Цифровой');
        await addLiveSensor('В колбе', 'Цифровой');
        await addLiveSensor('В колбе', 'NTC');
        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat NTC-1wire');
        expect(live.text).not.toContain('Настенный цифровой'); // тоже поглощён комплектом GO, не показан вовсе
        expect(live.total).toBe(25820);

        expect(local.total).toBe(live.total);
    });

    test('1 бойлер ГВС: сам насос не продаётся, а его датчик — да', async ({ page }) => {
        // Локально: data-test-id="add-gvs-boiler" добавляет boilerPump (relay|relay-s, не продаётся)
        // и flask-sensor-gvs-boiler (продаётся, тарифицируется как обычный "Датчик в колбе").
        await page.getByTestId('add-gvs-boiler').click();
        const local = await readLocalOffer(page);
        expect(local.text).toContain('Датчик бойлера');
        // GO (16 990) + датчик бойлера (1 450). Сам насос бойлера — без цены.
        expect(local.total).toBe(18440);

        // Live: степпер "Количество бойлеров" x1.
        await openLiveClean(page);
        await clickLiveStepperPlus(page, 'Количество бойлеров', 1);
        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat GO!');
        expect(live.total).toBe(18440);

        expect(local.total).toBe(live.total);
    });

    test('одиночный датчик защиты от протечки: не продаётся, но требует Smart2 вместо GO', async ({ page }) => {
        // Локально: data-test-id="add-leak-sensor". Датчик протечки (connection_type: di)
        // не помещается в GO/GO+ — подборщик уходит на Smart2 (18 990), сам датчик без цены.
        await page.getByTestId('add-leak-sensor').click();
        const local = await readLocalOffer(page);
        expect(local.text).toContain('Датчик протечки');
        expect(local.text).toContain('Smart2');
        expect(local.total).toBe(18990); // MYHEAT_PRICES.controllers.smart2, датчик протечки без цены

        // Live: степпер "Проводной датчик защиты от протечки" x1.
        await openLiveClean(page);
        await clickLiveStepperPlus(page, 'Проводной датчик защиты от протечки', 1);
        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat Smart 2');
        expect(live.total).toBe(18990);

        expect(local.total).toBe(live.total);
    });

    test('одиночный запорный клапан: double_relay занимает 2 слота, нужен Smart2 + модуль RL2', async ({ page }) => {
        // Локально: data-test-id="add-valve". Клапан (double_relay, не продаётся) занимает
        // 2 relay-слота — не помещается в GO/GO+ (1 слот), подборщик добирает Smart2 + RL2.
        await page.getByTestId('add-valve').click();
        const local = await readLocalOffer(page);
        expect(local.text).toContain('Запорный клапан');
        expect(local.text).toContain('Модуль реле RL2');
        expect(local.total).toBe(22880); // smart2 (18 990) + RL2 (3 890), сам клапан без цены

        // Live: степпер "Запорный кран (220В/12В)" в секции "Единый шлейф" x1.
        await openLiveClean(page);
        await clickLiveStepperPlus(page, 'Запорный кран (220В/12В)', 1);
        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat Smart 2');
        expect(live.text).toContain('MyHeat RL2');
        expect(live.total).toBe(22880);

        expect(local.total).toBe(live.total);
    });

    test('одиночный дискретный вход "Датчик ОПС": не продаётся, помещается в Smart2 без доп. модулей', async ({ page }) => {
        // Локально: карточка "Датчик ОПС" в разделе "Дискретные входы" не имеет своего
        // data-test-id (в отличие от leak-sensor/valve) — ищем её кнопку "Добавить" по
        // соседству с текстом карточки, как и для остальных generic-карточек без testId.
        const card = page.locator('div')
            .filter({ hasText: 'Датчик ОПС' })
            .filter({ has: page.getByRole('button', { name: 'Добавить' }) })
            .last();
        await card.getByRole('button', { name: 'Добавить' }).click();
        const local = await readLocalOffer(page);
        expect(local.text).toContain('Датчик ОПС');
        expect(local.text).toContain('Smart2');
        expect(local.total).toBe(18990); // discrete_fire_alarm без цены, DI помещается в Smart2 без модулей

        // Live: модалка "Дискретные входы" -> select "Датчик ОПС" -> Добавить.
        await openLiveClean(page);
        await page.evaluate(() => {
            const heading = Array.from(document.querySelectorAll('*')).find((e) => e.innerText?.trim() === 'Дискретные входы');
            heading.parentElement.parentElement.querySelector('button')?.click();
        });
        const modal = page.locator('.modal.show');
        await expect(modal).toContainText('Выберите датчик');
        await modal.getByText('Не выбрано').click();
        await page.getByText('Датчик ОПС', { exact: true }).click();
        await modal.getByRole('button', { name: 'Добавить' }).click();
        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat Smart 2');
        expect(live.total).toBe(18990);

        expect(local.total).toBe(live.total);
    });

    test('одиночный насос 220V: не продаётся, помещается в GO без доп. модулей', async ({ page }) => {
        const card = page.locator('div')
            .filter({ hasText: 'Насос 220V' })
            .filter({ has: page.getByRole('button', { name: 'Добавить' }) })
            .last();
        await card.getByRole('button', { name: 'Добавить' }).click();
        const local = await readLocalOffer(page);
        expect(local.text).toContain('Насос 220V');
        expect(local.text).toContain('GO');
        expect(local.total).toBe(16990); // 220pump без цены, relay|relay-s помещается в 1 слот GO

        // Live: степпер "Количество насосов 220V" x1.
        await openLiveClean(page);
        await clickLiveStepperPlus(page, 'Количество насосов 220V', 1);
        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat GO!');
        expect(live.total).toBe(16990);

        expect(local.total).toBe(live.total);
    });

    test('одиночный насос 0-10V: требует PRO + модуль IO4 (di-канал, не relay)', async ({ page }) => {
        const card = page.locator('div')
            .filter({ hasText: 'Насос 0-10V' })
            .filter({ has: page.getByRole('button', { name: 'Добавить' }) })
            .last();
        await card.getByRole('button', { name: 'Добавить' }).click();
        const local = await readLocalOffer(page);
        expect(local.text).toContain('Насос 0-10V');
        expect(local.text).toContain('Модуль IO4');
        // PRO (44 990) + IO4 (7 990). 010pump (connection_type: di) идёт только через io4.channel_devices.
        expect(local.total).toBe(52980);

        // Live: степпер "Количество насосов 0-10V" x1.
        await openLiveClean(page);
        await clickLiveStepperPlus(page, 'Количество насосов 0-10V', 1);
        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat Pro');
        expect(live.text).toContain('MyHeat IO4');
        expect(live.total).toBe(52980);

        expect(local.total).toBe(live.total);
    });

    test('одиночное "Прочее оборудование": не продаётся, помещается в GO без доп. модулей', async ({ page }) => {
        await page.getByTestId('add-other-equipment').click();
        const local = await readLocalOffer(page);
        expect(local.text).toContain('Прочее оборудование');
        expect(local.total).toBe(16990); // otherEquipment без цены

        // Live: степпер "Количество прочего оборудования" x1.
        await openLiveClean(page);
        await clickLiveStepperPlus(page, 'Количество прочего оборудования', 1);
        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat GO!');
        expect(live.total).toBe(16990);

        expect(local.total).toBe(live.total);
    });

    test('смесительный узел (сервопривод 220V + цифровой датчик): узел бесплатный, датчик платный', async ({ page }) => {
        // Локально: узел (double_relay, не продаётся) занимает 2 relay-слота -> Smart2 + RL2S;
        // датчик смесительного узла (flask-sensor-mixing-unit) тарифицируется как обычный flask-digital.
        const card = page.locator('div')
            .filter({ hasText: 'Сервопривод 220V с цифровым датчиком' })
            .filter({ has: page.getByRole('button', { name: 'Добавить' }) })
            .last();
        await card.getByRole('button', { name: 'Добавить' }).click();
        const local = await readLocalOffer(page);
        expect(local.text).toContain('Датчик смесительного узла');
        expect(local.text).toContain('Модуль реле RL2S');
        // smart2 (18 990) + RL2S (3 890) + датчик смесительного узла (1 450).
        expect(local.total).toBe(24330);

        // Live: модалка "Смесительные узлы" -> "220V" + "Цифровой" -> Добавить.
        await openLiveClean(page);
        await page.evaluate(() => {
            const heading = Array.from(document.querySelectorAll('*')).find((e) => e.innerText?.trim() === 'Смесительные узлы');
            heading.parentElement.parentElement.querySelector('button')?.click();
        });
        const modal = page.locator('.modal.show');
        await expect(modal).toContainText('Добавление смесительного узла');
        await modal.getByText('Не выбрано').first().click();
        await page.getByText('220V', { exact: true }).click();
        await modal.getByText('Не выбрано').first().click();
        await page.getByText('Цифровой', { exact: true }).click();
        await modal.getByRole('button', { name: 'Добавить' }).click();
        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat Smart 2');
        expect(live.text).toContain('MyHeat RL2S');
        expect(live.total).toBe(24330);

        expect(local.total).toBe(live.total);
    });

    test('беспроводной термостат: обе стороны переходят на GO+ (встроенный радиодатчик в комплекте)', async ({ page }) => {
        // Локально: вторая карточка термостата (первая — проводная) — "Беспроводной".
        const card = page.locator('div')
            .filter({ hasText: 'Беспроводной' })
            .filter({ has: page.getByRole('button', { name: 'Добавить термостат' }) })
            .last();
        await card.getByRole('button', { name: 'Добавить термостат' }).click();
        const local = await readLocalOffer(page);
        expect(local.text).toContain('Термостат беспроводной, черный');
        expect(local.text).toContain('GO+');
        // GO+ (22 490, включает комплектный wireless-wall датчик) + термостат (9 490).
        expect(local.total).toBe(31980);

        // Live: модалка "Термостат" -> "Беспроводной" / "Черный", без датчика пола.
        await openLiveClean(page);
        await page.evaluate(() => {
            const heading = Array.from(document.querySelectorAll('*')).find((e) => e.innerText?.trim() === 'Термостат');
            heading.parentElement.parentElement.querySelector('button')?.click();
        });
        const modal = page.locator('.modal.show');
        await expect(modal).toContainText('Добавление нового термостата');
        await modal.getByText('Не выбрано').first().click();
        await page.getByText('Беспроводной', { exact: true }).click();
        await modal.getByText('Не выбрано').first().click();
        await page.getByText('Черный', { exact: true }).click();
        await modal.getByRole('button', { name: 'Добавить' }).click();
        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat GO!+');
        expect(live.total).toBe(31980);

        expect(local.total).toBe(live.total);
    });

    test('смесительный узел (сервопривод 0-10V + NTC-датчик): требует PRO + IO4, датчик платный', async ({ page }) => {
        // В отличие от 220V-варианта, привод 0-10V идёт только через IO4 (connection_type: di),
        // и у него нет "цифрового" варианта датчика — только NTC (это подтверждено и в live
        // select "Выберите тип датчика", где для 0-10V доступен единственный пункт "NTC").
        const card = page.locator('div')
            .filter({ hasText: 'Сервопривод 0-10V с NTC-датчиком' })
            .filter({ has: page.getByRole('button', { name: 'Добавить' }) })
            .last();
        await card.getByRole('button', { name: 'Добавить' }).click();
        const local = await readLocalOffer(page);
        expect(local.text).toContain('NTC-датчик температуры');
        expect(local.text).toContain('Модуль IO4');
        // PRO (44 990) + IO4 (7 990) + NTC-датчик (3 190, wired-flask-ntc).
        expect(local.total).toBe(56170);

        // Live: модалка "Смесительные узлы" -> "0-10V" -> Добавить. "Тип датчика"
        // автозаполняется в "NTC" сразу после выбора привода (единственный вариант
        // для 0-10V) — второй select руками не трогаем, кликать там нечего.
        await openLiveClean(page);
        await page.evaluate(() => {
            const heading = Array.from(document.querySelectorAll('*')).find((e) => e.innerText?.trim() === 'Смесительные узлы');
            heading.parentElement.parentElement.querySelector('button')?.click();
        });
        const modal = page.locator('.modal.show');
        await expect(modal).toContainText('Добавление смесительного узла');
        await modal.getByText('Не выбрано').first().click();
        await page.getByText('0-10V', { exact: true }).click();
        await expect(modal).toContainText('NTC');
        await modal.getByRole('button', { name: 'Добавить' }).click();
        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat Pro');
        expect(live.text).toContain('MyHeat IO4');
        expect(live.total).toBe(56170);

        expect(local.total).toBe(live.total);
    });

    test('дискретный вход "Запрос тепла от бассейна": не продаётся, помещается в Smart2 без модулей', async ({ page }) => {
        const card = page.locator('div')
            .filter({ hasText: 'Запрос тепла от бассейна' })
            .filter({ has: page.getByRole('button', { name: 'Добавить' }) })
            .last();
        await card.getByRole('button', { name: 'Добавить' }).click();
        const local = await readLocalOffer(page);
        expect(local.text).toContain('Запрос тепла от бассейна');
        expect(local.text).toContain('Smart2');
        expect(local.total).toBe(18990); // discrete_pool без цены

        // Live: модалка "Дискретные входы" -> select "Запрос тепла от бассейна" -> Добавить.
        await openLiveClean(page);
        await page.evaluate(() => {
            const heading = Array.from(document.querySelectorAll('*')).find((e) => e.innerText?.trim() === 'Дискретные входы');
            heading.parentElement.parentElement.querySelector('button')?.click();
        });
        const modal = page.locator('.modal.show');
        await expect(modal).toContainText('Выберите датчик');
        await modal.getByText('Не выбрано').click();
        await page.getByText('Запрос тепла от бассейна', { exact: true }).click();
        await modal.getByRole('button', { name: 'Добавить' }).click();
        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat Smart 2');
        expect(live.total).toBe(18990);

        expect(local.total).toBe(live.total);
    });

    test('беспроводной уличный датчик температуры (без термостата): обе стороны переходят на GO+', async ({ page }) => {
        // Локально: карточка "Уличный датчик температуры" — это селектор ТИПА внутри
        // общей беспроводной секции (соседствует со "Настенный датчик температуры"),
        // а не отдельная кнопка "Добавить" — сначала выбираем тип, потом жмём "Добавить датчик".
        await page.getByRole('button', { name: 'Уличный датчик температуры', exact: true }).click();
        const card = page.locator('div')
            .filter({ hasText: 'Уличный датчик температуры' })
            .filter({ has: page.getByRole('button', { name: 'Добавить датчик' }) })
            .last();
        await card.getByRole('button', { name: 'Добавить датчик' }).click();
        const local = await readLocalOffer(page);
        expect(local.text).toContain('Беспроводной Уличный датчик температуры');
        expect(local.text).toContain('GO+');
        // GO+ (22 490, включает комплектный wireless-wall датчик) + уличный датчик (5 890, wireless-outdoor).
        expect(local.total).toBe(28380);

        // Live: toggle "Беспроводной уличный датчик температуры".
        await openLiveClean(page);
        await clickLiveToggleByLabel(page, 'Беспроводной уличный датчик температуры');
        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat GO!+');
        expect(live.total).toBe(28380);

        expect(local.total).toBe(live.total);
    });

    // --- Комбинированные схемы: несколько групп оборудования одновременно.
    // Такие сценарии нагружают сразу несколько линий (relay / 1-wire / 4-20 / di)
    // и ловят расхождения в подсчёте слотов и подборе модулей, которых не видно
    // на одиночных устройствах.

    test('комбинация 5 зон + 5 насосов 220V + 5 проводных термостатов: PRO + один RL6', async ({ page }) => {
        const addZone = page.getByTestId('add-zone');
        for (let i = 0; i < 5; i += 1) await addZone.click();

        const pumpCard = page.locator('div')
            .filter({ hasText: 'Насос 220V' })
            .filter({ has: page.getByRole('button', { name: 'Добавить' }) })
            .last();
        for (let i = 0; i < 5; i += 1) await pumpCard.getByRole('button', { name: 'Добавить' }).click();

        const wiredThermostatAdd = page.getByRole('button', { name: 'Добавить термостат' }).first();
        for (let i = 0; i < 5; i += 1) await wiredThermostatAdd.click();

        const local = await readLocalOffer(page);
        expect(local.text).toContain('Модуль реле RL6'); // 15 relay-потребителей закрываются одним RL6 поверх PRO
        expect(local.text).toContain('5 шт');
        // PRO (44 990) + RL6 (8 990) + 5 термостатов (47 450). Зоны и насосы сами по себе не продаются.
        expect(local.total).toBe(101430);

        // Live: два степпера + модалка термостата, количество которого доводится
        // до 5 уже своим степпером у добавленной позиции.
        await openLiveClean(page);
        await clickLiveStepperPlus(page, 'Количество зон', 5);
        await clickLiveStepperPlus(page, 'Количество насосов 220V', 5);
        await page.evaluate(() => {
            const heading = Array.from(document.querySelectorAll('*')).find((e) => e.innerText?.trim() === 'Термостат');
            heading.parentElement.parentElement.querySelector('button')?.click();
        });
        const modal = page.locator('.modal.show');
        await expect(modal).toContainText('Добавление нового термостата');
        await modal.getByText('Не выбрано').first().click();
        await page.getByText('Проводной', { exact: true }).click();
        await modal.getByText('Не выбрано').first().click();
        await page.getByText('Черный', { exact: true }).click();
        await modal.getByRole('button', { name: 'Добавить' }).click();
        await clickLiveStepperPlus(page, 'Количество', 4); // добавленный термостат: 1 -> 5

        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat Pro');
        expect(live.text).toContain('MyHeat RL6');
        expect(live.total).toBe(101430);

        expect(local.total).toBe(live.total);
    });

    test('комбинация 3 бойлера ГВС + 3 зоны + 2 датчика давления: комплектные датчики PRO гасят часть цены', async ({ page }) => {
        const addGvs = page.getByTestId('add-gvs-boiler');
        for (let i = 0; i < 3; i += 1) await addGvs.click();
        const addZone = page.getByTestId('add-zone');
        for (let i = 0; i < 3; i += 1) await addZone.click();
        const pressureCard = page.locator('div')
            .filter({ hasText: 'Токовый датчик давления' })
            .filter({ has: page.getByRole('button', { name: 'Добавить' }) })
            .last();
        for (let i = 0; i < 2; i += 1) await pressureCard.getByRole('button', { name: 'Добавить' }).click();

        const local = await readLocalOffer(page);
        // Второй датчик 4-20 уже не влезает во встроенный порт PRO — нужен IO4.
        expect(local.text).toContain('Модуль IO4');
        // Из трёх датчиков бойлера два закрыты комплектными flask-digital PRO, платный только один.
        expect(local.text).toContain('Датчик бойлера');
        // PRO (44 990) + IO4 (7 990) + 1 датчик бойлера (1 450) + 2 датчика давления (11 980).
        expect(local.total).toBe(66410);

        await openLiveClean(page);
        await clickLiveStepperPlus(page, 'Количество бойлеров', 3);
        await clickLiveStepperPlus(page, 'Количество зон', 3);
        await clickLiveStepperPlus(page, 'Датчик 4–20мА', 2);
        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat Pro');
        expect(live.text).toContain('MyHeat IO4');
        expect(live.total).toBe(66410);

        expect(local.total).toBe(live.total);
    });

    test('комбинация 4 зоны + 4 датчика ОПС + 3 NTC-датчика: relay/di/1-wire одновременно, PRO + DI6 + NTC-модуль', async ({ page }) => {
        // Самая смешанная схема набора: relay (зоны), di (ОПС) и 1-wire/ntc (датчики)
        // нагружаются одновременно, поэтому подбор обязан добрать сразу два разных
        // модуля — дискретный DI6 и NTC 1-Wire — поверх PRO.
        const addZone = page.getByTestId('add-zone');
        for (let i = 0; i < 4; i += 1) await addZone.click();

        const opsCard = page.locator('div')
            .filter({ hasText: 'Датчик ОПС' })
            .filter({ has: page.getByRole('button', { name: 'Добавить' }) })
            .last();
        for (let i = 0; i < 4; i += 1) await opsCard.getByRole('button', { name: 'Добавить' }).click();

        await page.getByRole('button', { name: 'NTC-датчик в колбе', exact: true }).click();
        const ntcCard = page.locator('div')
            .filter({ hasText: 'NTC-датчик в колбе' })
            .filter({ has: page.getByRole('button', { name: 'Добавить датчик' }) })
            .last();
        for (let i = 0; i < 3; i += 1) await ntcCard.getByRole('button', { name: 'Добавить датчик' }).click();

        const local = await readLocalOffer(page);
        expect(local.text).toContain('Модуль DI6');
        expect(local.text).toContain('Модуль NTC 1-Wire');
        // PRO (44 990) + DI6 (7 990) + NTC 1-Wire (4 190) + 3 NTC-датчика (9 570).
        expect(local.total).toBe(66740);

        // Live: степпер зон + модалка дискретного входа (ОПС, затем количество 4)
        // + модалка датчика температуры (Проводной/В колбе/NTC, затем количество 3).
        await openLiveClean(page);
        await clickLiveStepperPlus(page, 'Количество зон', 4);

        await page.evaluate(() => {
            const heading = Array.from(document.querySelectorAll('*')).find((e) => e.innerText?.trim() === 'Дискретные входы');
            let node = heading;
            for (let i = 0; i < 8; i += 1) {
                node = node.parentElement;
                if (node.querySelector('button')) { node.querySelector('button').click(); break; }
            }
        });
        const diModal = page.locator('.modal.show');
        await expect(diModal).toContainText('Выберите датчик');
        await diModal.getByText('Не выбрано').click();
        await page.getByText('Датчик ОПС', { exact: true }).click();
        await diModal.getByRole('button', { name: 'Добавить' }).click();
        await clickLiveStepperPlus(page, 'Количество', 3); // добавленный ОПС: 1 -> 4

        await page.evaluate(() => {
            const heading = Array.from(document.querySelectorAll('*')).find((e) => e.innerText?.trim() === 'Датчики температуры');
            let node = heading;
            for (let i = 0; i < 8; i += 1) {
                node = node.parentElement;
                if (node.querySelector('button')) { node.querySelector('button').click(); break; }
            }
        });
        const tempModal = page.locator('.modal.show');
        await expect(tempModal).toContainText('Тип подключения');
        await tempModal.getByText('Не выбрано').nth(0).click();
        await page.getByText('Проводной', { exact: true }).click();
        await tempModal.getByText('Не выбрано').nth(0).click();
        await page.getByText('В колбе', { exact: true }).click();
        await tempModal.getByText('Не выбрано').nth(0).click();
        await page.getByText('NTC', { exact: true }).click();
        await tempModal.getByRole('button', { name: 'Добавить' }).click();
        await clickLiveStepperPlus(page, 'Количество', 2); // добавленный NTC-датчик: 1 -> 3

        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat DI6');
        expect(live.text).toContain('MyHeat NTC-1wire');
        expect(live.total).toBe(66740);

        expect(local.total).toBe(live.total);
    });

    test('комбинация 6 зон + 2 бойлера ГВС + 2 запорных клапана: комплектные датчики PRO закрывают оба бойлера', async ({ page }) => {
        const addZone = page.getByTestId('add-zone');
        for (let i = 0; i < 6; i += 1) await addZone.click();
        const addGvs = page.getByTestId('add-gvs-boiler');
        for (let i = 0; i < 2; i += 1) await addGvs.click();
        const addValve = page.getByTestId('add-valve');
        for (let i = 0; i < 2; i += 1) await addValve.click();

        const local = await readLocalOffer(page);
        expect(local.text).toContain('Модуль реле RL6');
        // Оба датчика бойлера укладываются в 2 комплектных flask-digital PRO — платных датчиков нет.
        expect(local.text).not.toContain('Датчик бойлера');
        expect(local.total).toBe(53980); // PRO (44 990) + RL6 (8 990), вся арматура без цены

        await openLiveClean(page);
        await clickLiveStepperPlus(page, 'Количество зон', 6);
        await clickLiveStepperPlus(page, 'Количество бойлеров', 2);
        await clickLiveStepperPlus(page, 'Запорный кран (220В/12В)', 2);
        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat Pro');
        expect(live.text).toContain('MyHeat RL6');
        expect(live.total).toBe(53980);

        expect(local.total).toBe(live.total);
    });

    test('комбинация 2 смесительных узла + 3 насоса 0-10V + 2 датчика давления: всё через каналы IO4', async ({ page }) => {
        // 3 насоса 0-10V (di) + 1 датчик 4-20 занимают 4 канала одного IO4,
        // второй датчик давления садится на встроенный порт PRO — модуль всё ещё один.
        const mixCard = page.locator('div')
            .filter({ hasText: 'Сервопривод 220V с цифровым датчиком' })
            .filter({ has: page.getByRole('button', { name: 'Добавить' }) })
            .last();
        for (let i = 0; i < 2; i += 1) await mixCard.getByRole('button', { name: 'Добавить' }).click();

        const pumpCard = page.locator('div')
            .filter({ hasText: 'Насос 0-10V' })
            .filter({ has: page.getByRole('button', { name: 'Добавить' }) })
            .last();
        for (let i = 0; i < 3; i += 1) await pumpCard.getByRole('button', { name: 'Добавить' }).click();

        const pressureCard = page.locator('div')
            .filter({ hasText: 'Токовый датчик давления' })
            .filter({ has: page.getByRole('button', { name: 'Добавить' }) })
            .last();
        for (let i = 0; i < 2; i += 1) await pressureCard.getByRole('button', { name: 'Добавить' }).click();

        const local = await readLocalOffer(page);
        expect(local.text).toContain('Модуль IO4');
        // PRO (44 990) + один IO4 (7 990) + 2 датчика давления (11 980).
        expect(local.total).toBe(64960);

        await openLiveClean(page);
        await clickLiveStepperPlus(page, 'Количество насосов 0-10V', 3);
        await clickLiveStepperPlus(page, 'Датчик 4–20мА', 2);
        await page.evaluate(() => {
            const heading = Array.from(document.querySelectorAll('*')).find((e) => e.innerText?.trim() === 'Смесительные узлы');
            let node = heading;
            for (let i = 0; i < 8; i += 1) {
                node = node.parentElement;
                if (node.querySelector('button')) { node.querySelector('button').click(); break; }
            }
        });
        const mixModal = page.locator('.modal.show');
        await expect(mixModal).toContainText('Добавление смесительного узла');
        await mixModal.getByText('Не выбрано').first().click();
        await page.getByText('220V', { exact: true }).click();
        await mixModal.getByText('Не выбрано').first().click();
        await page.getByText('Цифровой', { exact: true }).click();
        await mixModal.getByRole('button', { name: 'Добавить' }).click();
        await clickLiveStepperPlus(page, 'Количество', 1); // смесительный узел: 1 -> 2

        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat IO4');
        expect(live.total).toBe(64960);

        expect(local.total).toBe(live.total);
    });

    test('комбинация 3 проводных + 2 беспроводных термостата + 4 датчика протечки: Smart2 добирает радиомодуль RDT2', async ({ page }) => {
        // Беспроводные термостаты на Smart2 требуют радиомодуль RDT2 (4 990) —
        // единственный сценарий в наборе, где подбирается именно радиомодуль.
        const wiredAdd = page.getByRole('button', { name: 'Добавить термостат' }).first();
        for (let i = 0; i < 3; i += 1) await wiredAdd.click();
        const wirelessAdd = page.getByRole('button', { name: 'Добавить термостат' }).nth(1);
        for (let i = 0; i < 2; i += 1) await wirelessAdd.click();
        const addLeak = page.getByTestId('add-leak-sensor');
        for (let i = 0; i < 4; i += 1) await addLeak.click();

        const local = await readLocalOffer(page);
        expect(local.text).toContain('Радиомодуль RDT2');
        expect(local.text).toContain('Термостат проводной, черный');
        expect(local.text).toContain('Термостат беспроводной, черный');
        // Smart2 (18 990) + RDT2 (4 990) + 3 проводных (28 470) + 2 беспроводных (18 980).
        expect(local.total).toBe(71430);

        // Live: проводной и беспроводной термостаты — две отдельные позиции,
        // каждая со своим степпером количества.
        await openLiveClean(page);
        await clickLiveStepperPlus(page, 'Проводной датчик защиты от протечки', 4);
        const addLiveThermostat = async (type) => {
            await page.evaluate(() => {
                const heading = Array.from(document.querySelectorAll('*')).find((e) => e.innerText?.trim() === 'Термостат');
                let node = heading;
                for (let i = 0; i < 8; i += 1) {
                    node = node.parentElement;
                    if (node.querySelector('button')) { node.querySelector('button').click(); break; }
                }
            });
            const modal = page.locator('.modal.show');
            await expect(modal).toContainText('Добавление нового термостата');
            await modal.getByText('Не выбрано').first().click();
            await page.getByText(type, { exact: true }).click();
            await modal.getByText('Не выбрано').first().click();
            await page.getByText('Черный', { exact: true }).click();
            await modal.getByRole('button', { name: 'Добавить' }).click();
        };
        await addLiveThermostat('Проводной');
        await clickLiveStepperPlus(page, 'Количество', 2); // проводной: 1 -> 3
        await addLiveThermostat('Беспроводной');
        // У беспроводного термостата свой степпер — он последний из добавленных позиций.
        await page.evaluate(() => {
            const heading = Array.from(document.querySelectorAll('*')).find((e) => e.innerText?.trim() === 'Термостат');
            let sec = heading;
            for (let i = 0; i < 10; i += 1) {
                sec = sec.parentElement;
                if (sec.innerText.includes('Беспроводной термостат')) break;
            }
            const groups = Array.from(sec.querySelectorAll('.form-number'));
            const wireless = groups[groups.length - 1];
            wireless.querySelector('button i.fa-plus').closest('button').click();
        });

        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat RDT2');
        expect(live.total).toBe(71430);

        expect(local.total).toBe(live.total);
    });

    test('комбинация 8 зон + 4 бойлера ГВС: два датчика бойлера платные, два закрыты комплектом PRO', async ({ page }) => {
        const addZone = page.getByTestId('add-zone');
        for (let i = 0; i < 8; i += 1) await addZone.click();
        const addGvs = page.getByTestId('add-gvs-boiler');
        for (let i = 0; i < 4; i += 1) await addGvs.click();

        const local = await readLocalOffer(page);
        expect(local.text).toContain('Модуль реле RL6');
        // 4 датчика бойлера: 2 закрыты комплектными flask-digital PRO, 2 платные (по 1 450).
        expect(local.text).toContain('Датчик бойлера');
        expect(local.total).toBe(56880); // PRO (44 990) + RL6 (8 990) + 2 датчика (2 900)

        await openLiveClean(page);
        await clickLiveStepperPlus(page, 'Количество зон', 8);
        await clickLiveStepperPlus(page, 'Количество бойлеров', 4);
        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat Pro');
        expect(live.text).toContain('MyHeat RL6');
        expect(live.total).toBe(56880);

        expect(local.total).toBe(live.total);
    });

    test('комбинация 5 датчиков протечки + 3 клапана + 2 прочего оборудования: сразу DI6 и RL6', async ({ page }) => {
        // Датчики протечки грузят DI-линию, клапаны (double_relay) и прочее
        // оборудование — relay-линию, поэтому добираются два разных модуля сразу.
        const addLeak = page.getByTestId('add-leak-sensor');
        for (let i = 0; i < 5; i += 1) await addLeak.click();
        const addValve = page.getByTestId('add-valve');
        for (let i = 0; i < 3; i += 1) await addValve.click();
        const addOther = page.getByTestId('add-other-equipment');
        for (let i = 0; i < 2; i += 1) await addOther.click();

        const local = await readLocalOffer(page);
        expect(local.text).toContain('Модуль DI6');
        expect(local.text).toContain('Модуль реле RL6');
        expect(local.total).toBe(61970); // PRO (44 990) + DI6 (7 990) + RL6 (8 990)

        await openLiveClean(page);
        await clickLiveStepperPlus(page, 'Проводной датчик защиты от протечки', 5);
        await clickLiveStepperPlus(page, 'Запорный кран (220В/12В)', 3);
        await clickLiveStepperPlus(page, 'Количество прочего оборудования', 2);
        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat DI6');
        expect(live.text).toContain('MyHeat RL6');
        expect(live.total).toBe(61970);

        expect(local.total).toBe(live.total);
    });

    test('комбинация 4 бойлера ГВС + 5 NTC-датчиков: Smart2 добирает 2×RL2 и NTC-модуль', async ({ page }) => {
        // Единственный комплектный датчик Smart2 — настенный цифровой, поэтому все
        // 4 датчика бойлера платные; 5 NTC-датчиков требуют модуль NTC 1-Wire.
        const addGvs = page.getByTestId('add-gvs-boiler');
        for (let i = 0; i < 4; i += 1) await addGvs.click();
        await page.getByRole('button', { name: 'NTC-датчик в колбе', exact: true }).click();
        const ntcCard = page.locator('div')
            .filter({ hasText: 'NTC-датчик в колбе' })
            .filter({ has: page.getByRole('button', { name: 'Добавить датчик' }) })
            .last();
        for (let i = 0; i < 5; i += 1) await ntcCard.getByRole('button', { name: 'Добавить датчик' }).click();

        const local = await readLocalOffer(page);
        expect(local.text).toContain('Модуль реле RL2');
        expect(local.text).toContain('Модуль NTC 1-Wire');
        // Smart2 (18 990) + 2×RL2 (7 780) + NTC-модуль (4 190) + 4 датчика бойлера (5 800) + 5 NTC (15 950).
        expect(local.total).toBe(52710);

        await openLiveClean(page);
        await clickLiveStepperPlus(page, 'Количество бойлеров', 4);
        await page.evaluate(() => {
            const heading = Array.from(document.querySelectorAll('*')).find((e) => e.innerText?.trim() === 'Датчики температуры');
            let node = heading;
            for (let i = 0; i < 8; i += 1) {
                node = node.parentElement;
                if (node.querySelector('button')) { node.querySelector('button').click(); break; }
            }
        });
        const modal = page.locator('.modal.show');
        await expect(modal).toContainText('Тип подключения');
        await modal.getByText('Не выбрано').nth(0).click();
        await page.getByText('Проводной', { exact: true }).click();
        await modal.getByText('Не выбрано').nth(0).click();
        await page.getByText('В колбе', { exact: true }).click();
        await modal.getByText('Не выбрано').nth(0).click();
        await page.getByText('NTC', { exact: true }).click();
        await modal.getByRole('button', { name: 'Добавить' }).click();
        await clickLiveStepperPlus(page, 'Количество', 4); // NTC-датчик: 1 -> 5

        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat NTC-1wire');
        expect(live.total).toBe(52710);

        expect(local.total).toBe(live.total);
    });

    test('комбинация 3 зоны + 3 ОПС + 2 запроса от бассейна + 1 датчик давления: DI6 под пять DI-устройств', async ({ page }) => {
        const addZone = page.getByTestId('add-zone');
        for (let i = 0; i < 3; i += 1) await addZone.click();
        const addByTitle = async (title, times) => {
            const card = page.locator('div')
                .filter({ hasText: title })
                .filter({ has: page.getByRole('button', { name: 'Добавить' }) })
                .last();
            for (let i = 0; i < times; i += 1) await card.getByRole('button', { name: 'Добавить' }).click();
        };
        await addByTitle('Датчик ОПС', 3);
        await addByTitle('Запрос тепла от бассейна', 2);
        await addByTitle('Токовый датчик давления', 1);

        const local = await readLocalOffer(page);
        expect(local.text).toContain('Модуль DI6'); // 5 DI-устройств не влезают во встроенные входы PRO
        expect(local.total).toBe(58970); // PRO (44 990) + DI6 (7 990) + датчик давления (5 990)

        await openLiveClean(page);
        await clickLiveStepperPlus(page, 'Количество зон', 3);
        await clickLiveStepperPlus(page, 'Датчик 4–20мА', 1);
        const addLiveDiscrete = async (name, extra) => {
            await page.evaluate(() => {
                const heading = Array.from(document.querySelectorAll('*')).find((e) => e.innerText?.trim() === 'Дискретные входы');
                let node = heading;
                for (let i = 0; i < 8; i += 1) {
                    node = node.parentElement;
                    if (node.querySelector('button')) { node.querySelector('button').click(); break; }
                }
            });
            const modal = page.locator('.modal.show');
            await expect(modal).toContainText('Выберите датчик');
            await modal.getByText('Не выбрано').click();
            await page.getByText(name, { exact: true }).click();
            await modal.getByRole('button', { name: 'Добавить' }).click();
            if (extra > 0) {
                // Степпер только что добавленной позиции — последний в секции.
                await page.evaluate((times) => {
                    const heading = Array.from(document.querySelectorAll('*')).find((e) => e.innerText?.trim() === 'Дискретные входы');
                    let sec = heading;
                    for (let i = 0; i < 10; i += 1) {
                        sec = sec.parentElement;
                        if (sec.innerText.includes('Количество')) break;
                    }
                    const groups = Array.from(sec.querySelectorAll('.form-number'));
                    const last = groups[groups.length - 1];
                    const plus = Array.from(last.querySelectorAll('button')).find((b) => b.querySelector('i.fa-plus'));
                    for (let i = 0; i < times; i += 1) plus.click();
                }, extra);
            }
        };
        await addLiveDiscrete('Датчик ОПС', 2);
        await addLiveDiscrete('Запрос тепла от бассейна', 1);

        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat DI6');
        expect(live.total).toBe(58970);

        expect(local.total).toBe(live.total);
    });

    test('комбинация 4 насоса 220V + 3 термостата + беспроводной уличный датчик: Smart2 + 2×RL2 + RDT2', async ({ page }) => {
        // Уличный датчик на live задаётся бинарным тумблером (ровно 1 шт),
        // поэтому локально тоже берём один — иначе схемы будут несопоставимы.
        const pumpCard = page.locator('div')
            .filter({ hasText: 'Насос 220V' })
            .filter({ has: page.getByRole('button', { name: 'Добавить' }) })
            .last();
        for (let i = 0; i < 4; i += 1) await pumpCard.getByRole('button', { name: 'Добавить' }).click();
        const wiredThermostatAdd = page.getByRole('button', { name: 'Добавить термостат' }).first();
        for (let i = 0; i < 3; i += 1) await wiredThermostatAdd.click();
        await page.getByRole('button', { name: 'Уличный датчик температуры', exact: true }).click();
        const outdoorCard = page.locator('div')
            .filter({ hasText: 'Уличный датчик температуры' })
            .filter({ has: page.getByRole('button', { name: 'Добавить датчик' }) })
            .last();
        await outdoorCard.getByRole('button', { name: 'Добавить датчик' }).click();

        const local = await readLocalOffer(page);
        expect(local.text).toContain('Радиомодуль RDT2'); // беспроводной датчик на Smart2 требует радиомодуль
        expect(local.text).toContain('Модуль реле RL2');
        // Smart2 (18 990) + 2×RL2 (7 780) + RDT2 (4 990) + уличный датчик (5 890) + 3 термостата (28 470).
        expect(local.total).toBe(66120);

        await openLiveClean(page);
        await clickLiveStepperPlus(page, 'Количество насосов 220V', 4);
        await clickLiveToggleByLabel(page, 'Беспроводной уличный датчик температуры');
        await page.evaluate(() => {
            const heading = Array.from(document.querySelectorAll('*')).find((e) => e.innerText?.trim() === 'Термостат');
            let node = heading;
            for (let i = 0; i < 8; i += 1) {
                node = node.parentElement;
                if (node.querySelector('button')) { node.querySelector('button').click(); break; }
            }
        });
        const modal = page.locator('.modal.show');
        await expect(modal).toContainText('Добавление нового термостата');
        await modal.getByText('Не выбрано').first().click();
        await page.getByText('Проводной', { exact: true }).click();
        await modal.getByText('Не выбрано').first().click();
        await page.getByText('Черный', { exact: true }).click();
        await modal.getByRole('button', { name: 'Добавить' }).click();
        await clickLiveStepperPlus(page, 'Количество', 2); // термостат: 1 -> 3

        const live = await readLiveKit(page);
        expect(live.text).toContain('MyHeat RDT2');
        expect(live.total).toBe(66120);

        expect(local.total).toBe(live.total);
    });

    // ЭТОТ ТЕСТ НАМЕРЕННО КРАСНЫЙ (обычный expect, не test.fail()) — документирует
    // реальный пробел функциональности, а не флейк и не другой выбор контроллера.
    // Проверено 2026-07-27: на /selection нет НИКАКОГО упоминания "блок питания"/
    // FARADAY ни в UI (document.body.innerText), ни в коде resources/js/selection.jsx
    // (grep по "faraday"/"дополнительный блок питания" — пусто), ни ключа в
    // MYHEAT_PRICES. На mhtest.ru это отдельная секция "Дополнительный блок питания"
    // со своим счётчиком, дающая реальный товар "Блок питания FARADAY" (код 6310,
    // 2 290 ₽): GO (16 990) + блок питания (2 290) = 19 280. Локально эту позицию
    // нечем добавить вообще — итог остаётся на уровне голого контроллера (16 990).
    test('РАСХОЖДЕНИЕ: "Дополнительный блок питания" (FARADAY) отсутствует локально полностью', async ({ page }) => {
        const local = await readLocalOffer(page); // ничего не добавляем — фичи для этого нет в UI
        expect(local.total).toBe(16990); // голый GO, добавить блок питания нечем

        await openLiveClean(page);
        await clickLiveStepperPlus(page, 'Количество блоков питания', 1);
        const live = await readLiveKit(page);
        expect(live.text).toContain('Блок питания FARADAY');
        expect(live.total).toBe(19280);

        expect(local.total).toBe(live.total); // ожидаемо падает: 16 990 !== 19 280, фичи нет локально
    });

});
