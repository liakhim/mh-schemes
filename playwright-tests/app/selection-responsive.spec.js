import { test, expect } from '@playwright/test';

/**
 * Адаптив /selection.
 *
 * Раскладка проходит три ступени: три колонки (навигация + контент + панель)
 * шире 1200px, две колонки до 760px и одна колонка с закреплённой снизу лентой
 * контроллера на телефоне. Кегли снижаются ступенями 18 -> 17 -> 16 -> 15,
 * описание карточки не опускается ниже 12.5px.
 *
 * Тест держит два инварианта, которые ломались молча:
 * - страница нигде не уезжает вбок и ни один элемент не вылезает за правую
 *   границу вьюпорта (на 320px за карточку выходил счётчик списка добавленного);
 * - боковая навигация исчезает ровно на 1200px.
 */
const WIDTHS = [1920, 1440, 1280, 1200, 1100, 1024, 900, 768, 640, 480, 414, 375, 320];

/** Ширина документа сверх вьюпорта и элементы, вылезшие за правый край. */
const measureOverflow = (page) => page.evaluate(() => {
    const de = document.documentElement;
    const outside = [];
    document.querySelectorAll('.selection-page *').forEach((el) => {
        const box = el.getBoundingClientRect();
        if (box.width > 0 && box.right > de.clientWidth + 1) {
            outside.push((el.className || el.nodeName).toString().split(' ')[0]);
        }
    });
    return {
        documentOverflow: de.scrollWidth - de.clientWidth,
        // Декоративный круг панели намеренно заходит за её край и обрезается
        // её же overflow, страницу он не расширяет.
        outside: [...new Set(outside)].filter((name) => name !== 'sel-controller-panel-glow'),
    };
});

