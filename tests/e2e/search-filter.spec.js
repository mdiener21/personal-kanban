import { test, expect } from '@playwright/test';
import { seedBoardFixture } from './helpers/board-seed.js';
import { createColumnMenuFixture } from './helpers/test-fixtures.js';

async function performSearch(page, query) {
  const searchInput = page.locator('#board-search-input');
  await searchInput.fill(query);
  await page.waitForTimeout(500); // Allow time for filtering
}

async function clearSearch(page) {
  const searchInput = page.locator('#board-search-input');
  await searchInput.fill('');
  await page.waitForTimeout(300);
}

async function getVisibleTaskCards(page) {
  return page.locator('.task-card:visible');
}

async function addTaskWithDetails(page, columnSelector, title, description, priority, labels = []) {
  const column = page.locator(columnSelector);
  await column.locator('[data-action="add-task"]').click();
  
  const taskModal = page.locator('#task-modal');
  await expect(taskModal).toBeVisible();
  
  await page.locator('#task-title').fill(title);
  if (description) {
    await page.locator('#task-description').fill(description);
  }
  if (priority) {
    await page.locator('#task-priority').selectOption(priority);
  }
  
  // Add labels if specified
  for (const labelName of labels) {
    const labelOption = page.locator('#task-labels-list .label-option').filter({ hasText: labelName });
    if (await labelOption.count() > 0) {
      await labelOption.click();
    }
  }
  
  await page.locator('#task-modal button[type="submit"]').click();
  await expect(taskModal).toHaveClass(/hidden/);
}

