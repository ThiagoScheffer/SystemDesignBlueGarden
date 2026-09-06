import { describe, expect, it } from 'vitest';
import { formatMetric, metricRows } from './metricPresentation';

describe('metric presentation', () => {
  it('formats rates and uncapped ratios with their actual units', () => {
    expect(formatMetric(3.2, 'percent')).toBe('320%');
    expect(formatMetric(0.125, 'percent')).toBe('12.5%');
    expect(formatMetric(25, 'rps')).toBe('25 req/s');
    expect(formatMetric(840, 'ms')).toBe('840 ms');
    expect(formatMetric(null, 'percent')).toBe('Unavailable');
  });
  it('retains edge failures and zero-valued metrics, without rendering diagnostic objects', () => {
    const rows = metricRows({
      transferredRps: 0,
      effectiveLatencyMs: 45,
      retries: 2,
      timeouts: 3,
      failedRps: 4,
      rejectedRps: 5,
      processingFailureRps: 6,
      unavailableRps: 7,
      diagnostics: [],
    });
    expect(rows).toContainEqual({
      key: 'transferredRps',
      label: 'Transferred traffic',
      value: '0 req/s',
    });
    expect(rows).toContainEqual({
      key: 'unavailableRps',
      label: 'Unavailable requests',
      value: '7 req/s',
    });
    expect(rows).toHaveLength(8);
  });
});
