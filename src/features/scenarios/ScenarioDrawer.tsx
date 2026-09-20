import { AlertTriangle, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useModalFocus } from '../../app/useModalFocus';
import type { ArchitectureDocumentV1 } from '../../domain/architecture/types';
import type {
  ScenarioEvent,
  SimulationScenario,
} from '../../domain/simulation/types';
import { useEditorStore } from '../canvas/editorStore';
import { useSimulationStore } from '../simulation/simulationStore';
import {
  createScenarioPreset,
  scenarioPresetLabels,
  type ScenarioPreset,
} from './presets';

const presetKeys = Object.keys(scenarioPresetLabels) as ScenarioPreset[];
const eventTypes: ScenarioEvent['type'][] = [
  'TRAFFIC_SET',
  'NODE_FAILURE',
  'NODE_CAPACITY',
  'CACHE_BYPASS',
  'QUEUE_INJECT',
  'EDGE_LATENCY',
];

function defaultEvent(
  type: ScenarioEvent['type'],
  document: ArchitectureDocumentV1,
): ScenarioEvent | null {
  const id = `event-${crypto.randomUUID()}`;
  const client = document.nodes.find((node) => node.type === 'client');
  if (type === 'TRAFFIC_SET' && client)
    return {
      id,
      type,
      atSecond: 30,
      sourceNodeId: client.id,
      requestsPerSecond: 5000,
    };
  if (type === 'NODE_FAILURE') {
    const node = document.nodes.find(
      (candidate) =>
        candidate.type !== 'client' &&
        candidate.type !== 'region' &&
        candidate.type !== 'note',
    );
    return node
      ? { id, type, atSecond: 30, nodeId: node.id, durationSeconds: 30 }
      : null;
  }
  if (type === 'NODE_CAPACITY') {
    const node = document.nodes.find(
      (candidate) =>
        candidate.type !== 'client' &&
        candidate.type !== 'region' &&
        candidate.type !== 'note',
    );
    return node
      ? {
          id,
          type,
          atSecond: 30,
          nodeId: node.id,
          multiplier: 0.5,
          durationSeconds: 30,
        }
      : null;
  }
  if (type === 'CACHE_BYPASS') {
    const node = document.nodes.find((candidate) => candidate.type === 'cache');
    return node
      ? { id, type, atSecond: 30, nodeId: node.id, durationSeconds: 30 }
      : null;
  }
  if (type === 'QUEUE_INJECT') {
    const node = document.nodes.find(
      (candidate) => candidate.type === 'message-queue',
    );
    return node
      ? { id, type, atSecond: 30, nodeId: node.id, messages: 50000 }
      : null;
  }
  if (type === 'EDGE_LATENCY' && document.edges[0])
    return {
      id,
      type,
      atSecond: 30,
      edgeId: document.edges[0].id,
      addedLatencyMs: 250,
      durationSeconds: 30,
    };
  return null;
}

