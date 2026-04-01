import { test, expect } from '@playwright/test';

test.describe('StegoVault', () => {
  test('should load the homepage with terminal UI', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('h1')).toContainText('STEGO_VAULT');
    await expect(page.getByText('SYSTEM: ONLINE')).toBeVisible();
  });

  test('should switch between menu items', async ({ page }) => {
    await page.goto('/');
    
    await page.getByText('> DECODE_MESSAGE').click();
    await expect(page.getByText('// LSB_STEGANOGRAPHY_DECODER')).toBeVisible();
    
    await page.getByText('> ANALYZE_IMAGE').click();
    await expect(page.getByText('// STEGANALYSIS_TOOLKIT')).toBeVisible();
    
    await page.getByText('> ENCODE_MESSAGE').click();
    await expect(page.getByText('// LSB_STEGANOGRAPHY_ENCODER')).toBeVisible();
  });

  test('should show dropzone on encode panel', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByText('DROP_COVER_IMAGE_HERE')).toBeVisible();
  });

  test('should toggle encryption and show password field', async ({ page }) => {
    await page.goto('/');
    
    const encryptionCheckbox = page.getByRole('checkbox');
    await encryptionCheckbox.check();
    
    await expect(page.getByPlaceholder('ENTER_ENCRYPTION_KEY...')).toBeVisible();
  });

  test('should have bit depth selector with 1-bit default', async ({ page }) => {
    await page.goto('/');
    
    const onebitButton = page.getByRole('button', { name: '1-BIT' });
    await expect(onebitButton).toHaveClass(/bg-\[#00FF41\]/);
  });
});
