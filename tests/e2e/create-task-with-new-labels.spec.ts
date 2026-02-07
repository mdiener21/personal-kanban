// spec: task-creation-with-labels.plan.md
// seed: tests/e2e/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Task Creation - Label Management Scenarios', () => {
  test('Create task with 2 new custom labels and medium priority', async ({ page }) => {
    // Navigate to the kanban board application
    await page.goto('http://localhost:3000');

    // Click 'Add task to To Do' button
    await page.getByRole('button', { name: 'Add task to To Do' }).click();

    // Enter 'Design new user interface mockups' as title
    await page.getByRole('textbox', { name: 'Title' }).fill('Design new user interface mockups');

    // Select 'Medium' priority from dropdown
    await page.getByLabel('Priority', { exact: true }).selectOption(['Medium']);

    // In the Labels section, click the 'Add a new label' button
    await page.getByRole('button', { name: 'Add a new label' }).click();

    // Enter 'Design' as the label name
    await page.getByRole('textbox', { name: 'Label Name' }).fill('Design');

    // Change the color to red by entering '#ef4444' in the hex color field
    await page.getByRole('textbox', { name: 'Hex color code' }).fill('#ef4444');

    // Click 'Add Label' button
    await page.getByRole('button', { name: 'Add Label' }).click();

    // Click 'Add a new label' button again to create second label
    await page.getByRole('button', { name: 'Add a new label' }).click();

    // Enter 'UI/UX' as label name and set color to '#10b981' (green)
    await page.getByRole('textbox', { name: 'Label Name' }).fill('UI/UX');

    // Set the color to green (#10b981)
    await page.getByRole('textbox', { name: 'Hex color code' }).fill('#10b981');

    // Click 'Add Label' to create the second label
    await page.getByRole('button', { name: 'Add Label' }).click();

    // Click 'Add Task' to create the task
    await page.getByRole('button', { name: 'Add Task', exact: true }).click();

    // Verify task is created with medium priority and custom labels
    await expect(page.getByText('Design new user interface mockups')).toBeVisible();
    await expect(page.getByText('medium')).toBeVisible();
    await expect(page.getByText('Design')).toBeVisible();
    await expect(page.getByText('UI/UX')).toBeVisible();
    await expect(page.locator('article:has-text("To Do") [role="generic"]:has-text("Task count")')).toContainText('2');
  });
});