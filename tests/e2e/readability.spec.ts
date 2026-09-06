import { expect, test, type Page } from '@playwright/test';
import { architecture } from './architectureFixture';
import { createDefaultProjectSettings } from '../../src/domain/architecture/projectSettings';
import { parseArchitectureDocument } from '../../src/domain/architecture/schema';

async function loadOverloaded(page: Page) {
  const model = structuredClone(architecture);
  model.nodes[1].data.config.queueLimit = 1;
  model.nodes[1].data.config.failureRate = 0.12;
  model.scenarios[0].traffic[0].requestsPerSecond = 3200;
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'readability.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(model)),
  });
  await page.getByTitle('Run simulation').click();
  await expect(page.getByText('completed', { exact: true })).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole('button', { name: 'Fit View', exact: true }).click();
}

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
]) {
  test(`diagnostics and results are readable at ${viewport.width}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await loadOverloaded(page);
    const opener = page.getByLabel('Show Application server failing requests');
    await opener.click();
    const panel = page.getByLabel('Application server error details');
    await expect(panel).toBeVisible();
    expect(
      await panel
        .locator('p')
        .first()
        .evaluate((element) => getComputedStyle(element).fontSize),
    ).toBe('16px');
    expect(
      await panel.evaluate(
        (element) => element.closest('.react-flow__viewport') === null,
      ),
    ).toBe(true);
    expect(
      await panel.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`diagnostics-${viewport.width}.png`),
    });
    const originalWidth = (await panel.boundingBox())!.width;
    await page.getByRole('button', { name: 'Zoom Out', exact: true }).click();
    expect((await panel.boundingBox())!.width).toBe(originalWidth);
    await panel
      .getByRole('button', { name: 'Close diagnostic details' })
      .click();
    await expect(
      page.getByRole('complementary', { name: 'Configuration inspector' }),
    ).toBeVisible();
    await page.getByLabel('Show Application server bottleneck details').click();
    await expect(
      page.getByRole('heading', { name: 'Bottleneck details' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('heading', { name: 'Bottleneck details' }),
    ).toBeHidden();

    const results = page.getByRole('region', { name: 'Simulation results' });
    await results.getByRole('tab', { name: 'Explainable findings' }).click();
    await results.getByRole('button', { name: 'Expand', exact: true }).click();
    await expect(results.locator('.finding-entry').first()).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`findings-${viewport.width}.png`),
    });
    await results.getByRole('tab', { name: 'Event log', exact: true }).click();
    await expect(results.locator('.event-entry').first()).toBeVisible();
    await results
      .getByRole('tab', { name: 'Selected metrics', exact: true })
      .click();
    await expect(
      results.getByText('Failed requests', { exact: true }),
    ).toBeVisible();
    await expect(
      results.getByText('Demand / capacity', { exact: true }),
    ).toBeVisible();
    await results.getByRole('tab', { name: 'Selected metrics' }).press('Home');
    await expect(results.getByRole('tab', { name: 'Overview' })).toBeFocused();
    await results
      .getByRole('button', { name: 'Collapse', exact: true })
      .click();
    await expect(results.getByText('completed', { exact: true })).toBeVisible();
    await expect(
      results.getByText('Successful', { exact: true }),
    ).toBeVisible();
    await expect(results.getByRole('tablist')).toBeHidden();
    await results.getByRole('button', { name: 'Show details' }).click();
    await expect(results.getByRole('tab', { name: 'Overview' })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}

test('preflight, details, and results reflow at narrow reading widths', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await loadOverloaded(page);
  await page.getByLabel('Show Application server failing requests').click();
  for (const width of [960, 320]) {
    await page.setViewportSize({ width, height: width === 960 ? 540 : 800 });
    const panel = page.getByLabel('Application server error details');
    await expect(panel).toBeVisible();
    expect(
      await panel.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await panel.getByRole('link').last().scrollIntoViewIfNeeded();
    await expect(panel.getByRole('link').last()).toBeInViewport();
    await page.screenshot({
      path: testInfo.outputPath(`reading-${width}.png`),
    });
  }
  await page.getByRole('button', { name: 'Back to canvas' }).click();
  const results = page.getByRole('region', { name: 'Simulation results' });
  await results.getByRole('tab', { name: 'Selected metrics' }).click();
  await expect(
    results.getByText('Failed requests', { exact: true }),
  ).toBeVisible();
  expect(
    await results.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  const projectSettings = createDefaultProjectSettings();
  projectSettings.expectedScale = 'medium';
  projectSettings.simulationDefaults.peakRps = 10000;
  await page.locator('input[type="file"]').setInputFiles({
    name: 'preflight.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        ...parseArchitectureDocument(architecture),
        projectSettings,
      }),
    ),
  });
  await expect(
    page.getByRole('region', { name: 'Simulation results' }),
  ).toBeHidden();
  await page.getByTitle('Configure scenario').click();
  const drawer = page.getByRole('dialog', { name: 'Scenario configuration' });
  await drawer.getByRole('button', { name: 'Run simulation' }).click();
  await expect(
    drawer.getByRole('heading', { name: 'Preflight findings' }),
  ).toBeVisible();
  const warnings = drawer.locator('.preflight-results');
  await warnings.scrollIntoViewIfNeeded();
  expect(
    await warnings
      .locator('p')
      .first()
      .evaluate((element) => getComputedStyle(element).fontSize),
  ).toBe('16px');
  expect(
    await drawer.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('preflight-320.png') });
  await drawer
    .getByRole('button', { name: 'Close scenario configuration' })
    .focus();
  await page.keyboard.press('Shift+Tab');
  await expect(
    drawer.getByRole('button', { name: 'Run simulation' }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(page.getByTitle('Configure scenario')).toBeFocused();
});

test('supports doubled text size and long component labels', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const model = structuredClone(architecture);
  model.nodes[1].data.label = 'ApplicationService'.repeat(6);
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'long-label.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(model)),
  });
  await page.getByLabel('Application server architecture component').dblclick();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  const guide = page.getByLabel('Application server information');
  await expect(guide).toBeVisible();
  expect(
    await guide
      .locator('.detail-body > p')
      .evaluate((element) => getComputedStyle(element).fontSize),
  ).toBe('32px');
  expect(
    await guide.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await guide
    .getByRole('textbox', { name: 'Implementation notes' })
    .fill('Readable at twice the default text size.');
  const countBounds = (await page
    .locator('.palette .count-badge')
    .boundingBox())!;
  const searchBounds = (await page
    .locator('.palette .search-field')
    .boundingBox())!;
  expect(countBounds.y + countBounds.height).toBeLessThanOrEqual(
    searchBounds.y,
  );
  await page.screenshot({ path: testInfo.outputPath('text-200-percent.png') });
  await page.keyboard.press('Escape');
  await expect(guide).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
