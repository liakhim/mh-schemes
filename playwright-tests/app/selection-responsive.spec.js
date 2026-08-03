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
        await page.goto('/selection');
        await page.getByTestId('reset-equipment').click();
        await page.getByTestId('reset-equipment-confirm').click();
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
