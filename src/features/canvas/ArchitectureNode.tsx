import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ArchitectureNodeV1 } from '../../domain/architecture/types';
import { componentDefinitionMap } from '../../domain/components/definitions';
import { iconMap } from '../component-library/iconMap';
import { useEditorStore } from './editorStore';
import {
  isSimulationLocked,
  useSimulationStore,
} from '../simulation/simulationStore';

export type ArchitectureFlowNode = Node<
  { architecture: ArchitectureNodeV1 },
  'architecture'
>;

export function ArchitectureNode({
  data,
  selected,
}: NodeProps<ArchitectureFlowNode>) {
  const node = data.architecture;
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
  const simulationLocked = isSimulationLocked(simulationStatus);

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
      } ${isRegion ? 'is-region' : ''} ${infoOpen ? 'has-info-open' : ''}`}
      style={{ '--node-color': definition.color } as React.CSSProperties}
      onMouseEnter={startHover}
      onMouseLeave={clearHover}
      aria-label={`${definition.label} architecture component`}
    >
      {!isNote && !isRegion && (
        <Handle type="target" position={Position.Left} />
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
        <Handle type="source" position={Position.Right} />
      )}
      {metric && (
        <div className={`node-metric-badge metric-${metric.status}`}>
          {metric.status === 'failed'
            ? 'Failed'
            : `${Math.round(metric.utilization * 100)}%`}
          {node.type === 'message-queue' && metric.backlog > 0 && (
            <span>{Math.round(metric.backlog).toLocaleString()} queued</span>
          )}
        </div>
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
