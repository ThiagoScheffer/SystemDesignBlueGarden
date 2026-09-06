import { z } from 'zod';
import { COMPONENT_TYPES } from '../architecture/types';
import type {
  ChallengeDefinition,
  ConceptDefinition,
  LearningQuestion,
  LearningSourceReference,
  LearningTemplate,
  LearningTipDefinition,
  LessonDefinition,
  RubricDefinition,
} from './types';

const id = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const componentType = z.enum(COMPONENT_TYPES);
const version = z.number().int().positive();

const incidentEventSchema = z.object({
  type: z.enum([
    'TRAFFIC_SET',
    'NODE_FAILURE',
    'NODE_CAPACITY',
    'CACHE_BYPASS',
    'QUEUE_INJECT',
    'EDGE_LATENCY',
    'CACHE_KEY_EXPIRATION',
  ]),
  componentType: componentType.optional(),
  sourceType: componentType.optional(),
  targetType: componentType.optional(),
  atSecond: z.number().int().nonnegative(),
  durationSeconds: z.number().int().positive().optional(),
  requestsPerSecond: z.number().nonnegative().optional(),
  multiplier: z.number().nonnegative().optional(),
  messages: z.number().nonnegative().optional(),
  addedLatencyMs: z.number().nonnegative().optional(),
  keyCount: z.number().int().positive().optional(),
  affectedTrafficPercent: z.number().min(0).max(100).optional(),
  rebuildDurationSeconds: z.number().int().positive().optional(),
});

const templateSchema = z.object({
  id,
  contentVersion: version,
  title: z.string().min(1),
  summary: z.string().min(1),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  concepts: z.array(z.string().min(1)).min(1),
  assumptions: z.array(z.string().min(1)),
  knownTradeoffs: z.array(z.string().min(1)),
});

const challengeSchema = z.object({
  id,
  contentVersion: version,
  templateId: id,
  title: z.string().min(1),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  summary: z.string().min(1),
  prompt: z.string().min(1),
  concepts: z.array(z.string().min(1)).min(1),
  functionalRequirements: z.array(z.string().min(1)),
  nonFunctionalRequirements: z.array(z.string().min(1)),
  guidedSteps: z.array(
    z.object({ id, label: z.string().min(1), hint: z.string().min(1) }),
  ),
  worksheetDefaults: z.object({
    activeUsers: z.number().nonnegative(),
    actionsPerUserPerDay: z.number().nonnegative(),
    readPercent: z.number().min(0).max(100),
    averagePayloadKB: z.number().nonnegative(),
    retentionDays: z.number().nonnegative(),
    replicationFactor: z.number().min(1),
    peakMultiplier: z.number().min(1),
  }),
  incident: z.object({
    id,
    title: z.string().min(1),
    hiddenDescription: z.string().min(1),
    revealedDescription: z.string().min(1),
    durationSeconds: z.number().int().positive(),
    events: z.array(incidentEventSchema).min(1),
  }),
  criteria: z.array(
    z.object({
      id,
      label: z.string().min(1),
      explanation: z.string().min(1),
      componentTypes: z.array(componentType).min(1),
      minimum: z.number().int().positive(),
    }),
  ),
  referenceTradeoffs: z.array(z.string().min(1)),
  recommendedComponents: z.array(componentType).optional(),
  lessonIds: z.array(id).optional(),
  rubricId: id.optional(),
});

const conceptSchema = z.object({
  id,
  contentVersion: version,
  title: z.string().min(1),
  summary: z.string().min(1),
  componentTypes: z.array(componentType),
  sourceIds: z.array(id),
});

const lessonSchema = z.object({
  id,
  contentVersion: version,
  title: z.string().min(1),
  summary: z.string().min(1),
  conceptIds: z.array(id).min(1),
  questionIds: z.array(id),
  tipIds: z.array(id),
});

const questionSchema = z.object({
  id,
  prompt: z.string().min(1),
  conceptIds: z.array(id).min(1),
});

const tipSchema = z.object({
  id,
  title: z.string().min(1),
  guidance: z.string().min(1),
  conceptIds: z.array(id).min(1),
});

const sourceSchema = z.object({
  id,
  title: z.string().min(1),
  localPath: z.string().startsWith('docs/DesignInterv/'),
});

const ruleSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('component-count'),
    componentTypes: z.array(componentType).min(1),
    minimum: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('active-path'),
    componentTypes: z.array(componentType).min(2),
  }),
  z.object({
    type: z.literal('config-enabled'),
    componentType,
    keys: z.array(z.string().min(1)).min(1),
    minimumEnabled: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('run-observation'),
    metric: z.enum([
      'databasePeakOfferedRps',
      'cachePeakOriginRps',
      'cachePeakLockWaitRps',
      'cacheTotalLockTimeouts',
      'cacheTotalStaleResponses',
      'cacheTotalCoalescedRequests',
      'globalPeakP95LatencyMs',
      'globalPeakErrorRate',
    ]),
    operator: z.enum(['gt', 'gte', 'lt', 'lte']),
    value: z.number(),
  }),
  z.object({
    type: z.literal('run-improvement'),
    metric: z.enum([
      'databasePeakOfferedRps',
      'cachePeakOriginRps',
      'cachePeakLockWaitRps',
      'cacheTotalLockTimeouts',
      'cacheTotalStaleResponses',
      'cacheTotalCoalescedRequests',
      'globalPeakP95LatencyMs',
      'globalPeakErrorRate',
    ]),
    minimumPercent: z.number().min(0).max(100),
  }),
  z.object({ type: z.literal('cache-lock-safety') }),
  z.object({ type: z.literal('cache-refresh-connection') }),
]);

const rubricSchema = z.object({
  id,
  contentVersion: version,
  criteria: z.array(
    z.object({
      id,
      label: z.string().min(1),
      explanation: z.string().min(1),
      rule: ruleSchema,
    }),
  ),
});

export interface LearningRegistryBundle {
  challenges: ChallengeDefinition[];
  templates: LearningTemplate[];
  concepts: ConceptDefinition[];
  lessons: LessonDefinition[];
  rubrics: RubricDefinition[];
  questions: LearningQuestion[];
  tips: LearningTipDefinition[];
  sources: LearningSourceReference[];
}

function unique<T extends { id: string }>(name: string, entries: T[]) {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) throw new Error(`Duplicate ${name} ID: ${entry.id}`);
    ids.add(entry.id);
  }
  return ids;
}

export function validateLearningRegistryBundle(bundle: LearningRegistryBundle) {
  const parsed = {
    challenges: z.array(challengeSchema).parse(bundle.challenges),
    templates: z.array(templateSchema).parse(bundle.templates),
    concepts: z.array(conceptSchema).parse(bundle.concepts),
    lessons: z.array(lessonSchema).parse(bundle.lessons),
    rubrics: z.array(rubricSchema).parse(bundle.rubrics),
    questions: z.array(questionSchema).parse(bundle.questions),
    tips: z.array(tipSchema).parse(bundle.tips),
    sources: z.array(sourceSchema).parse(bundle.sources),
  };
  const templateIds = unique('template', parsed.templates);
  const conceptIds = unique('concept', parsed.concepts);
  const lessonIds = unique('lesson', parsed.lessons);
  const rubricIds = unique('rubric', parsed.rubrics);
  const questionIds = unique('question', parsed.questions);
  const tipIds = unique('tip', parsed.tips);
  const sourceIds = unique('source', parsed.sources);
  unique('challenge', parsed.challenges);

  for (const challenge of parsed.challenges) {
    if (!templateIds.has(challenge.templateId))
      throw new Error(
        `Challenge ${challenge.id} references a missing template`,
      );
    for (const lessonId of challenge.lessonIds ?? [])
      if (!lessonIds.has(lessonId))
        throw new Error(
          `Challenge ${challenge.id} references missing lesson ${lessonId}`,
        );
    if (challenge.rubricId && !rubricIds.has(challenge.rubricId))
      throw new Error(`Challenge ${challenge.id} references a missing rubric`);
  }
  for (const concept of parsed.concepts)
    for (const sourceId of concept.sourceIds)
      if (!sourceIds.has(sourceId))
        throw new Error(
          `Concept ${concept.id} references missing source ${sourceId}`,
        );
  for (const lesson of parsed.lessons) {
    for (const conceptId of lesson.conceptIds)
      if (!conceptIds.has(conceptId))
        throw new Error(
          `Lesson ${lesson.id} references missing concept ${conceptId}`,
        );
    for (const questionId of lesson.questionIds)
      if (!questionIds.has(questionId))
        throw new Error(
          `Lesson ${lesson.id} references missing question ${questionId}`,
        );
    for (const tipId of lesson.tipIds)
      if (!tipIds.has(tipId))
        throw new Error(`Lesson ${lesson.id} references missing tip ${tipId}`);
  }
  return parsed;
}
