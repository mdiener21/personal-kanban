import { test, expect } from '@playwright/test';
import { seedBoardFixture } from './helpers/board-seed.js';
import { createTaskCardFixture } from './helpers/test-fixtures.js';

async function openLabelsModal(page) {
  const manageLabelsBtn = page.locator('#manage-labels-btn');
  const menuBtn = page.locator('#desktop-menu-btn');
  const controlsMenu = page.locator('#board-controls-menu');
  const labelsModal = page.locator('#labels-modal');

  // If it's already open, just use it.
  if (await labelsModal.isVisible()) {
    return labelsModal;
  }

  // Avoid click interception by any in-flight modal/dialog close animations.
  await expect(page.locator('#dialog-modal')).toBeHidden();
  await expect(page.locator('#label-modal')).toBeHidden();

  // On small layouts the controls menu is collapsed behind the menu button
  if (!(await manageLabelsBtn.isVisible())) {
    await expect(menuBtn).toBeVisible();
    await menuBtn.scrollIntoViewIfNeeded();

    const menuIsOpen = await controlsMenu
      .evaluate((el) => el.classList.contains('show'))
      .catch(() => false);

    if (!menuIsOpen) {
      try {
        await menuBtn.click({ timeout: 3000 });
      } catch {
        await menuBtn.click({ force: true });
      }
    }

    await expect(controlsMenu).toHaveClass(/\bshow\b/, { timeout: 5000 });
  }

  await expect(manageLabelsBtn).toBeVisible();
  await manageLabelsBtn.click();

  await expect(labelsModal).toBeVisible();
  return labelsModal;
}

async function openAddLabelModal(page) {
  await page.locator('#add-label-btn').click();
  const modal = page.locator('#label-modal');
  await expect(modal).toBeVisible();
  return modal;
}

async function getLabelCount(page) {
  const modal = await openLabelsModal(page);
  const labelItems = modal.locator('#labels-list .label-item');
  const count = await labelItems.count();
  
  // Close modal
  await page.locator('#labels-close-btn').click();
  await expect(page.locator('#labels-modal')).toBeHidden();
  
  return count;
}

