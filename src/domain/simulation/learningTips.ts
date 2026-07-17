import type {
  ArchitectureDocumentV1,
  ArchitectureNodeV1,
  ComponentType,
} from '../architecture/types';
import type {
  DiagnosticCode,
  DiagnosticTopic,
  SimulationDiagnostic,
} from './types';

export interface LearningTip {
  topic: DiagnosticTopic;
  summary: string;
  actions: string[];
}

export type LearningSourceKind =
  'fundamental' | 'pattern' | 'case-study' | 'general';

export interface LearningResource {
  id: string;
  label: string;
  url: string;
  sourceKind: LearningSourceKind;
  topics: DiagnosticTopic[];
  componentTypes?: ComponentType[];
  diagnosticCodes?: DiagnosticCode[];
  architectureCaseId?: 'twitter';
}

export const learningTips: Record<DiagnosticTopic, LearningTip> = {
  capacity: {
    topic: 'capacity',
    summary:
      'Demand is arriving faster than this component can complete it. Protect the dependency before retries amplify the load.',
    actions: [
      'Increase capacity or add horizontally scaled instances.',
      'Apply rate limiting, backpressure, or graceful degradation.',
      'Reduce synchronous work on the critical request path.',
    ],
  },
  latency: {
    topic: 'latency',
    summary:
      'Tail latency is rising. A small group of slow requests can dominate the experience even when the average looks healthy.',
    actions: [
      'Inspect saturation and downstream calls on this path.',
      'Use timeouts and circuit breakers to bound slow dependencies.',
      'Move non-essential work to an asynchronous path.',
    ],
  },
  cache: {
    topic: 'cache',
    summary:
      'Cache misses or bypass traffic are transferring read pressure to the backing data store.',
    actions: [
      'Improve the hit rate for frequently repeated reads.',
      'Pre-warm hot keys and add jitter to expirations.',
      'Protect the database from miss storms with request coalescing.',
    ],
  },
  queue: {
    topic: 'queue',
    summary:
      'The producer rate exceeds the consumer rate, so queued work and completion delay are growing.',
    actions: [
      'Scale consumers using queue depth and age as signals.',
      'Set a bounded queue and define overload behavior.',
      'Use retries with backoff and a dead-letter queue.',
    ],
  },
  sharding: {
    topic: 'sharding',
    summary:
      'Traffic is unevenly distributed, leaving one shard significantly hotter than its peers.',
    actions: [
      'Choose a shard key with a more uniform access distribution.',
      'Split or rebalance the hot partition.',
      'Add special handling for unusually hot users or keys.',
    ],
  },
  failure: {
    topic: 'failure',
    summary:
      'Requests are reaching an unavailable or error-producing component.',
    actions: [
      'Fail over to healthy instances and remove unhealthy targets.',
      'Use circuit breakers to prevent cascading failures.',
      'Define a degraded response for non-critical functionality.',
    ],
  },
};

export const learningResources: LearningResource[] = [
  {
    id: 'twitter-case-study',
    label: 'Twitter feed scaling case study',
    url: 'https://www.systemdesignhandbook.com/guides/design-twitter-system-design/',
    sourceKind: 'case-study',
    topics: ['capacity', 'queue', 'cache', 'sharding', 'failure'],
    architectureCaseId: 'twitter',
  },
  {
    id: 'cloudflare-reference-architectures',
    label: 'Cloudflare CDN and load-balancing architectures',
    url: 'https://developers.cloudflare.com/reference-architecture/architectures/',
    sourceKind: 'pattern',
    topics: ['capacity', 'latency', 'cache', 'failure'],
    componentTypes: ['dns', 'cdn', 'load-balancer', 'cache'],
  },
  {
    id: 'azure-performance-antipatterns',
    label: 'Azure performance antipatterns',
    url: 'https://learn.microsoft.com/en-us/azure/architecture/antipatterns/',
    sourceKind: 'pattern',
    topics: ['capacity', 'latency', 'failure'],
    diagnosticCodes: [
      'capacity-saturation',
      'capacity-rejection',
      'high-tail-latency',
      'retry-amplification',
    ],
  },
  {
    id: 'azure-cloud-patterns',
    label: 'Azure performance design patterns',
    url: 'https://learn.microsoft.com/en-us/azure/well-architected/performance-efficiency/design-patterns',
    sourceKind: 'pattern',
    topics: ['capacity', 'cache', 'queue', 'failure'],
  },
  {
    id: 'google-cascading-failures',
    label: 'Google SRE: addressing cascading failures',
    url: 'https://sre.google/sre-book/addressing-cascading-failures/',
    sourceKind: 'pattern',
    topics: ['capacity', 'latency', 'failure'],
    diagnosticCodes: [
      'component-unavailable',
      'capacity-rejection',
      'processing-failure',
      'downstream-unavailable',
      'downstream-rejection',
      'downstream-processing-failure',
      'retry-amplification',
    ],
  },
  {
    id: 'aws-reliability',
    label: 'AWS Well-Architected reliability guidance',
    url: 'https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html',
    sourceKind: 'pattern',
    topics: ['failure'],
  },
  {
    id: 'system-design-primer',
    label: 'Open-source System Design Primer',
    url: 'https://github.com/donnemartin/system-design-primer',
    sourceKind: 'fundamental',
    topics: ['capacity', 'latency', 'cache', 'queue', 'sharding', 'failure'],
  },
  {
    id: 'system-design-handbook-general',
    label: 'System Design Handbook: general guide',
    url: 'https://www.systemdesignhandbook.com/guides/system-design/',
    sourceKind: 'general',
    topics: ['capacity', 'latency', 'cache', 'queue', 'sharding', 'failure'],
  },
];

