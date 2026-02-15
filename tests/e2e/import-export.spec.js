import { test, expect } from '@playwright/test';
import { seedBoardFixture } from './helpers/board-seed.js';
import { createColumnMenuFixture } from './helpers/test-fixtures.js';

async function getBoardName(page) {
  const brandText = page.locator('#brand-text, .brand-text');
  return await brandText.textContent();
}

async function createTestBoardData() {
  return {
    boardName: 'Test Import Board',
    columns: [
      { id: 'backlog', name: 'Backlog', color: '#6b7280', order: 1 },
      { id: 'development', name: 'Development', color: '#3b82f6', order: 2 },
      { id: 'testing', name: 'Testing', color: '#f59e0b', order: 3 },
      { id: 'done', name: 'Done', color: '#10b981', order: 4 }
    ],
    tasks: [
      {
        id: 'task-1',
        title: 'Setup project structure',
        description: 'Create initial project folders and configuration',
        column: 'backlog',
        priority: 'high',
        order: 1,
        labels: ['setup'],
        creationDate: '2026-02-01'
      },
      {
        id: 'task-2',
        title: 'Implement user authentication',
        description: 'Add login and registration functionality',
        column: 'development',
        priority: 'medium',
        dueDate: '2026-02-20',
        order: 1,
        labels: ['backend'],
        creationDate: '2026-02-05'
      }
    ],
    labels: [
      { id: 'setup', name: 'Setup', color: '#8b5cf6' },
      { id: 'backend', name: 'Backend', color: '#10b981' }
    ],
    settings: {
      showPriority: true,
      showDueDate: true,
      showAge: false,
      showChangeDate: false,
      locale: 'en-US',
      defaultPriority: 'medium',
      notificationDays: 7
    }
  };
}

