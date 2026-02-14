import { test, expect } from '@playwright/test';
import { seedBoardFixture } from './helpers/board-seed.js';
import { createTaskCardFixture } from './helpers/test-fixtures.js';

function taskCard(page, taskId) {
  return page.locator(`.task[data-task-id="${taskId}"]`);
}

test.describe('Task Card Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#board-container')).toBeVisible();
    await seedBoardFixture(page, createTaskCardFixture());
    await page.reload();
    await expect(taskCard(page, 'task-card-1')).toBeVisible();
  });

  test('opens edit modal when clicking task title', async ({ page }) => {
    await taskCard(page, 'task-card-1').locator('.task-title').click();

    await expect(page.locator('#task-modal')).toBeVisible();
    await expect(page.locator('#task-modal-title')).toHaveText('Edit Task');
    await expect(page.locator('#task-title')).toHaveValue('Delegated Interaction Task');
  });

  test('opens edit modal when clicking description and priority', async ({ page }) => {
    await taskCard(page, 'task-card-1').locator('.task-description').click();
    await expect(page.locator('#task-modal')).toBeVisible();
    await expect(page.locator('#task-title')).toHaveValue('Delegated Interaction Task');

    await page.locator('#cancel-task-btn').click();
    await expect(page.locator('#task-modal')).toHaveClass(/hidden/);

    await taskCard(page, 'task-card-1').locator('.task-priority-header').click();
    await expect(page.locator('#task-modal')).toBeVisible();
    await expect(page.locator('#task-title')).toHaveValue('Delegated Interaction Task');
  });

  test('opens edit modal via keyboard on title and priority', async ({ page }) => {
    const title = taskCard(page, 'task-card-1').locator('.task-title');
    await title.focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('#task-modal')).toBeVisible();
    await expect(page.locator('#task-title')).toHaveValue('Delegated Interaction Task');

    await page.locator('#cancel-task-btn').click();
    await expect(page.locator('#task-modal')).toHaveClass(/hidden/);

    const priority = taskCard(page, 'task-card-1').locator('.task-priority-header');
    await priority.focus();
    await page.keyboard.press(' ');

    await expect(page.locator('#task-modal')).toBeVisible();
    await expect(page.locator('#task-title')).toHaveValue('Delegated Interaction Task');
  });

  test('deletes task via confirm dialog and updates column counter', async ({ page }) => {
    const todoCounter = page.locator('article.task-column[data-column="todo"] .task-counter');
    await expect(todoCounter).toHaveText('2');

    await taskCard(page, 'task-card-1').locator('.delete-task-btn').click();

    const dialog = page.locator('#dialog-modal');
    await expect(dialog).toBeVisible();
    await expect(page.locator('#dialog-modal-message')).toContainText('Are you sure you want to delete this task?');

    await page.locator('#dialog-confirm-btn').click();

    await expect(taskCard(page, 'task-card-1')).toHaveCount(0);
    await expect(todoCounter).toHaveText('1');
  });
});
