import { Activity, AlertTriangle } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { useEditorStore } from '../canvas/editorStore';
import { usePresentationStore } from '../../app/presentationStore';
import { useSimulationStore } from './simulationStore';
import { metricRows } from './metricPresentation';

const format = (value: number, suffix = '') =>
  `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
const tabs = [
  'Overview',
  'Explainable findings',
  'Event log',
  'Selected metrics',
] as const;
type ResultsTab = (typeof tabs)[number];

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
  const runId = useSimulationStore((state) => state.runId);
  if (status === 'idle' || status === 'preflight') return null;
  return <SimulationResults key={runId} onReset={onReset} />;
}

function SimulationResults({ onReset }: { onReset: () => void }) {
  const [tab, setTab] = useState<ResultsTab>('Overview');
  const [size, setSize] = useState<'normal' | 'expanded' | 'collapsed'>(
    'normal',
  );
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
  const document = useEditorStore((state) => state.document);
  const latest = ticks.at(-1);
  const global = latest?.global;
  const events = ticks
    .flatMap((tick) => tick.events)
    .slice()
    .reverse();
  const selectedMetric =
    selection?.kind === 'node'
      ? latest?.nodes[selection.id]
      : selection?.kind === 'edge'
        ? latest?.edges[selection.id]
        : undefined;
  const selectedName =
    selection?.kind === 'node'
      ? document.nodes.find((node) => node.id === selection.id)?.data.label
      : selection?.kind === 'edge'
        ? document.edges.find((edge) => edge.id === selection.id)?.label ||
          'Selected connection'
        : '';
  const inspect = (nodeId?: string, edgeId?: string) => {
    if (!nodeId && !edgeId) return;
    useSimulationStore.getState().closeDiagnostic();
    useEditorStore
      .getState()
      .select(
        nodeId ? { kind: 'node', id: nodeId } : { kind: 'edge', id: edgeId! },
      );
    usePresentationStore.getState().setReadingView('inspector');
  };
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft')
      next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    setTab(tabs[next]);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      .item(next)
      ?.focus();
  };
  return (
    <section
      className={`simulation-panel results-${size}`}
      aria-label="Simulation results"
    >
      <header>
        <div>
          <Activity aria-hidden="true" size={18} />
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
            aria-expanded={size !== 'collapsed'}
            onClick={() =>
              setSize(size === 'collapsed' ? 'normal' : 'collapsed')
            }
          >
            {size === 'collapsed' ? 'Show details' : 'Collapse'}
          </button>
          <button
            type="button"
            aria-pressed={size === 'expanded'}
            onClick={() => setSize(size === 'expanded' ? 'normal' : 'expanded')}
          >
            {size === 'expanded' ? 'Restore size' : 'Expand'}
          </button>
          <button type="button" onClick={onReset}>
            Reset simulation
          </button>
        </div>
      </header>
      {error && (
        <div className="simulation-error" role="alert">
          <AlertTriangle aria-hidden="true" size={18} />
          {error}
        </div>
      )}
      {global && (
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
      )}
      {size !== 'collapsed' && (
        <>
          <div
            role="tablist"
            aria-label="Simulation detail views"
            className="results-tabs"
          >
            {tabs.map((name, index) => (
              <button
                key={name}
                id={`results-tab-${index}`}
                role="tab"
                type="button"
                aria-selected={tab === name}
                aria-controls="results-content"
                tabIndex={tab === name ? 0 : -1}
                onClick={() => setTab(name)}
                onKeyDown={(event) => onTabKey(event, index)}
              >
                {name}
                {name === 'Explainable findings' && (
                  <span className="tab-count">
                    {summary?.findings.length ?? 0}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id="results-content"
            aria-labelledby={`results-tab-${tabs.indexOf(tab)}`}
            tabIndex={0}
            className="results-body"
          >
            {tab === 'Overview' &&
              (global ? (
                <div className="timeline-card">
                  <div>
                    <span>Traffic</span>
                    <strong>{format(global.generatedRps, ' req/s')}</strong>
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
              ) : (
                <p>
                  {error
                    ? 'No metrics were produced for this run.'
                    : 'Waiting for simulation metrics...'}
                </p>
              ))}
            {tab === 'Selected metrics' && (
              <div className="metric-detail-card">
                <h3>{selectedName || 'Select a node or edge'}</h3>
                {selectedMetric ? (
                  <dl className="selected-metrics">
                    {metricRows(selectedMetric).map((row) => (
                      <div key={row.key}>
                        <dt>{row.label}</dt>
                        <dd>{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p>
                    Choose a component or connection to inspect its latest
                    simulation values.
                  </p>
                )}
              </div>
            )}
            {tab === 'Event log' && (
              <div className="event-log-card">
                {events.length === 0 && (
                  <p>No threshold or scenario events yet.</p>
                )}
                {events.map((event) => (
                  <article
                    key={event.id}
                    className={`event-entry event-${event.severity}`}
                  >
                    <div className="event-meta">
                      <time>
                        {String(Math.floor(event.second / 60)).padStart(2, '0')}
                        :{String(event.second % 60).padStart(2, '0')}
                      </time>
                      <span className="severity-label">{event.severity}</span>
                    </div>
                    <p>{event.message}</p>
                    {(event.nodeId || event.edgeId) && (
                      <button
                        type="button"
                        onClick={() => inspect(event.nodeId, event.edgeId)}
                      >
                        Inspect component or connection
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
            {tab === 'Explainable findings' && (
              <div className="findings-card">
                {!summary && (
                  <p>
                    {status === 'error'
                      ? 'This run ended before final findings were available. Review the error and event log.'
                      : 'Explainable findings will be available when this simulation completes.'}
                  </p>
                )}
                {summary?.findings.length === 0 && (
                  <p>No material bottleneck was detected.</p>
                )}
                {summary?.findings.map((finding) => (
                  <article
                    key={finding.id}
                    className={`finding-entry event-${finding.severity}`}
                  >
                    <span className="severity-label">{finding.severity}</span>
                    <h3>{finding.title}</h3>
                    <p>{finding.description}</p>
                    <p className="finding-suggestion">
                      <strong>Suggested correction:</strong>{' '}
                      {finding.suggestion}
                    </p>
                    {(finding.nodeId || finding.edgeId) && (
                      <button
                        type="button"
                        onClick={() => inspect(finding.nodeId, finding.edgeId)}
                      >
                        Inspect component or connection
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      <p className="estimate-disclaimer">
        Educational estimate based on configured assumptions; not a production
        guarantee.
      </p>
    </section>
  );
}
