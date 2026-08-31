import { test, expect } from '@playwright/test';

const openCleanSelection = async (page) => {
    await page.context().addCookies([{ name: 'PHPSESSID', value: '1', domain: 'localhost', path: '/' }]);
    await page.goto('/selection');
    await page.getByTestId('reset-equipment').click();
    await page.getByTestId('reset-equipment-confirm').click();
};

test.describe('/selection — сохранение подбора', () => {
    test('насос 0-10V добавляет обязательный IO4', async ({ page }) => {
        await openCleanSelection(page);

        await page.getByTestId('pump-type-010').click();
        await page.getByTestId('add-pump').click();

        await expect(page.getByTestId('controller-card-pro')).toHaveAttribute('data-active', 'true');
        await expect(page.getByTestId('panel-module-io4')).toBeVisible();
    });

    test('восстановленный черновик повторно рассчитывает IO4', async ({ page }) => {
        await page.context().addCookies([{ name: 'PHPSESSID', value: '1', domain: 'localhost', path: '/' }]);
        await page.addInitScript(() => {
            window.localStorage.setItem('mh-schemes-selection-draft', JSON.stringify({
                version: 1,
                savedAt: Date.now(),
                incomingScheme: {
                    controller: { type: 'go', relay_devices: [], one_wire_devices: [], bus_devices: [] },
                    wired_devices: [{
                        id: 1,
                        type: '010pump',
                        device_type: 'pump',
                        connection_type: 'di',
                        _group: 'pump',
                    }],
                    ext_modules: [],
                    power_modules: ['circuit-breaker', 'power-unit'],
                },
                requestedControllerType: 'go',
                controllerSelectionSource: 'default',
                upsRequested: false,
                editor: { pumpConnectionMode: 'wired', pumpType: '010' },
            }));
        });
        await page.goto('/selection');

        await page.getByRole('button', { name: 'Продолжить' }).click();

        await expect(page.getByTestId('controller-card-pro')).toHaveAttribute('data-active', 'true');
        await expect(page.getByTestId('panel-module-io4')).toBeVisible();
        await expect(page.getByTestId('pump-type-010')).toHaveAttribute('data-active', 'true');
    });

    test('двойная активация создаёт только одну схему', async ({ page }) => {
        await openCleanSelection(page);
        await page.evaluate(() => { window.open = () => null; });
        let createRequests = 0;
        await page.route('**/api/schemes', async (route) => {
            if (route.request().method() !== 'POST') return route.continue();
            createRequests += 1;
            await new Promise((resolve) => setTimeout(resolve, 150));
            return route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({ id: 321 }),
            });
        });

        await page.getByTestId('build-scheme').evaluate((button) => {
            button.click();
            button.click();
        });
        await expect.poll(() => createRequests).toBe(1);
    });
});
