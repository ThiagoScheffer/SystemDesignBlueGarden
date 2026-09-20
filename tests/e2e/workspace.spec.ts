import { expect, test } from '@playwright/test';
import { architecture } from './architectureFixture';

for (const theme of ['light', 'dark'] as const) {
  for (const width of [1440, 1024, 390]) {
    test(`${theme} workspace at ${width}`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await page.locator('input[type="file"]').setInputFiles({
        name: 'workspace.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(architecture)),
      });
      if (width >= 1280) {
        const canvas = page.locator('.canvas-shell');
        const before = (await canvas.boundingBox())!.width;
        await page
          .getByRole('button', { name: 'Hide Components', exact: true })
          .click();
        await expect(page.locator('#components-toggle')).toBeFocused();
        expect((await canvas.boundingBox())!.width).toBeGreaterThan(before);
        await page.locator('#components-toggle').click();
        await page
          .getByRole('button', { name: 'Hide Inspector', exact: true })
          .click();
        await expect(page.locator('#inspector-toggle')).toBeFocused();
        await page.locator('#inspector-toggle').click();
      } else {
        await page.locator('#components-toggle').click();
        await expect(
          page.getByRole('complementary', { name: 'Component library' }),
        ).toBeVisible();
        await expect(page.locator('#components-toggle')).toHaveAttribute(
          'aria-expanded',
          'true',
        );
        await page
          .getByRole('button', { name: 'Hide Components', exact: true })
          .click();
        await expect(page.locator('#components-toggle')).toBeFocused();
        await expect(page.locator('#components-toggle')).toHaveAttribute(
          'aria-expanded',
          'false',
        );
      }
      await page
        .getByRole('button', { name: 'Auto-arrange', exact: true })
        .click();
      await page.getByTitle('Run simulation').click();
      const arrange = page.getByRole('button', {
        name: 'Auto-arrange',
        exact: true,
      });
      await expect(arrange).toBeDisabled();
      await page.getByTitle('Pause simulation', { exact: true }).click();
      await expect(arrange).toBeDisabled();
      await page.getByTitle('Resume simulation', { exact: true }).click();
      await expect(page.getByText('completed', { exact: true })).toBeVisible({
        timeout: 15000,
      });
      const panel = page.getByRole('region', { name: 'Simulation results' });
      const separator = page.getByRole('separator', {
        name: 'Resize simulation results',
      });
      await separator.focus();
      await page.keyboard.press('End');
      const expanded = (await panel.boundingBox())!.height;
      await page.keyboard.press('Home');
      expect((await panel.boundingBox())!.height).toBeLessThan(expanded);
      const handle = (await separator.boundingBox())!;
      const small = (await panel.boundingBox())!.height;
      await page.mouse.move(
        handle.x + handle.width / 2,
        handle.y + handle.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(handle.x + handle.width / 2, handle.y - 70, {
        steps: 5,
      });
      await page.mouse.up();
      expect((await panel.boundingBox())!.height).toBeGreaterThan(small);
      const custom = (await panel.boundingBox())!.height;
      await panel.getByRole('button', { name: 'Expand', exact: true }).click();
      await panel
        .getByRole('button', { name: 'Restore size', exact: true })
        .click();
      expect(
        Math.abs((await panel.boundingBox())!.height - custom),
      ).toBeLessThan(2);
      await panel.getByRole('button', { name: 'Expand', exact: true }).click();
      await page.getByRole('button', { name: 'Fit View', exact: true }).click();
      await page.screenshot({
        path: info.outputPath(`${theme}-${width}.png`),
        fullPage: true,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await panel
        .getByRole('button', { name: 'Reset simulation', exact: true })
        .click();
      await expect(panel).toBeHidden();
      await page
        .getByRole('button', {
          name: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`,
        })
        .click();
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute(
        'data-theme',
        theme === 'dark' ? 'light' : 'dark',
      );
    });
  }
}
