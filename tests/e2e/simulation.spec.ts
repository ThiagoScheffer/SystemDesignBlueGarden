import { expect, test } from '@playwright/test';

const architecture = {
  schemaVersion: '1.2',
  id: 'architecture-e2e',
  metadata: {
    name: 'E2E Architecture',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  viewport: { x: 0, y: 0, zoom: 1 },
  nodes: [
    {
      id: 'client-e2e',
      type: 'client',
      position: { x: 120, y: 160 },
      data: {
        label: 'Client',
        config: {
          capacity: 5000,
          baseLatencyMs: 0,
          failureRate: 0,
          concurrencyLimit: 100,
          queueLimit: 1000,
          costPerHour: 0,
        },
      },
    },
    {
      id: 'service-e2e',
      type: 'application-server',
      position: { x: 420, y: 160 },
      data: {
        label: 'Application server',
        config: {
          capacity: 1000,
          baseLatencyMs: 20,
          failureRate: 0,
          concurrencyLimit: 100,
          queueLimit: 1000,
          costPerHour: 0.1,
        },
      },
    },
  ],
  edges: [
    {
      id: 'edge-e2e',
      source: 'client-e2e',
      target: 'service-e2e',
      config: {
        protocol: 'HTTP',
        mode: 'synchronous',
        trafficType: 'mixed',
        encrypted: true,
        latencyMs: 5,
        bandwidthMbps: 100,
        timeoutMs: 1000,
        retryCount: 1,
        trafficPercentage: 100,
      },
    },
  ],
  scenarios: [
    {
      id: 'scenario-e2e',
      name: 'Browser baseline',
      durationSeconds: 10,
      traffic: [{ sourceNodeId: 'client-e2e', requestsPerSecond: 100 }],
      events: [],
    },
  ],
};

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
  const drawer = page.getByRole('complementary', {
    name: 'Scenario configuration',
  });
  await expect(drawer).toBeVisible();
  await page.getByRole('button', { name: 'Traffic spike' }).click();
  await expect(drawer.getByText('Timeline events')).toBeVisible();
});
