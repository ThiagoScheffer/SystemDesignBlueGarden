export interface LearningTip {
  id: string;
  summary: string;
  actions: string[];
  links: { label: string; url: string }[];
}

const handbook = 'https://www.systemdesignhandbook.com/guides';

export const learningTips: Record<string, LearningTip> = {
  capacity: {
    id: 'capacity',
    summary:
      'Demand is arriving faster than this component can complete it. Protect the dependency before retries amplify the load.',
    actions: [
      'Increase capacity or add horizontally scaled instances.',
      'Apply rate limiting, backpressure, or graceful degradation.',
      'Reduce synchronous work on the critical request path.',
    ],
    links: [
      {
        label: 'Twitter scaling and failure case study',
        url: `${handbook}/design-twitter-system-design/`,
      },
    ],
  },
  latency: {
    id: 'latency',
    summary:
      'Tail latency is rising. A small group of slow requests can dominate the experience even when the average looks healthy.',
    actions: [
      'Inspect saturation and downstream calls on this path.',
      'Use timeouts and circuit breakers to bound slow dependencies.',
      'Move non-essential work to an asynchronous path.',
    ],
    links: [
      {
        label: 'Twitter system-design case study',
        url: `${handbook}/design-twitter-system-design/`,
      },
    ],
  },
  cache: {
    id: 'cache',
    summary:
      'Cache misses or bypass traffic are transferring read pressure to the backing data store.',
    actions: [
      'Improve the hit rate for frequently repeated reads.',
      'Pre-warm hot keys and add jitter to expirations.',
      'Protect the database from miss storms with request coalescing.',
    ],
    links: [
      {
        label: 'Caching in system design',
        url: `${handbook}/caching-in-system-design/`,
      },
    ],
  },
  queue: {
    id: 'queue',
    summary:
      'The producer rate exceeds the consumer rate, so queued work and completion delay are growing.',
    actions: [
      'Scale consumers using queue depth and age as signals.',
      'Set a bounded queue and define overload behavior.',
      'Use retries with backoff and a dead-letter queue.',
    ],
    links: [
      {
        label: 'Message queue system design',
        url: `${handbook}/message-queue-system-design/`,
      },
      {
        label: 'Twitter backpressure case study',
        url: `${handbook}/design-twitter-system-design/`,
      },
    ],
  },
  sharding: {
    id: 'sharding',
    summary:
      'Traffic is unevenly distributed, leaving one shard significantly hotter than its peers.',
    actions: [
      'Choose a shard key with a more uniform access distribution.',
      'Split or rebalance the hot partition.',
      'Add special handling for unusually hot users or keys.',
    ],
    links: [
      {
        label: 'Database partitioning and sharding',
        url: `${handbook}/database-system-design/`,
      },
      {
        label: 'Twitter hot-user case study',
        url: `${handbook}/design-twitter-system-design/`,
      },
    ],
  },
  failure: {
    id: 'failure',
    summary:
      'Requests are reaching an unavailable or error-producing component.',
    actions: [
      'Fail over to healthy instances and remove unhealthy targets.',
      'Use circuit breakers to prevent cascading failures.',
      'Define a degraded response for non-critical functionality.',
    ],
    links: [
      {
        label: 'Twitter failure scenarios',
        url: `${handbook}/design-twitter-system-design/`,
      },
    ],
  },
};
