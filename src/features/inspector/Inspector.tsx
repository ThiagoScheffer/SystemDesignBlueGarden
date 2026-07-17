import { Settings2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type {
  EdgeConfig,
  NoteType,
  OperationalConfig,
} from '../../domain/architecture/types';
import { componentDefinitionMap } from '../../domain/components/definitions';
import { useEditorStore } from '../canvas/editorStore';

const advancedFields: Array<{
  key: keyof OperationalConfig;
  label: string;
  step?: number;
}> = [
  { key: 'baseLatencyMs', label: 'Base latency (ms)' },
  { key: 'failureRate', label: 'Failure rate', step: 0.001 },
  { key: 'concurrencyLimit', label: 'Concurrency limit' },
  { key: 'queueLimit', label: 'Queue limit' },
  { key: 'costPerHour', label: 'Cost per hour', step: 0.01 },
];

const noteTypes: NoteType[] = [
  'assumption',
  'decision',
  'risk',
  'question',
  'constraint',
  'requirement',
  'trade-off',
  'improvement',
];

function NumberField({
  label,
  value,
  step = 1,
  onChange,
  onBegin,
  onCommit,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (value: number) => void;
  onBegin: () => void;
  onCommit: () => void;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input
        type="number"
        min="0"
        step={step}
        value={value}
        onFocus={onBegin}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value)))}
        onBlur={onCommit}
      />
    </label>
  );
}

