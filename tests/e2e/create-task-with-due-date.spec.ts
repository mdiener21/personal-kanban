// spec: task-creation-with-labels.plan.md
// seed: tests/e2e/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Task Creation - Happy Path Scenarios', () => {
  test('Create task with due date, 2 labels, and medium priority', async ({ page }) => {
    // Navigate to the kanban board application
    await page.goto('http://localhost:3000');

    // Click 'Add task to To Do' button
    await page.getByRole('button', { name: 'Add task to To Do' }).click();

    // Enter 'Finalize quarterly report' as title
    await page.getByRole('textbox', { name: 'Title' }).fill('Finalize quarterly report');

    // Select 'Medium' priority
    await page.getByLabel('Priority', { exact: true }).selectOption(['Medium']);

    // Click the Due Date field and enter a future date (e.g., 2026-02-15)
    await page.getByRole('textbox', { name: 'Due Date' }).fill('2026-02-15');

    // Select 'Urgent' and 'Task' labels
    await page.getByRole('checkbox', { name: 'Urgent' }).click();

    // Select the 'Task' label
    await page.getByRole('checkbox', { name: 'Task' }).click();

    // Click 'Add Task' to create the task
    await page.getByRole('button', { name: 'Add Task', exact: true }).click();

    // Verify task is created successfully
    await expect(page.getByText('Finalize quarterly report')).toBeVisible();
    await expect(page.getByText('medium')).toBeVisible();
    await expect(page.getByText('Urgent')).toBeVisible();
    await expect(page.getByText('Task')).toBeVisible();
    await expect(page.getByText('Due 2/15/2026')).toBeVisible();
  });
});