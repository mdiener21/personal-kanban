// spec: task-creation-with-labels.plan.md
// seed: tests/e2e/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Task Creation - Happy Path Scenarios', () => {
  test('Create task with 2 existing labels and medium priority in In Progress column', async ({ page }) => {
    // Navigate to the kanban board application
    await page.goto('http://localhost:3000');

    // Click the 'Add task to In Progress' button
    await page.getByRole('button', { name: 'Add task to In Progress' }).click();

    // Enter 'Implement user authentication system' as the task title
    await page.getByRole('textbox', { name: 'Title' }).fill('Implement user authentication system');

    // Set priority to 'Medium' from the dropdown
    await page.getByLabel('Priority', { exact: true }).selectOption(['Medium']);

    // Select 'Feature' and 'Task' labels by clicking their checkboxes
    await page.getByRole('checkbox', { name: 'Feature' }).click();

    // Select the 'Task' label by clicking its checkbox
    await page.getByRole('checkbox', { name: 'Task' }).click();

    // Click 'Add Task' button
    await page.getByRole('button', { name: 'Add Task', exact: true }).click();

    // Verify task is created in the In Progress column
    await expect(page.getByText('Implement user authentication system')).toBeVisible();
    await expect(page.locator('article:has-text("In Progress") .task:first-child')).toContainText('medium');
    await expect(page.locator('article:has-text("In Progress") .task:first-child')).toContainText('Feature');
    await expect(page.locator('article:has-text("In Progress") .task:first-child')).toContainText('Task');
    await expect(page.locator('article:has-text("In Progress") [role="generic"]:has-text("Task count")')).toContainText('4');
  });
});