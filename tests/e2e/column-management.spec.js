import { test, expect } from '@playwright/test';
import { seedBoardFixture } from './helpers/board-seed.js';
import { createColumnMenuFixture } from './helpers/test-fixtures.js';

async function openColumnModal(page) {
  const addColumnBtn = page.locator('#add-column-btn');
  const menuBtn = page.locator('#desktop-menu-btn');

  // On small layouts the controls menu is collapsed behind the menu button
  if (!(await addColumnBtn.isVisible()) && (await menuBtn.isVisible())) {
    await menuBtn.click();
  }

  await expect(addColumnBtn).toBeVisible();
  await addColumnBtn.scrollIntoViewIfNeeded();
  await addColumnBtn.click();
  const modal = page.locator('#column-modal');
  await expect(modal).toBeVisible();
  return modal;
}

async function getColumnCount(page) {
  const columns = page.locator('article.task-column');
  return await columns.count();
}

async function getColumnByName(page, columnName) {
  return page.locator('article.task-column').filter({ hasText: columnName });
}

async function getColumnTitleOrder(page) {
  const titles = await page.locator('article.task-column h2').allTextContents();
  return titles
    .map((t) => (t || '').trim())
    .map((t) => t.replace(/\s*\(\d+\)\s*$/, ''));
}

