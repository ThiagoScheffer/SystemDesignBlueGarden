import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { AlertTriangle, Gauge, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ArchitectureNodeV1 } from '../../domain/architecture/types';
import { componentDefinitionMap } from '../../domain/components/definitions';
import {
  getLearningTips,
  rankLearningResources,
} from '../../domain/simulation/learningTips';
import { iconMap } from '../component-library/iconMap';
import { useEditorStore } from './editorStore';
import {
  isSimulationLocked,
  useSimulationStore,
} from '../simulation/simulationStore';

export type ArchitectureFlowNode = Node<
  {
    architecture: ArchitectureNodeV1;
    onPortContextMenu?: (
      event: React.MouseEvent,
      nodeId: string,
      port: 'source' | 'target',
    ) => void;
  },
  'architecture'
>;

export function ArchitectureNode({
  data,
  selected,
}: NodeProps<ArchitectureFlowNode>) {
  const node = data.architecture;
  const document = useEditorStore((state) => state.document);
  const definition = componentDefinitionMap[node.type];
  const Icon = iconMap[definition.icon];
  const isNote = node.type === 'note';
  const isRegion = node.type === 'region';
  const expandedInfoNodeId = useEditorStore(
    (state) => state.expandedInfoNodeId,
  );
  const closeInfoNode = useEditorStore((state) => state.closeInfoNode);
  const beginTransaction = useEditorStore((state) => state.beginTransaction);
  const commitTransaction = useEditorStore((state) => state.commitTransaction);
  const updateNodeTransient = useEditorStore(
    (state) => state.updateNodeTransient,
  );
  const [showTooltip, setShowTooltip] = useState(false);
  const hoverTimer = useRef<number | null>(null);
  const infoOpen = expandedInfoNodeId === node.id;
  const metric = useSimulationStore(
    (state) => state.ticks.at(-1)?.nodes[node.id],
  );
  const simulationStatus = useSimulationStore((state) => state.status);
  const activeDiagnostic = useSimulationStore(
    (state) => state.activeDiagnostic,
  );
  const toggleDiagnostic = useSimulationStore(
    (state) => state.toggleDiagnostic,
  );
  const closeDiagnostic = useSimulationStore((state) => state.closeDiagnostic);
  const learningTipsEnabled = useSimulationStore(
    (state) => state.learningTipsEnabled,
  );
  const simulationLocked = isSimulationLocked(simulationStatus);
  const diagnosticOpen = activeDiagnostic?.nodeId === node.id;
  const errorDiagnostics =
    metric?.diagnostics.filter((entry) => entry.category === 'error') ?? [];
  const bottleneckDiagnostics =
    metric?.diagnostics.filter((entry) => entry.category === 'bottleneck') ??
    [];
  const displayedDiagnostics =
    activeDiagnostic?.category === 'error'
      ? errorDiagnostics
      : bottleneckDiagnostics;
  const criticalBottleneck = bottleneckDiagnostics.some(
    (entry) => entry.severity === 'critical',
  );
  const likelyCauses =
    activeDiagnostic?.category === 'error'
      ? bottleneckDiagnostics.filter(
          (entry) =>
            entry.code === 'capacity-saturation' ||
            entry.code === 'queue-growth',
        )
      : [];
  const contextualTips = getLearningTips(displayedDiagnostics);
  const learningResourcesForNode = rankLearningResources(
    document,
    node,
    displayedDiagnostics,
  );

  const clearHover = () => {
    if (hoverTimer.current !== null) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setShowTooltip(false);
  };

  useEffect(
    () => () => {
      if (hoverTimer.current !== null) {
        window.clearTimeout(hoverTimer.current);
      }
    },
    [],
  );
  useEffect(() => {
    if (!infoOpen) return;
    const timeout = window.setTimeout(() => {
      if (hoverTimer.current !== null) {
        window.clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }
      setShowTooltip(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [infoOpen]);
  useEffect(() => {
    if (!diagnosticOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDiagnostic();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [closeDiagnostic, diagnosticOpen]);
  useEffect(() => {
    if (diagnosticOpen && displayedDiagnostics.length === 0) closeDiagnostic();
  }, [closeDiagnostic, diagnosticOpen, displayedDiagnostics.length]);

  const startHover = () => {
    if (infoOpen) return;
    hoverTimer.current = window.setTimeout(() => {
      setShowTooltip(true);
      hoverTimer.current = null;
    }, 1000);
  };

  const commitAndClose = () => {
    commitTransaction();
    closeInfoNode();
  };

  return (
    <div
      className={`architecture-node ${selected ? 'is-selected' : ''} ${
        isNote ? 'is-note' : ''
      } ${isRegion ? 'is-region' : ''} ${infoOpen || diagnosticOpen ? 'has-info-open' : ''} ${
        criticalBottleneck ? 'has-critical-bottleneck' : ''
      }`}
      style={{ '--node-color': definition.color } as React.CSSProperties}
      onMouseEnter={startHover}
      onMouseLeave={clearHover}
      aria-label={`${definition.label} architecture component`}
    >
      {!isNote && !isRegion && (
        <Handle
          type="target"
          position={Position.Left}
          onContextMenu={(event) =>
            data.onPortContextMenu?.(event, node.id, 'target')
          }
        />
      )}
      <div className="architecture-node-icon">
        <Icon aria-hidden="true" size={18} />
      </div>
      <div className="architecture-node-copy">
        <strong>{node.data.label}</strong>
        <span>
          {isNote
            ? node.data.config.noteType
            : `${node.data.config.capacity.toLocaleString()} req/s`}
        </span>
      </div>
      {!isNote && !isRegion && (
        <Handle
          type="source"
          position={Position.Right}
          onContextMenu={(event) =>
            data.onPortContextMenu?.(event, node.id, 'source')
          }
        />
      )}
      {metric && (
        <div className={`node-metric-badge metric-${metric.status}`}>
          {metric.status === 'failed'
            ? 'Failed'
            : metric.loadRatio === null
              ? 'Unavailable'
              : `${Math.round(metric.loadRatio * 100).toLocaleString()}%`}
          <span>
            · P95 {Math.round(metric.p95LatencyMs).toLocaleString()} ms
          </span>
          {node.type === 'message-queue' && metric.backlog > 0 && (
            <span>{Math.round(metric.backlog).toLocaleString()} queued</span>
          )}
        </div>
      )}

      {metric &&
        (errorDiagnostics.length > 0 || bottleneckDiagnostics.length > 0) && (
          <div className="node-diagnostic-signals nodrag nopan">
            {errorDiagnostics.length > 0 && (
              <button
                type="button"
                className="diagnostic-signal signal-error"
                aria-label={`Show ${node.data.label} failing requests`}
                aria-expanded={
                  diagnosticOpen && activeDiagnostic?.category === 'error'
                }
                onClick={(event) => {
                  event.stopPropagation();
                  closeInfoNode();
                  toggleDiagnostic(node.id, 'error');
                }}
              >
                <AlertTriangle aria-hidden="true" size={10} /> ERROR
              </button>
            )}
            {bottleneckDiagnostics.length > 0 && (
              <button
                type="button"
                className="diagnostic-signal signal-bottleneck"
                aria-label={`Show ${node.data.label} bottleneck details`}
                aria-expanded={
                  diagnosticOpen && activeDiagnostic?.category === 'bottleneck'
                }
                onClick={(event) => {
                  event.stopPropagation();
                  closeInfoNode();
                  toggleDiagnostic(node.id, 'bottleneck');
                }}
              >
                <Gauge aria-hidden="true" size={10} /> BOTTLENECK
              </button>
            )}
          </div>
        )}

      {diagnosticOpen && displayedDiagnostics.length > 0 && (
        <section
          className={`node-diagnostic-popover nodrag nopan nowheel diagnostic-${activeDiagnostic.category}`}
          aria-label={`${node.data.label} ${activeDiagnostic.category} details`}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <header>
            <div>
              <span>Live diagnostic</span>
              <h3>
                {activeDiagnostic.category === 'error'
                  ? 'FAILING REQUESTS'
                  : 'BOTTLENECK DETAILS'}
              </h3>
            </div>
            <button
              type="button"
              aria-label="Close diagnostic details"
              onClick={closeDiagnostic}
            >
              <X aria-hidden="true" size={15} />
            </button>
          </header>
          <div className="diagnostic-list">
            {displayedDiagnostics.map((entry) => (
              <article key={entry.id} className={`severity-${entry.severity}`}>
                <strong>{entry.title}</strong>
                <p>{entry.explanation}</p>
                {entry.affectedRps > 0 && (
                  <small>
                    {entry.affectedRps.toLocaleString(undefined, {
                      maximumFractionDigits: 1,
                    })}{' '}
                    affected req/s
                  </small>
                )}
              </article>
            ))}
          </div>
          {likelyCauses.length > 0 && (
            <div className="diagnostic-likely-cause">
              <span>Likely cause</span>
              {likelyCauses.map((entry) => (
                <p key={entry.id}>
                  <strong>{entry.title}:</strong> {entry.explanation}
                </p>
              ))}
            </div>
          )}
          {learningTipsEnabled && (
            <div className="diagnostic-learning">
              <span>Suggested corrections</span>
              {contextualTips.map((tip) => (
                <div key={tip.topic}>
                  <p>{tip.summary}</p>
                  <ul>
                    {tip.actions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="diagnostic-resources">
                {learningResourcesForNode.map((resource) => (
                  <a
                    key={resource.id}
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Study: {resource.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {showTooltip && !infoOpen && (
        <div className="node-tooltip" role="tooltip">
          <strong>{definition.label}</strong>
          <p>{definition.education.summary}</p>
          <span>Example</span>
          <p>{definition.education.example}</p>
          <small>Double-click for details</small>
        </div>
      )}

      {infoOpen && (
        <section
          className="node-info-card nodrag nopan nowheel"
          aria-label={`${definition.label} information`}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <header>
            <div>
              <span>Component guide</span>
              <h3>{definition.label}</h3>
            </div>
            <button
              type="button"
              aria-label="Close component information"
              onClick={commitAndClose}
            >
              <X aria-hidden="true" size={15} />
            </button>
          </header>
          <p>{definition.education.summary}</p>
          <div className="node-info-example">
            <span>Example</span>
            <p>{definition.education.example}</p>
          </div>

          {node.type === 'cache' && (
            <label className="node-info-slider">
              <span>
                Cache hit rate{' '}
                <strong>{node.data.config.hitRatePercent}%</strong>
              </span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={node.data.config.hitRatePercent ?? 80}
                disabled={simulationLocked}
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

          <label className="node-info-notes">
            <span>Implementation notes</span>
            <textarea
              rows={4}
              placeholder="Add decisions, constraints, or implementation details…"
              value={node.data.implementationNotes ?? ''}
              disabled={simulationLocked}
              onFocus={beginTransaction}
              onChange={(event) =>
                updateNodeTransient(node.id, {
                  implementationNotes: event.target.value,
                })
              }
              onBlur={commitTransaction}
            />
          </label>
        </section>
      )}
    </div>
  );
}