test.describe('Label Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#board-container')).toBeVisible();
    await seedBoardFixture(page, createTaskCardFixture());
    await page.reload();
    await expect(page.locator('article.task-column[data-column="todo"]')).toBeVisible();
  });

  test('creates new label via manage labels modal', async ({ page }) => {
    const initialCount = await getLabelCount(page);
    const labelsModal = await openLabelsModal(page);
    
    // Click Add Label button
    await labelsModal.locator('#add-label-btn').click();
    
    // Verify label creation modal opens
    const labelModal = page.locator('#label-modal');
    await expect(labelModal).toBeVisible();
    await expect(page.locator('#label-modal-title')).toHaveText('Add Label');
    
    // Fill in label details
    await page.locator('#label-name').fill('Bug Fix');
    await page.locator('#label-color').fill('#ef4444');
    await page.locator('#label-group').fill('Priority');
    
    // Submit form
    await page.locator('#label-modal button[type="submit"]').click();
    
    // Verify label modal closes
    await expect(labelModal).toHaveClass(/hidden/);
    
    // Verify we're back to labels modal and new label appears
    await expect(labelsModal).toBeVisible();

    // Labels are grouped into accordion sections and most sections start collapsed.
    // Expand all sections so we can reliably assert visibility of the newly created label.
    const headers = labelsModal.locator('#labels-list .accordion-header');
    const headerCount = await headers.count();
    for (let i = 0; i < headerCount; i++) {
      const header = headers.nth(i);
      const expanded = await header.getAttribute('aria-expanded');
      if (expanded === 'false') {
        await header.click();
      }
    }

    const newLabelRow = labelsModal.locator('#labels-list .label-item', { hasText: /^Bug Fix$/ }).first();
    await expect(newLabelRow).toBeVisible();
    
    // Verify label count increased
    const finalCount = await getLabelCount(page);
    expect(finalCount).toBe(initialCount + 1);
  });

  test('validates required label name', async ({ page }) => {
    const labelsModal = await openLabelsModal(page);
    const labelModal = await openAddLabelModal(page);
    
    // Try to submit without name
    await page.locator('#label-modal button[type="submit"]').click();

    // Missing-name is reported via the app's alert dialog
    const dialog = page.locator('#dialog-modal');
    await expect(dialog).toBeVisible();
    await expect(page.locator('#dialog-modal-title')).toContainText(/label name required/i);
    await expect(page.locator('#dialog-modal-message')).toContainText(/please enter a label name/i);
    await page.locator('#dialog-confirm-btn').click();
    await expect(dialog).toBeHidden();
    
    // Modal should remain open
    await expect(labelModal).toBeVisible();
    
    // Check for validation - name field should be focused
    const nameInput = page.locator('#label-name');
    await expect(nameInput).toBeFocused();
  });

  test('prevents duplicate label names', async ({ page }) => {
    const labelsModal = await openLabelsModal(page);
    const labelModal = await openAddLabelModal(page);
    
    // Try to create label with existing name "Task"
    await page.locator('#label-name').fill('Task');
    await page.locator('#label-color').fill('#ef4444');
    
    await page.locator('#label-modal button[type="submit"]').click();
    
    // Duplicate-name is reported via the app's alert dialog
    const dialog = page.locator('#dialog-modal');
    await expect(dialog).toBeVisible();
    await expect(page.locator('#dialog-modal-title')).toContainText(/already exists/i);
    await expect(page.locator('#dialog-modal-message')).toContainText(/already exists/i);
    await page.locator('#dialog-confirm-btn').click();
    await expect(dialog).toHaveClass(/hidden/);

    // Label modal should still be open for correction
    await expect(labelModal).toBeVisible();
  });

  test('edits existing label', async ({ page }) => {
    const labelsModal = await openLabelsModal(page);
    
    // Find the "Task" label and click edit
    const taskLabelItem = labelsModal.locator('#labels-list .label-item').filter({ hasText: 'Task' });
    await expect(taskLabelItem).toBeVisible();
    
    const editBtn = taskLabelItem.locator('button[title*="edit" i], button[aria-label*="edit" i]').first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    
    // Verify label edit modal opens with existing data
    const labelModal = page.locator('#label-modal');
    await expect(labelModal).toBeVisible();
    await expect(page.locator('#label-modal-title')).toHaveText('Edit Label');
    await expect(page.locator('#label-name')).toHaveValue('Task');
    
    // Update label details
    await page.locator('#label-name').fill('Task (Updated)');
    await page.locator('#label-color').fill('#10b981');
    await page.locator('#label-group').fill('Type');
    
    // Submit changes
    await page.locator('#label-modal button[type="submit"]').click();
    
    // Verify modal closes
    await expect(labelModal).toHaveClass(/hidden/);
    
    // Verify label updated in list
    const updatedLabel = labelsModal.locator('#labels-list').getByText('Task (Updated)');
    await expect(updatedLabel).toBeVisible();
    
    // Verify old name no longer exists
    const oldLabel = labelsModal.locator('#labels-list').getByText(/^Task$/);
    await expect(oldLabel).toHaveCount(0);
  });

  test('deletes label with confirmation', async ({ page }) => {
    // First create a label to delete (to avoid deleting one that might be used)
    const labelsModal = await openLabelsModal(page);
    await labelsModal.locator('#add-label-btn').click();
    
    const labelModal = page.locator('#label-modal');
    await page.locator('#label-name').fill('Temporary Label');
    await page.locator('#label-color').fill('#f59e0b');
    await page.locator('#label-modal button[type="submit"]').click();
    await expect(labelModal).toHaveClass(/hidden/);
    
    const initialCount = await getLabelCount(page);
    
    // Reopen labels modal and delete the temporary label
    const labelsModalReopen = await openLabelsModal(page);
    const tempLabelItem = labelsModalReopen.locator('#labels-list .label-item').filter({ hasText: 'Temporary Label' });
    
    const deleteBtn = tempLabelItem.locator('button[title*="delete" i], button[aria-label*="delete" i]').first();
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();
    
    // Verify confirmation dialog
    const dialog = page.locator('#dialog-modal');
    await expect(dialog).toBeVisible();
    await expect(page.locator('#dialog-modal-title')).toContainText(/delete label/i);
    await expect(page.locator('#dialog-modal-message')).toContainText(/delete label/i);
    
    // Confirm deletion
    await page.locator('#dialog-confirm-btn').click();
    
    // Verify dialog closes
    await expect(dialog).toHaveClass(/hidden/);
    
    // Verify label removed from list
    await expect(tempLabelItem).toHaveCount(0);
    
    // Verify label count decreased
    const finalCount = await getLabelCount(page);
    expect(finalCount).toBe(initialCount - 1);
  });

  test('groups labels by category in display', async ({ page }) => {
    const labelsModal = await openLabelsModal(page);
    
    // Create labels with different groups
    const labelData = [
      { name: 'High Priority', group: 'Priority', color: '#ef4444' },
      { name: 'Low Priority', group: 'Priority', color: '#f59e0b' },
      { name: 'Feature', group: 'Type', color: '#10b981' },
      { name: 'Bug', group: 'Type', color: '#ef4444' }
    ];
    
    for (const label of labelData) {
      await labelsModal.locator('#add-label-btn').click();
      await page.locator('#label-name').fill(label.name);
      await page.locator('#label-color').fill(label.color);
      await page.locator('#label-group').fill(label.group);
      await page.locator('#label-modal button[type="submit"]').click();
      
      const labelModal = page.locator('#label-modal');
      await expect(labelModal).toHaveClass(/hidden/);
    }
    
    // Verify groups are rendered as accordion sections
    const priorityHeader = labelsModal.locator('.accordion-header').filter({ hasText: 'Priority' });
    const typeHeader = labelsModal.locator('.accordion-header').filter({ hasText: 'Type' });
    await expect(priorityHeader).toBeVisible();
    await expect(typeHeader).toBeVisible();

    // Ensure sections are expanded so bodies are visible
    if ((await priorityHeader.getAttribute('aria-expanded')) !== 'true') await priorityHeader.click();
    if ((await typeHeader.getAttribute('aria-expanded')) !== 'true') await typeHeader.click();

    const labelsList = labelsModal.locator('#labels-list');
    await expect(labelsList.getByText('High Priority')).toBeVisible();
    await expect(labelsList.getByText('Low Priority')).toBeVisible();
    await expect(labelsList.getByText('Feature')).toBeVisible();
    await expect(labelsList.getByText('Bug')).toBeVisible();
  });

  test('searches and filters labels', async ({ page }) => {
    const labelsModal = await openLabelsModal(page);
    
    const searchInput = labelsModal.locator('#labels-search');
    await expect(searchInput).toBeVisible();

    // Search for "Task"
    await searchInput.fill('Task');

    // Verify matching label is shown
    const taskLabel = labelsModal.locator('#labels-list .label-item').filter({ hasText: 'Task' });
    await expect(taskLabel).toBeVisible();

    // Clear search
    await searchInput.fill('');

    // Verify labels are shown again
    const allLabels = labelsModal.locator('#labels-list .label-item');
    const count = await allLabels.count();
    expect(count).toBeGreaterThan(0);
  });

  test('assigns labels to tasks in task modal', async ({ page }) => {
    // Open a task for editing
    const taskCard = page.locator('.task[data-task-id="task-card-1"]');
    await taskCard.locator('.task-title').click();
    
    const taskModal = page.locator('#task-modal');
    await expect(taskModal).toBeVisible();

    // Select the "Task" label in the label picker (checkbox list)
    const taskLabelRow = taskModal.locator('#task-labels-selection label.label-checkbox', { hasText: 'Task' });
    await expect(taskLabelRow).toBeVisible();

    const taskCheckbox = taskLabelRow.locator('input[type="checkbox"]');
    await taskCheckbox.check();
    await expect(taskCheckbox).toBeChecked();
    
    // Save task
    await page.locator('#task-modal button[type="submit"]').click();
    await expect(taskModal).toHaveClass(/hidden/);
    
    // Verify label appears/disappears on task card
    const taskLabels = taskCard.locator('.task-label').filter({ hasText: 'Task' });
    await expect(taskLabels).toHaveCount(1);
  });
});