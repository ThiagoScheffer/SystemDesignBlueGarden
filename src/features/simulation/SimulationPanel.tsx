import { Activity, AlertTriangle, Gauge, X } from 'lucide-react';
import { useEditorStore } from '../canvas/editorStore';
import { useSimulationStore } from './simulationStore';

const format = (value: number, suffix = '') =>
  `${value >= 1000 ? value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : value.toFixed(value < 10 ? 2 : 1)}${suffix}`;

function Sparkline({ values, label }: { values: number[]; label: string }) {
  const width = 640;
  const height = 64;
  const max = Math.max(1, ...values);
  const points = values
    .map(
      (value, index) =>
        `${(index / Math.max(1, values.length - 1)) * width},${height - (value / max) * (height - 4)}`,
    )
    .join(' ');
  return (
    <svg
      className="metric-sparkline"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function SimulationPanel({ onReset }: { onReset: () => void }) {
  const status = useSimulationStore((state) => state.status);
  const ticks = useSimulationStore((state) => state.ticks);
  const summary = useSimulationStore((state) => state.summary);
  const error = useSimulationStore((state) => state.error);
  const learningTipsEnabled = useSimulationStore(
    (state) => state.learningTipsEnabled,
  );
  const setLearningTipsEnabled = useSimulationStore(
    (state) => state.setLearningTipsEnabled,
  );
  const selection = useEditorStore((state) => state.selection);
  const select = useEditorStore((state) => state.select);
  if (status === 'idle' || status === 'preflight') return null;
  const latest = ticks.at(-1);
  const global = latest?.global;
  const allEvents = ticks
    .flatMap((tick) => tick.events)
    .slice(-30)
    .reverse();
  const selectedMetric =
    selection?.kind === 'node'
      ? latest?.nodes[selection.id]
      : selection?.kind === 'edge'
        ? latest?.edges[selection.id]
        : undefined;

  return (
    <section className="simulation-panel" aria-label="Simulation results">
      <header>
        <div>
          <Activity size={16} />
          <strong>Simulation</strong>
          <span className={`run-status status-${status}`}>{status}</span>
          {latest && <span>Virtual time {latest.second}s</span>}
        </div>
        <div className="simulation-header-actions">
          <label className="learning-tips-toggle">
            <input
              type="checkbox"
              checked={learningTipsEnabled}
              onChange={(event) => setLearningTipsEnabled(event.target.checked)}
            />
            Show learning tips
          </label>
          <button
            type="button"
            onClick={onReset}
            aria-label="Close simulation results"
          >
            <X size={15} />
          </button>
        </div>
      </header>
      {error && (
        <div className="simulation-error">
          <AlertTriangle size={15} />
          {error}
        </div>
      )}
      {global && (
        <div className="simulation-content">
          <div className="kpi-grid">
            <div>
              <span>Generated</span>
              <strong>{format(global.generatedRps, ' rps')}</strong>
            </div>
            <div>
              <span>Successful</span>
              <strong>{format(global.successfulRps, ' rps')}</strong>
            </div>
            <div>
              <span>Error rate</span>
              <strong>{format(global.errorRate * 100, '%')}</strong>
            </div>
            <div>
              <span>Avg latency</span>
              <strong>{format(global.averageLatencyMs, ' ms')}</strong>
            </div>
            <div>
              <span>P95 latency</span>
              <strong>{format(global.p95LatencyMs, ' ms')}</strong>
            </div>
            <div>
              <span>Queue depth</span>
              <strong>{format(global.queueDepth)}</strong>
            </div>
            <div>
              <span>Monthly cost</span>
              <strong>${format(global.estimatedMonthlyCost)}</strong>
            </div>
          </div>
          <div className="simulation-details-grid">
            <div className="timeline-card">
              <div>
                <span>Traffic</span>
                <strong>{format(global.generatedRps, ' rps')}</strong>
              </div>
              <Sparkline
                values={ticks.map((tick) => tick.global.generatedRps)}
                label="Generated traffic over virtual time"
              />
              <div>
                <span>P95 latency</span>
                <strong>{format(global.p95LatencyMs, ' ms')}</strong>
              </div>
              <Sparkline
                values={ticks.map((tick) => tick.global.p95LatencyMs)}
                label="P95 latency over virtual time"
              />
            </div>
            <div className="metric-detail-card">
              <h3>
                <Gauge size={14} />{' '}
                {selectedMetric ? 'Selected metrics' : 'Select a node or edge'}
              </h3>
              {selectedMetric ? (
                Object.entries(selectedMetric)
                  .filter(
                    ([, value]) =>
                      typeof value === 'number' || typeof value === 'string',
                  )
                  .slice(0, 10)
                  .map(([key, value]) => (
                    <div key={key}>
                      <span>{key.replace(/([A-Z])/g, ' $1')}</span>
                      <strong>
                        {typeof value === 'number' ? format(value) : value}
                      </strong>
                    </div>
                  ))
              ) : (
                <p>
                  Choose a component or connection to inspect its latest
                  simulation values.
                </p>
              )}
            </div>
            <div className="event-log-card">
              <h3>Event log</h3>
              <div>
                {allEvents.length === 0 && (
                  <p>No threshold or scenario events yet.</p>
                )}
                {allEvents.map((event) => (
                  <button
                    type="button"
                    key={event.id}
                    className={`event-${event.severity}`}
                    onClick={() =>
                      event.nodeId
                        ? select({ kind: 'node', id: event.nodeId })
                        : event.edgeId
                          ? select({ kind: 'edge', id: event.edgeId })
                          : undefined
                    }
                  >
                    <span>
                      {String(Math.floor(event.second / 60)).padStart(2, '0')}:
                      {String(event.second % 60).padStart(2, '0')}
                    </span>
                    <p>{event.message}</p>
                  </button>
                ))}
              </div>
            </div>
            {summary && (
              <div className="findings-card">
                <h3>Explainable findings</h3>
                {summary.findings.length === 0 && (
                  <p>No material bottleneck was detected.</p>
                )}
                {summary.findings.map((finding) => (
                  <button
                    type="button"
                    key={finding.id}
                    onClick={() =>
                      finding.nodeId
                        ? select({ kind: 'node', id: finding.nodeId })
                        : finding.edgeId
                          ? select({ kind: 'edge', id: finding.edgeId })
                          : undefined
                    }
                  >
                    <strong>{finding.title}</strong>
                    <span>{finding.description}</span>
                    <small>{finding.suggestion}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="estimate-disclaimer">
            Educational estimate based on configured assumptions; not a
            production guarantee.
          </p>
        </div>
      )}
    </section>
  );
}
