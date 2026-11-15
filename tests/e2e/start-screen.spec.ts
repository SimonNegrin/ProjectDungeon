import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { artifactPath } from './artifacts';

test.use({ viewport: { width: 1280, height: 720 } });

async function save(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const path = artifactPath(testInfo, 'screenshots', `${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, animations: 'disabled' });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

async function openStart(page: Page, search = ''): Promise<void> {
  await page.goto(`/${search}`);
  await expect(page.getByTestId('start-screen')).toBeVisible();
  await expect(page.getByTestId('start-menu')).toBeVisible();
}

test('el menú es la primera pantalla y «Nueva» abre el paso 1', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  await openStart(page);

  await expect(page.getByTestId('start-new')).toBeVisible();
  await expect(page.getByTestId('start-load')).toBeVisible();
  await expect(page.getByTestId('start-new')).toBeFocused();
  await save(page, testInfo, 'menu-1280x720');

  // `Esc` no abandona el menú principal.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('start-menu')).toBeVisible();

  await page.getByTestId('start-new').click();
  await expect(page.getByTestId('start-menu')).toBeHidden();
  await expect(page.getByTestId('start-step1')).toBeVisible();
  await expect(page.getByTestId('step1-players')).toHaveValue('1');
  await expect(page.getByTestId('step1-seed')).not.toHaveValue('');
  await expect(page.getByTestId('step1-players')).toBeFocused();
  await save(page, testInfo, 'paso1-1280x720');

  await page.getByTestId('step1-cancel').click();
  await expect(page.getByTestId('start-cancel-dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  await save(page, testInfo, 'confirmacion-1280x720');
  await page.getByTestId('start-cancel-dismiss').click();
  await expect(page.getByTestId('start-step1')).toBeVisible();

  await page.getByTestId('step1-cancel').click();
  await page.getByTestId('start-cancel-confirm').click();
  await expect(page.getByTestId('start-menu')).toBeVisible();
  await expect(page.getByTestId('start-new')).toBeFocused();

  // «Cargar» queda en el punto de extensión: no abre selector ni sale del menú.
  await page.getByTestId('start-load').click();
  await expect(page.getByTestId('start-menu')).toBeVisible();
  await expect(page.getByTestId('start-step1')).toBeHidden();
  expect(await page.locator('input[type="file"]').count()).toBe(0);
  expect(errors).toEqual([]);
});

test('?seed=42 precarga una vez y el campo sigue siendo editable', async ({
  page,
}, testInfo) => {
  await openStart(page, '?seed=42');
  await page.getByTestId('start-new').click();

  const seed = page.getByTestId('step1-seed');
  await expect(seed).toHaveValue('42');
  await seed.fill('123');
  await expect(seed).toHaveValue('123');

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('start-cancel-dialog')).toBeVisible();
  await page.getByTestId('start-cancel-dismiss').click();
  await expect(seed).toHaveValue('123');

  await page.getByTestId('step1-cancel').click();
  await page.getByTestId('start-cancel-confirm').click();
  await expect(page.getByTestId('start-menu')).toBeVisible();

  await page.getByTestId('start-new').click();
  await expect(page.getByTestId('step1-players')).toHaveValue('1');
  await expect(seed).not.toHaveValue('42');
  await save(page, testInfo, 'paso1-segunda-entrada-1280x720');
});

test('semilla inválida bloquea; vacía genera otra y N=6 avanza', async ({
  page,
}, testInfo) => {
  await openStart(page, '?seed=abc');
  await expect(page.getByTestId('start-status')).toContainText('inválida');

  await page.getByTestId('start-new').click();
  const seed = page.getByTestId('step1-seed');
  const error = page.getByTestId('step1-error');
  await expect(seed).not.toHaveValue('');

  await seed.fill('abc');
  await page.getByTestId('step1-continue').click();
  await expect(error).toBeVisible();
  await expect(error).toContainText('inválida');
  await expect(page.getByTestId('start-step1')).toBeVisible();
  await save(page, testInfo, 'paso1-error-1280x720');

  const blocked = await seed.inputValue();
  await seed.fill('');
  await page.getByTestId('step1-continue').click();
  await expect(error).toBeHidden();
  await expect(seed).not.toHaveValue('');
  await expect(page.getByTestId('start-status')).toContainText('Configuración lista');
  expect(await seed.inputValue()).not.toBe(blocked);

  await page.getByTestId('step1-players').selectOption('6');
  await page.getByTestId('step1-continue').click();
  await expect(page.getByTestId('start-status')).toContainText('6 jugadores');
  await expect(page.getByTestId('step1-players')).toHaveValue('6');
});

test('recorrido solo con teclado: foco, aviso y vuelta al menú', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await openStart(page);
  await expect(page.getByTestId('start-new')).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.getByTestId('start-step1')).toBeVisible();
  await expect(page.getByTestId('step1-players')).toBeFocused();

  await page.keyboard.press('2');
  await expect(page.getByTestId('step1-players')).toHaveValue('2');
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('step1-seed')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('start-cancel-dialog')).toBeVisible();
  await expect(page.getByTestId('start-cancel-dismiss')).toBeFocused();

  // El foco no escapa del aviso con Tab ni con Shift+Tab.
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('start-cancel-confirm')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('start-cancel-dismiss')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('start-cancel-dialog')).toBeHidden();
  await expect(page.getByTestId('step1-seed')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('start-cancel-dismiss')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('start-menu')).toBeVisible();
  await expect(page.getByTestId('start-new')).toBeFocused();
  await save(page, testInfo, 'menu-900x700');
});
