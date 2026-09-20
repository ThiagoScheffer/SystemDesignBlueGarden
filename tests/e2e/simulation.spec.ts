import { expect, test } from '@playwright/test';

import { architecture } from './architectureFixture';

test('imports an architecture and completes a browser simulation', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText('Blue Garden', { exact: true })).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: 'architecture.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(architecture)),
  });
  await expect(page.getByLabel('Architecture name')).toHaveValue(
    'E2E Architecture (imported)',
  );
  const miniMap = page.getByRole('img', { name: 'Architecture overview map' });
  await expect(miniMap).toBeVisible();
  const miniMapNodes = miniMap.locator('.react-flow__minimap-node');
  await expect(miniMapNodes).toHaveCount(2);
  const miniMapFills = await miniMapNodes.evaluateAll((nodes) =>
    nodes.map((node) => (node as SVGElement).style.fill.toLowerCase()),
  );
  expect(miniMapFills).toHaveLength(2);
  expect(new Set(miniMapFills).size).toBe(2);
  expect(miniMapFills).not.toContain('#000000');
  const maskFill = await miniMap
    .locator('.react-flow__minimap-mask')
    .evaluate((mask) => getComputedStyle(mask).fill);
  expect(maskFill).toContain('0.22');

  await page.getByTitle('Run simulation').click();
  await expect(
    page.getByRole('region', { name: 'Simulation results' }),
  ).toBeVisible();
  await expect(page.getByText('completed', { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText('Educational estimate')).toBeVisible();
});

test('configures a traffic-spike preset', async ({ page }) => {
  await page.goto('/');
  await page.getByTitle('Configure scenario').click();
  const drawer = page.getByRole('dialog', {
    name: 'Scenario configuration',
  });
  await expect(drawer).toBeVisible();
  await page.getByRole('button', { name: 'Traffic spike' }).click();
  await expect(drawer.getByText('Timeline events')).toBeVisible();
});

test('opens live failure details for an overloaded component', async ({
  page,
}) => {
  const overloadedArchitecture = structuredClone(architecture);
  overloadedArchitecture.nodes[1].type = 'load-balancer';
  overloadedArchitecture.nodes[1].data.label = 'Load balancer';
  overloadedArchitecture.nodes[1].data.config.capacity = 1_000;
  overloadedArchitecture.nodes[1].data.config.queueLimit = 1;
  overloadedArchitecture.nodes[1].data.config.failureRate = 0.12;
  overloadedArchitecture.edges[0].config.retryCount = 0;
  overloadedArchitecture.scenarios[0].traffic[0].requestsPerSecond = 3_200;

  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'overloaded-architecture.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(overloadedArchitecture)),
  });
  await page.getByTitle('Run simulation').click();
  await expect(page.getByText('completed', { exact: true })).toBeVisible({
    timeout: 15_000,
  });

  await page.getByLabel('Show Load balancer failing requests').click();
  const diagnostic = page.getByLabel('Load balancer error details');
  await expect(diagnostic.getByText('Failing requests')).toBeVisible();
  await expect(diagnostic).toContainText(
    'Connections droppedcritical69% rejected at capacity',
  );
  await expect(diagnostic).toContainText(
    'Server errorscritical12% of requests failing',
  );
  await expect(diagnostic).toContainText(
    'Likely causeCapacity saturation: 320% of configured capacity is demanded.',
  );
  await expect(diagnostic.getByText('Suggested corrections')).toBeVisible();
  await expect(
    diagnostic.getByRole('link', {
      name: /Azure performance antipatterns/,
    }),
  ).toBeVisible();
  await expect(
    diagnostic.getByRole('link', { name: /Twitter feed scaling case study/ }),
  ).toHaveCount(0);
});

