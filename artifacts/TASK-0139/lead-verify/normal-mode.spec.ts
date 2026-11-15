import { expect, test } from '@playwright/test';

test('TASK-0139 lead: Nueva partida desde pausa abre el paso 1', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/?seed=42');
  await expect(page.getByTestId('start-screen')).toBeVisible();
  await page.getByTestId('start-new').click();
  await expect(page.getByTestId('start-step1')).toBeVisible();
  await page.getByTestId('step1-continue').click();
  await expect(page.getByTestId('player-screen')).toBeVisible();
  await page.getByTestId('player-next').click();
  await expect(page.getByTestId('party-summary')).toBeVisible();
  await page.getByTestId('summary-start').click();
  await expect(page.getByTestId('start-screen')).toBeHidden();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-menu')).toBeVisible();
  await page.getByTestId('pause-new').click();
  await expect(page.getByTestId('pause-confirm-block')).toBeVisible();
  await page.getByTestId('pause-confirm').click();

  await expect(page.getByTestId('pause-menu')).toBeHidden();
  await expect(page.getByTestId('start-screen')).toBeVisible();
  await expect(page.getByTestId('start-step1')).toBeVisible();
  await expect(page.getByTestId('start-menu')).toBeHidden();
  await expect(page.getByTestId('step1-players')).toBeFocused();
  expect(errors).toEqual([]);
});
