import { useMemo, useState } from 'react';
import { evaluateRubric } from '../../domain/learning/evaluation';
import { learningRubrics } from '../../domain/learning/structuredContent';
import type {
  ChallengeAttempt,
  LearningMetricKey,
} from '../../domain/learning/types';
import { useEditorStore } from '../canvas/editorStore';

const metricLabels: Record<LearningMetricKey, string> = {
  databasePeakOfferedRps: 'Database peak offered RPS',
  cachePeakOriginRps: 'Cache peak origin RPS',
  cachePeakLockWaitRps: 'Cache peak lock-wait RPS',
  cacheTotalLockTimeouts: 'Cache lock timeouts',
  cacheTotalStaleResponses: 'Stale responses served',
  cacheTotalCoalescedRequests: 'Coalesced requests',
  globalPeakP95LatencyMs: 'Global peak P95 (ms)',
  globalPeakErrorRate: 'Global peak error rate',
};

export function LearningRunComparison({
  attempt,
}: {
  attempt: ChallengeAttempt;
}) {
  const document = useEditorStore((state) => state.document);
  const runs = useMemo(
    () => attempt.runSnapshots ?? [],
    [attempt.runSnapshots],
  );
  const [leftId, setLeftId] = useState<string>();
  const [rightId, setRightId] = useState<string>();
  const left = runs.find((run) => run.id === leftId) ?? runs.at(-2) ?? runs[0];
  const right = runs.find((run) => run.id === rightId) ?? runs.at(-1);
  const rubric = learningRubrics.find(
    (candidate) => candidate.id === attempt.challengeSnapshot.rubricId,
  );
  const observations = useMemo(
    () => (rubric ? evaluateRubric(rubric, document, runs) : []),
    [document, rubric, runs],
  );
  if (!runs.length && !rubric) return null;
  const keys = Object.keys(metricLabels) as LearningMetricKey[];
  return (
    <section className="learning-run-comparison">
      <h3>Run evidence</h3>
      {left && right && <>
        <p>Engine versions: {left.summary.engineVersion ?? 'legacy'} / {right.summary.engineVersion ?? 'legacy'}</p>
        {(['read', 'write'] as const).map(kind => <div className="run-metric-row" key={kind}><strong>{kind} successful / failed req/s (final)</strong><span>{left.summary.workloads?.[kind] ? `${left.summary.workloads[kind].successfulRps.toLocaleString()} / ${left.summary.workloads[kind].failedRps.toLocaleString()}` : 'Not recorded'}</span><span>{right.summary.workloads?.[kind] ? `${right.summary.workloads[kind].successfulRps.toLocaleString()} / ${right.summary.workloads[kind].failedRps.toLocaleString()}` : 'Not recorded'}</span></div>)}
      </>}
      {runs.length > 0 && (
        <div className="run-selectors">
          <label>
            Earlier run
            <select
              value={left?.id ?? ''}
              onChange={(event) => setLeftId(event.target.value)}
            >
              {runs.map((run, index) => (
                <option key={run.id} value={run.id}>
                  Run {index + 1} · {run.scenario.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Later run
            <select
              value={right?.id ?? ''}
              onChange={(event) => setRightId(event.target.value)}
            >
              {runs.map((run, index) => (
                <option key={run.id} value={run.id}>
                  Run {index + 1} · {run.scenario.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {left && right && (
        <div
          className="run-metric-table"
          role="table"
          aria-label="Learning run comparison"
        >
          <div className="run-metric-row run-metric-heading" role="row">
            <strong>Metric</strong>
            <strong>Earlier</strong>
            <strong>Later</strong>
          </div>
          {keys.map((key) => (
            <div className="run-metric-row" role="row" key={key}>
              <span>{metricLabels[key]}</span>
              <span>{left.metrics[key].toLocaleString()}</span>
              <span>{right.metrics[key].toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
      {observations.length > 0 && (
        <div className="rubric-observations">
          <h4>Deterministic observations</h4>
          {observations.map((observation) => (
            <div key={observation.criterionId} data-state={observation.state}>
              <strong>{observation.label}</strong>
              <span>{observation.state.replace('-', ' ')}</span>
              <p>{observation.evidence}</p>
            </div>
          ))}
          <small>
            Evidence is advisory; no score or pass/fail result is calculated.
          </small>
        </div>
      )}
    </section>
  );
}
