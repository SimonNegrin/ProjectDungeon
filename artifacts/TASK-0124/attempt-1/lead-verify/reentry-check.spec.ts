import { expect, test } from '@playwright/test';

test('reentrada en la pantalla de jugador no duplica el roster', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-new').click();
  await page.getByTestId('step1-continue').click();
  await expect(page.getByTestId('player-screen')).toBeVisible();

  await page.getByTestId('player-cancel').click();
  await page.getByTestId('player-cancel-confirm').click();
  await expect(page.getByTestId('start-menu')).toBeVisible();

  await page.getByTestId('start-new').click();
  await page.getByTestId('step1-continue').click();
  await expect(page.getByTestId('player-screen')).toBeVisible();

  const count = await page
    .getByTestId('player-archetypes')
    .getByRole('button')
    .count();
  console.log(`archetype buttons after reentry: ${count}`);

  const ids = await page
    .getByTestId('player-archetypes')
    .getByRole('button')
    .evaluateAll((buttons) =>
      buttons.map((button) => (button as HTMLElement).dataset.testid),
    );
  console.log(`testids: ${ids.join(',')}`);
  expect(count).toBe(9);
});
