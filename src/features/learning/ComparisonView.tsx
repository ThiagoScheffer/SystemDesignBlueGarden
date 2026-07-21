import type { ChallengeAttempt } from '../../domain/learning/types';
import { ArchitecturePreview } from './ArchitecturePreview';

const metricRows = [
  ['Successful RPS', 'successfulRps'],
  ['Error rate', 'errorRate'],
  ['P95 latency', 'p95LatencyMs'],
  ['Queue depth', 'queueDepth'],
  ['Monthly cost', 'estimatedMonthlyCost'],
] as const;

export function ComparisonView({
  attempt,
  onTryAgain,
}: {
  attempt: ChallengeAttempt;
  onTryAgain: () => void;
}) {
  const comparison = attempt.comparison;
  if (!comparison) return <p>No comparison snapshot is available.</p>;
  const format = (key: string, value: number) =>
    key === 'errorRate'
      ? `${(value * 100).toFixed(2)}%`
      : key === 'estimatedMonthlyCost'
        ? `$${value.toLocaleString()}`
        : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return (
    <section className="comparison-view" aria-label="Evidence comparison">
      <header>
        <div>
          <span className="eyebrow">Completed attempt</span>
          <h2>{attempt.challengeSnapshot.title}</h2>
        </div>
        <button type="button" onClick={onTryAgain}>
          Try again
        </button>
      </header>
      <p className="comparison-disclaimer">
        This is neutral evidence from one shared scenario, not a score or a
        claim that either design is uniquely correct.
      </p>
      <div className="comparison-diagrams">
        <article>
          <h3>Your submitted design</h3>
          <ArchitecturePreview
            templateId={attempt.challengeId}
            architecture={comparison.submittedArchitecture}
          />
        </article>
        <article>
          <h3>One reference approach</h3>
          <ArchitecturePreview
            templateId={attempt.challengeId}
            reference
            architecture={comparison.referenceArchitecture}
          />
        </article>
      </div>
      {attempt.status === 'completed' ? (
        <>
          <h3>Scenario evidence</h3>
          <div className="comparison-metrics">
            <div>
              <strong>Metric</strong>
              <strong>Your design</strong>
              <strong>Reference</strong>
            </div>
            {metricRows.map(([label, key]) => (
              <div key={key}>
                <span>{label}</span>
                <span>{format(key, comparison.userMetric[key])}</span>
                <span>{format(key, comparison.referenceMetric[key])}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="comparison-disclaimer">
          This attempt ended before a comparable scenario result was submitted.
          The reference topology and concept evidence are still available for
          study.
        </p>
      )}
      <h3>Concept evidence</h3>
      <div className="evidence-list">
        {comparison.evidence.map((item) => (
          <article key={item.criterionId}>
            <strong>{item.label}</strong>
            <span>Your design: {item.userState}</span>
            <span>Reference: {item.referenceState}</span>
            <p>{item.explanation}</p>
          </article>
        ))}
      </div>
      <h3>Reference trade-offs</h3>
      <ul>
        {comparison.referenceTradeoffs.map((tradeoff) => (
          <li key={tradeoff}>{tradeoff}</li>
        ))}
      </ul>
      <h3>Your recorded reasoning</h3>
      <p>
        {attempt.answers.bottlenecksAndTradeoffs ||
          'No trade-off notes were submitted.'}
      </p>
    </section>
  );
}