const twitterKeywords = [
  'twitter',
  'social feed',
  'timeline',
  'tweet',
  'fan-out',
];
const twitterTopics = new Set<DiagnosticTopic>([
  'capacity',
  'queue',
  'cache',
  'sharding',
  'failure',
]);

export function matchesTwitterCase(
  document: ArchitectureDocumentV1,
  diagnostics: SimulationDiagnostic[],
) {
  const searchable = [
    document.metadata.name,
    document.metadata.description,
    ...document.nodes.flatMap((node) => [
      node.data.label,
      node.data.description,
      node.data.implementationNotes,
      node.type === 'note' ? String(node.data.config.content ?? '') : '',
    ]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
  const hasKeyword = twitterKeywords.some((keyword) =>
    searchable.includes(keyword),
  );
  const types = new Set(document.nodes.map((node) => node.type));
  const topologyGroups = [
    ['api-gateway', 'application-server', 'load-balancer'].some((type) =>
      types.has(type as ComponentType),
    ),
    types.has('message-queue') && types.has('worker'),
    types.has('cache'),
    types.has('nosql-database') || types.has('sharding'),
  ].filter(Boolean).length;
  const hasRelatedProblem = diagnostics.some((entry) =>
    twitterTopics.has(entry.topic),
  );
  return hasKeyword && topologyGroups >= 3 && hasRelatedProblem;
}

export function getLearningTips(diagnostics: SimulationDiagnostic[]) {
  return Array.from(new Set(diagnostics.map((entry) => entry.topic))).map(
    (topic) => learningTips[topic],
  );
}

export function rankLearningResources(
  document: ArchitectureDocumentV1,
  node: ArchitectureNodeV1,
  diagnostics: SimulationDiagnostic[],
  limit = 3,
): LearningResource[] {
  const topics = new Set(diagnostics.map((entry) => entry.topic));
  const codes = new Set(diagnostics.map((entry) => entry.code));
  const twitterMatch = matchesTwitterCase(document, diagnostics);
  const scored = learningResources
    .filter((resource) => resource.topics.some((topic) => topics.has(topic)))
    .filter(
      (resource) =>
        !resource.architectureCaseId ||
        (resource.architectureCaseId === 'twitter' && twitterMatch),
    )
    .map((resource, index) => {
      const codeMatch = resource.diagnosticCodes?.some((code) =>
        codes.has(code),
      );
      const componentMatch = resource.componentTypes?.includes(node.type);
      const score =
        (resource.architectureCaseId ? 400 : 0) +
        (codeMatch ? 200 : 0) +
        (componentMatch ? 100 : 0) +
        (resource.sourceKind === 'general' ? 0 : 20);
      return { resource, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const seen = new Set<string>();
  const result: LearningResource[] = [];
  for (const { resource } of scored) {
    if (seen.has(resource.url)) continue;
    seen.add(resource.url);
    result.push(resource);
    if (result.length === limit) break;
  }
  return result;
}