test.describe('/selection — адаптив', () => {
    test.beforeEach(async ({ page }) => {
        await page.context().addCookies([{ name: 'PHPSESSID', value: '1', domain: 'localhost', path: '/' }]);
        await page.goto('/selection');
        const resetButton = page.getByTestId('reset-equipment');
        if (await resetButton.isVisible()) {
            await resetButton.click();
            await page.getByTestId('reset-equipment-confirm').click();
        }
        // Непустые карточки: списки добавленного со счётчиками и есть что
        // переносить — именно они и упирались в край на узких экранах.
        await page.getByTestId('add-pump').click();
        await page.getByTestId('add-thermostat').click();
        await page.getByTestId('add-zone').click();
    });

    for (const width of WIDTHS) {
        test(`${width}px: страница не уезжает вбок`, async ({ page }) => {
            await page.setViewportSize({ width, height: 900 });
            await page.waitForTimeout(300);

            const { documentOverflow, outside } = await measureOverflow(page);
            expect(documentOverflow, `горизонтальный скролл на ${width}px`).toBe(0);
            expect(outside, `элементы за правым краем на ${width}px`).toEqual([]);
        });
    }

    test('боковая навигация исчезает на 1200px', async ({ page }) => {
        const nav = page.locator('.sel-side-nav');

        await page.setViewportSize({ width: 1201, height: 900 });
        await expect(nav).toBeVisible();

        await page.setViewportSize({ width: 1200, height: 900 });
        await expect(nav).toBeHidden();
    });

    test('[navigation] разделы датчиков разделены, маркеры отражают добавленное оборудование', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 });
        const nav = page.locator('.sel-side-nav .sel-quick-nav');
        const marker = (label) => nav.getByRole('link', { name: label, exact: true }).locator('.sel-quick-nav-complete');

        await expect(nav.locator('a')).toHaveText([
            'Котлы',
            'Гидравлика',
            'Климат',
            'Прочее оборудование',
            'Дополнительные датчики',
            'Защита от протечки',
            'Прочее',
            'Питание',
        ]);
        await expect(marker('Гидравлика')).toBeVisible();
        await expect(marker('Климат')).toBeVisible();
        await expect(marker('Дополнительные датчики')).toHaveCount(0);
        await expect(marker('Защита от протечки')).toHaveCount(0);

        await page.getByTestId('add-pressure-sensor').click();
        await expect(marker('Дополнительные датчики')).toBeVisible();

        await page.locator('.sel-pressure-card').getByRole('button', { name: 'Удалить Датчик давления' }).click();
        await expect(marker('Дополнительные датчики')).toHaveCount(0);
    });

    test('на телефоне шапка в одну строку, переключатель режима по контенту', async ({ page }) => {
        const geometry = () => page.evaluate(() => {
            const box = (selector) => document.querySelector(selector).getBoundingClientRect();
            const inner = box('.sel-liquid-header-inner');
            const modeSwitch = box('.sel-mode-switch');
            const header = box('.sel-liquid-header');
            return {
                headerTop: Math.round(header.top),
                headerWidth: Math.round(header.width),
                viewportWidth: document.documentElement.clientWidth,
                headerHeight: Math.round(box('.sel-liquid-header').height),
                buttonHeight: Math.round(box('.sel-mode-option').height),
                switchWidth: Math.round(modeSwitch.width),
                innerWidth: Math.round(inner.width),
                // Переключатель и лого на одной строке, если верх переключателя
                // выше низа лого.
                sameRow: modeSwitch.top < box('.sel-header-brand').bottom,
                // Положительный запас = переключатель не срезан краем шапки.
                slack: Math.round(inner.right - modeSwitch.right),
            };
        });

        for (const width of [760, 480, 414, 375, 360, 320]) {
            await page.setViewportSize({ width, height: 800 });
            await page.waitForTimeout(250);
            const g = await geometry();

            expect(g.sameRow, `лого и переключатель на разных строках при ${width}px`).toBe(true);
            expect(g.buttonHeight, `высота кнопки режима при ${width}px`).toBe(30);
            expect(g.slack, `переключатель срезан краем шапки при ${width}px`).toBeGreaterThanOrEqual(0);
            // Ширина по содержимому, а не во всю строку шапки.
            expect(g.switchWidth, `переключатель растянут на всю шапку при ${width}px`)
                .toBeLessThan(g.innerWidth);
            expect(g.headerHeight, `шапка выше одной строки при ${width}px`).toBeLessThanOrEqual(56);
            // Прибита к верху и во всю ширину: отступы по краям на телефоне
            // съедали высоту и ширину впустую.
            expect(g.headerTop, `шапка не прижата к верху при ${width}px`).toBe(0);
            expect(g.headerWidth, `шапка не во всю ширину при ${width}px`).toBe(g.viewportWidth);
        }
    });

    test('на телефоне кнопки нижней ленты одной высоты и в одну строку', async ({ page }) => {
        const actions = () => page.evaluate(() => {
            const box = (selector) => document.querySelector(selector).getBoundingClientRect();
            const primary = box('.sel-controller-primary-action');
            const spec = box('.sel-controller-spec-action');
            const reset = box('.sel-controller-reset-action');
            const label = document.querySelector('.sel-controller-action-copy strong');
            return {
                heights: [primary.height, spec.height, reset.height].map(Math.round),
                tops: [primary.top, spec.top, reset.top].map(Math.round),
                // Высота подписи в строках: на телефоне `br` скрыт и она одна.
                labelLines: Math.round(
                    label.getBoundingClientRect().height
                    / parseFloat(getComputedStyle(label).lineHeight),
                ),
                labelText: label.textContent,
            };
        });

        for (const width of [414, 375, 320]) {
            await page.setViewportSize({ width, height: 800 });
            await page.waitForTimeout(250);
            const a = await actions();

            expect(new Set(a.heights).size, `разная высота кнопок при ${width}px: ${a.heights}`).toBe(1);
            expect(new Set(a.tops).size, `кнопки не выровнены по горизонтали при ${width}px`).toBe(1);
            expect(a.heights[0], `кнопки слишком высокие при ${width}px`).toBeLessThanOrEqual(40);
            expect(a.labelLines, `подпись в две строки при ${width}px`).toBe(1);
            // Пробел из разметки должен склеить подпись при скрытом `br`.
            expect(a.labelText).toBe('Схема подключения');
        }

        // На десктопе подпись остаётся двухстрочной: панель узкая.
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.waitForTimeout(250);
        expect((await actions()).labelLines).toBe(2);
    });

    test('на телефоне рендер термостата не крупнее настроек карточки', async ({ page }) => {
        const visual = page.locator('.sel-thermostat-visual');

        await page.setViewportSize({ width: 1440, height: 900 });
        await page.waitForTimeout(250);
        const desktop = await visual.boundingBox();
        expect(desktop.width, 'на десктопе рендер остаётся крупным').toBeGreaterThan(240);

        await page.setViewportSize({ width: 375, height: 900 });
        await page.waitForTimeout(250);
        const mobile = await visual.boundingBox();
        expect(mobile.width, 'рендер термостата на телефоне').toBeLessThanOrEqual(176);
        // Квадрат: свечение и тень заданы в процентах от колонки, поэтому
        // пропорции должны сохраниться.
        expect(Math.abs(mobile.height - mobile.width)).toBeLessThan(2);
    });

    test('карточки дискретных входов: фиксированная высота на десктопе, по контенту на телефоне', async ({ page }) => {
        const cards = page.locator('.sel-card-fixed-height');
        const minHeights = () => cards.evaluateAll((els) => els.map((el) => getComputedStyle(el).minHeight));

        // На десктопе карточки стоят парами в ряд, и фиксированная высота держит
        // фоновый снимок неподвижным при добавлении строки.
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.waitForTimeout(250);
        expect(await minHeights()).toEqual(['158px', '158px', '158px', '158px']);

        // На телефоне они идут в одну колонку: те же 158px оставляли пустое
        // поле под кнопкой, поэтому высота считается по содержимому.
        await page.setViewportSize({ width: 375, height: 900 });
        await page.waitForTimeout(250);
        expect(await minHeights()).toEqual(['0px', '0px', '0px', '0px']);

        const [collapsed] = await cards.first().evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
        expect(collapsed, 'карточка не должна тянуться до прежних 158px').toBeLessThan(150);
    });

    test('кегли снижаются ступенями и не проваливаются ниже читаемого', async ({ page }) => {
        const fontSize = (selector) => page.evaluate(
            (sel) => Math.round(parseFloat(getComputedStyle(document.querySelector(sel)).fontSize) * 10) / 10,
            selector,
        );

        const steps = [];
        for (const width of [1440, 1100, 900, 640]) {
            await page.setViewportSize({ width, height: 900 });
            await page.waitForTimeout(250);
            steps.push({
                width,
                heading: await fontSize('.selection-page h2'),
                description: await fontSize('.sel-card-desc'),
            });
        }

        expect(steps.map((s) => s.heading)).toEqual([18, 17, 16, 15]);
        expect(steps.map((s) => s.description)).toEqual([13.5, 13, 12.5, 12.5]);
    });
});
