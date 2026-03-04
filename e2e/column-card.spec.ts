import { test, expect } from '@playwright/test';
import { createBoard, createColumn } from './fixtures';

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

test('create column and card via UI on an API-created board', async ({ page }) => {
  // Set up a board via API
  const board = await createBoard('Column Card Test Board');
  const boardId = board.id;

  // Navigate to the board
  await page.goto(`/boards/${boardId}`);
  await expect(page.getByText('Column Card Test Board')).toBeVisible();

  // Create a column via UI
  await page.getByTestId('add-column-btn').click();
  await page.getByTestId('column-name-input').fill('To Do');
  await page.getByTestId('column-create-btn').click();

  // Wait for modal to close
  await expect(page.getByTestId('create-column-modal')).not.toBeVisible({ timeout: 5000 });

  // Verify column appears (use first() to avoid matching the notification toast)
  await expect(page.locator('[data-testid^="column-"]').getByText('To Do')).toBeVisible();

  // Create a card via UI - click the "Add Card" button in the column
  await page.getByText('+ ADD TASK').first().click();
  await page.getByTestId('card-title-input').fill('My First Card');
  await page.getByTestId('card-create-btn').click();

  // Wait for modal to close
  await expect(page.getByTestId('create-card-modal')).not.toBeVisible({ timeout: 5000 });

  // Verify card appears (use testid selector to avoid matching notification toast)
  await expect(page.locator('[data-testid^="card-"]').getByText('My First Card')).toBeVisible();
});

test('create column via API, then create card via UI', async ({ page }) => {
  // Set up a board and column via API
  const board = await createBoard('API Column Test');
  const column = await createColumn(board.id, 'Backlog', 0);

  await page.goto(`/boards/${board.id}`);
  await expect(page.getByText('Backlog')).toBeVisible();

  // Create card via UI
  await page.getByText('+ ADD TASK').click();
  await page.getByTestId('card-title-input').fill('API Column Card');
  await page.getByTestId('card-create-btn').click();

  await expect(page.getByTestId('create-card-modal')).not.toBeVisible({ timeout: 5000 });
  await expect(page.locator('[data-testid^="card-"]').getByText('API Column Card')).toBeVisible();
});