export function ScenarioDrawer({
  document,
  start,
}: {
  document: ArchitectureDocumentV1;
  start: (
    scenario: SimulationScenario,
    acknowledgeWarnings?: boolean,
  ) => boolean;
}) {
  const open = useSimulationStore((state) => state.drawerOpen);
  const setOpen = useSimulationStore((state) => state.setDrawerOpen);
  const drawerRef = useRef<HTMLElement>(null);
  useModalFocus(drawerRef, open, () => setOpen(false));
  const preflight = useSimulationStore((state) => state.preflight);
  const upsertScenario = useEditorStore((state) => state.upsertScenario);
  const initial = useMemo(
    () =>
      document.scenarios[0] ??
      createScenarioPreset(
        'baseline',
        document.nodes,
        document.edges,
        document.projectSettings.simulationDefaults,
      ),
    [
      document.edges,
      document.nodes,
      document.projectSettings.simulationDefaults,
      document.scenarios,
    ],
  );
  const [draft, setDraft] = useState<SimulationScenario>(initial);
  const [acknowledge, setAcknowledge] = useState(false);
  const [newEventType, setNewEventType] =
    useState<ScenarioEvent['type']>('TRAFFIC_SET');

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      setDraft(
        document.scenarios[0] ??
          createScenarioPreset(
            'baseline',
            document.nodes,
            document.edges,
            document.projectSettings.simulationDefaults,
          ),
      );
      setAcknowledge(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [
    document.edges,
    document.nodes,
    document.projectSettings.simulationDefaults,
    document.scenarios,
    open,
  ]);

  if (!open) return null;
  const updateEvent = (id: string, changes: Partial<ScenarioEvent>) =>
    setDraft((current) => ({
      ...current,
      events: current.events.map((event) =>
        event.id === id ? ({ ...event, ...changes } as ScenarioEvent) : event,
      ),
    }));

  const compatibleNodes = (event: ScenarioEvent) => {
    if (event.type === 'CACHE_BYPASS')
      return document.nodes.filter((node) => node.type === 'cache');
    if (event.type === 'QUEUE_INJECT')
      return document.nodes.filter((node) => node.type === 'message-queue');
    return document.nodes.filter(
      (node) =>
        node.type !== 'client' &&
        node.type !== 'region' &&
        node.type !== 'note',
    );
  };

  return (
    <div className="scenario-backdrop" role="presentation">
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        className="scenario-drawer"
        aria-label="Scenario configuration"
      >
        <header>
          <div>
            <span className="eyebrow">Simulate</span>
            <h2>Configure scenario</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close scenario configuration"
          >
            <X size={18} />
          </button>
        </header>
        <div className="scenario-body">
          <section>
            <h3>Presets</h3>
            <div className="preset-grid">
              {presetKeys.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() =>
                    setDraft(
                      createScenarioPreset(
                        preset,
                        document.nodes,
                        document.edges,
                        document.projectSettings.simulationDefaults,
                      ),
                    )
                  }
                >
                  {scenarioPresetLabels[preset]}
                </button>
              ))}
            </div>
          </section>
          {document.scenarios.length > 0 && <section><h3>Saved scenarios</h3><div className="preset-grid">{document.scenarios.map(scenario => <button type="button" key={scenario.id} onClick={() => setDraft(structuredClone(scenario))}>{scenario.name}</button>)}</div></section>}
          <section className="scenario-fields">
            <label>
              <span>Name</span>
              <input
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
            </label>
            <label>
              <span>Duration (seconds)</span>
              <input
                type="number"
                min="10"
                max="86400"
                value={draft.durationSeconds}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    durationSeconds: Number(event.target.value),
                  })
                }
              />
            </label>
            <label>
              <span>Ambient failure (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={(draft.ambientFailureRate ?? 0) * 100}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    ambientFailureRate: Number(event.target.value) / 100,
                  })
                }
              />
            </label>
            {draft.traffic.map((source, index) => <div key={index} className="scenario-fields">
              <label><span>Client source</span><select value={source.sourceNodeId} onChange={event => setDraft({ ...draft, traffic: draft.traffic.map((entry, i) => i === index ? { ...entry, sourceNodeId: event.target.value } : entry) })}>{document.nodes.filter(node => node.type === 'client').map(node => <option key={node.id} value={node.id}>{node.data.label}</option>)}</select></label>
              <label><span>Workload</span><select value={source.trafficType ?? 'read'} onChange={event => setDraft({ ...draft, traffic: draft.traffic.map((entry, i) => i === index ? { ...entry, trafficType: event.target.value as 'read' | 'write' } : entry) })}><option value="read">Read</option><option value="write">Write</option></select></label>
              <label><span>{index === 0 ? 'Initial requests/second' : 'Requests/second'}</span><input type="number" min="0" value={source.requestsPerSecond} onChange={event => setDraft({ ...draft, traffic: draft.traffic.map((entry, i) => i === index ? { ...entry, requestsPerSecond: Number(event.target.value) } : entry) })} /></label>
              <label><span>Operation label</span><input maxLength={120} value={source.operation ?? ''} onChange={event => setDraft({ ...draft, traffic: draft.traffic.map((entry, i) => i === index ? { ...entry, operation: event.target.value } : entry) })} /></label>
              <button type="button" onClick={() => setDraft({ ...draft, traffic: draft.traffic.filter((_, i) => i !== index) })}>Remove workload</button>
            </div>)}
            <button type="button" onClick={() => { const client = document.nodes.find(node => node.type === 'client'); if (client) setDraft({ ...draft, traffic: [...draft.traffic, { sourceNodeId: client.id, trafficType: 'write', requestsPerSecond: 200 }] }); }}>Add workload</button>
          </section>
          <section>
            <div className="scenario-section-heading">
              <h3>Timeline events</h3>
              <div>
                <select
                  value={newEventType}
                  onChange={(event) =>
                    setNewEventType(event.target.value as ScenarioEvent['type'])
                  }
                >
                  {eventTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const event = defaultEvent(newEventType, document);
                    if (event)
                      setDraft({ ...draft, events: [...draft.events, event] });
                  }}
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
            <div className="event-editor-list">
              {draft.events.length === 0 && (
                <p className="empty-copy">
                  No incidents. This is a baseline run.
                </p>
              )}
              {draft.events.map((event) => (
                <article key={event.id} className="event-editor">
                  <div>
                    <strong>{event.type.replaceAll('_', ' ')}</strong>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          events: draft.events.filter(
                            (candidate) => candidate.id !== event.id,
                          ),
                        })
                      }
                      aria-label="Delete event"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <label>
                    <span>At second</span>
                    <input
                      type="number"
                      min="0"
                      value={event.atSecond}
                      onChange={(change) =>
                        updateEvent(event.id, {
                          atSecond: Number(change.target.value),
                        })
                      }
                    />
                  </label>
                  {'nodeId' in event && (
                    <label>
                      <span>Target</span>
                      <select
                        value={event.nodeId}
                        onChange={(change) =>
                          updateEvent(event.id, { nodeId: change.target.value })
                        }
                      >
                        {compatibleNodes(event).map((node) => (
                          <option key={node.id} value={node.id}>
                            {node.data.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {'edgeId' in event && (
                    <label>
                      <span>Connection</span>
                      <select
                        value={event.edgeId}
                        onChange={(change) =>
                          updateEvent(event.id, { edgeId: change.target.value })
                        }
                      >
                        {document.edges.map((edge) => (
                          <option key={edge.id} value={edge.id}>
                            {edge.label ?? edge.id}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {'durationSeconds' in event && (
                    <label>
                      <span>Duration</span>
                      <input
                        type="number"
                        min="1"
                        value={event.durationSeconds}
                        onChange={(change) =>
                          updateEvent(event.id, {
                            durationSeconds: Number(change.target.value),
                          })
                        }
                      />
                    </label>
                  )}
                  {event.type === 'TRAFFIC_SET' && <label><span>Workload to change</span><select value={event.trafficType ?? 'read'} onChange={change => updateEvent(event.id, { trafficType: change.target.value as 'read' | 'write' })}><option value="read">Read</option><option value="write">Write</option></select></label>}
                  {'requestsPerSecond' in event && (
                    <label>
                      <span>RPS</span>
                      <input
                        type="number"
                        min="0"
                        value={event.requestsPerSecond}
                        onChange={(change) =>
                          updateEvent(event.id, {
                            requestsPerSecond: Number(change.target.value),
                          })
                        }
                      />
                    </label>
                  )}
                  {'multiplier' in event && (
                    <label>
                      <span>Capacity multiplier</span>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.05"
                        value={event.multiplier}
                        onChange={(change) =>
                          updateEvent(event.id, {
                            multiplier: Number(change.target.value),
                          })
                        }
                      />
                    </label>
                  )}
                  {'messages' in event && (
                    <label>
                      <span>Messages</span>
                      <input
                        type="number"
                        min="0"
                        value={event.messages}
                        onChange={(change) =>
                          updateEvent(event.id, {
                            messages: Number(change.target.value),
                          })
                        }
                      />
                    </label>
                  )}
                  {'addedLatencyMs' in event && (
                    <label>
                      <span>Added latency (ms)</span>
                      <input
                        type="number"
                        min="0"
                        value={event.addedLatencyMs}
                        onChange={(change) =>
                          updateEvent(event.id, {
                            addedLatencyMs: Number(change.target.value),
                          })
                        }
                      />
                    </label>
                  )}
                </article>
              ))}
            </div>
          </section>
          {preflight &&
            (preflight.errors.length > 0 || preflight.warnings.length > 0) && (
              <section className="preflight-results">
                <h3>
                  <AlertTriangle size={15} /> Preflight findings
                </h3>
                {[...preflight.errors, ...preflight.warnings].map((item) => (
                  <article
                    key={item.id}
                    className={`preflight-entry ${item.severity}`}
                  >
                    <span className="severity-label">
                      {item.severity === 'error'
                        ? 'Error — must resolve'
                        : 'Modeling warning'}
                    </span>
                    <p className={item.severity}>{item.message}</p>
                  </article>
                ))}
                {preflight.warnings.length > 0 &&
                  preflight.errors.length === 0 && (
                    <label className="check-field">
                      <input
                        type="checkbox"
                        checked={acknowledge}
                        onChange={(event) =>
                          setAcknowledge(event.target.checked)
                        }
                      />
                      <span>I understand these modeling warnings.</span>
                    </label>
                  )}
              </section>
            )}
        </div>
        <footer>
          <button
            type="button"
            onClick={() => {
              upsertScenario(draft);
              setOpen(false);
            }}
          >
            Save scenario
          </button>
          <button
            className="run-button"
            type="button"
            onClick={() => {
              upsertScenario(draft);
              if (start(draft, acknowledge)) setOpen(false);
            }}
          >
            Run simulation
          </button>
        </footer>
      </aside>
    </div>
  );
}
