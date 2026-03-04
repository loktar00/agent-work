import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Mark welcome wizard as completed so it doesn't interfere with tests
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

test('homepage redirects to /boards', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/boards/);
});

test('boards page loads', async ({ page }) => {
  await page.goto('/boards');
  await expect(page.locator('body')).toBeVisible();
});

test('health endpoint responds', async ({ request }) => {
  const response = await request.get('http://localhost:3000/api/health');
  expect(response.ok()).toBeTruthy();
});
