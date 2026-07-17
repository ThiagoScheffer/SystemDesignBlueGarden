import { componentDefinitionMap } from '../components/definitions';
import type {
  ArchitectureDocumentV1,
  ArchitectureEdgeV1,
  ArchitectureNodeV1,
  ComponentType,
} from './types';

const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export function createArchitectureDocument(
  name = 'Untitled architecture',
): ArchitectureDocumentV1 {
  const now = new Date().toISOString();
  return {
    schemaVersion: '1.1',
    id: makeId('architecture'),
    metadata: { name, createdAt: now, updatedAt: now },
    viewport: { x: 0, y: 0, zoom: 1 },
    nodes: [],
    edges: [],
  };
}

export function createArchitectureNode(
  type: ComponentType,
  position: { x: number; y: number },
): ArchitectureNodeV1 {
  const definition = componentDefinitionMap[type];
  return {
    id: makeId(type),
    type,
    position,
    data: {
      label: definition.label,
      config: { ...definition.defaults },
    },
  };
}

export function createArchitectureEdge(
  source: string,
  target: string,
): ArchitectureEdgeV1 {
  return {
    id: makeId('edge'),
    source,
    target,
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
  };
}