test.describe('Import/Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#board-container')).toBeVisible();
  });

  test('exports board data as JSON file', async ({ page }) => {
    // Seed the board with test data
    await seedBoardFixture(page, createColumnMenuFixture());
    await page.reload();
    
    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#export-btn').click();
    const download = await downloadPromise;
    
    // Verify download properties
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/^board-.*\.json$/);
    expect(filename).toContain('.json');
    
    // Verify download content
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    
    // Read and validate downloaded JSON
    const fs = require('fs');
    const downloadedContent = fs.readFileSync(downloadPath, 'utf8');
    const boardData = JSON.parse(downloadedContent);
    
    // Validate structure
    expect(boardData).toHaveProperty('boardName');
    expect(boardData).toHaveProperty('columns');
    expect(boardData).toHaveProperty('tasks');
    expect(boardData).toHaveProperty('labels');
    expect(Array.isArray(boardData.columns)).toBe(true);
    expect(Array.isArray(boardData.tasks)).toBe(true);
    expect(Array.isArray(boardData.labels)).toBe(true);
    
    // Validate essential columns exist
    const columnNames = boardData.columns.map(c => c.name);
    expect(columnNames).toContain('Done'); // Done column should always be present
  });

  test('imports board from valid JSON file', async ({ page }) => {
    const testBoardData = await createTestBoardData();
    const fileContent = JSON.stringify(testBoardData, null, 2);
    
    // Create file input and trigger import
    const fileInput = page.locator('#import-file');
    await page.locator('#import-btn').click();
    
    // Set file content
    const buffer = Buffer.from(fileContent);
    await fileInput.setInputFiles({
      name: 'test-board.json',
      mimeType: 'application/json',
      buffer: buffer
    });
    
    // Verify import confirmation dialog
    const dialog = page.locator('#dialog-modal');
    await expect(dialog).toBeVisible();
    const message = page.locator('#dialog-modal-message');
    await expect(message).toContainText('import this board');
    
    // Confirm import
    await page.locator('#dialog-confirm-btn').click();
    await expect(dialog).toHaveClass(/hidden/);
    
    // Verify board was imported
    await page.waitForTimeout(1000); // Allow time for import processing
    
    const boardName = await getBoardName(page);
    expect(boardName).toBe('Test Import Board');
    
    // Verify columns were imported
    await expect(page.locator('article.task-column[data-column="backlog"]')).toBeVisible();
    await expect(page.locator('article.task-column[data-column="development"]')).toBeVisible();
    await expect(page.locator('article.task-column[data-column="testing"]')).toBeVisible();
    
    // Verify tasks were imported
    await expect(page.locator('.task-card').filter({ hasText: 'Setup project structure' })).toBeVisible();
    await expect(page.locator('.task-card').filter({ hasText: 'Implement user authentication' })).toBeVisible();
    
    // Verify task is in correct column
    const developmentColumn = page.locator('article.task-column[data-column="development"]');
    await expect(developmentColumn.locator('.task-card').filter({ hasText: 'Implement user authentication' })).toBeVisible();
    
    // Verify labels were imported
    const taskCard = page.locator('.task-card').filter({ hasText: 'Setup project structure' }).first();
    await expect(taskCard.locator('.task-label').filter({ hasText: 'Setup' })).toBeVisible();
  });

  test('handles import cancellation', async ({ page }) => {
    await seedBoardFixture(page, createColumnMenuFixture());
    const originalBoardName = await getBoardName(page);
    
    const testBoardData = await createTestBoardData();
    const fileContent = JSON.stringify(testBoardData, null, 2);
    
    const fileInput = page.locator('#import-file');
    await page.locator('#import-btn').click();
    
    const buffer = Buffer.from(fileContent);
    await fileInput.setInputFiles({
      name: 'cancel-test-board.json',
      mimeType: 'application/json',
      buffer: buffer
    });
    
    // Verify confirmation dialog
    const dialog = page.locator('#dialog-modal');
    await expect(dialog).toBeVisible();
    
    // Cancel import
    await page.locator('#dialog-cancel-btn').click();
    await expect(dialog).toHaveClass(/hidden/);
    
    // Verify board wasn't changed
    const currentBoardName = await getBoardName(page);
    expect(currentBoardName).toBe(originalBoardName);
    
    // Verify original data is still present
    await expect(page.locator('article.task-column[data-column="todo"]')).toBeVisible();
  });

  test('validates JSON file format on import', async ({ page }) => {
    // Test with invalid JSON
    const invalidJson = '{ "boardName": "Invalid", "columns": [ invalid json }';
    
    const fileInput = page.locator('#import-file');
    await page.locator('#import-btn').click();
    
    const buffer = Buffer.from(invalidJson);
    await fileInput.setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: buffer
    });
    
    // Should show error dialog
    const dialog = page.locator('#dialog-modal');
    await expect(dialog).toBeVisible();
    const message = page.locator('#dialog-modal-message');
    await expect(message).toContainText(/error|invalid|parse/i);
    
    await page.locator('#dialog-confirm-btn').click();
    await expect(dialog).toHaveClass(/hidden/);
  });

  test('handles missing required fields in import', async ({ page }) => {
    // Test with incomplete board data
    const incompleteData = {
      boardName: 'Incomplete Board',
      // Missing columns, tasks, labels
    };
    
    const fileContent = JSON.stringify(incompleteData, null, 2);
    
    const fileInput = page.locator('#import-file');
    await page.locator('#import-btn').click();
    
    const buffer = Buffer.from(fileContent);
    await fileInput.setInputFiles({
      name: 'incomplete.json',
      mimeType: 'application/json',
      buffer: buffer
    });
    
    // Should either show validation error or import with defaults
    const dialog = page.locator('#dialog-modal');
    await expect(dialog).toBeVisible();
    
    // If it's a validation error, message should indicate the issue
    const message = page.locator('#dialog-modal-message');
    const messageText = await message.textContent();
    
    if (messageText.toLowerCase().includes('error')) {
      // Validation failed - acknowledge error
      await page.locator('#dialog-confirm-btn').click();
    } else {
      // Import proceeded with defaults - confirm
      await page.locator('#dialog-confirm-btn').click();
      
      // Verify import succeeded with defaults
      await page.waitForTimeout(1000);
      const boardName = await getBoardName(page);
      expect(boardName).toBe('Incomplete Board');
      
      // Should have default columns
      await expect(page.locator('article.task-column[data-column="done"]')).toBeVisible();
    }
  });

  test('preserves data integrity during export-import cycle', async ({ page }) => {
    // Create and seed a board with comprehensive data
    await seedBoardFixture(page, createColumnMenuFixture());
    await page.reload();
    
    // Add a task with comprehensive data
    await page.locator('[data-action="add-task"]').first().click();
    const taskModal = page.locator('#task-modal');
    await expect(taskModal).toBeVisible();
    
    await page.locator('#task-title').fill('Round-trip Test Task');
    await page.locator('#task-description').fill('Testing export-import data integrity');
    await page.locator('#task-priority').selectOption('high');
    await page.locator('#task-due-date').fill('2026-03-01');
    
    await page.locator('#task-modal button[type="submit"]').click();
    await expect(taskModal).toHaveClass(/hidden/);
    
    // Export the board
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#export-btn').click();
    const download = await downloadPromise;
    
    const downloadPath = await download.path();
    const fs = require('fs');
    const exportedData = JSON.parse(fs.readFileSync(downloadPath, 'utf8'));
    
    // Create a new board and import the exported data
    await page.locator('#add-board-btn').click();
    const boardModal = page.locator('#board-modal');
    await expect(boardModal).toBeVisible();
    await page.locator('#board-name').fill('Import Test Board');
    await page.locator('#board-modal button[type="submit"]').click();
    await expect(boardModal).toHaveClass(/hidden/);
    
    // Import the exported data
    const fileInput = page.locator('#import-file');
    await page.locator('#import-btn').click();
    
    const buffer = Buffer.from(JSON.stringify(exportedData));
    await fileInput.setInputFiles({
      name: 'round-trip-test.json',
      mimeType: 'application/json',
      buffer: buffer
    });
    
    const dialog = page.locator('#dialog-modal');
    await expect(dialog).toBeVisible();
    await page.locator('#dialog-confirm-btn').click();
    
    // Verify all data was preserved
    await page.waitForTimeout(1000);
    
    // Check task was imported correctly
    const importedTask = page.locator('.task-card').filter({ hasText: 'Round-trip Test Task' });
    await expect(importedTask).toBeVisible();
    
    // Verify task details by opening it
    await importedTask.click();
    await expect(taskModal).toBeVisible();
    
    await expect(page.locator('#task-title')).toHaveValue('Round-trip Test Task');
    await expect(page.locator('#task-description')).toHaveValue('Testing export-import data integrity');
    await expect(page.locator('#task-priority')).toHaveValue('high');
    await expect(page.locator('#task-due-date')).toHaveValue('2026-03-01');
  });

  test('imports legacy board format correctly', async ({ page }) => {
    // Test compatibility with older export formats
    const legacyBoardData = {
      boardName: 'Legacy Board',
      columns: [
        { id: 'todo', name: 'To Do', color: '#ef4444' },
        { id: 'done', name: 'Done', color: '#10b981' }
      ],
      tasks: [
        {
          id: 'legacy-task',
          text: 'Legacy task title', // Old format used 'text' instead of 'title'
          description: 'Legacy task description',
          column: 'todo',
          priority: 'medium',
          'due-date': '2026-02-25', // Old format used 'due-date'
          labels: []
        }
      ],
      labels: []
    };
    
    const fileContent = JSON.stringify(legacyBoardData, null, 2);
    
    const fileInput = page.locator('#import-file');
    await page.locator('#import-btn').click();
    
    const buffer = Buffer.from(fileContent);
    await fileInput.setInputFiles({
      name: 'legacy-board.json',
      mimeType: 'application/json',
      buffer: buffer
    });
    
    const dialog = page.locator('#dialog-modal');
    await expect(dialog).toBeVisible();
    await page.locator('#dialog-confirm-btn').click();
    
    // Verify import succeeded
    await page.waitForTimeout(1000);
    const boardName = await getBoardName(page);
    expect(boardName).toBe('Legacy Board');
    
    // Verify legacy task was imported with field conversion
    const legacyTask = page.locator('.task-card').filter({ hasText: 'Legacy task title' });
    await expect(legacyTask).toBeVisible();
    
    // Verify the task details were converted correctly
    await legacyTask.click();
    const taskModal = page.locator('#task-modal');
    await expect(taskModal).toBeVisible();
    
    await expect(page.locator('#task-title')).toHaveValue('Legacy task title');
    await expect(page.locator('#task-due-date')).toHaveValue('2026-02-25');
  });

  test('handles large board imports efficiently', async ({ page }) => {
    // Create a board with many tasks and columns
    const largeBoardData = {
      boardName: 'Large Test Board',
      columns: Array.from({ length: 10 }, (_, i) => ({
        id: `col-${i}`,
        name: `Column ${i + 1}`,
        color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
        order: i + 1
      })).concat([{ id: 'done', name: 'Done', color: '#10b981', order: 11 }]),
      tasks: Array.from({ length: 50 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i + 1}`,
        description: `Description for task ${i + 1}`,
        column: `col-${i % 10}`,
        priority: ['low', 'medium', 'high'][i % 3],
        order: i + 1,
        labels: [],
        creationDate: '2026-02-01'
      })),
      labels: [],
      settings: {}
    };
    
    const fileContent = JSON.stringify(largeBoardData, null, 2);
    
    const fileInput = page.locator('#import-file');
    await page.locator('#import-btn').click();
    
    const buffer = Buffer.from(fileContent);
    await fileInput.setInputFiles({
      name: 'large-board.json',
      mimeType: 'application/json',
      buffer: buffer
    });
    
    const dialog = page.locator('#dialog-modal');
    await expect(dialog).toBeVisible();
    await page.locator('#dialog-confirm-btn').click();
    
    // Allow more time for large import
    await page.waitForTimeout(3000);
    
    // Verify import succeeded
    const boardName = await getBoardName(page);
    expect(boardName).toBe('Large Test Board');
    
    // Verify columns were imported
    const columns = page.locator('article.task-column');
    const columnCount = await columns.count();
    expect(columnCount).toBe(11); // 10 + Done column
    
    // Verify tasks were imported
    const tasks = page.locator('.task-card');
    const taskCount = await tasks.count();
    expect(taskCount).toBe(50);
  });
});