test.describe('Column Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#board-container')).toBeVisible();
    await seedBoardFixture(page, createColumnMenuFixture());
    await page.reload();
    await expect(page.locator('article.task-column[data-column="todo"]')).toBeVisible();
  });

  test('adds new column via Add Column button', async ({ page }) => {
    const initialCount = await getColumnCount(page);
    
    const modal = await openColumnModal(page);
    
    // Fill in column details
    await page.locator('#column-name').fill('Testing');
    await page.locator('#column-color').fill('#e11d48');
    
    // Submit form
    await page.locator('#column-modal button[type="submit"]').click();
    
    // Verify modal closes
    await expect(modal).toHaveClass(/hidden/);
    
    // Verify new column appears
    const newColumn = await getColumnByName(page, 'Testing');
    await expect(newColumn).toBeVisible();
    
    // Verify column count increased
    const finalCount = await getColumnCount(page);
    expect(finalCount).toBe(initialCount + 1);
    
    // Verify column appears before Done column
    const columnNames = await getColumnTitleOrder(page);
    const testingIndex = columnNames.findIndex((name) => name.includes('Testing'));
    const doneIndex = columnNames.findIndex((name) => name.includes('Done'));
    expect(testingIndex).toBeLessThan(doneIndex);
  });

  test('validates required column name', async ({ page }) => {
    const modal = await openColumnModal(page);
    
    // Try to submit without name
    await page.locator('#column-modal button[type="submit"]').click();
    
    // Modal should remain open
    await expect(modal).toBeVisible();
    
    // Check for validation message or required field indication
    const nameInput = page.locator('#column-name');
    await expect(nameInput).toBeFocused();
  });

  test('edits existing column via column menu', async ({ page }) => {
    // Open column menu for To Do
    const todoColumn = page.locator('article.task-column[data-column="todo"]');
    await todoColumn.locator('.column-menu-btn').click();
    
    const menu = todoColumn.locator('.column-menu');
    await expect(menu).toBeVisible();
    
    // Click edit action
    await menu.locator('[data-column-menu-action="edit"]').click();
    
    // Verify column modal opens with existing data
    const modal = page.locator('#column-modal');
    await expect(modal).toBeVisible();
    await expect(page.locator('#column-modal-title')).toHaveText('Edit Column');
    await expect(page.locator('#column-name')).toHaveValue('To Do');
    
    // Update column details
    await page.locator('#column-name').fill('To Do (Updated)');
    await page.locator('#column-color').fill('#10b981');
    
    // Submit changes
    await page.locator('#column-modal button[type="submit"]').click();
    
    // Verify modal closes
    await expect(modal).toHaveClass(/hidden/);
    
    // Verify column title updated
    await expect(page.locator('article.task-column h2').filter({ hasText: 'To Do (Updated)' })).toBeVisible();
    
    // Verify old name no longer exists
    await expect(page.locator('article.task-column h2').filter({ hasText: /^To Do$/ })).toHaveCount(0);
  });

  test('deletes non-Done column with confirmation', async ({ page }) => {
    // First add a column to delete (so we don't delete a column with tasks)
    const modal = await openColumnModal(page);
    await page.locator('#column-name').fill('Temporary');
    await page.locator('#column-color').fill('#f59e0b');
    await page.locator('#column-modal button[type="submit"]').click();
    await expect(modal).toHaveClass(/hidden/);
    
    const initialCount = await getColumnCount(page);
    
    // Open column menu for the temporary column
    const tempColumn = await getColumnByName(page, 'Temporary');
    await tempColumn.locator('.column-menu-btn').click();
    
    const menu = tempColumn.locator('.column-menu');
    await expect(menu).toBeVisible();
    
    // Click delete action
    await menu.locator('[data-column-menu-action="delete"]').click();
    
    // Verify confirmation dialog appears
    const dialog = page.locator('#dialog-modal');
    await expect(dialog).toBeVisible();
    await expect(page.locator('#dialog-modal-title')).toContainText(/delete column/i);
    await expect(page.locator('#dialog-modal-message')).toContainText(/delete/i);
    
    // Confirm deletion
    await page.locator('#dialog-confirm-btn').click();
    
    // Verify dialog closes
    await expect(dialog).toHaveClass(/hidden/);
    
    // Verify column is removed
    await expect(tempColumn).toHaveCount(0);
    
    // Verify column count decreased
    const finalCount = await getColumnCount(page);
    expect(finalCount).toBe(initialCount - 1);
  });

  test('prevents deletion of Done column', async ({ page }) => {
    // Open column menu for Done column
    const doneColumn = page.locator('article.task-column[data-column="done"]');
    await doneColumn.locator('.column-menu-btn').click();
    
    const menu = doneColumn.locator('.column-menu');
    await expect(menu).toBeVisible();
    
    // Click delete action
    await menu.locator('[data-column-menu-action="delete"]').click();
    
    // Verify guard dialog appears
    const dialog = page.locator('#dialog-modal');
    await expect(dialog).toBeVisible();
    await expect(page.locator('#dialog-modal-message')).toContainText('Done column is permanent');
    
    // Acknowledge the message
    await page.locator('#dialog-confirm-btn').click();
    
    // Verify Done column still exists
    await expect(doneColumn).toBeVisible();
  });

  test('reorders columns via drag and drop', async ({ page }) => {
    // Get initial column order
    const initialOrder = await getColumnTitleOrder(page);
    
    // Find To Do and In Progress columns
    const todoColumn = page.locator('article.task-column[data-column="todo"]');
    const inProgressColumn = page.locator('article.task-column[data-column="inprogress"]');
    
    await expect(todoColumn).toBeVisible();
    await expect(inProgressColumn).toBeVisible();
    
    // Columns themselves are not draggable; use the drag handle.
    await inProgressColumn.locator('.column-drag-handle').dragTo(todoColumn.locator('.column-drag-handle'));
    
    // Wait for reorder to complete
    await page.waitForTimeout(500);
    
    // Verify order changed
    const finalOrder = await getColumnTitleOrder(page);
    
    // In Progress should now come before To Do
    const todoIndex = finalOrder.findIndex(text => text.includes('To Do'));
    const inProgressIndex = finalOrder.findIndex(text => text.includes('In Progress'));
    
    expect(inProgressIndex).toBeLessThan(todoIndex);
    expect(finalOrder).not.toEqual(initialOrder);
  });

  test('collapses and expands columns', async ({ page }) => {
    const todoColumn = page.locator('article.task-column[data-column="todo"]');
    
    // Find the collapse toggle (chevron button)
    const collapseBtn = todoColumn.locator('.column-collapse-btn');
    await expect(collapseBtn).toBeVisible();
    
    // Get initial tasks visibility
    const tasksList = todoColumn.locator('.tasks');
    await expect(tasksList).toBeVisible();
    
    // Collapse column
    await collapseBtn.click();
    
    // Verify column is collapsed and tasks are hidden
    await expect(todoColumn).toHaveClass(/is-collapsed/);
    await expect(tasksList).toHaveClass(/hidden/);
    
    // Expand column again
    await collapseBtn.click();
    
    // Verify column expanded and tasks are visible
    await expect(todoColumn).not.toHaveClass(/is-collapsed/);
    await expect(tasksList).toBeVisible();
  });

  test('displays correct task counts in column headers', async ({ page }) => {
    // Verify To Do column shows correct count (should be 3 from fixture)
    const todoColumn = page.locator('article.task-column[data-column="todo"]');
    const todoCounter = todoColumn.locator('.task-counter');
    await expect(todoCounter).toHaveText('3');
    
    // Add a task to verify counter updates
    const addTaskBtn = todoColumn.locator('.add-task-btn-icon');
    await addTaskBtn.click();
    
    const taskModal = page.locator('#task-modal');
    await expect(taskModal).toBeVisible();
    
    await page.locator('#task-title').fill('Test Counter Task');
    await page.locator('#task-modal button[type="submit"]').click();
    
    await expect(taskModal).toHaveClass(/hidden/);
    
    // Verify counter increased
    await expect(todoCounter).toHaveText('4');
  });
});