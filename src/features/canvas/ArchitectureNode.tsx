import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { AlertTriangle, Gauge } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ArchitectureNodeV1 } from '../../domain/architecture/types';
import { componentDefinitionMap } from '../../domain/components/definitions';
import { iconMap } from '../component-library/iconMap';
import { useEditorStore } from './editorStore';
import { useSimulationStore } from '../simulation/simulationStore';

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
  const definition = componentDefinitionMap[node.type];
  const Icon = iconMap[definition.icon];
  const isNote = node.type === 'note';
  const isRegion = node.type === 'region';
  const expandedInfoNodeId = useEditorStore(
    (state) => state.expandedInfoNodeId,
  );
  const closeInfoNode = useEditorStore((state) => state.closeInfoNode);
  const [showTooltip, setShowTooltip] = useState(false);
  const hoverTimer = useRef<number | null>(null);
  const infoOpen = expandedInfoNodeId === node.id;
  const metric = useSimulationStore(
    (state) => state.ticks.at(-1)?.nodes[node.id],
  );
  const activeDiagnostic = useSimulationStore(
    (state) => state.activeDiagnostic,
  );
  const toggleDiagnostic = useSimulationStore(
    (state) => state.toggleDiagnostic,
  );
  const diagnosticOpen = activeDiagnostic?.nodeId === node.id;
  const errorDiagnostics =
    metric?.diagnostics.filter((entry) => entry.category === 'error') ?? [];
  const bottleneckDiagnostics =
    metric?.diagnostics.filter((entry) => entry.category === 'bottleneck') ??
    [];
  const criticalBottleneck = bottleneckDiagnostics.some(
    (entry) => entry.severity === 'critical',
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
  const startHover = () => {
    if (infoOpen || diagnosticOpen) return;
    hoverTimer.current = window.setTimeout(() => {
      setShowTooltip(true);
      hoverTimer.current = null;
    }, 1000);
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
          {node.type === 'cache' && metric.cacheOriginRps !== undefined && (
            <span>
              {Math.round(metric.cacheOriginRps).toLocaleString()} origin req/s
            </span>
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
                  useEditorStore
                    .getState()
                    .select({ kind: 'node', id: node.id });
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
                  useEditorStore
                    .getState()
                    .select({ kind: 'node', id: node.id });
                  toggleDiagnostic(node.id, 'bottleneck');
                }}
              >
                <Gauge aria-hidden="true" size={10} /> BOTTLENECK
              </button>
            )}
          </div>
        )}

      {showTooltip && !infoOpen && !diagnosticOpen && (
        <div className="node-tooltip" role="tooltip">
          <strong>{definition.label}</strong>
          <p>{definition.education.summary}</p>
          <span>Example</span>
          <p>{definition.education.example}</p>
          <small>Double-click for details</small>
        </div>
      )}
    </div>
  );
}