test('completes a guided learning attempt and opens neutral evidence', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTitle('Learning Studio').click();
  const hub = page.getByRole('dialog', { name: 'Learning Studio' });
  await expect(hub.getByText('Design a URL Shortener')).toBeVisible();
  await expect(hub.getByText('Design a Rate Limiter')).toBeVisible();
  await hub.getByRole('button', { name: 'Start guided' }).first().click();
  const drawer = page.getByRole('complementary', {
    name: 'Design a URL Shortener learning workspace',
  });
  await expect(drawer).toBeVisible();
  await expect(page.getByLabel('Architecture name')).toHaveValue(
    'URL Shortener — Starter',
  );
  await drawer.getByRole('button', { name: 'Reveal and run incident' }).click();
  await expect(drawer.getByText('Incident run completed')).toBeVisible({
    timeout: 25_000,
  });
  await drawer.getByRole('button', { name: 'Finish and compare' }).click();
  await expect(drawer).toBeHidden({ timeout: 15_000 });
  await page.getByTitle('Learning Studio').click();
  await page.getByRole('button', { name: 'progress' }).click();
  await page.getByRole('button', { name: 'Review evidence' }).click();
  await expect(
    page.getByRole('heading', { name: 'Scenario evidence' }),
  ).toBeVisible();
  await expect(page.getByText(/not a score/i)).toBeVisible();
});

test('resumes an interview attempt with a soft timer after reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTitle('Learning Studio').click();
  const hub = page.getByRole('dialog', { name: 'Learning Studio' });
  const firstChallenge = hub.locator('.learning-card').first();
  await firstChallenge.getByRole('button', { name: 'Interview' }).click();
  await expect(
    page.getByRole('complementary', {
      name: 'Design a URL Shortener learning workspace',
    }),
  ).toBeVisible();
  await page.reload();
  const hud = page.getByRole('button', {
    name: 'Open Design a URL Shortener learning workspace',
  });
  await expect(hud).toBeVisible();
  await expect(hud).toContainText(/\d{2}:\d{2}:\d{2}/, { timeout: 5_000 });
  await hud.click();
  await expect(page.getByText('interview challenge')).toBeVisible();
});

test('creates a template as a separate local project', async ({ page }) => {
  await page.goto('/');
  await page.getByTitle('Learning Studio').click();
  const hub = page.getByRole('dialog', { name: 'Learning Studio' });
  await hub.getByRole('button', { name: 'templates' }).click();
  await hub.getByRole('button', { name: 'Create project' }).first().click();
  await expect(page.getByLabel('Architecture name')).toHaveValue(
    'URL Shortener — Starter',
  );
  const projectCount = await page.evaluate(async () => {
    const request = indexedDB.open('blue-garden');
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const countRequest = database
      .transaction('projects', 'readonly')
      .objectStore('projects')
      .count();
    const count = await new Promise<number>((resolve, reject) => {
      countRequest.onsuccess = () => resolve(countRequest.result);
      countRequest.onerror = () => reject(countRequest.error);
    });
    database.close();
    return count;
  });
  expect(projectCount).toBeGreaterThanOrEqual(2);
});

test('compares unprotected and coalesced cache-expiration runs', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTitle('Learning Studio').click();
  const hub = page.getByRole('dialog', { name: 'Learning Studio' });
  const challenge = hub
    .locator('.learning-card')
    .filter({ hasText: 'Prevent a Cache Stampede' });
  await challenge.getByRole('button', { name: 'Start guided' }).click();
  const drawer = page.getByRole('complementary', {
    name: 'Prevent a Cache Stampede learning workspace',
  });
  await expect(drawer).toBeVisible();
  await expect(page.getByText('Recommended').first()).toBeVisible();

  await drawer.getByRole('button', { name: 'Reveal and run incident' }).click();
  await page.getByLabel('Simulation speed').selectOption('MAX');
  await expect(drawer.getByText('Incident run completed')).toBeVisible({
    timeout: 15_000,
  });
  const originRow = drawer
    .locator('.run-metric-row')
    .filter({ hasText: 'Cache peak origin RPS' });
  await expect(originRow).toContainText('9,200');

  await page.getByLabel('Cache architecture component').click();
  await page.getByRole('button', { name: 'Learning', exact: true }).click();
  await expect(page.getByText('Cache stampede', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Basic', exact: true }).click();
  await page.getByLabel('Request coalescing').check();

  await drawer.getByRole('button', { name: 'Run incident again' }).click();
  await page.getByLabel('Simulation speed').selectOption('MAX');
  await expect(drawer.locator('.run-selectors option')).toHaveCount(4, {
    timeout: 15_000,
  });
  await expect(originRow).toContainText('2,001');
});
