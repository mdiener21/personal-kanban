import { test, expect } from '@playwright/test';
import { seedBoardFixture } from './helpers/board-seed.js';
import { createColumnMenuFixture } from './helpers/test-fixtures.js';

async function openColumnMenu(page, columnId) {
  const menuBtn = page.locator(`article.task-column[data-column="${columnId}"] .column-menu-btn`);
  await expect(menuBtn).toBeVisible();
  await menuBtn.click();

  const menu = page.locator(`article.task-column[data-column="${columnId}"] .column-menu`);
  await expect(menu).toBeVisible();
  return menu;
}

async function openSortSubmenu(page, columnId) {
  const menu = await openColumnMenu(page, columnId);
  const sortWrapper = menu.locator('.column-menu-submenu-wrapper');
  await expect(sortWrapper).toBeVisible();
  await sortWrapper.hover();

  const sortSubmenu = sortWrapper.locator('.column-submenu');
  await expect(sortSubmenu).toBeVisible();
  return sortSubmenu;
}

async function firstTaskTitleInColumn(page, columnId) {
  const firstTitle = page.locator(`article.task-column[data-column="${columnId}"] .task .task-title`).first();
  await expect(firstTitle).toBeVisible();
  return (await firstTitle.textContent())?.trim();
}

test.describe('Column Menu Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#board-container')).toBeVisible();
    await seedBoardFixture(page, createColumnMenuFixture());
    await page.reload();
    await expect(page.locator('article.task-column[data-column="todo"]')).toBeVisible();
  });

  test('sorts To Do tasks by due date from column menu', async ({ page }) => {
    const sortSubmenu = await openSortSubmenu(page, 'todo');
    await sortSubmenu.getByRole('menuitem', { name: 'By Due Date' }).click();

    await expect(page.locator('article.task-column[data-column="todo"]')).toBeVisible();
    await expect.poll(async () => firstTaskTitleInColumn(page, 'todo')).toBe('Todo Urgent Early');
  });

  test('sorts To Do tasks by priority from column menu', async ({ page }) => {
    const sortSubmenu = await openSortSubmenu(page, 'todo');
    await sortSubmenu.getByRole('menuitem', { name: 'By Priority' }).click();

    await expect(page.locator('article.task-column[data-column="todo"]')).toBeVisible();
    await expect.poll(async () => firstTaskTitleInColumn(page, 'todo')).toBe('Todo Urgent Early');
  });

  test('opens edit column modal from column menu', async ({ page }) => {
    const menu = await openColumnMenu(page, 'todo');
    await menu.locator('[data-column-menu-action="edit"]').click();

    const modal = page.locator('#column-modal');
    await expect(modal).toBeVisible();
    await expect(page.locator('#column-modal-title')).toHaveText('Edit Column');
    await expect(page.locator('#column-name')).toHaveValue('To Do');
  });

  test('shows guard dialog when deleting Done column from column menu', async ({ page }) => {
    const menu = await openColumnMenu(page, 'done');
    await menu.locator('[data-column-menu-action="delete"]').click();

    const dialog = page.locator('#dialog-modal');
    await expect(dialog).toBeVisible();
    await expect(page.locator('#dialog-modal-message')).toContainText('Done column is permanent');

    await page.locator('#dialog-confirm-btn').click();
    await expect(dialog).toHaveClass(/hidden/);
  });
});
