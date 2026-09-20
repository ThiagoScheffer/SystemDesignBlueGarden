import type { ArchitectureDocumentV1 } from '../architecture/types';
import type { ScenarioEvent, SimulationScenario } from '../simulation/types';
import type { CompiledIncident, IncidentBlueprint } from './types';

export function compileIncident(
  blueprint: IncidentBlueprint,
  document: ArchitectureDocumentV1,
): CompiledIncident {
  const missingRoles: string[] = [];
  const events: ScenarioEvent[] = [];
  const nodes = [...document.nodes].sort((a, b) => a.id.localeCompare(b.id));
  const edges = [...document.edges]
    .filter((edge) => !edge.config.disabled)
    .sort((a, b) => a.id.localeCompare(b.id));
  blueprint.events.forEach((event, index) => {
    const id = `${blueprint.id}-${index}`;
    if (event.type === 'EDGE_LATENCY') {
      const sourceIds = new Set(
        nodes
          .filter((node) => node.type === event.sourceType)
          .map((node) => node.id),
      );
      const targetIds = new Set(
        nodes
          .filter((node) => node.type === event.targetType)
          .map((node) => node.id),
      );
      const edge = edges.find(
        (candidate) =>
          sourceIds.has(candidate.source) && targetIds.has(candidate.target),
      );
      if (!edge) {
        missingRoles.push(
          `${event.sourceType} → ${event.targetType} connection`,
        );
        return;
      }
      events.push({
        id,
        type: event.type,
        atSecond: event.atSecond,
        edgeId: edge.id,
        addedLatencyMs: event.addedLatencyMs,
        durationSeconds: event.durationSeconds,
      });
      return;
    }
    const node = nodes.find(
      (candidate) => candidate.type === event.componentType,
    );
    if (!node) {
      missingRoles.push(event.componentType);
      return;
    }
    if (event.type === 'TRAFFIC_SET')
      events.push({
        id,
        type: event.type,
        atSecond: event.atSecond,
        sourceNodeId: node.id,
        requestsPerSecond: event.requestsPerSecond,
      });
    if (event.type === 'NODE_FAILURE')
      events.push({
        id,
        type: event.type,
        atSecond: event.atSecond,
        nodeId: node.id,
        durationSeconds: event.durationSeconds,
      });
    if (event.type === 'NODE_CAPACITY')
      events.push({
        id,
        type: event.type,
        atSecond: event.atSecond,
        nodeId: node.id,
        multiplier: event.multiplier,
        durationSeconds: event.durationSeconds,
      });
    if (event.type === 'CACHE_BYPASS')
      events.push({
        id,
        type: event.type,
        atSecond: event.atSecond,
        nodeId: node.id,
        durationSeconds: event.durationSeconds,
      });
    if (event.type === 'CACHE_KEY_EXPIRATION')
      events.push({
        id,
        type: event.type,
        atSecond: event.atSecond,
        nodeId: node.id,
        keyCount: event.keyCount,
        affectedTrafficPercent: event.affectedTrafficPercent,
        rebuildDurationSeconds: event.rebuildDurationSeconds,
        durationSeconds: event.durationSeconds,
      });
    if (event.type === 'QUEUE_INJECT')
      events.push({
        id,
        type: event.type,
        atSecond: event.atSecond,
        nodeId: node.id,
        messages: event.messages,
      });
  });
  if (missingRoles.length) return { missingRoles: [...new Set(missingRoles)] };
  const client = nodes.find((node) => node.type === 'client');
  if (!client) return { missingRoles: ['client'] };
  const scenario: SimulationScenario = {
    id: `challenge-${blueprint.id}-${crypto.randomUUID()}`,
    name: blueprint.title,
    description: blueprint.revealedDescription,
    durationSeconds: blueprint.durationSeconds,
    ambientFailureRate:
      document.projectSettings.simulationDefaults.ambientFailureRate,
    traffic: document.scenarios[0]?.traffic.some(source => source.trafficType) ? structuredClone(document.scenarios[0].traffic) : [
      {
        sourceNodeId: client.id,
        requestsPerSecond:
          document.projectSettings.simulationDefaults.initialRps,
      },
    ],
    events,
  };
  return { scenario, missingRoles: [] };
}
