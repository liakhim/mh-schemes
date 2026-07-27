import { test } from '@playwright/test';

test('dump offer sections for ups + 2 zones', async ({ page }) => {
    await page.goto('/selection');
    await page.getByTestId('reset-equipment').click();
    await page.getByTestId('reset-equipment-confirm').click();
    const addZoneButton = page.getByTestId('add-zone');
    await addZoneButton.click();
    await addZoneButton.click();
    await page.getByTestId('ups-toggle').click();
    await page.getByTestId('open-commercial-offer').click();
    const dialog = page.getByRole('dialog', { name: 'Коммерческое предложение' });
    console.log('=== OFFER DUMP (ups + 2 zones) ===');
    console.log(await dialog.innerText());
    console.log('=== END DUMP ===');
});
