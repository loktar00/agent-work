import { test, expect } from '@playwright/test';

test.describe('Welcome Wizard', () => {
  test('shows welcome wizard on first visit', async ({ page }) => {
    // Do NOT set localStorage - simulate first visit
    await page.goto('/boards');

    // Wizard modal should be visible with the NEONSYNC title
    await expect(page.getByText('NEONSYNC').first()).toBeVisible();
    await expect(page.getByText('Get Started')).toBeVisible();
  });

  test('wizard can be skipped', async ({ page }) => {
    await page.goto('/boards');

    // The "Skip Setup" button should be present
    await expect(page.getByText('Skip Setup')).toBeVisible();
    await page.getByText('Skip Setup').click();

    // After skipping, the wizard should close
    await expect(page.getByText('Skip Setup')).not.toBeVisible({ timeout: 3000 });

    // The boards page should be visible underneath
    await expect(page.getByText('Boards')).toBeVisible();
  });

  test('wizard creates content when stepping through', async ({ page }) => {
    await page.goto('/boards');

    // Step 1: Welcome - click Get Started
    await expect(page.getByText('Get Started')).toBeVisible();
    await page.getByText('Get Started').click();

    // Step 2: Create Board - click Create Board (auto-advances to columns step)
    await expect(page.getByText('Create Your First Board')).toBeVisible();
    await page.getByRole('button', { name: 'Create Board' }).click();

    // Wizard auto-advances to Step 3: Create Columns
    await expect(page.getByText('Set Up Workflow Columns')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Create Columns' }).click();

    // Wizard auto-advances to Step 4: Add Sample Cards
    await expect(page.getByRole('button', { name: 'Add Sample Cards' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Add Sample Cards' }).click();

    // Step 5: Completion
    await expect(page.getByText("You're All Set!")).toBeVisible({ timeout: 10000 });

    // Can choose to skip the tour
    await page.getByText('Skip Tour').click();

    // Wizard should be closed
    await expect(page.getByText("You're All Set!")).not.toBeVisible({ timeout: 3000 });
  });

  test('guided tour launches from wizard completion', async ({ page }) => {
    await page.goto('/boards');

    // Step through wizard quickly (wizard auto-advances after each API call)
    await page.getByText('Get Started').click();
    await page.getByRole('button', { name: 'Create Board' }).click();
    await expect(page.getByText('Set Up Workflow Columns')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Create Columns' }).click();
    await expect(page.getByRole('button', { name: 'Add Sample Cards' })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Add Sample Cards' }).click();
    await expect(page.getByText("You're All Set!")).toBeVisible({ timeout: 10000 });

    // Click "Start Tour" to launch guided tour
    await page.getByText('Start Tour').click();

    // The Joyride tour renders a dialog with the first step content
    await expect(
      page.getByText('Use the sidebar to navigate between boards, agents, and activity feeds.'),
    ).toBeVisible({ timeout: 10000 });
  });

  test('returning user skips wizard', async ({ page }) => {
    // Set localStorage to simulate returning user
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

    await page.goto('/boards');

    // Wizard should NOT be visible
    await expect(page.getByText('Get Started')).not.toBeVisible({ timeout: 3000 });

    // Boards page should be directly accessible
    await expect(page.getByText('Boards')).toBeVisible();
  });
});

test.describe('Tutorial Page', () => {
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

  test('tutorial page loads with checklist', async ({ page }) => {
    await page.goto('/tutorial');

    // Page title
    await expect(page.getByRole('heading', { name: 'Tutorial' })).toBeVisible();
    await expect(
      page.getByText('Complete each step to learn the fundamentals of NEONSYNC.'),
    ).toBeVisible();

    // Progress indicator
    await expect(page.getByText('0 / 6')).toBeVisible();

    // Step titles should be visible in the checklist (use first() since titles appear in both panels)
    await expect(page.getByText('Create a Board').first()).toBeVisible();
    await expect(page.getByText('Add Columns').first()).toBeVisible();
    await expect(page.getByText('Create Cards').first()).toBeVisible();
    await expect(page.getByText('Drag & Drop').first()).toBeVisible();
    await expect(page.getByText('Create an Agent').first()).toBeVisible();
    await expect(page.getByText('Explore').first()).toBeVisible();
  });

  test('can navigate to tutorial via sidebar', async ({ page }) => {
    await page.goto('/boards');

    // Click the Tutorial nav link
    await page.getByTestId('nav-tutorial').click();

    await expect(page).toHaveURL(/\/tutorial/);
    await expect(page.getByText('Tutorial')).toBeVisible();
  });
});
