import { describe, expect, it } from 'vitest';
import {
  createArchitectureDocument,
  createArchitectureEdge,
  createArchitectureNode,
} from './factories';
import { parseArchitectureDocument } from './schema';

describe('architecture document schema', () => {
  it('accepts a valid architecture document', () => {
    const document = createArchitectureDocument('Checkout');
    const client = createArchitectureNode('client', { x: 0, y: 0 });
    const api = createArchitectureNode('api-gateway', { x: 200, y: 0 });
    document.nodes = [client, api];
    document.edges = [createArchitectureEdge(client.id, api.id)];

    expect(parseArchitectureDocument(document)).toEqual(document);
  });

  it('rejects an edge that references a missing node', () => {
    const document = createArchitectureDocument();
    const client = createArchitectureNode('client', { x: 0, y: 0 });
    document.nodes = [client];
    document.edges = [createArchitectureEdge(client.id, 'missing-node')];

    expect(() => parseArchitectureDocument(document)).toThrow(
      /references a missing node/,
    );
  });

  it('rejects unsupported schema versions', () => {
    const document = { ...createArchitectureDocument(), schemaVersion: '2.0' };
    expect(() => parseArchitectureDocument(document)).toThrow();
  });

  it('migrates a 1.0 cache document and supplies the default hit rate', () => {
    const document = createArchitectureDocument('Legacy cache');
    const cache = createArchitectureNode('cache', { x: 0, y: 0 });
    delete cache.data.config.hitRatePercent;
    const legacy = { ...document, schemaVersion: '1.0', nodes: [cache] };

    const migrated = parseArchitectureDocument(legacy);

    expect(migrated.schemaVersion).toBe('1.2');
    expect(migrated.scenarios).toEqual([]);
    expect(migrated.nodes[0].data.config.hitRatePercent).toBe(80);
  });

  it('migrates a 1.1 document to 1.2 without changing its architecture ID', () => {
    const current = createArchitectureDocument('Version 1.1');
    const document = structuredClone(current) as unknown as Record<
      string,
      unknown
    >;
    delete document.scenarios;
    const legacy = { ...document, schemaVersion: '1.1' };

    const migrated = parseArchitectureDocument(legacy);

    expect(migrated.schemaVersion).toBe('1.2');
    expect(migrated.id).toBe(current.id);
    expect(migrated.scenarios).toEqual([]);
  });

  it('accepts a configured Sharding router', () => {
    const document = createArchitectureDocument();
    document.nodes = [createArchitectureNode('sharding', { x: 0, y: 0 })];

    expect(
      parseArchitectureDocument(document).nodes[0].data.config,
    ).toMatchObject({
      shardCount: 4,
      shardKey: 'userId',
      shardStrategy: 'hash',
    });
  });

  it('rejects invalid Cache hit rates', () => {
    const document = createArchitectureDocument();
    const cache = createArchitectureNode('cache', { x: 0, y: 0 });
    cache.data.config.hitRatePercent = 101;
    document.nodes = [cache];

    expect(() => parseArchitectureDocument(document)).toThrow();
  });

  it('rejects containment cycles', () => {
    const document = createArchitectureDocument();
    const first = createArchitectureNode('region', { x: 0, y: 0 });
    const second = createArchitectureNode('region', { x: 200, y: 0 });
    first.parentId = second.id;
    second.parentId = first.id;
    document.nodes = [first, second];

    expect(() => parseArchitectureDocument(document)).toThrow(
      /Containment cycle/,
    );
  });

  it('requires a Region parent and one-level containment', () => {
    const document = createArchitectureDocument();
    const service = createArchitectureNode('application-server', {
      x: 0,
      y: 0,
    });
    const database = createArchitectureNode('sql-database', { x: 200, y: 0 });
    database.parentId = service.id;
    document.nodes = [service, database];

    expect(() => parseArchitectureDocument(document)).toThrow(
      /must have a Region parent/,
    );
  });
});
