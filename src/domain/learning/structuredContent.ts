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

const urlTopics: Array<[string, string, string, string]> = [
  ['read-write-isolation', 'Read / write isolation', 'Redirect reads and creation writes share entry capacity but follow different dependencies. A failed key generator should affect creation without becoming a redirect dependency.', 'Which dependency can stop link creation while existing links still redirect?'],
  ['url-apis', 'API and data contract', 'Separate POST creation from GET redirect. Store short code, original URL, owner, creation time and expiry; define validation, idempotency and missing/expired responses.', 'How does retrying a timed-out POST avoid creating multiple links?'],
  ['short-keyspace', 'Keyspace capacity', 'An alphabet of A symbols and length L has A^L codes. Base62 with seven characters has 3,521,614,606,208 possible values; namespace capacity differs from allocation throughput.', 'Why does a huge keyspace not guarantee collision-free random allocation?'],
  ['key-allocation', 'Sequence versus key pool', 'A sequence offers deterministic unique allocation within one namespace. Pre-generated pools move generation off the request path but introduce depletion and refill decisions.', 'How will the creation service behave when its key pool is exhausted?'],
  ['atomic-allocation', 'Atomic allocation', 'Two creators must not claim the same key. Atomic allocation or conditional insertion enforces one winner; independently configured generators require a shared namespace contract.', 'Where is uniqueness enforced across concurrent creators?'],
  ['random-collisions', 'Collision retries', 'Random and hash-derived codes require occupancy-aware collision analysis and bounded retries. This simulator intentionally models sequence and finite pools, not a claimed random collision rate.', 'How does collision probability change as a namespace fills?'],
  ['cache-first-lookup', 'Cache-first redirect lookup', 'Cache hits terminate lookup work. Only misses reach the shard router and mapping store; a parallel direct read edge bypasses the benefit and adds a required dependency.', 'Which measured traffic proves the database receives only cache misses?'],
  ['url-sharding', 'Partition ownership', 'Hashing the short code spreads mappings across partitions. A failed partition loses its owned requests; redirecting them to a healthy partition does not magically copy their data.', 'What data movement is required before changing shard ownership?'],
  ['viral-hot-key', 'Viral hot keys', 'Even balanced key ownership cannot spread one popular code. Cache hit rate, request coalescing and origin capacity determine whether a viral link overloads its partition.', 'Why can a balanced hash function still produce a hot shard?'],
  ['redirect-codes', 'Redirect semantics', 'Permanent redirects may be cached by clients, reducing server analytics and limiting destination edits. Temporary redirects preserve control at the cost of repeated lookups.', 'Would you choose a permanent redirect for an editable marketing link?'],
  ['url-expiration', 'Expiration and cleanup', 'Lazy expiry hides expired mappings during reads; background cleanup reclaims storage later. The editor records these policies without pretending to simulate records or scan costs.', 'Can a record remain stored after it must stop redirecting?'],
  ['analytics-isolation', 'Asynchronous analytics', 'Click events enter a buffer and consumer throughput drains it. Consumer failure increases backlog; asynchronous edges exclude analytics latency and success from the redirect response.', 'What happens when analytics remains unavailable longer than the buffer can hold?'],
  ['url-admission', 'Admission control', 'A gateway can reject excess aggregate demand before expensive dependencies. The model uses a per-second aggregate limit, not per-user token buckets or a distributed quota store.', 'Which clients should receive retry guidance after admission rejection?'],
  ['write-storage', 'Write-based capacity', 'Only creation writes add mapping records. Multiply writes per day by stored bytes, retention days and replicas; estimate request bandwidth separately from retained storage.', 'How do five-year retention and three replicas change the estimate?'],
  ['url-consistency', 'Consistency and failure trade-offs', 'New links may need read-after-write visibility; analytics can usually lag. Replication and region failover need explicit consistency assumptions beyond this aggregate graph model.', 'What happens if a newly created link is read from a lagging replica?'],
];
learningConcepts.push(...urlTopics.map(([id, title, summary]) => ({ id, title, summary, contentVersion: 1, componentTypes: ['application-server', 'cache', 'nosql-database'] as ConceptDefinition['componentTypes'], sourceIds: [] })));
learningQuestions.push(...urlTopics.map(([id, , , prompt]) => ({ id: `${id}-question`, prompt, conceptIds: [id] })));
learningTips.push({ id: 'url-evidence-tip', title: 'Compare causal evidence', guidance: 'Run the 19k-read / 200-write baseline, then viral traffic, cache bypass, key outage and analytics outage independently. Compare per-workload success, cache origin traffic and queue backlog. Change one assumption between runs.', conceptIds: ['read-write-isolation', 'analytics-isolation', 'cache-first-lookup'] });
learningLessons.push({ id: 'url-shortener-design', contentVersion: 1, title: 'Design and test a URL Shortener', summary: 'Reason from API contracts and write-based capacity to isolated workload paths, finite key allocation, expiration and asynchronous analytics.', conceptIds: urlTopics.map(([id]) => id), questionIds: urlTopics.map(([id]) => `${id}-question`), tipIds: ['url-evidence-tip'] });
learningRubrics.push({ id: 'url-shortener-rubric', contentVersion: 1, criteria: [
  { id: 'url-read-path', label: 'Cache-first read path', explanation: 'Reach a mapping datastore through cache on a synchronous read path.', rule: { type: 'workload-path', trafficType: 'read', from: 'client', to: 'nosql-database', via: 'cache', asynchronous: false } },
  { id: 'url-write-path', label: 'Creation and key allocation', explanation: 'A creation role reaches an ID generator through a write path.', rule: { type: 'workload-path', trafficType: 'write', from: 'application-server', fromRole: 'url-creation', to: 'application-server', toRole: 'id-generator', asynchronous: false } },
  { id: 'url-analytics-path', label: 'Buffered asynchronous analytics', explanation: 'A redirect role reaches an analytics worker through a queue and asynchronous boundary.', rule: { type: 'workload-path', trafficType: 'read', from: 'application-server', fromRole: 'redirect', to: 'worker', toRole: 'analytics-consumer', via: 'message-queue', asynchronous: true } },
  { id: 'url-read-run', label: 'Redirect completion evidence', explanation: 'A completed run demonstrates reads with at most one percent failures.', rule: { type: 'workload-run', trafficType: 'read', maximumFailurePercent: 1 } },
  { id: 'url-write-run', label: 'Creation completion evidence', explanation: 'A completed run demonstrates writes with at most one percent failures.', rule: { type: 'workload-run', trafficType: 'write', maximumFailurePercent: 1 } },
  { id: 'url-origin-improvement', label: 'Before / after origin demand', explanation: 'Reduce measured cache-origin demand by 25 percent in comparable runs.', rule: { type: 'run-improvement', metric: 'cachePeakOriginRps', minimumPercent: 25 } },
] });

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