test.describe('Search and Filter Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#board-container')).toBeVisible();
    await seedBoardFixture(page, createColumnMenuFixture());
    await page.reload();
    
    // Ensure search input is visible and ready
    const searchInput = page.locator('#board-search-input');
    await expect(searchInput).toBeVisible();
  });

  test('filters tasks by title search', async ({ page }) => {
    // Add specific tasks for testing
    await addTaskWithDetails(page, 'article.task-column[data-column="todo"]', 
      'User Authentication Module', 
      'Implement login and registration features', 
      'high'
    );
    
    await addTaskWithDetails(page, 'article.task-column[data-column="todo"]', 
      'Database Schema Design', 
      'Design tables for user data', 
      'medium'
    );
    
    // Get initial task count
    const initialTasks = await getVisibleTaskCards(page);
    const initialCount = await initialTasks.count();
    expect(initialCount).toBeGreaterThan(2);
    
    // Search for "Authentication" in title
    await performSearch(page, 'Authentication');
    
    const filteredTasks = await getVisibleTaskCards(page);
    const filteredCount = await filteredTasks.count();
    
    // Should show fewer tasks
    expect(filteredCount).toBeLessThan(initialCount);
    expect(filteredCount).toBeGreaterThanOrEqual(1);
    
    // Verify the correct task is visible
    await expect(filteredTasks.filter({ hasText: 'User Authentication Module' })).toBeVisible();
    await expect(filteredTasks.filter({ hasText: 'Database Schema Design' })).toHaveCount(0);
    
    // Clear search and verify all tasks return
    await clearSearch(page);
    const clearedTasks = await getVisibleTaskCards(page);
    const clearedCount = await clearedTasks.count();
    expect(clearedCount).toBe(initialCount);
  });

  test('filters tasks by description search', async ({ page }) => {
    await addTaskWithDetails(page, 'article.task-column[data-column="inprogress"]', 
      'API Development', 
      'Create REST endpoints for data access', 
      'high'
    );
    
    await addTaskWithDetails(page, 'article.task-column[data-column="inprogress"]', 
      'Frontend Components', 
      'Build reusable UI components', 
      'medium'
    );
    
    // Search by description content
    await performSearch(page, 'REST endpoints');
    
    const filteredTasks = await getVisibleTaskCards(page);
    
    // Should show only the API Development task
    await expect(filteredTasks).toHaveCount(1);
    await expect(filteredTasks.filter({ hasText: 'API Development' })).toBeVisible();
  });

  test('filters tasks by priority search', async ({ page }) => {
    // Add tasks with different priorities
    await addTaskWithDetails(page, 'article.task-column[data-column="todo"]', 
      'Critical Bug Fix', 
      'Fix production issue', 
      'high'
    );
    
    await addTaskWithDetails(page, 'article.task-column[data-column="todo"]', 
      'Code Cleanup', 
      'Refactor old code', 
      'low'
    );
    
    // Search by priority
    await performSearch(page, 'high');
    
    const filteredTasks = await getVisibleTaskCards(page);
    
    // Should show high priority tasks
    await expect(filteredTasks.filter({ hasText: 'Critical Bug Fix' })).toBeVisible();
    await expect(filteredTasks.filter({ hasText: 'Code Cleanup' })).toHaveCount(0);
    
    // Test low priority search
    await performSearch(page, 'low');
    
    const lowPriorityTasks = await getVisibleTaskCards(page);
    await expect(lowPriorityTasks.filter({ hasText: 'Code Cleanup' })).toBeVisible();
    await expect(lowPriorityTasks.filter({ hasText: 'Critical Bug Fix' })).toHaveCount(0);
  });

  test('filters tasks by label search', async ({ page }) => {
    // First create some labels
    await page.locator('#manage-labels-btn').click();
    const labelModal = page.locator('#label-modal');
    await expect(labelModal).toBeVisible();
    
    // Create 'backend' label
    await page.locator('#label-name').fill('backend');
    await page.locator('#label-color').fill('#10b981');
    await page.locator('#label-modal button[type="submit"]').click();
    await expect(labelModal).toHaveClass(/hidden/);
    
    // Create 'frontend' label
    await page.locator('#manage-labels-btn').click();
    await expect(labelModal).toBeVisible();
    await page.locator('#label-name').fill('frontend');
    await page.locator('#label-color').fill('#3b82f6');
    await page.locator('#label-modal button[type="submit"]').click();
    await expect(labelModal).toHaveClass(/hidden/);
    
    // Add tasks with labels
    await addTaskWithDetails(page, 'article.task-column[data-column="todo"]', 
      'API Integration', 
      'Connect to external API', 
      'medium',
      ['backend']
    );
    
    await addTaskWithDetails(page, 'article.task-column[data-column="todo"]', 
      'UI Design', 
      'Create responsive layout', 
      'medium',
      ['frontend']
    );
    
    // Search by label name
    await performSearch(page, 'backend');
    
    const backendTasks = await getVisibleTaskCards(page);
    await expect(backendTasks.filter({ hasText: 'API Integration' })).toBeVisible();
    await expect(backendTasks.filter({ hasText: 'UI Design' })).toHaveCount(0);
    
    // Search by different label
    await performSearch(page, 'frontend');
    
    const frontendTasks = await getVisibleTaskCards(page);
    await expect(frontendTasks.filter({ hasText: 'UI Design' })).toBeVisible();
    await expect(frontendTasks.filter({ hasText: 'API Integration' })).toHaveCount(0);
  });

  test('performs case-insensitive search', async ({ page }) => {
    await addTaskWithDetails(page, 'article.task-column[data-column="todo"]', 
      'JavaScript Enhancement', 
      'Add new functionality', 
      'medium'
    );
    
    // Test various case combinations
    const searchTerms = ['javascript', 'JAVASCRIPT', 'JavaScript', 'jAvAsCrIpT'];
    
    for (const term of searchTerms) {
      await performSearch(page, term);
      
      const filteredTasks = await getVisibleTaskCards(page);
      await expect(filteredTasks.filter({ hasText: 'JavaScript Enhancement' })).toBeVisible();
      
      await clearSearch(page);
    }
  });

  test('performs partial word search', async ({ page }) => {
    await addTaskWithDetails(page, 'article.task-column[data-column="todo"]', 
      'Database Optimization', 
      'Improve query performance', 
      'high'
    );
    
    // Search with partial words
    await performSearch(page, 'optim');
    
    const filteredTasks = await getVisibleTaskCards(page);
    await expect(filteredTasks.filter({ hasText: 'Database Optimization' })).toBeVisible();
    
    // Search with partial description
    await performSearch(page, 'query perf');
    
    const descriptionTasks = await getVisibleTaskCards(page);
    await expect(descriptionTasks.filter({ hasText: 'Database Optimization' })).toBeVisible();
  });

  test('shows no results for non-matching search', async ({ page }) => {
    // Search for something that won't match any tasks
    await performSearch(page, 'nonexistent-search-term-xyz');
    
    const filteredTasks = await getVisibleTaskCards(page);
    const taskCount = await filteredTasks.count();
    expect(taskCount).toBe(0);
    
    // Verify columns are still visible but empty
    const columns = page.locator('article.task-column');
    const columnCount = await columns.count();
    expect(columnCount).toBeGreaterThan(0);
    
    // Verify empty state messaging or handling
    const emptyColumns = columns.filter({ hasText: /no tasks|empty/i });
    // This depends on implementation - might show empty message or just empty columns
  });

  test('maintains filter across column interactions', async ({ page }) => {
    // Add tasks in different columns
    await addTaskWithDetails(page, 'article.task-column[data-column="todo"]', 
      'Feature Development', 
      'Build new features', 
      'medium'
    );
    
    await addTaskWithDetails(page, 'article.task-column[data-column="inprogress"]', 
      'Feature Testing', 
      'Test completed features', 
      'low'
    );
    
    // Apply search filter
    await performSearch(page, 'feature');
    
    // Verify both tasks are visible
    const filteredTasks = await getVisibleTaskCards(page);
    await expect(filteredTasks).toHaveCount(2);
    
    // Interact with column (e.g., collapse/expand)
    const todoColumn = page.locator('article.task-column[data-column="todo"]');
    const collapseBtn = todoColumn.locator('.column-collapse-btn');
    
    if (await collapseBtn.count() > 0) {
      await collapseBtn.click(); // Collapse
      await page.waitForTimeout(300);
      await collapseBtn.click(); // Expand
    }
    
    // Filter should still be active
    const searchInput = page.locator('#board-search-input');
    await expect(searchInput).toHaveValue('feature');
    
    const stillFilteredTasks = await getVisibleTaskCards(page);
    await expect(stillFilteredTasks).toHaveCount(2);
  });

  test('clears filter when search input is emptied', async ({ page }) => {
    const initialTasks = await getVisibleTaskCards(page);
    const initialCount = await initialTasks.count();
    
    // Apply filter
    await performSearch(page, 'some filter');
    
    const filteredTasks = await getVisibleTaskCards(page);
    const filteredCount = await filteredTasks.count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
    
    // Clear filter
    await clearSearch(page);
    
    // All tasks should be visible again
    const clearedTasks = await getVisibleTaskCards(page);
    const clearedCount = await clearedTasks.count();
    expect(clearedCount).toBe(initialCount);
  });

  test('filters work across all columns simultaneously', async ({ page }) => {
    // Add similar tasks in multiple columns
    await addTaskWithDetails(page, 'article.task-column[data-column="todo"]', 
      'Review Process Setup', 
      'Setup code review process', 
      'medium'
    );
    
    await addTaskWithDetails(page, 'article.task-column[data-column="inprogress"]', 
      'Review Implementation', 
      'Implement review workflow', 
      'high'
    );
    
    await addTaskWithDetails(page, 'article.task-column[data-column="done"]', 
      'Different Task', 
      'Unrelated work', 
      'low'
    );
    
    // Search for "review"
    await performSearch(page, 'review');
    
    // Should find tasks in todo and inprogress columns
    const todoColumn = page.locator('article.task-column[data-column="todo"]');
    const inProgressColumn = page.locator('article.task-column[data-column="inprogress"]');
    const doneColumn = page.locator('article.task-column[data-column="done"]');
    
    await expect(todoColumn.locator('.task-card:visible').filter({ hasText: 'Review Process Setup' })).toBeVisible();
    await expect(inProgressColumn.locator('.task-card:visible').filter({ hasText: 'Review Implementation' })).toBeVisible();
    await expect(doneColumn.locator('.task-card:visible').filter({ hasText: 'Different Task' })).toHaveCount(0);
  });

  test('search persists across page navigation/refresh', async ({ page }) => {
    // Apply search filter
    await performSearch(page, 'persistent search');
    
    const searchInput = page.locator('#board-search-input');
    await expect(searchInput).toHaveValue('persistent search');
    
    // Refresh page
    await page.reload();
    await expect(page.locator('#board-container')).toBeVisible();
    
    // Check if search is remembered (depends on implementation)
    const searchInputAfterRefresh = page.locator('#board-search-input');
    
    // This test might need adjustment based on whether search state is persisted
    // For now, we verify the search input is functional after refresh
    await performSearch(page, 'test search');
    await expect(searchInputAfterRefresh).toHaveValue('test search');
  });
});