import { challenges, learningTemplates } from './content';
import { validateLearningRegistryBundle } from './registry';
import type {
  ConceptDefinition,
  LearningQuestion,
  LearningSourceReference,
  LearningTipDefinition,
  LessonDefinition,
  RubricDefinition,
} from './types';

export const learningSources: LearningSourceReference[] = [
  {
    id: 'cache-stampede-source',
    title: 'Preventing Cache Stampedes',
    localPath: 'docs/DesignInterv/Preventing Cache Stampedes.md',
  },
  {
    id: 'cache-invalidation-source',
    title: 'Why Cache Invalidation Is Difficult',
    localPath: 'docs/DesignInterv/Why Cache Invalidation Is Difficult.md',
  },
  {
    id: 'write-cache-source',
    title: 'Write-Through vs. Write-Behind Caching',
    localPath: 'docs/DesignInterv/Write-Through vs. Write-Behind Caching.md',
  },
];

export const learningConcepts: ConceptDefinition[] = [
  {
    id: 'cache-stampede',
    contentVersion: 1,
    title: 'Cache stampede',
    summary:
      'Concurrent misses for an expired popular key can multiply origin requests and overload the backing store.',
    componentTypes: ['cache', 'application-server', 'sql-database'],
    sourceIds: ['cache-stampede-source'],
  },
  {
    id: 'request-coalescing',
    contentVersion: 1,
    title: 'Request coalescing',
    summary:
      'Identical concurrent requests share one in-flight rebuild instead of issuing duplicate database queries.',
    componentTypes: ['application-server', 'cache'],
    sourceIds: ['cache-stampede-source'],
  },
  {
    id: 'cache-locking',
    contentVersion: 1,
    title: 'Bounded cache locking',
    summary:
      'A distributed lock allows one rebuild, but it needs expiry and a bounded wait policy to avoid indefinite blocking.',
    componentTypes: ['cache'],
    sourceIds: ['cache-stampede-source'],
  },
  {
    id: 'stale-revalidation',
    contentVersion: 1,
    title: 'Stale-while-revalidate',
    summary:
      'A bounded stale window can keep reads responsive while one request refreshes the cached value.',
    componentTypes: ['cache'],
    sourceIds: ['cache-stampede-source', 'cache-invalidation-source'],
  },
  {
    id: 'ttl-jitter',
    contentVersion: 1,
    title: 'TTL jitter',
    summary:
      'Randomized expiry spreads multi-key refresh work, but it does not protect one exceptionally hot key.',
    componentTypes: ['cache'],
    sourceIds: ['cache-stampede-source'],
  },
  {
    id: 'background-refresh',
    contentVersion: 1,
    title: 'Background refresh',
    summary:
      'A refresh worker can keep known hot keys warm, while request-time protection still covers worker failure and new hot keys.',
    componentTypes: ['cache', 'worker'],
    sourceIds: ['cache-stampede-source'],
  },
];

export const learningQuestions: LearningQuestion[] = [
  {
    id: 'stampede-cause-question',
    prompt: 'How many origin queries occur when the popular key expires?',
    conceptIds: ['cache-stampede'],
  },
  {
    id: 'lock-failure-question',
    prompt: 'What happens to waiting requests if the lock holder fails?',
    conceptIds: ['cache-locking'],
  },
  {
    id: 'stale-safety-question',
    prompt: 'For how long is stale data acceptable for this workload?',
    conceptIds: ['stale-revalidation'],
  },
];

export const learningTips: LearningTipDefinition[] = [
  {
    id: 'measure-origin-tip',
    title: 'Measure the amplification first',
    guidance:
      'Run the expiration without protection and compare cache origin RPS with the backing database capacity.',
    conceptIds: ['cache-stampede'],
  },
  {
    id: 'combine-protection-tip',
    title: 'Combine compatible protections',
    guidance:
      'Coalescing or locking controls duplicate work; stale serving controls user latency; jitter controls synchronized keys.',
    conceptIds: [
      'request-coalescing',
      'cache-locking',
      'stale-revalidation',
      'ttl-jitter',
    ],
  },
];

