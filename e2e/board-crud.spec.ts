import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'agent-board-tutorial',
      JSON.stringify({
        state: {
          hasCompletedWelcome: true,
          hasCompletedTour: true,
          currentTourStep: 0,
          isTourActive: false,
          tutorialProgress: {},
          welcomeBoardId: null,
        },
        version: 0,
      }),
    );
  });
});

test('create a board via UI modal and navigate to it', async ({ page }) => {
  const boardName = `E2E Board ${Date.now()}`;
  await page.goto('/boards');

  // Click "New Board" button
  await page.getByTestId('new-board-btn').click();

  // Fill in the board name
  await page.getByTestId('board-name-input').fill(boardName);
  await page.getByTestId('board-description-input').fill('Created by e2e test');

  // Click create
  await page.getByTestId('board-create-btn').click();

  // Wait for the modal to close and board to appear in the list
  await expect(page.getByTestId('create-board-modal')).not.toBeVisible({ timeout: 5000 });

  // Verify the board appears in the list
  await expect(page.getByText(boardName).first()).toBeVisible();

  // Click on the board to navigate to it
  await page.getByText(boardName).first().click();

  // Verify we navigated to the board page
  await expect(page).toHaveURL(/\/boards\/.+/);
  await expect(page.getByText(boardName).first()).toBeVisible();
});
