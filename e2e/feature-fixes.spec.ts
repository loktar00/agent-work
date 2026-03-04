import { test, expect } from '@playwright/test';
import { createBoard, createColumn, createCard } from './fixtures';

const API_URL = 'http://localhost:3000/api';

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

test.describe('Subtask operations', () => {
  let boardId: string;
  let columnId: string;
  let cardId: string;

  test.beforeEach(async () => {
    const board = await createBoard(`Subtask Test ${Date.now()}`);
    boardId = board.id;
    const column = await createColumn(boardId, 'To Do', 0);
    columnId = column.id;
    const card = await createCard(boardId, columnId, 'Subtask Card');
    cardId = card.id;
  });

  test('add and toggle a subtask', async ({ page }) => {
    await page.goto(`/boards/${boardId}`);
    await expect(page.locator(`[data-testid="card-${cardId}"]`)).toBeVisible();

    // Click the card to open the drawer
    await page.locator(`[data-testid="card-${cardId}"]`).click();

    // The drawer opens on the Subtasks tab by default
    await expect(page.getByPlaceholder('Add subtask...')).toBeVisible();

    // Add a subtask
    await page.getByPlaceholder('Add subtask...').fill('My test subtask');
    await page.getByPlaceholder('Add subtask...').press('Enter');

    // Wait for the subtask to appear
    await expect(page.getByText('My test subtask')).toBeVisible({ timeout: 5000 });

    // Screenshot after adding subtask
    await page.screenshot({ path: 'test-results/subtask-added.png' });

    // Find the checkbox next to the subtask and toggle it
    const subtaskRow = page.locator('.mantine-Group-root').filter({ hasText: 'My test subtask' });
    const checkbox = subtaskRow.locator('.mantine-Checkbox-input');
    await checkbox.click();

    // Wait for the toggle to take effect - the text should get line-through
    await expect(
      subtaskRow.locator('span, p, .mantine-Text-root').filter({ hasText: 'My test subtask' }),
    ).toHaveCSS('text-decoration-line', 'line-through', { timeout: 5000 });

    // Screenshot after toggling
    await page.screenshot({ path: 'test-results/subtask-toggled.png' });
  });

  test('add and delete a subtask', async ({ page }) => {
    await page.goto(`/boards/${boardId}`);
    await page.locator(`[data-testid="card-${cardId}"]`).click();

    await expect(page.getByPlaceholder('Add subtask...')).toBeVisible();

    // Add a subtask
    await page.getByPlaceholder('Add subtask...').fill('Subtask to delete');
    await page.getByPlaceholder('Add subtask...').press('Enter');

    await expect(page.getByText('Subtask to delete')).toBeVisible({ timeout: 5000 });

    // Screenshot before delete
    await page.screenshot({ path: 'test-results/subtask-before-delete.png' });

    // Click the delete button (trash icon) next to "Subtask to delete"
    // Scope to the group row containing the subtask text to avoid hitting other ActionIcons
    const subtaskRow = page.locator('.mantine-Group-root').filter({ hasText: 'Subtask to delete' });
    const deleteBtn = subtaskRow.locator('button[data-variant="subtle"]');

    // Set up response listener before clicking
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/subtasks/') && resp.request().method() === 'DELETE',
      { timeout: 10000 },
    );
    await deleteBtn.click({ force: true });
    await responsePromise;

    // Verify the subtask is removed - wait for refetch
    await expect(page.getByText('Subtask to delete')).not.toBeVisible({ timeout: 10000 });

    // Screenshot after delete
    await page.screenshot({ path: 'test-results/subtask-deleted.png' });
  });
});

test.describe('Discussion messages', () => {
  let boardId: string;
  let columnId: string;
  let cardId: string;

  test.beforeEach(async () => {
    const board = await createBoard(`Discussion Test ${Date.now()}`);
    boardId = board.id;
    const column = await createColumn(boardId, 'In Progress', 0);
    columnId = column.id;
    const card = await createCard(boardId, columnId, 'Discussion Card');
    cardId = card.id;
  });

  test('send a message in card discussion', async ({ page }) => {
    await page.goto(`/boards/${boardId}`);
    await page.locator(`[data-testid="card-${cardId}"]`).click();

    // Click on the Discussion tab
    await page.getByRole('tab', { name: 'Discussion' }).click();

    // Verify the empty state
    await expect(page.getByText('No messages')).toBeVisible();

    // Type a message
    const messageText = `E2E test message ${Date.now()}`;
    await page.getByPlaceholder('Write a message...').fill(messageText);

    // Click Send
    await page.getByRole('button', { name: 'Send' }).click();

    // Verify the message appears
    await expect(page.getByText(messageText)).toBeVisible({ timeout: 5000 });

    // Verify author badge shows 'human'
    await expect(page.getByText('human')).toBeVisible();

    // Screenshot
    await page.screenshot({ path: 'test-results/discussion-message-sent.png' });
  });
});

