import { test, expect } from '@playwright/test';

test.describe('Critical User Flows', () => {
  test.describe('Homepage', () => {
    test('should load homepage successfully', async ({ page }) => {
      await page.goto('/');

      // Verify page loaded
      await expect(page).toHaveTitle(/Carterdea/i);

      // Verify header is visible
      await expect(page.getByRole('banner')).toBeVisible();

      // Verify main content is visible
      await expect(page.getByRole('main')).toBeVisible();
    });

    test('should navigate to contact page from homepage', async ({ page }) => {
      await page.goto('/');

      // Find and click contact link
      const contactLink = page.getByRole('link', { name: /contact/i });
      await expect(contactLink).toBeVisible();
      await contactLink.click();

      // Verify navigation to contact page
      await expect(page).toHaveURL(/\/contact/);
      await expect(page.getByRole('heading', { name: /contact/i })).toBeVisible();
    });
  });

  test.describe('Contact Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/contact');
    });

    test('should load contact page successfully', async ({ page }) => {
      await expect(page).toHaveTitle(/Contact.*Carterdea/i);
      await expect(page.getByRole('heading', { name: /contact/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /send/i })).toBeVisible();
    });

    test('should display all form fields', async ({ page }) => {
      await expect(page.getByLabel(/name/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/budget/i)).toBeVisible();
      await expect(page.getByLabel(/message/i)).toBeVisible();
    });

    test('should show validation errors for empty form', async ({ page }) => {
      const submitButton = page.getByRole('button', { name: /send/i });

      // Try to submit empty form
      await submitButton.click();

      // Should show validation errors
      await expect(page.getByText(/name is required/i)).toBeVisible();
      await expect(page.getByText(/email is required/i)).toBeVisible();
      await expect(page.getByText(/budget is required/i)).toBeVisible();
      await expect(page.getByText(/message is required/i)).toBeVisible();
    });

    test('should show error for invalid email', async ({ page }) => {
      await page.getByLabel(/email/i).fill('invalid-email');
      await page.getByLabel(/name/i).click(); // Blur email field

      await expect(page.getByText(/invalid email address/i)).toBeVisible();
    });

    test('should successfully submit valid form', async ({ page }) => {
      // Fill out form with valid data
      await page.getByLabel(/name/i).fill('John Doe');
      await page.getByLabel(/email/i).fill('john@example.com');
      await page.getByLabel(/budget/i).selectOption('25-50k');
      await page.getByLabel(/message/i).fill('I would like to work with you on a project.');

      // Submit form
      const submitButton = page.getByRole('button', { name: /send/i });
      await submitButton.click();

      // Should show loading state
      await expect(submitButton).toBeDisabled();
      await expect(submitButton).toHaveText(/sending/i);

      // Should show success message
      await expect(page.getByText(/thank you for your message/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/we will be in touch soon/i)).toBeVisible();

      // Form should be hidden
      await expect(page.getByLabel(/name/i)).not.toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should be able to navigate back to homepage from contact page', async ({ page }) => {
      await page.goto('/contact');

      // Click close/back button
      const closeLink = page.getByRole('link', { name: /close/i });
      await expect(closeLink).toBeVisible();
      await closeLink.click();

      // Should be back on homepage
      await expect(page).toHaveURL('/');
    });
  });

  test.describe('React Components', () => {
    test('should load React components on homepage', async ({ page }) => {
      await page.goto('/');

      // Wait for main content to be visible
      await expect(page.getByRole('main')).toBeVisible();

      // Check if page loaded without JavaScript errors
      page.on('pageerror', (error) => {
        throw new Error(`Page error: ${error.message}`);
      });

      // Wait a bit to ensure React components have hydrated
      await page.waitForTimeout(2000);

      // Verify no console errors
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.reload();
      await page.waitForTimeout(1000);

      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Accessibility', () => {
    test('contact form should be keyboard accessible', async ({ page }) => {
      await page.goto('/contact');

      // Tab through form fields
      await page.keyboard.press('Tab');
      await expect(page.getByLabel(/name/i)).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.getByLabel(/email/i)).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.getByLabel(/budget/i)).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.getByLabel(/message/i)).toBeFocused();
    });
  });
});
