import { describe, expect, it } from 'vitest';
import {
  createArchitectureDocument,
  createArchitectureNode,
} from '../architecture/factories';
import type { SimulationDiagnostic } from './types';
import { matchesTwitterCase, rankLearningResources } from './learningTips';

const diagnostic = (
  topic: SimulationDiagnostic['topic'],
  code: SimulationDiagnostic['code'],
): SimulationDiagnostic => ({
  id: `${topic}-${code}`,
  code,
  topic,
  category: code === 'capacity-saturation' ? 'bottleneck' : 'error',
  severity: 'critical',
  title: 'Problem',
  explanation: 'Problem details',
  affectedRps: 10,
  affectedPercent: 10,
});

const twitterDocument = () => {
  const document = createArchitectureDocument('Twitter home timeline');
  document.nodes = [
    createArchitectureNode('api-gateway', { x: 0, y: 0 }),
    createArchitectureNode('message-queue', { x: 100, y: 0 }),
    createArchitectureNode('worker', { x: 200, y: 0 }),
    createArchitectureNode('cache', { x: 300, y: 0 }),
    createArchitectureNode('nosql-database', { x: 400, y: 0 }),
  ];
  return document;
};

describe('contextual learning resources', () => {
  it('ranks a component and problem match without showing Twitter', () => {
    const document = createArchitectureDocument('Checkout architecture');
    const loadBalancer = createArchitectureNode('load-balancer', {
      x: 0,
      y: 0,
    });
    document.nodes = [loadBalancer];

    const resources = rankLearningResources(document, loadBalancer, [
      diagnostic('capacity', 'capacity-rejection'),
    ]);

    expect(resources).toHaveLength(3);
    expect(resources[0].id).toBe('azure-performance-antipatterns');
    expect(resources.map((resource) => resource.id)).not.toContain(
      'twitter-case-study',
    );
    expect(new Set(resources.map((resource) => resource.url)).size).toBe(
      resources.length,
    );
  });

  it('shows Twitter first only when keyword, topology, and problem match', () => {
    const document = twitterDocument();
    const queue = document.nodes.find((node) => node.type === 'message-queue')!;
    const diagnostics = [diagnostic('queue', 'queue-growth')];

    expect(matchesTwitterCase(document, diagnostics)).toBe(true);
    expect(rankLearningResources(document, queue, diagnostics)[0].id).toBe(
      'twitter-case-study',
    );
  });

  it('rejects Twitter when topology, keyword, or problem is missing', () => {
    const noKeyword = twitterDocument();
    noKeyword.metadata.name = 'Background processing';
    const sparse = createArchitectureDocument('Twitter timeline');
    sparse.nodes = [createArchitectureNode('cache', { x: 0, y: 0 })];
    const unrelated = twitterDocument();

    expect(
      matchesTwitterCase(noKeyword, [diagnostic('queue', 'queue-growth')]),
    ).toBe(false);
    expect(
      matchesTwitterCase(sparse, [
        diagnostic('cache', 'cache-miss-amplification'),
      ]),
    ).toBe(false);
    expect(
      matchesTwitterCase(unrelated, [
        diagnostic('latency', 'high-tail-latency'),
      ]),
    ).toBe(false);
  });

  it('uses the general handbook as a fallback for a narrow topic', () => {
    const document = createArchitectureDocument('Partitioned data');
    const sharding = createArchitectureNode('sharding', { x: 0, y: 0 });
    document.nodes = [sharding];

    const resources = rankLearningResources(document, sharding, [
      diagnostic('sharding', 'hot-shard'),
    ]);

    expect(resources.map((resource) => resource.id)).toEqual([
      'system-design-primer',
      'system-design-handbook-general',
    ]);
  });
});
