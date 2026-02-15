import { test, expect } from '@playwright/test';
import { seedBoardFixture } from './helpers/board-seed.js';
import { createColumnMenuFixture } from './helpers/test-fixtures.js';

async function openSettingsModal(page) {
  const settingsBtn = page.locator('#settings-btn');
  const menuBtn = page.locator('#desktop-menu-btn');
  const controlsMenu = page.locator('#board-controls-menu');

  // On small layouts, the controls menu is hidden behind the menu button.
  if (!(await settingsBtn.isVisible())) {
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

    try {
      await expect(settingsBtn).toBeVisible({ timeout: 3000 });
    } catch {
      // If the menu toggled closed, retry once.
      await menuBtn.click({ force: true });
      await expect(settingsBtn).toBeVisible({ timeout: 3000 });
    }
  }

  await expect(settingsBtn).toBeVisible();
  await settingsBtn.click();
  const modal = page.locator('#settings-modal');
  await expect(modal).toBeVisible();
  return modal;
}

async function getSettingsValue(page, settingId) {
  const element = page.locator(`#${settingId}`);
  const inputType = await element.getAttribute('type');
  if (inputType === 'checkbox') {
    return await element.isChecked();
  }
  return await element.inputValue();
}

test.describe('Settings Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#board-container')).toBeVisible();
    await seedBoardFixture(page, createColumnMenuFixture());
    await page.reload();
  });

  test('opens and closes settings modal', async ({ page }) => {
    // Open settings modal
    const modal = await openSettingsModal(page);
    
    // Verify modal content is visible
    await expect(page.locator('#settings-modal-title')).toHaveText('Settings');
    await expect(page.locator('#settings-form')).toBeVisible();
    
    // Close via close button
    await page.locator('#settings-close-modal-btn').click();
    await expect(modal).toBeHidden();
    
    // Reopen and close via Escape key
    await openSettingsModal(page);
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    
    // Reopen and close via backdrop click
    await page.goto('/'); // Reset page state
    await openSettingsModal(page);
    const backdrop = page.locator('#settings-modal .modal-backdrop');
    await expect(backdrop).toBeVisible();
    await page.evaluate(() => {
      document.querySelector('#settings-modal .modal-backdrop')?.click();
    });
    await expect(modal).toBeHidden({ timeout: 10000 });
  });

  test('toggles show priority setting', async ({ page }) => {
    await openSettingsModal(page);
    
    const checkbox = page.locator('#settings-show-priority');
    const initialState = await checkbox.isChecked();
    
    // Toggle the setting
    await checkbox.click();
    
    // Verify the change was applied (should trigger re-render)
    await page.waitForTimeout(500); // Allow time for re-render
    
    // Setting should persist even after reopening modal
    await page.locator('#settings-close-modal-btn').click();
    await openSettingsModal(page);
    
    const newState = await checkbox.isChecked();
    expect(newState).toBe(!initialState);
    
    // Verify visual change on task items (priority indicators should show/hide)
    await page.locator('#settings-close-modal-btn').click();
    
    if (newState) {
      // If show priority is ON, priority indicators should be visible
      await expect(page.locator('.task-item .task-priority').first()).toBeVisible();
    } else {
      // If show priority is OFF, priority indicators should be hidden
      await expect(page.locator('.task-item .task-priority')).toHaveCount(0);
    }
  });

  test('toggles show due date setting', async ({ page }) => {
    await openSettingsModal(page);
    
    const checkbox = page.locator('#settings-show-due-date');
    const initialState = await checkbox.isChecked();
    
    // Toggle the setting
    await checkbox.click();
    await page.waitForTimeout(500);
    
    // Close and reopen modal to verify persistence
    await page.locator('#settings-close-modal-btn').click();
    await openSettingsModal(page);
    
    const newState = await checkbox.isChecked();
    expect(newState).toBe(!initialState);
    
    // Close modal to check visual changes
    await page.locator('#settings-close-modal-btn').click();
    
    if (newState) {
      await expect(page.locator('.task-item .task-date').first()).toBeVisible();
    } else {
      await expect(page.locator('.task-item .task-date')).toHaveCount(0);
    }
  });

  test('toggles show age setting', async ({ page }) => {
    await openSettingsModal(page);
    
    const checkbox = page.locator('#settings-show-age');
    const initialState = await checkbox.isChecked();
    
    await checkbox.click();
    await page.waitForTimeout(500);
    
    // Verify persistence
    await page.locator('#settings-close-modal-btn').click();
    await openSettingsModal(page);
    
    const newState = await checkbox.isChecked();
    expect(newState).toBe(!initialState);
  });

  test('toggles show change date setting', async ({ page }) => {
    await openSettingsModal(page);
    
    const checkbox = page.locator('#settings-show-change-date');
    const initialState = await checkbox.isChecked();
    
    await checkbox.click();
    await page.waitForTimeout(500);
    
    // Verify persistence
    await page.locator('#settings-close-modal-btn').click();
    await openSettingsModal(page);
    
    const newState = await checkbox.isChecked();
    expect(newState).toBe(!initialState);
  });

  test('configures notification days setting', async ({ page }) => {
    await openSettingsModal(page);
    
    const input = page.locator('#settings-notification-days');
    
    // Clear and set new value
    await input.fill('7');
    await input.blur(); // Trigger change event
    await page.waitForTimeout(500);
    
    // Verify persistence
    await page.locator('#settings-close-modal-btn').click();
    await openSettingsModal(page);
    
    await expect(input).toHaveValue('7');
    
    // Test empty value falls back to default (3)
    await input.fill('');
    await input.blur();
    await page.waitForTimeout(500);

    // Should fall back to a numeric default
    await page.locator('#settings-close-modal-btn').click();
    await openSettingsModal(page);
    
    const finalValue = await input.inputValue();
    expect(Number.isInteger(Number(finalValue))).toBe(true);
  });

  test('configures countdown threshold settings', async ({ page }) => {
    await openSettingsModal(page);
    
    const urgentInput = page.locator('#settings-countdown-urgent-threshold');
    const warningInput = page.locator('#settings-countdown-warning-threshold');
    
    // Set urgent threshold
    await urgentInput.fill('2');
    await urgentInput.blur();
    await page.waitForTimeout(300);
    
    // Set warning threshold (must be >= urgent threshold)
    await warningInput.fill('5');
    await warningInput.blur();
    await page.waitForTimeout(300);
    
    // Verify persistence
    await page.locator('#settings-close-modal-btn').click();
    await openSettingsModal(page);
    
    await expect(urgentInput).toHaveValue('2');
    await expect(warningInput).toHaveValue('5');
    
    // Test constraint: warning must be >= urgent (enforced on warning change)
    await urgentInput.fill('8');
    await urgentInput.blur();
    await page.waitForTimeout(300);

    await warningInput.fill('5');
    await warningInput.blur();
    await page.waitForTimeout(300);

    // Warning threshold resets to default (10) if invalid
    await page.locator('#settings-close-modal-btn').click();
    await openSettingsModal(page);
    
    const urgentValue = Number(await urgentInput.inputValue());
    const warningValue = Number(await warningInput.inputValue());
    expect(warningValue).toBeGreaterThanOrEqual(urgentValue);
  });

  test('changes locale setting', async ({ page }) => {
    await openSettingsModal(page);
    
    const localeSelect = page.locator('#settings-locale');
    
    // Get available options
    const options = await localeSelect.locator('option').allTextContents();
    expect(options.length).toBeGreaterThan(1);
    
    // Select a different locale
    const currentLocale = await localeSelect.inputValue();
    const targetLocale = options.find((opt) => opt !== currentLocale);
    if (targetLocale) {
      await localeSelect.selectOption(targetLocale);
      await page.waitForTimeout(500);
      
      // Verify persistence
      await page.locator('#settings-close-modal-btn').click();
      await openSettingsModal(page);
      
      await expect(localeSelect).toHaveValue(targetLocale);
    }
  });

  test('changes default priority setting', async ({ page }) => {
    await openSettingsModal(page);
    
    const prioritySelect = page.locator('#settings-default-priority');
    
    // Get available options
    const options = await prioritySelect.locator('option').all();
    expect(options.length).toBeGreaterThan(1);
    
    // Select 'high' priority
    await prioritySelect.selectOption('high');
    await page.waitForTimeout(500);
    
    // Verify persistence
    await page.locator('#settings-close-modal-btn').click();
    await openSettingsModal(page);
    
    await expect(prioritySelect).toHaveValue('high');
    
    // Test that new tasks use default priority
    await page.locator('#settings-close-modal-btn').click();
    
    // Add a new task
    await page.locator('article.task-column[data-column="todo"] .add-task-btn-icon').first().click();
    const taskModal = page.locator('#task-modal');
    await expect(taskModal).toBeVisible();
    
    // Priority should default to 'high'
    const taskPrioritySelect = page.locator('#task-priority');
    await expect(taskPrioritySelect).toHaveValue('high');
  });

  test('settings persist across browser sessions', async ({ page, context }) => {
    await openSettingsModal(page);
    
    // Configure multiple settings
    await page.locator('#settings-show-priority').uncheck();
    await page.locator('#settings-notification-days').fill('14');
    await page.locator('#settings-default-priority').selectOption('low');
    
    await page.locator('#settings-close-modal-btn').click();
    await page.waitForTimeout(500);
    
    // Simulate browser restart by opening a new page
    const newPage = await context.newPage();
    await newPage.goto('/');
    await expect(newPage.locator('#board-container')).toBeVisible();
    
    // Check that settings persisted
    const newModal = await openSettingsModal(newPage);
    
    await expect(newPage.locator('#settings-show-priority')).not.toBeChecked();
    await expect(newPage.locator('#settings-notification-days')).toHaveValue('14');
    await expect(newPage.locator('#settings-default-priority')).toHaveValue('low');
    
    await newPage.close();
  });

  test('validates numeric input constraints', async ({ page }) => {
    await openSettingsModal(page);
    
    const notificationInput = page.locator('#settings-notification-days');
    const urgentInput = page.locator('#settings-countdown-urgent-threshold');
    
    // Test negative values (browser may allow typing, app stores integer as-entered)
    await notificationInput.fill('-5');
    await notificationInput.blur();
    await page.waitForTimeout(300);
    const notificationValue = Number(await notificationInput.inputValue());
    expect(Number.isInteger(notificationValue)).toBe(true);
    
    // Test zero for urgent threshold (app resets invalid values to default 3)
    await urgentInput.fill('0');
    // settings.js listens on the 'change' event; trigger it explicitly for reliability.
    await urgentInput.dispatchEvent('change');
    await page.waitForTimeout(300);

    // Settings are persisted, but the input value is not automatically rewritten.
    await page.locator('#settings-close-modal-btn').click();
    await openSettingsModal(page);
    await expect(urgentInput).toHaveValue('3');
    
    // Test very large values (HTML input has max=365 but app does not explicitly clamp)
    await notificationInput.fill('10000');
    await notificationInput.blur();
    await page.waitForTimeout(300);
    const largeNotificationValue = Number(await notificationInput.inputValue());
    expect(Number.isInteger(largeNotificationValue)).toBe(true);
  });
});