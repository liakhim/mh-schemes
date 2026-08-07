import { test, expect } from '@playwright/test';

/**
 * Автоматический подбор контроллера двусторонний.
 *
 * Раньше подбор работал только на повышение: контроллер поднимался, когда
 * оборудование переставало помещаться, но при удалении оборудования оставался
 * старшим — набранный PRO не возвращался к go даже на пустой схеме. Теперь
 * кандидаты перебираются от младшего к старшему на каждое изменение схемы,
 * поэтому подбор откатывается сам. Ручной выбор контроллера при этом остаётся
 * за пользователем и не понижается, пока оборудование в него влезает.
 */
test.describe('/selection — откат подбора контроллера на понижение', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/selection');
        await page.getByTestId('reset-equipment').click();
        await page.getByTestId('reset-equipment-confirm').click();
    });

    test('токовый датчик давления поднимает подбор до PRO, удаление возвращает go', async ({ page }) => {
        // 4-20 вход есть только у pro и ecosmart, у go/go+/smart2 их нет вовсе.
        await page.getByTestId('add-pressure-sensor').click();
        await expect(page.getByTestId('controller-card-pro')).toHaveAttribute('data-active', 'true');

        await page.getByTestId('pressure-sensor-qty-dec').click();
        await expect(page.getByTestId('controller-card-go')).toHaveAttribute('data-active', 'true');
    });

    test('удаление зон возвращает подбор со smart2 на go', async ({ page }) => {
        // 5 зон превышают релейную ёмкость go (1 слот) и переводят подбор на smart2.
        await page.getByTestId('add-zone').click();
        for (let i = 1; i < 5; i += 1) await page.getByTestId('zone-qty-inc').click();
        await expect(page.getByTestId('controller-card-smart2')).toHaveAttribute('data-active', 'true');

        for (let i = 0; i < 5; i += 1) await page.getByTestId('zone-qty-dec').click();
        await expect(page.getByTestId('controller-card-go')).toHaveAttribute('data-active', 'true');
    });

    test('вручную выбранный контроллер подбор не понижает', async ({ page }) => {
        await page.getByTestId('add-zone').click();
        for (let i = 1; i < 5; i += 1) await page.getByTestId('zone-qty-inc').click();
        await expect(page.getByTestId('controller-card-smart2')).toHaveAttribute('data-active', 'true');

        // Клик по карточке фиксирует контроллер за пользователем.
        await page.getByTestId('controller-card-smart2').click();
        for (let i = 0; i < 5; i += 1) await page.getByTestId('zone-qty-dec').click();

        await expect(page.getByTestId('controller-card-smart2')).toHaveAttribute('data-active', 'true');
    });
});
