import { useCallback, useEffect } from 'react';
import type {
  ArchitectureDocumentV1,
  ProjectSettings,
} from '../../domain/architecture/types';
import { collectEvidence, emptyMetric } from '../../domain/learning/comparison';
import {
  challenges,
  createTemplateDocument,
  getChallenge,
} from '../../domain/learning/content';
import { compileIncident } from '../../domain/learning/incidents';
import { createLearningRunSnapshot } from '../../domain/learning/evaluation';
import { calculateCapacity } from '../../domain/learning/worksheet';
import type {
  AttemptAnswers,
  CapacityWorksheet,
  ChallengeAttempt,
  LearningMode,
} from '../../domain/learning/types';
import {
  deleteProject,
  deleteTrainingAttempt,
  loadProject,
  loadTrainingAttempts,
  saveProject,
  saveTrainingAttempt,
} from '../../storage/database';
import { useEditorStore } from '../canvas/editorStore';
import { useSimulationStore } from '../simulation/simulationStore';
import { useLearningStore } from './learningStore';

const emptyAnswers = (): AttemptAnswers => ({
  clarifyingQuestions: '',
  functionalRequirements: '',
  nonFunctionalRequirements: '',
  dataAndApiDecisions: '',
  bottlenecksAndTradeoffs: '',
});
const minutesFor = (level: ChallengeAttempt['challengeSnapshot']['level']) =>
  level === 'beginner' ? 30 : level === 'advanced' ? 60 : 45;

function createAttempt(
  challengeId: string,
  mode: LearningMode,
  architectureId: string,
): ChallengeAttempt {
  const challenge = getChallenge(challengeId);
  if (!challenge) throw new Error(`Unknown challenge: ${challengeId}`);
  const startedAt = new Date();
  return {
    learningSchemaVersion: 2,
    id: `attempt-${crypto.randomUUID()}`,
    challengeId,
    challengeVersion: challenge.contentVersion,
    challengeSnapshot: structuredClone(challenge),
    architectureId,
    mode,
    status: 'in-progress',
    startedAt: startedAt.toISOString(),
    updatedAt: startedAt.toISOString(),
    deadlineAt:
      mode === 'interview'
        ? new Date(
            startedAt.getTime() + minutesFor(challenge.level) * 60_000,
          ).toISOString()
        : undefined,
    revealedIncident: false,
    incidentRunCompleted: false,
    completedStepIds: mode === 'guided' ? ['understand'] : [],
    answers: emptyAnswers(),
    worksheet: structuredClone(challenge.worksheetDefaults),
    runSnapshots: [],
  };
}

