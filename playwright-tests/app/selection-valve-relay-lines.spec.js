import { test, expect } from '@playwright/test';

/**
 * Учёт запорных клапанов в подборе релейных линий.
 *
 * `valve` на `double_relay` сначала занимает свободную пару RELAY-S и только при
 * её отсутствии переходит на пару RELAY (`docs/rules/relay.md`, `balanceServos`).
 * Подбор же считал клапан строго по RELAY, поэтому на трёх клапанах видел дефицит
 * релейных слотов PRO (4) при полностью свободной линии RELAY-S (4) и добирал
 * модуль RL6, который в построенной схеме оставался пустым.
 *
 * Ёмкость PRO под клапаны: 2 пары RELAY-S + 2 пары RELAY = 4 клапана без модулей.
 */
test.describe('/selection — запорные клапаны на релейных линиях', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/selection');
        await page.getByTestId('reset-equipment').click();
        await page.getByTestId('reset-equipment-confirm').click();
    });

    /** Добавляет указанное количество независимых запорных клапанов. */
    const addValves = async (page, count) => {
        for (let i = 0; i < count; i += 1) await page.getByTestId('leak-valve-qty-inc').click();
    };

    test('4 клапана помещаются в линии PRO без модулей расширения', async ({ page }) => {
        await addValves(page, 4);
        await expect(page.getByTestId('controller-card-pro')).toHaveAttribute('data-active', 'true');
        await expect(page.locator('[data-test-id^="panel-module-"]')).toHaveCount(0);
    });

    test('пятый клапан уже не помещается и добирает RL6', async ({ page }) => {
        await addValves(page, 5);
        await expect(page.getByTestId('controller-card-pro')).toHaveAttribute('data-active', 'true');
        await expect(page.getByTestId('panel-module-rl6')).toBeVisible();
    });

    test('клапан занимает RELAY-S и не вытесняет зоны с RELAY', async ({ page }) => {
        // 4 зоны занимают все 4 RELAY-слота PRO, два клапана уходят на RELAY-S:
        // линии сходятся ровно, модули расширения не нужны.
        await page.getByTestId('add-zone').click();
        for (let i = 1; i < 4; i += 1) await page.getByTestId('zone-qty-inc').click();
        await addValves(page, 2);

        await expect(page.getByTestId('controller-card-pro')).toHaveAttribute('data-active', 'true');
        await expect(page.locator('[data-test-id^="panel-module-"]')).toHaveCount(0);
    });
});
