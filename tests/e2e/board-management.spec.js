import { test, expect } from '@playwright/test';
import { buildSingleBoardFixture, seedBoardFixture } from './helpers/board-seed.js';

async function openBoardsModal(page) {
  const manageBoardsBtn = page.locator('#manage-boards-btn');
  const menuBtn = page.locator('#desktop-menu-btn');
  const controlsMenu = page.locator('#board-controls-menu');
  const boardsModal = page.locator('#boards-modal');

  // If it's already open, just use it.
  if (await boardsModal.isVisible()) {
    return boardsModal;
  }

  // Avoid click interception by any in-flight modal/dialog close animations.
  await expect(page.locator('#dialog-modal')).toBeHidden();
  await expect(page.locator('#board-create-modal')).toBeHidden();
  await expect(page.locator('#board-rename-modal')).toBeHidden();

  // On small layouts the controls menu is collapsed behind the menu button
  if (!(await manageBoardsBtn.isVisible())) {
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

  await expect(manageBoardsBtn).toBeVisible();
  await manageBoardsBtn.click();

  await expect(boardsModal).toBeVisible();
  return boardsModal;
}

async function getCurrentBoardName(page) {
  const brandText = await page.locator('#brand-text, .brand-text').textContent();
  return (brandText || '').trim();
}

async function getBoardCount(page) {
  const modal = await openBoardsModal(page);
  const boardItems = modal.locator('#boards-list .label-item');
  const count = await boardItems.count();
  
  // Close modal
  await page.locator('#boards-close-btn').click();
  await expect(page.locator('#boards-modal')).toBeHidden();
  
  return count;
}

test.describe('Board Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#board-container')).toBeVisible();
    
    // Seed with a basic board
    const fixture = buildSingleBoardFixture({
      boardId: 'test-board-1',
      boardName: 'Test Board 1',
      columns: [
        { id: 'todo', name: 'To Do', color: '#3583ff', order: 1, collapsed: false },
        { id: 'done', name: 'Done', color: '#505050', order: 2, collapsed: false }
      ],
      tasks: [],
      labels: [],
      settings: {
        showPriority: true,
        showDueDate: true,
        showAge: true,
        showChangeDate: false,
        locale: 'en-US',
        defaultPriority: 'none',
        notificationDays: 3,
        countdownUrgentThreshold: 3,
        countdownWarningThreshold: 10
      }
    });
    
    await seedBoardFixture(page, fixture);
    await page.reload();
  });

  test('creates new board via manage boards modal', async ({ page }) => {
    const initialCount = await getBoardCount(page);
    const modal = await openBoardsModal(page);
    
    // Click Add Board button
    const addBoardBtn = modal.locator('#add-board-btn');
    await expect(addBoardBtn).toBeVisible();
    await addBoardBtn.click();
    
    // Verify board creation modal opens
    const createModal = page.locator('#board-create-modal');
    await expect(createModal).toBeVisible();
    
    // Fill in board name
    await page.locator('#board-create-name').fill('New Test Board');
    
    // Submit form
    await page.locator('#board-create-form button[type="submit"]').click();
    
    // Verify creation modal closes
    await expect(createModal).toHaveClass(/hidden/);
    
    // Verify we're back to boards modal
    await expect(modal).toBeVisible();
    
    // Verify new board appears in list
    const newBoardItem = modal.locator('#boards-list').getByText('New Test Board');
    await expect(newBoardItem).toBeVisible();
    
    // Verify board count increased
    const finalCount = await getBoardCount(page);
    expect(finalCount).toBe(initialCount + 1);
  });

  test('switches boards via board selector dropdown', async ({ page }) => {
    // Create a second board first
    const modal = await openBoardsModal(page);
    await modal.locator('#add-board-btn').click();
    
    const createModal = page.locator('#board-create-modal');
    await page.locator('#board-create-name').fill('Second Board');
    await page.locator('#board-create-form button[type="submit"]').click();
    await expect(createModal).toHaveClass(/hidden/);
    
    // Close boards modal
    await page.locator('#boards-close-btn').click();
    await expect(page.locator('#boards-modal')).toBeHidden();
    
    // Verify we're now on the new board
    await expect(page.locator('#brand-text, .brand-text')).toContainText('Second Board');
    
    // Switch back via dropdown
    const boardSelect = page.locator('#board-select');

    // The board selector lives inside the controls menu and may be hidden until the menu is opened.
    if (!(await boardSelect.isVisible())) {
      const menuBtn = page.locator('#desktop-menu-btn');
      const controlsMenu = page.locator('#board-controls-menu');

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

      await expect(controlsMenu).toHaveClass(/\bshow\b/);
    }

    await expect(boardSelect).toBeVisible();
    
    // Select the first board
    const testBoardValue = await boardSelect.evaluate((selectEl) => {
      const select = /** @type {HTMLSelectElement} */ (selectEl);
      const option = Array.from(select.options).find((o) => {
        const text = (o.label || o.textContent || '').trim();
        return text.includes('Test Board 1');
      });
      return option?.value || '';
    });
    expect(testBoardValue, 'Expected an option for "Test Board 1"').not.toBe('');
    await boardSelect.selectOption(testBoardValue);
    
    // Verify board switched
    await expect(page.locator('#brand-text, .brand-text')).toContainText('Test Board 1');
  });

  test('switches boards via Open button in manage boards modal', async ({ page }) => {
    // Create a second board first
    const modal = await openBoardsModal(page);
    await modal.locator('#add-board-btn').click();
    
    const createModal = page.locator('#board-create-modal');
    await page.locator('#board-create-name').fill('Target Board');
    await page.locator('#board-create-form button[type="submit"]').click();
    await expect(createModal).toHaveClass(/hidden/);
    
    // Now switch back to first board using Open button
    const targetRow = modal.locator('#boards-list .label-item').filter({ hasText: 'Test Board 1' });
    await expect(targetRow).toBeVisible();
    
    const openBtn = targetRow.locator('button:has-text("Open")');
    await expect(openBtn).toBeVisible();
    await openBtn.click();
    
    // Verify board switched and modal closed
    await expect(modal).toHaveClass(/hidden/);
    await expect(page.locator('#brand-text, .brand-text')).toContainText('Test Board 1');
    
    // Verify active badge appears on correct board
    const modalReopen = await openBoardsModal(page);
    const activeRow = modalReopen.locator('#boards-list .label-item').filter({ hasText: 'Test Board 1' });
    await expect(activeRow.locator('.task-label:has-text("Active")')).toBeVisible();
  });

  test('renames board via edit button', async ({ page }) => {
    const modal = await openBoardsModal(page);
    
    // Find the board item and click edit
    const boardRow = modal.locator('#boards-list .label-item').filter({ hasText: 'Test Board 1' });
    await expect(boardRow).toBeVisible();
    
    const editBtn = boardRow.locator('button[title*="rename" i], button[aria-label*="rename" i]').first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    
    // Verify rename modal opens
    const renameModal = page.locator('#board-rename-modal');
    await expect(renameModal).toBeVisible();
    
    // Update name
    const nameInput = page.locator('#board-rename-name');
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveValue('Test Board 1');
    
    await nameInput.fill('Renamed Board');
    
    // Submit rename
    await page.locator('#board-rename-form button[type="submit"]').click();
    
    // Verify rename modal closes
    await expect(renameModal).toHaveClass(/hidden/);
    
    // Verify name updated in boards list
    const updatedRow = modal.locator('#boards-list .label-item').filter({ hasText: 'Renamed Board' });
    await expect(updatedRow).toBeVisible();
    
    // Close boards modal and verify header updated
    await page.locator('#boards-close-btn').click();
    await expect(page.locator('#brand-text, .brand-text')).toContainText('Renamed Board');
  });

  test('deletes board with confirmation when multiple exist', async ({ page }) => {
    // Create a second board so we can delete the first
    const modal = await openBoardsModal(page);
    await modal.locator('#add-board-btn').click();
    
    const createModal = page.locator('#board-create-modal');
    await page.locator('#board-create-name').fill('Board to Keep');
    await page.locator('#board-create-form button[type="submit"]').click();
    await expect(createModal).toHaveClass(/hidden/);
    
    const initialCount = await getBoardCount(page);
    
    // Reopen boards modal and delete the first board
    const modalReopen = await openBoardsModal(page);
    const boardRow = modalReopen.locator('#boards-list .label-item').filter({ hasText: 'Test Board 1' });
    
    const deleteBtn = boardRow.locator('button[title*="delete" i], button[aria-label*="delete" i]').first();
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();
    
    // Verify confirmation dialog
    const dialog = page.locator('#dialog-modal');
    await expect(dialog).toBeVisible();
    await expect(page.locator('#dialog-modal-message')).toContainText(/delete the board/i);
    
    // Confirm deletion
    await page.locator('#dialog-confirm-btn').click();
    
    // Verify board removed from list
    await expect(boardRow).toHaveCount(0);
    
    // Verify board count decreased
    const finalCount = await getBoardCount(page);
    expect(finalCount).toBe(initialCount - 1);
  });

  test('prevents deletion of last remaining board', async ({ page }) => {
    const modal = await openBoardsModal(page);
    
    // Try to delete the only board
    const boardRow = modal.locator('#boards-list .label-item').filter({ hasText: 'Test Board 1' });
    const deleteBtn = boardRow.locator('button[title*="delete" i], button[aria-label*="delete" i]').first();
    
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // First: confirm deletion prompt
    const dialog = page.locator('#dialog-modal');
    await expect(dialog).toBeVisible();
    await expect(page.locator('#dialog-modal-title')).toContainText(/delete board/i);
    await page.locator('#dialog-confirm-btn').click();

    // Then: deletion guard alert (cannot delete last board)
    await expect(dialog).toBeVisible();
    await expect(page.locator('#dialog-modal-title')).toContainText(/unable to delete/i);
    await expect(page.locator('#dialog-modal-message')).toContainText(/unable to delete|last board/i);
    await page.locator('#dialog-confirm-btn').click();
    await expect(dialog).toHaveClass(/hidden/);

    // Verify board still exists
    await expect(boardRow).toBeVisible();
  });

  test('exports board from manage boards modal', async ({ page }) => {
    const modal = await openBoardsModal(page);
    
    // Find board and click export
    const boardRow = modal.locator('#boards-list .label-item').filter({ hasText: 'Test Board 1' });
    const exportBtn = boardRow.locator('button[title*="export" i], button[aria-label*="export" i]').first();
    
    await expect(exportBtn).toBeVisible();
    
    // Set up download handler
    const downloadPromise = page.waitForEvent('download');
    
    await exportBtn.click();
    
    // Verify download initiated
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^Test_Board_1_board_.*\.json$/);
  });

  test('displays correct active board indicator', async ({ page }) => {
    const modal = await openBoardsModal(page);
    
    // Verify current active board has "Active" badge
    const activeBoard = modal.locator('#boards-list .label-item').filter({ hasText: 'Test Board 1' });
    await expect(activeBoard.locator('.task-label:has-text("Active")')).toBeVisible();
    
    // Create another board
    await modal.locator('#add-board-btn').click();
    const createModal = page.locator('#board-create-modal');
    await page.locator('#board-create-name').fill('Inactive Board');
    await page.locator('#board-create-form button[type="submit"]').click();
    await expect(createModal).toHaveClass(/hidden/);
    
    // Verify new board is now active
    const newActiveBoard = modal.locator('#boards-list .label-item').filter({ hasText: 'Inactive Board' });
    await expect(newActiveBoard.locator('.task-label:has-text("Active")')).toBeVisible();
    
    // Verify old board no longer has active badge
    await expect(activeBoard.locator('.task-label:has-text("Active")')).toHaveCount(0);
  });
});