export function useLearningController(
  document: ArchitectureDocumentV1,
  startSimulation: (
    scenario: import('../../domain/simulation/types').SimulationScenario,
    acknowledgeWarnings?: boolean,
  ) => boolean,
) {
  const hydrateDocument = useEditorStore((state) => state.hydrateDocument);
  const applyLearningConfiguration = useEditorStore(
    (state) => state.applyLearningConfiguration,
  );
  const summary = useSimulationStore((state) => state.summary);
  const simulationScenario = useSimulationStore((state) => state.scenario);
  const simulationTicks = useSimulationStore((state) => state.ticks);

  useEffect(() => {
    let active = true;
    void loadTrainingAttempts()
      .then((attempts) => {
        if (!active) return;
        const store = useLearningStore.getState();
        store.setAttempts(attempts);
        store.setActiveAttempt(
          attempts.find(
            (attempt) =>
              attempt.architectureId === useEditorStore.getState().document.id,
          ) ?? null,
        );
        store.setLoading(false);
      })
      .catch(() =>
        useLearningStore
          .getState()
          .setError('Training history could not be loaded.'),
      );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const store = useLearningStore.getState();
    const match =
      store.attempts.find(
        (attempt) => attempt.architectureId === document.id,
      ) ?? null;
    if (store.activeAttempt?.architectureId !== document.id)
      store.setActiveAttempt(match);
  }, [document.id]);

  const persist = useCallback(async (attempt: ChallengeAttempt) => {
    const next = { ...attempt, updatedAt: new Date().toISOString() };
    useLearningStore.getState().replaceAttempt(next);
    await saveTrainingAttempt(next);
    return next;
  }, []);

  useEffect(() => {
    const attempt = useLearningStore.getState().activeAttempt;
    if (
      !attempt ||
      attempt.status !== 'in-progress' ||
      !summary ||
      !simulationScenario ||
      summary.architectureId !== document.id ||
      attempt.runSnapshots?.some((run) => run.id === summary.runId)
    )
      return;
    const incidentCompleted =
      attempt.incidentRunCompleted ||
      summary.scenarioId === attempt.incidentScenarioId;
    void persist({
      ...attempt,
      runSnapshots: [
        ...(attempt.runSnapshots ?? []),
        createLearningRunSnapshot(
          document,
          simulationScenario,
          summary,
          simulationTicks,
        ),
      ],
      incidentRunCompleted: incidentCompleted,
      completedStepIds: incidentCompleted
        ? [...new Set([...attempt.completedStepIds, 'incident'])]
        : attempt.completedStepIds,
    });
  }, [document, persist, simulationScenario, simulationTicks, summary]);

  const switchProject = useCallback(
    async (next: ArchitectureDocumentV1) => {
      await saveProject(useEditorStore.getState().document);
      hydrateDocument(next);
      await saveProject(next);
      useSimulationStore.getState().reset();
    },
    [hydrateDocument],
  );

  const startChallenge = useCallback(
    async (challengeId: string, mode: LearningMode) => {
      const next = createTemplateDocument(challengeId);
      const attempt = createAttempt(challengeId, mode, next.id);
      await switchProject(next);
      await saveTrainingAttempt(attempt);
      const store = useLearningStore.getState();
      store.replaceAttempt(attempt);
      store.setActiveAttempt(attempt);
      store.setHubOpen(false);
      store.setDrawerOpen(true);
    },
    [switchProject],
  );

  const createFromTemplate = useCallback(
    async (templateId: string) => {
      await switchProject(createTemplateDocument(templateId));
      const store = useLearningStore.getState();
      store.setActiveAttempt(null);
      store.setHubOpen(false);
    },
    [switchProject],
  );

  const resumeAttempt = useCallback(
    async (attempt: ChallengeAttempt) => {
      const project = await loadProject(attempt.architectureId);
      if (!project) {
        useLearningStore
          .getState()
          .setError(
            'The architecture for this attempt is no longer available.',
          );
        return;
      }
      await switchProject(project.document);
      useLearningStore.getState().setActiveAttempt(attempt);
      useLearningStore.getState().setHubOpen(false);
      useLearningStore
        .getState()
        .setDrawerOpen(attempt.status === 'in-progress');
    },
    [switchProject],
  );

  const updateAttempt = useCallback(
    (changes: Partial<ChallengeAttempt>) => {
      const attempt = useLearningStore.getState().activeAttempt;
      if (!attempt || attempt.status !== 'in-progress') return;
      void persist({ ...attempt, ...changes });
    },
    [persist],
  );

  const updateAnswer = useCallback(
    (key: keyof AttemptAnswers, value: string) => {
      const attempt = useLearningStore.getState().activeAttempt;
      if (attempt)
        updateAttempt({ answers: { ...attempt.answers, [key]: value } });
    },
    [updateAttempt],
  );

  const updateWorksheet = useCallback(
    (worksheet: CapacityWorksheet) => updateAttempt({ worksheet }),
    [updateAttempt],
  );
  const toggleStep = useCallback(
    (id: string) => {
      const attempt = useLearningStore.getState().activeAttempt;
      if (!attempt) return;
      const completedStepIds = attempt.completedStepIds.includes(id)
        ? attempt.completedStepIds.filter((step) => step !== id)
        : [...attempt.completedStepIds, id];
      updateAttempt({ completedStepIds });
    },
    [updateAttempt],
  );

  const applyRequirements = useCallback(() => {
    const attempt = useLearningStore.getState().activeAttempt;
    if (!attempt) return;
    const estimate = calculateCapacity(attempt.worksheet);
    const settings: ProjectSettings = structuredClone(
      useEditorStore.getState().document.projectSettings,
    );
    settings.expectedScale = 'custom';
    settings.expectedUsers = 'custom';
    settings.customScale = {
      ...settings.customScale,
      registeredUsers: Math.round(attempt.worksheet.activeUsers),
      dailyActiveUsers: Math.round(attempt.worksheet.activeUsers),
      requestsPerSecond: estimate.averageRps,
      dailyTransactions: Math.round(
        attempt.worksheet.activeUsers * attempt.worksheet.actionsPerUserPerDay,
      ),
      storageGB: estimate.retainedStorageGB,
      monthlyTrafficGB: estimate.monthlyTrafficGB,
      peakTrafficMultiplier: attempt.worksheet.peakMultiplier,
    };
    applyLearningConfiguration({ projectSettings: settings });
  }, [applyLearningConfiguration]);

  const applySimulationDefaults = useCallback(() => {
    const attempt = useLearningStore.getState().activeAttempt;
    if (!attempt) return;
    const estimate = calculateCapacity(attempt.worksheet);
    const settings = structuredClone(
      useEditorStore.getState().document.projectSettings,
    );
    settings.simulationDefaults = {
      ...settings.simulationDefaults,
      initialRps: Math.round(estimate.averageRps),
      peakRps: Math.round(estimate.peakRps),
    };
    applyLearningConfiguration({ projectSettings: settings });
  }, [applyLearningConfiguration]);

  const applyBaseline = useCallback(() => {
    const attempt = useLearningStore.getState().activeAttempt;
    const current = useEditorStore.getState().document;
    const client = current.nodes.find((node) => node.type === 'client');
    if (!attempt || !client) {
      useLearningStore
        .getState()
        .setError('Add a Client before applying baseline traffic.');
      return;
    }
    const estimate = calculateCapacity(attempt.worksheet);
    applyLearningConfiguration({
      scenario: {
        id: `learning-baseline-${attempt.id}`,
        name: `${attempt.challengeSnapshot.title} baseline`,
        durationSeconds:
          current.projectSettings.simulationDefaults.durationSeconds,
        ambientFailureRate:
          current.projectSettings.simulationDefaults.ambientFailureRate,
        traffic: [
          {
            sourceNodeId: client.id,
            requestsPerSecond: Math.round(estimate.averageRps),
          },
        ],
        events: [],
      },
    });
  }, [applyLearningConfiguration]);

  const runIncident = useCallback(() => {
    const attempt = useLearningStore.getState().activeAttempt;
    if (!attempt) return;
    const compiled = compileIncident(
      attempt.challengeSnapshot.incident,
      useEditorStore.getState().document,
    );
    if (!compiled.scenario) {
      useLearningStore
        .getState()
        .setError(
          `Add the missing challenge roles: ${compiled.missingRoles.join(', ')}.`,
        );
      return;
    }
    const next = {
      ...attempt,
      revealedIncident: true,
      incidentScenarioId: compiled.scenario.id,
      completedStepIds: [...new Set([...attempt.completedStepIds, 'baseline'])],
    };
    void persist(next);
    if (!startSimulation(compiled.scenario, true))
      useLearningStore
        .getState()
        .setError('The challenge incident did not pass simulation preflight.');
  }, [persist, startSimulation]);

  const finishAttempt = useCallback(async () => {
    const attempt = useLearningStore.getState().activeAttempt;
    if (!attempt || !attempt.incidentRunCompleted) {
      useLearningStore
        .getState()
        .setError('Run the hidden incident before finishing this attempt.');
      return;
    }
    const user = structuredClone(useEditorStore.getState().document);
    const reference = createTemplateDocument(attempt.challengeId, true);
    const store = useLearningStore.getState();
    store.setComparisonRunning(true);
    store.setError(null);
    const worker = new Worker(
      new URL('../../engine/comparison.worker.ts', import.meta.url),
      { type: 'module' },
    );
    await new Promise<void>((resolve) => {
      worker.onmessage = (
        event: MessageEvent<{
          type: string;
          scenario?: import('../../domain/simulation/types').SimulationScenario;
          userMetric?: import('../../domain/simulation/types').GlobalMetric;
          referenceMetric?: import('../../domain/simulation/types').GlobalMetric;
          message?: string;
        }>,
      ) => {
        if (
          event.data.type === 'ERROR' ||
          !event.data.scenario ||
          !event.data.userMetric ||
          !event.data.referenceMetric
        ) {
          store.setError(event.data.message ?? 'Comparison failed.');
          store.setComparisonRunning(false);
          worker.terminate();
          resolve();
          return;
        }
        const completedAt = new Date().toISOString();
        void persist({
          ...attempt,
          status: 'completed',
          completedAt,
          completedStepIds: [
            ...new Set([...attempt.completedStepIds, 'finish']),
          ],
          comparison: {
            createdAt: completedAt,
            scenario: event.data.scenario,
            submittedArchitecture: user,
            referenceArchitecture: reference,
            userMetric: event.data.userMetric,
            referenceMetric: event.data.referenceMetric,
            evidence: collectEvidence(
              attempt.challengeSnapshot,
              user,
              reference,
            ),
            referenceTradeoffs: attempt.challengeSnapshot.referenceTradeoffs,
          },
        }).then(() => {
          store.setComparisonRunning(false);
          store.setDrawerOpen(false);
          worker.terminate();
          resolve();
        });
      };
      worker.onerror = () => {
        store.setError('The comparison worker stopped unexpectedly.');
        store.setComparisonRunning(false);
        worker.terminate();
        resolve();
      };
      worker.postMessage({
        attemptId: attempt.id,
        challenge: attempt.challengeSnapshot,
        user,
        reference,
      });
    });
  }, [persist]);

  const abandonAttempt = useCallback(() => {
    const attempt = useLearningStore.getState().activeAttempt;
    if (!attempt) return;
    const user = structuredClone(useEditorStore.getState().document);
    const reference = createTemplateDocument(attempt.challengeId, true);
    const compiled = compileIncident(
      attempt.challengeSnapshot.incident,
      reference,
    );
    if (!compiled.scenario) return;
    const completedAt = new Date().toISOString();
    void persist({
      ...attempt,
      status: 'abandoned',
      completedAt,
      revealedIncident: true,
      comparison: {
        createdAt: completedAt,
        scenario: compiled.scenario,
        submittedArchitecture: user,
        referenceArchitecture: reference,
        userMetric: emptyMetric(),
        referenceMetric: emptyMetric(),
        evidence: collectEvidence(attempt.challengeSnapshot, user, reference),
        referenceTradeoffs: attempt.challengeSnapshot.referenceTradeoffs,
      },
    }).then(() => {
      const store = useLearningStore.getState();
      store.setDrawerOpen(false);
      store.setHubTab('progress');
      store.setHubOpen(true);
    });
  }, [persist]);

  const tryAgain = useCallback(
    async (attempt: ChallengeAttempt) => {
      const source =
        attempt.comparison?.submittedArchitecture ??
        (await loadProject(attempt.architectureId))?.document;
      if (!source) return;
      const now = new Date().toISOString();
      const nextDocument = {
        ...structuredClone(source),
        id: `architecture-${crypto.randomUUID()}`,
        metadata: {
          ...source.metadata,
          name: `${attempt.challengeSnapshot.title} — Retry`,
          createdAt: now,
          updatedAt: now,
        },
      };
      const nextAttempt = createAttempt(
        attempt.challengeId,
        attempt.mode,
        nextDocument.id,
      );
      await switchProject(nextDocument);
      await saveTrainingAttempt(nextAttempt);
      const store = useLearningStore.getState();
      store.replaceAttempt(nextAttempt);
      store.setActiveAttempt(nextAttempt);
      store.setHubOpen(false);
      store.setDrawerOpen(true);
    },
    [switchProject],
  );

  const removeAttempt = useCallback(async (attempt: ChallengeAttempt) => {
    await deleteTrainingAttempt(attempt.id);
    await deleteProject(attempt.architectureId);
    useLearningStore.getState().removeAttempt(attempt.id);
  }, []);

  return {
    challenges,
    startChallenge,
    createFromTemplate,
    resumeAttempt,
    updateAnswer,
    updateWorksheet,
    toggleStep,
    applyRequirements,
    applySimulationDefaults,
    applyBaseline,
    runIncident,
    finishAttempt,
    abandonAttempt,
    tryAgain,
    removeAttempt,
  };
}