export const learningLessons: LessonDefinition[] = [
  {
    id: 'prevent-cache-stampede',
    contentVersion: 1,
    title: 'Prevent a cache stampede',
    summary:
      'Observe an unprotected popular-key expiry, then reduce origin amplification with explicit mitigation choices.',
    conceptIds: [
      'cache-stampede',
      'request-coalescing',
      'cache-locking',
      'stale-revalidation',
      'ttl-jitter',
      'background-refresh',
    ],
    questionIds: [
      'stampede-cause-question',
      'lock-failure-question',
      'stale-safety-question',
    ],
    tipIds: ['measure-origin-tip', 'combine-protection-tip'],
  },
];

export const learningRubrics: RubricDefinition[] = [
  {
    id: 'cache-stampede-rubric',
    contentVersion: 1,
    criteria: [
      {
        id: 'cache-request-path',
        label: 'Cache request path',
        explanation:
          'An active Application Server → Cache → SQL Database path is represented.',
        rule: {
          type: 'active-path',
          componentTypes: ['application-server', 'cache', 'sql-database'],
        },
      },
      {
        id: 'stampede-observed',
        label: 'Unprotected expiration observed',
        explanation: 'A run records origin amplification during expiration.',
        rule: {
          type: 'run-observation',
          metric: 'cachePeakOriginRps',
          operator: 'gt',
          value: 1000,
        },
      },
      {
        id: 'duplicate-rebuild-protection',
        label: 'Duplicate rebuild protection',
        explanation: 'Locking or request coalescing is enabled.',
        rule: {
          type: 'config-enabled',
          componentType: 'cache',
          keys: ['cacheLocking', 'requestCoalescing'],
          minimumEnabled: 1,
        },
      },
      {
        id: 'availability-strategy',
        label: 'Bounded availability strategy',
        explanation: 'Stale serving or background refresh is configured.',
        rule: {
          type: 'config-enabled',
          componentType: 'cache',
          keys: ['staleWindowSeconds', 'backgroundRefresh'],
          minimumEnabled: 1,
        },
      },
      {
        id: 'safe-lock-policy',
        label: 'Safe lock policy',
        explanation:
          'When locking is enabled, lock expiry exceeds a bounded request wait timeout.',
        rule: { type: 'cache-lock-safety' },
      },
      {
        id: 'refresh-worker-connectivity',
        label: 'Refresh worker connectivity',
        explanation:
          'Background refresh is backed by a connected cache-refresh Worker.',
        rule: { type: 'cache-refresh-connection' },
      },
      {
        id: 'synchronized-expiry-protection',
        label: 'Synchronized expiry protection',
        explanation: 'TTL jitter is configured for multi-key expiration.',
        rule: {
          type: 'config-enabled',
          componentType: 'cache',
          keys: ['ttlJitterPercent'],
          minimumEnabled: 1,
        },
      },
      {
        id: 'origin-improvement',
        label: 'Origin load improvement',
        explanation:
          'A later run reduces peak cache-origin traffic by at least 25%.',
        rule: {
          type: 'run-improvement',
          metric: 'cachePeakOriginRps',
          minimumPercent: 25,
        },
      },
    ],
  },
];

export const learningRegistry = validateLearningRegistryBundle({
  challenges,
  templates: learningTemplates,
  concepts: learningConcepts,
  lessons: learningLessons,
  rubrics: learningRubrics,
  questions: learningQuestions,
  tips: learningTips,
  sources: learningSources,
});

export function conceptsForComponent(type: string) {
  return learningConcepts.filter((concept) =>
    concept.componentTypes.includes(
      type as (typeof concept.componentTypes)[number],
    ),
  );
}
