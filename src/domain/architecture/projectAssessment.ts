import type { ArchitectureDocumentV1, ComponentType } from './types';

export interface ProjectFinding {
  id: string;
  severity: 'advisory';
  title: string;
  message: string;
  suggestion: string;
  nodeId?: string;
  edgeId?: string;
  settingsSection?: 'requirements' | 'simulation' | 'visibility';
}

const persistentTypes = new Set<ComponentType>([
  'sql-database',
  'nosql-database',
  'object-storage',
]);

export function assessProject(
  document: ArchitectureDocumentV1,
): ProjectFinding[] {
  const {
    expectedScale,
    expectedUsers,
    expectedComplexity,
    simulationDefaults,
  } = document.projectSettings;
  const nodesOf = (type: ComponentType) =>
    document.nodes.filter((node) => node.type === type);
  const applications = nodesOf('application-server');
  const findings: ProjectFinding[] = [];
  const add = (finding: Omit<ProjectFinding, 'severity'>) =>
    findings.push({ ...finding, severity: 'advisory' });
  const mediumPlus = expectedScale === 'medium' || expectedScale === 'large';
  const largeAudience =
    expectedScale === 'large' || expectedUsers === 'over-100000';
  const highComplexity =
    expectedComplexity === 'high' || expectedComplexity === 'very-high';
  const aggregateCapacity = applications.reduce(
    (sum, node) => sum + node.data.config.capacity,
    0,
  );

  if (applications.length && simulationDefaults.peakRps > aggregateCapacity) {
    add({
      id: 'peak-application-capacity',
      title: 'Peak traffic exceeds application capacity',
      message: `${simulationDefaults.peakRps.toLocaleString()} peak RPS exceeds ${aggregateCapacity.toLocaleString()} RPS of aggregate application capacity.`,
      suggestion: 'Add application capacity or reduce the expected peak.',
      nodeId: applications[0].id,
      settingsSection: 'simulation',
    });
  }
  if (largeAudience && applications.length < 2) {
    add({
      id: 'application-redundancy',
      title: 'Application tier lacks redundancy',
      message:
        'Large designs should not depend on a single application server.',
      suggestion: 'Use at least two application servers.',
      nodeId: applications[0]?.id,
      settingsSection: 'requirements',
    });
  }
  if (largeAudience && nodesOf('load-balancer').length === 0) {
    add({
      id: 'missing-load-balancer',
      title: 'No load balancer',
      message:
        'The expected audience is large but traffic has no load-balancing tier.',
      suggestion: 'Add a load balancer before the application tier.',
      settingsSection: 'requirements',
    });
  }
  const readOriented = document.edges.some(
    (edge) => !edge.config.disabled && edge.config.trafficType === 'read',
  );
  if (largeAudience && readOriented && nodesOf('cache').length === 0) {
    add({
      id: 'missing-cache',
      title: 'Read-heavy design lacks caching',
      message: 'Large read traffic may repeatedly reach persistent storage.',
      suggestion: 'Consider a cache for frequently repeated reads.',
      settingsSection: 'requirements',
    });
  }
  const databases = document.nodes.filter((node) =>
    persistentTypes.has(node.type),
  );
  if ((largeAudience || highComplexity) && databases.length === 1) {
    add({
      id: 'database-single-point',
      title: 'Single persistent database',
      message: 'The design has only one persistent data component.',
      suggestion:
        'Assess replicas, partitioning, or a second persistence role.',
      nodeId: databases[0].id,
    });
  }
  if (mediumPlus && nodesOf('monitoring-service').length === 0) {
    add({
      id: 'missing-monitoring',
      title: 'No monitoring service',
      message: 'Medium and large systems need operational visibility.',
      suggestion: 'Add monitoring for latency, errors, and saturation.',
      settingsSection: 'requirements',
    });
  }
  if (expectedComplexity === 'very-high' && nodesOf('region').length < 2) {
    add({
      id: 'region-resilience',
      title: 'Single-region topology',
      message:
        'Very-high complexity is configured with fewer than two regions.',
      suggestion: 'Model a second region and its failover boundary.',
      settingsSection: 'requirements',
    });
  }
  if (highComplexity) {
    const unencrypted = document.edges.find(
      (edge) => !edge.config.disabled && !edge.config.encrypted,
    );
    if (unencrypted) {
      add({
        id: 'unencrypted-connection',
        title: 'Unencrypted connection',
        message:
          'A high-complexity design contains an unencrypted active connection.',
        suggestion: 'Enable encryption or document the trusted boundary.',
        edgeId: unencrypted.id,
      });
    }
    const hasFailureScenario = document.scenarios.some((scenario) =>
      scenario.events.some(
        (event) =>
          event.type === 'NODE_FAILURE' || event.type === 'CACHE_BYPASS',
      ),
    );
    if (!hasFailureScenario) {
      add({
        id: 'missing-failure-scenario',
        title: 'No saved failure scenario',
        message:
          'Resilience assumptions are not represented by a saved failure scenario.',
        suggestion: 'Save a component-outage or cache-bypass scenario.',
        settingsSection: 'simulation',
      });
    }
  }
  return findings;
}
