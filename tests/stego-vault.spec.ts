import { test, expect } from '@playwright/test';

test.describe('StegoVault', () => {
  test('should load the homepage with Encode tab active', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('h1')).toContainText('StegoVault');
    await expect(page.getByRole('button', { name: 'encode', exact: true })).toHaveClass(/border-blue-500/);
  });

  test('should switch between tabs', async ({ page }) => {
    await page.goto('/');
    
    await page.getByRole('button', { name: 'decode', exact: true }).click();
    await expect(page.getByText('Upload Stego Image')).toBeVisible();
    
    await page.getByRole('button', { name: 'analyze', exact: true }).click();
    await expect(page.getByText('Upload Image to Analyze')).toBeVisible();
    
    await page.getByRole('button', { name: 'encode', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Cover Image' })).toBeVisible();
  });

  test('should show capacity stats when image is uploaded', async ({ page }) => {
    await page.goto('/');
    
    // The encode panel should show capacity after image upload
    await expect(page.getByText('Drop cover image here')).toBeVisible();
  });

  test('should toggle encryption and show password field', async ({ page }) => {
    await page.goto('/');
    
    const encryptionCheckbox = page.getByRole('checkbox');
    await encryptionCheckbox.check();
    
    await expect(page.getByPlaceholder('Enter encryption password')).toBeVisible();
  });

  test('should have bit depth selector with 1-bit default', async ({ page }) => {
    await page.goto('/');
    
    const onebitButton = page.getByRole('button', { name: '1-bit' });
    await expect(onebitButton).toHaveClass(/bg-blue-500/);
  });
});
