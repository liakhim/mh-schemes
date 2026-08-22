import { test, expect } from '@playwright/test';

/**
 * Анимации панели «Подобранный контроллер».
 *
 * У панели два независимых движения:
 * - `sel-mode-sidebar-enter` — вход при появлении панели (переключение режима
 *   подбора, панель существует только в автоматическом);
 * - `sel-controller-panel-pop` — короткий подъём, когда подбор сменил контроллер.
 *
 * Подъём добавляется вторым слотом к списку `animation`, а не подменяет его
 * целиком. Если подменять, то при снятии класса свойство возвращается к входной
 * анимации, браузер считает её новой и панель заново «въезжает» после каждой
 * смены контроллера — визуально это выглядело как мигание. Тест ловит именно
 * этот регресс: после смены контроллера входная анимация играть не должна.
 */
test.describe('/selection — панель «Подобранный контроллер»', () => {
    test.beforeEach(async ({ page }) => {
        await page.context().addCookies([{ name: 'PHPSESSID', value: '1', domain: 'localhost', path: '/' }]);
        await page.goto('/selection');
        await page.getByTestId('reset-equipment').click();
        await page.getByTestId('reset-equipment-confirm').click();

        // Слушатель ставится после сброса, чтобы не поймать анимации загрузки.
        await page.evaluate(() => {
            window.__panelAnimations = [];
            document.addEventListener('animationstart', (event) => {
                if (String(event.target.className).includes('sel-stuck-controllers-panel')) {
                    window.__panelAnimations.push(event.animationName);
                }
            }, true);
        });
    });

    /** Забирает и очищает накопленный список анимаций панели. */
    const takeAnimations = (page) => page.evaluate(() => window.__panelAnimations.splice(0));

    test('карточка показывает название без описания контроллера', async ({ page }) => {
        const card = page.getByTestId('controller-card-go');
        await expect(card.locator('.sel-stuck-controller-copy strong')).toBeVisible();
        await expect(card.locator('small')).toHaveCount(0);
    });

    test('смена контроллера играет только подъём, без повторного входа', async ({ page }) => {
        // 5 зон превышают релейную ёмкость go и переводят подбор на smart2.
        await page.getByTestId('add-zone').click();
        for (let i = 1; i < 5; i += 1) await page.getByTestId('zone-qty-inc').click();
        await expect(page.getByTestId('controller-card-smart2')).toHaveAttribute('data-active', 'true');
        await page.waitForTimeout(1200);

        expect(await takeAnimations(page)).toEqual(['sel-controller-panel-pop']);

        // Обратная смена контроллера снова поднимает панель: перезапуск той же
        // анимации через рефлоу продолжает работать.
        await page.getByTestId('reset-equipment').click();
        await page.getByTestId('reset-equipment-confirm').click();
        await expect(page.getByTestId('controller-card-go')).toHaveAttribute('data-active', 'true');
        await page.waitForTimeout(1200);

        expect(await takeAnimations(page)).toEqual(['sel-controller-panel-pop']);
    });

    test('возврат в автоматический режим играет вход панели', async ({ page }) => {
        await page.getByRole('button', { name: /Ручной/ }).click();
        await page.waitForTimeout(700);
        await page.getByRole('button', { name: /Автоматический/ }).click();
        await page.waitForTimeout(900);

        expect(await takeAnimations(page)).toEqual(['sel-mode-sidebar-enter']);
    });
});