export function Inspector() {
  const [mode, setMode] = useState<'basic' | 'advanced'>('basic');
  const document = useEditorStore((state) => state.document);
  const selection = useEditorStore((state) => state.selection);
  const updateNodeTransient = useEditorStore(
    (state) => state.updateNodeTransient,
  );
  const updateEdgeTransient = useEditorStore(
    (state) => state.updateEdgeTransient,
  );
  const beginTransaction = useEditorStore((state) => state.beginTransaction);
  const commitTransaction = useEditorStore((state) => state.commitTransaction);
  const deleteSelection = useEditorStore((state) => state.deleteSelection);

  const node =
    selection?.kind === 'node'
      ? document.nodes.find((candidate) => candidate.id === selection.id)
      : undefined;
  const edge =
    selection?.kind === 'edge'
      ? document.edges.find((candidate) => candidate.id === selection.id)
      : undefined;

  return (
    <aside className="inspector panel" aria-label="Configuration inspector">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Inspect</span>
          <h2>{node ? 'Component' : edge ? 'Connection' : 'Design details'}</h2>
        </div>
        <Settings2 aria-hidden="true" size={18} />
      </div>

      {!node && !edge && (
        <div className="inspector-empty">
          <div className="inspector-illustration">
            <Settings2 aria-hidden="true" />
          </div>
          <strong>Nothing selected</strong>
          <p>
            Select a component or connection to configure its operational model.
          </p>
          <div className="hint-card">
            <span>Canvas guide</span>
            <p>Drag to move · Scroll to zoom · Drag a handle to connect</p>
          </div>
        </div>
      )}

      {node && (
        <div className="inspector-form">
          <div className="selection-summary">
            <span
              className="selection-dot"
              style={{ background: componentDefinitionMap[node.type].color }}
            />
            <div>
              <strong>{componentDefinitionMap[node.type].label}</strong>
              <span>{componentDefinitionMap[node.type].category}</span>
            </div>
          </div>
          <div className="mode-switch" aria-label="Configuration mode">
            <button
              type="button"
              className={mode === 'basic' ? 'is-active' : ''}
              onClick={() => setMode('basic')}
            >
              Basic
            </button>
            <button
              type="button"
              className={mode === 'advanced' ? 'is-active' : ''}
              onClick={() => setMode('advanced')}
            >
              Advanced
            </button>
          </div>
          <label className="form-field">
            <span>Name</span>
            <input
              value={node.data.label}
              onFocus={beginTransaction}
              onChange={(event) =>
                updateNodeTransient(node.id, {
                  label: event.target.value || 'Untitled',
                })
              }
              onBlur={commitTransaction}
            />
          </label>
          <label className="form-field">
            <span>Description</span>
            <textarea
              rows={3}
              value={node.data.description ?? ''}
              onFocus={beginTransaction}
              onChange={(event) =>
                updateNodeTransient(node.id, {
                  description: event.target.value,
                })
              }
              onBlur={commitTransaction}
            />
          </label>
          {node.type === 'note' ? (
            <>
              <label className="form-field">
                <span>Note type</span>
                <select
                  value={node.data.config.noteType}
                  onFocus={beginTransaction}
                  onChange={(event) =>
                    updateNodeTransient(node.id, {
                      config: { noteType: event.target.value as NoteType },
                    })
                  }
                  onBlur={commitTransaction}
                >
                  {noteTypes.map((type) => (
                    <option key={type} value={type}>
                      {type[0].toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Content</span>
                <textarea
                  rows={7}
                  placeholder="Record context, reasoning, and trade-offs…"
                  value={node.data.config.content ?? ''}
                  onFocus={beginTransaction}
                  onChange={(event) =>
                    updateNodeTransient(node.id, {
                      config: { content: event.target.value },
                    })
                  }
                  onBlur={commitTransaction}
                />
              </label>
            </>
          ) : (
            <NumberField
              label="Capacity (req/s)"
              value={node.data.config.capacity}
              onChange={(capacity) =>
                updateNodeTransient(node.id, { config: { capacity } })
              }
              onBegin={beginTransaction}
              onCommit={commitTransaction}
            />
          )}
          {node.type === 'cache' && (
            <label className="form-field range-field">
              <span>
                Cache hit rate ({node.data.config.hitRatePercent ?? 80}%)
              </span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={node.data.config.hitRatePercent ?? 80}
                onFocus={beginTransaction}
                onPointerDown={beginTransaction}
                onChange={(event) =>
                  updateNodeTransient(node.id, {
                    config: { hitRatePercent: Number(event.target.value) },
                  })
                }
                onBlur={commitTransaction}
                onPointerUp={commitTransaction}
              />
            </label>
          )}
          {node.type === 'sharding' && (
            <div className="advanced-fields sharding-fields">
              <NumberField
                label="Shard count"
                value={node.data.config.shardCount ?? 4}
                onChange={(shardCount) =>
                  updateNodeTransient(node.id, {
                    config: { shardCount: Math.max(1, Math.round(shardCount)) },
                  })
                }
                onBegin={beginTransaction}
                onCommit={commitTransaction}
              />
              <label className="form-field">
                <span>Shard key</span>
                <input
                  value={node.data.config.shardKey ?? 'userId'}
                  onFocus={beginTransaction}
                  onChange={(event) =>
                    updateNodeTransient(node.id, {
                      config: { shardKey: event.target.value || 'userId' },
                    })
                  }
                  onBlur={commitTransaction}
                />
              </label>
              <label className="form-field">
                <span>Shard strategy</span>
                <select
                  value={node.data.config.shardStrategy ?? 'hash'}
                  onFocus={beginTransaction}
                  onChange={(event) =>
                    updateNodeTransient(node.id, {
                      config: {
                        shardStrategy: event.target.value as
                          'hash' | 'range' | 'directory',
                      },
                    })
                  }
                  onBlur={commitTransaction}
                >
                  <option value="hash">Hash</option>
                  <option value="range">Range</option>
                  <option value="directory">Directory</option>
                </select>
              </label>
            </div>
          )}
          {mode === 'advanced' && node.type !== 'note' && (
            <div className="advanced-fields">
              {advancedFields.map((field) => (
                <NumberField
                  key={field.key}
                  label={field.label}
                  step={field.step}
                  value={Number(node.data.config[field.key] ?? 0)}
                  onChange={(value) =>
                    updateNodeTransient(node.id, {
                      config: { [field.key]: value },
                    })
                  }
                  onBegin={beginTransaction}
                  onCommit={commitTransaction}
                />
              ))}
            </div>
          )}
          <button
            className="danger-button"
            type="button"
            onClick={deleteSelection}
          >
            <Trash2 aria-hidden="true" size={15} /> Delete component
          </button>
        </div>
      )}

      {edge && (
        <div className="inspector-form">
          <label className="form-field">
            <span>Label</span>
            <input
              value={edge.label ?? ''}
              placeholder={edge.config.protocol}
              onFocus={beginTransaction}
              onChange={(event) =>
                updateEdgeTransient(edge.id, { label: event.target.value })
              }
              onBlur={commitTransaction}
            />
          </label>
          <label className="form-field">
            <span>Protocol</span>
            <select
              value={edge.config.protocol}
              onFocus={beginTransaction}
              onChange={(event) =>
                updateEdgeTransient(edge.id, {
                  config: {
                    protocol: event.target.value as EdgeConfig['protocol'],
                  },
                })
              }
              onBlur={commitTransaction}
            >
              {['HTTP', 'gRPC', 'TCP', 'Async'].map((protocol) => (
                <option key={protocol}>{protocol}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Mode</span>
            <select
              value={edge.config.mode}
              onFocus={beginTransaction}
              onChange={(event) =>
                updateEdgeTransient(edge.id, {
                  config: { mode: event.target.value as EdgeConfig['mode'] },
                })
              }
              onBlur={commitTransaction}
            >
              <option value="synchronous">Synchronous</option>
              <option value="asynchronous">Asynchronous</option>
            </select>
          </label>
          <NumberField
            label="Latency (ms)"
            value={edge.config.latencyMs}
            onChange={(latencyMs) =>
              updateEdgeTransient(edge.id, { config: { latencyMs } })
            }
            onBegin={beginTransaction}
            onCommit={commitTransaction}
          />
          <NumberField
            label="Timeout (ms)"
            value={edge.config.timeoutMs}
            onChange={(timeoutMs) =>
              updateEdgeTransient(edge.id, { config: { timeoutMs } })
            }
            onBegin={beginTransaction}
            onCommit={commitTransaction}
          />
          <NumberField
            label="Retries"
            value={edge.config.retryCount}
            onChange={(retryCount) =>
              updateEdgeTransient(edge.id, { config: { retryCount } })
            }
            onBegin={beginTransaction}
            onCommit={commitTransaction}
          />
          <label className="check-field">
            <input
              type="checkbox"
              checked={edge.config.encrypted}
              onFocus={beginTransaction}
              onChange={(event) =>
                updateEdgeTransient(edge.id, {
                  config: { encrypted: event.target.checked },
                })
              }
              onBlur={commitTransaction}
            />
            <span>Encrypted connection</span>
          </label>
          <button
            className="danger-button"
            type="button"
            onClick={deleteSelection}
          >
            <Trash2 aria-hidden="true" size={15} /> Delete connection
          </button>
        </div>
      )}
    </aside>
  );
}
