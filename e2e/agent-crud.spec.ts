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

test('create an agent with name and role via UI', async ({ page }) => {
  const agentName = `Agent ${Date.now()}`;
  await page.goto('/agents');

  // Click "New Agent" button
  await page.getByTestId('new-agent-btn').click();

  // Switch to Custom tab
  await page.getByTestId('custom-tab').click();

  // Fill in the agent details
  await page.getByTestId('agent-name-input').fill(agentName);
  await page.getByTestId('agent-role-input').fill('developer');

  // Click create
  await page.getByTestId('agent-create-btn').click();

  // Wait for modal to close
  await expect(page.getByTestId('create-agent-modal')).not.toBeVisible({ timeout: 5000 });

  // Verify agent appears in the list
  await expect(page.getByText(agentName).first()).toBeVisible();
  await expect(page.getByText('developer').first()).toBeVisible();
});
