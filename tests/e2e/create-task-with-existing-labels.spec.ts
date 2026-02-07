// spec: task-creation-with-labels.plan.md
// seed: tests/e2e/seed.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Task Creation - Happy Path Scenarios', () => {
  test('Create task with 2 existing labels and medium priority in To Do column', async ({ page }) => {
    // Navigate to the kanban board application
    await page.goto('http://localhost:3000');

    // Click the 'Add task to To Do' button
    await page.getByRole('button', { name: 'Add task to To Do' }).click();

    // Enter 'Complete project milestone review' in the Title field
    await page.getByRole('textbox', { name: 'Title' }).fill('Complete project milestone review');

    // Enter 'Review and approve all project deliverables before deadline' in the Description field
    await page.getByRole('textbox', { name: 'Description' }).fill('Review and approve all project deliverables before deadline');

    // Click the Priority dropdown and select 'Medium'
    await page.getByLabel('Priority', { exact: true }).selectOption(['Medium']);

    // In the Labels section, click the checkbox next to 'Urgent' label
    await page.getByRole('checkbox', { name: 'Urgent' }).click();

    // Click the checkbox next to 'Feature' label
    await page.getByRole('checkbox', { name: 'Feature' }).click();

    // Click the 'Add Task' button
    await page.getByRole('button', { name: 'Add Task', exact: true }).click();

    // Verify the new task details
    await expect(page.getByText('Complete project milestone review')).toBeVisible();
    await expect(page.getByText('medium')).toBeVisible();
    await expect(page.getByText('Urgent')).toBeVisible();
    await expect(page.getByText('Feature')).toBeVisible();
    await expect(page.getByText('Task count')).toContainText('2');
  });
});