test.describe('Board project thread', () => {
  let boardId: string;

  test.beforeEach(async () => {
    const board = await createBoard(`Thread Test ${Date.now()}`);
    boardId = board.id;
  });

  test('send a message in board project thread', async ({ page }) => {
    await page.goto(`/boards/${boardId}/thread`);

    // Wait for the page to load - use heading role to avoid matching nav link
    await expect(page.getByRole('heading', { name: 'Project Thread' })).toBeVisible();

    // Type a message
    const messageText = `Board thread message ${Date.now()}`;
    await page.getByPlaceholder('Write a message...').fill(messageText);

    // Click Send
    await page.getByRole('button', { name: 'Send' }).click();

    // Verify the message appears
    await expect(page.getByText(messageText)).toBeVisible({ timeout: 5000 });

    // Verify author type badge
    await expect(page.getByText('human').first()).toBeVisible();

    // Screenshot
    await page.screenshot({ path: 'test-results/board-thread-message.png' });
  });
});

test.describe('Card delete', () => {
  let boardId: string;
  let columnId: string;
  let cardId: string;

  test.beforeEach(async () => {
    const board = await createBoard(`Delete Test ${Date.now()}`);
    boardId = board.id;
    const column = await createColumn(boardId, 'To Do', 0);
    columnId = column.id;
    const card = await createCard(boardId, columnId, 'Card to Delete');
    cardId = card.id;
  });

  test('delete a card from the drawer', async ({ page }) => {
    // Set up dialog handler EARLY to accept the confirmation dialog
    page.on('dialog', (dialog) => dialog.accept());

    await page.goto(`/boards/${boardId}`);
    await expect(page.locator(`[data-testid="card-${cardId}"]`)).toBeVisible();

    // Open the card drawer
    await page.locator(`[data-testid="card-${cardId}"]`).click();

    // Wait for the drawer to be fully loaded
    await expect(page.getByTestId('delete-card-btn')).toBeVisible();

    // Screenshot before delete
    await page.screenshot({ path: 'test-results/card-before-delete.png' });

    // Click the delete button and wait for DELETE response
    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('/api/cards/') && resp.request().method() === 'DELETE',
        { timeout: 15000 },
      ),
      page.getByTestId('delete-card-btn').click(),
    ]);

    // Verify the delete succeeded
    expect(response.status()).toBe(200);

    // Wait for card to be removed from the board (query refetch after mutation)
    await expect(page.locator(`[data-testid="card-${cardId}"]`)).not.toBeVisible({ timeout: 15000 });

    // Screenshot after delete
    await page.screenshot({ path: 'test-results/card-deleted.png' });
  });
});

test.describe('Add Card button visibility', () => {
  test('Add Card button is visible without scrolling', async ({ page }) => {
    const board = await createBoard(`Layout Test ${Date.now()}`);
    const column = await createColumn(board.id, 'Visible Column', 0);

    await page.goto(`/boards/${board.id}`);
    await expect(page.getByText('Visible Column')).toBeVisible();

    // Check that the ADD TASK button is visible
    const addCardBtn = page.locator(`[data-testid="add-card-${column.id}"]`);
    await expect(addCardBtn).toBeVisible();

    // Verify the button is in the viewport
    const box = await addCardBtn.boundingBox();
    expect(box).toBeTruthy();
    const viewportSize = page.viewportSize();
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewportSize!.height);

    // Screenshot
    await page.screenshot({ path: 'test-results/add-card-visible.png' });
  });

  test('Add Card button visible with multiple cards', async ({ page }) => {
    const board = await createBoard(`Layout Multi ${Date.now()}`);
    const column = await createColumn(board.id, 'Busy Column', 0);

    // Create several cards to test scroll behavior
    for (let i = 0; i < 5; i++) {
      await createCard(board.id, column.id, `Card ${i + 1}`);
    }

    await page.goto(`/boards/${board.id}`);
    await expect(page.getByText('Busy Column')).toBeVisible();

    // The ADD TASK button should still be visible (column layout fix)
    const addCardBtn = page.locator(`[data-testid="add-card-${column.id}"]`);
    await expect(addCardBtn).toBeVisible();
    await expect(addCardBtn).toHaveText('+ ADD TASK');

    // Screenshot
    await page.screenshot({ path: 'test-results/add-card-with-many-cards.png' });
  });
});
