import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeMouseHandler,
  type FinalConnectionState,
  type NodeChange,
  type NodeMouseHandler,
  type NodeTypes,
  type ReactFlowInstance,
} from '@xyflow/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from '../../domain/architecture/types';
import { componentDefinitionMap } from '../../domain/components/definitions';
import { computeAffectedEdgeStates } from '../../domain/simulation/diagnostics';
import {
  ArchitectureNode,
  type ArchitectureFlowNode,
} from './ArchitectureNode';
import { useEditorStore } from './editorStore';
import {
  isSimulationLocked,
  useSimulationStore,
} from '../simulation/simulationStore';

const nodeTypes: NodeTypes = { architecture: ArchitectureNode };

export function ArchitectureCanvas() {
  const document = useEditorStore((state) => state.document);
  const selection = useEditorStore((state) => state.selection);
  const addNode = useEditorStore((state) => state.addNode);
  const addEdge = useEditorStore((state) => state.addEdge);
  const select = useEditorStore((state) => state.select);
  const checkpoint = useEditorStore((state) => state.checkpoint);
  const commitTransaction = useEditorStore((state) => state.commitTransaction);
  const toggleInfoNode = useEditorStore((state) => state.toggleInfoNode);
  const updateNodePosition = useEditorStore(
    (state) => state.updateNodePosition,
  );
  const deleteEdge = useEditorStore((state) => state.deleteEdge);
  const deleteEdges = useEditorStore((state) => state.deleteEdges);
  const reverseEdge = useEditorStore((state) => state.reverseEdge);
  const duplicateEdge = useEditorStore((state) => state.duplicateEdge);
  const reconnectArchitectureEdge = useEditorStore(
    (state) => state.reconnectEdge,
  );
  const toggleEdgeDisabled = useEditorStore(
    (state) => state.toggleEdgeDisabled,
  );
  const toggleEdgeMonitored = useEditorStore(
    (state) => state.toggleEdgeMonitored,
  );
  const updateEdge = useEditorStore((state) => state.updateEdge);
  const [menu, setMenu] = useState<
    | null
    | { kind: 'edge'; edgeId: string; x: number; y: number }
    | {
        kind: 'port';
        nodeId: string;
        port: 'source' | 'target';
        x: number;
        y: number;
      }
  >(null);
  const [confirmIds, setConfirmIds] = useState<string[]>([]);
  const [labelDraft, setLabelDraft] = useState('');
  const reconnectSucceeded = useRef(false);
  const [instance, setInstance] = useState<ReactFlowInstance<
    ArchitectureFlowNode,
    Edge
  > | null>(null);
  const simulationStatus = useSimulationStore((state) => state.status);
  const [mapExpanded, setMapExpanded] = useState<boolean | null>(null);
  const showMap =
    mapExpanded ??
    (simulationStatus === 'idle' || simulationStatus === 'preflight');
  const latestTick = useSimulationStore((state) => state.ticks.at(-1));
  const activeDiagnostic = useSimulationStore(
    (state) => state.activeDiagnostic,
  );
  const closeDiagnostic = useSimulationStore((state) => state.closeDiagnostic);
  const locked = isSimulationLocked(simulationStatus);

  useEffect(() => {
    const close = (event: KeyboardEvent) =>
      event.key === 'Escape' && (setMenu(null), setConfirmIds([]));
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setMenu(null);
      setConfirmIds([]);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [document.id, simulationStatus]);
  useEffect(() => {
    if (!menu) return;
    const valid =
      menu.kind === 'edge'
        ? document.edges.some((edge) => edge.id === menu.edgeId)
        : document.nodes.some((node) => node.id === menu.nodeId);
    if (!valid) {
      const timeout = window.setTimeout(() => setMenu(null), 0);
      return () => window.clearTimeout(timeout);
    }
  }, [document.edges, document.nodes, menu]);

  const openPortMenu = (
    event: React.MouseEvent,
    nodeId: string,
    port: 'source' | 'target',
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({
      kind: 'port',
      nodeId,
      port,
      x: Math.min(event.clientX, window.innerWidth - 280),
      y: Math.min(event.clientY, window.innerHeight - 320),
    });
  };

  useEffect(() => {
    if (
      activeDiagnostic &&
      !document.nodes.some((node) => node.id === activeDiagnostic.nodeId)
    ) {
      closeDiagnostic();
    }
  }, [activeDiagnostic, closeDiagnostic, document.nodes]);

  const nodes = useMemo<ArchitectureFlowNode[]>(
    () =>
      document.nodes.map((node) => ({
        id: node.id,
        type: 'architecture',
        position: node.position,
        initialWidth: node.type === 'region' ? 190 : 158,
        initialHeight: 58,
        data: { architecture: node, onPortContextMenu: openPortMenu },
        selected: selection?.kind === 'node' && selection.id === node.id,
      })),
    [document.nodes, selection],
  );

  const edges = useMemo<Edge[]>(() => {
    const diagnosticStates = computeAffectedEdgeStates(
      document.edges.filter((edge) => !edge.config.disabled),
      latestTick,
    );
    return document.edges.map((edge) => {
      const diagnosticState = diagnosticStates[edge.id];
      const traffic = latestTick?.edges[edge.id]?.transferredRps ?? 0;
      const stateDescription =
        diagnosticState === 'error'
          ? 'direct request failures'
          : diagnosticState === 'affected-error'
            ? 'path affected by downstream failures'
            : diagnosticState === 'bottleneck'
              ? 'path affected by a bottleneck'
              : 'normal path';
      const parallels = document.edges.filter(
        (candidate) =>
          candidate.source === edge.source && candidate.target === edge.target,
      );
      const parallelIndex = parallels.findIndex(
        (candidate) => candidate.id === edge.id,
      );
      const stateLabels = [
        edge.config.disabled && 'Disabled',
        edge.config.monitored && 'Monitored',
      ].filter(Boolean);
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: [edge.label || edge.config.protocol, ...stateLabels].join(' · '),
        ariaLabel: `${edge.label || edge.config.protocol} connection: ${stateDescription}`,
        className: [
          diagnosticState && `edge-${diagnosticState}`,
          edge.config.disabled && 'edge-disabled',
          edge.config.monitored && 'edge-monitored',
        ]
          .filter(Boolean)
          .join(' '),
        selected: selection?.kind === 'edge' && selection.id === edge.id,
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: !edge.config.disabled && traffic > 0,
        reconnectable: !locked,
        pathOptions: { curvature: 0.25 + parallelIndex * 0.18 },
        style: {
          strokeWidth: traffic > 0 ? 2.3 : 1.6,
          opacity: edge.config.disabled ? 0.42 : 1,
          strokeDasharray: edge.config.disabled
            ? '8 6'
            : diagnosticState === 'affected-error'
              ? '7 4'
              : diagnosticState === 'bottleneck'
                ? '4 4'
                : undefined,
        },
      };
    });
  }, [document.edges, latestTick, locked, selection]);

  const handleNodeChanges = (changes: NodeChange<ArchitectureFlowNode>[]) => {
    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        updateNodePosition(change.id, change.position);
      }
      if (change.type === 'select' && change.selected) {
        select({ kind: 'node', id: change.id });
      }
    }
  };

  const connect = (connection: Connection) => {
    if (locked) return;
    if (connection.source && connection.target) {
      addEdge(connection.source, connection.target);
    }
  };

  const selectNode: NodeMouseHandler<ArchitectureFlowNode> = (_, node) => {
    closeDiagnostic();
    useEditorStore.getState().commitTransaction();
    useEditorStore.getState().closeInfoNode();
    select({ kind: 'node', id: node.id });
  };
  const showNodeInfo: NodeMouseHandler<ArchitectureFlowNode> = (_, node) => {
    closeDiagnostic();
    toggleInfoNode(node.id);
  };
  const selectEdge: EdgeMouseHandler = (_, edge) => {
    closeDiagnostic();
    select({ kind: 'edge', id: edge.id });
  };
  const contextEdge: EdgeMouseHandler = (event, edge) => {
    event.preventDefault();
    setLabelDraft(
      document.edges.find((candidate) => candidate.id === edge.id)?.label ?? '',
    );
    setMenu({
      kind: 'edge',
      edgeId: edge.id,
      x: Math.min(event.clientX, window.innerWidth - 270),
      y: Math.min(event.clientY, window.innerHeight - 390),
    });
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData(
      'application/blue-garden-component',
    ) as ComponentType;
    if (locked || !type || !componentDefinitionMap[type] || !instance) return;
    addNode(
      type,
      instance.screenToFlowPosition({ x: event.clientX, y: event.clientY }),
    );
  };

  return (
    <main
      className="canvas-shell"
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={handleDrop}
      aria-label="Architecture canvas"
    >
      <ReactFlow<ArchitectureFlowNode, Edge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={setInstance}
        onNodesChange={handleNodeChanges}
        onNodeClick={selectNode}
        onNodeDoubleClick={showNodeInfo}
        onEdgeClick={selectEdge}
        onEdgeContextMenu={contextEdge}
        onPaneClick={() => {
          closeDiagnostic();
          select(null);
        }}
        onConnect={connect}
        onReconnectStart={() => {
          reconnectSucceeded.current = false;
        }}
        onReconnect={(oldEdge, connection) => {
          reconnectSucceeded.current = true;
          reconnectArchitectureEdge(
            oldEdge.id,
            connection.source,
            connection.target,
          );
        }}
        onReconnectEnd={(
          _event,
          edge,
          _handle,
          state: FinalConnectionState,
        ) => {
          if (!reconnectSucceeded.current && !state.isValid)
            deleteEdge(edge.id);
        }}
        onNodeDragStart={checkpoint}
        onNodeDragStop={commitTransaction}
        nodesDraggable={!locked}
        nodesConnectable={!locked}
        edgesReconnectable={!locked}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        minZoom={0.25}
        maxZoom={2}
        deleteKeyCode={null}
        defaultEdgeOptions={{ markerEnd: { type: MarkerType.ArrowClosed } }}
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} />
        {showMap && (
          <MiniMap<ArchitectureFlowNode>
            pannable
            zoomable
            ariaLabel="Architecture overview map"
            bgColor="#0c1714"
            maskColor="rgba(7, 16, 14, 0.22)"
            maskStrokeColor="#466057"
            maskStrokeWidth={1.5}
            nodeColor={(node) =>
              componentDefinitionMap[node.data.architecture.type].color
            }
            nodeStrokeColor="#d9e3df"
            nodeStrokeWidth={1.5}
            nodeBorderRadius={3}
          />
        )}
        <Controls showInteractive={false} fitViewOptions={{ padding: 0.3 }} />
      </ReactFlow>
      <button
        className="map-toggle"
        type="button"
        aria-expanded={showMap}
        onClick={() => setMapExpanded(!showMap)}
      >
        {showMap ? 'Hide map' : 'Show map'}
      </button>
      {document.nodes.length === 0 && (
        <div className="canvas-empty" aria-hidden="true">
          <span>Start your architecture</span>
          <strong>Drag a component here</strong>
          <p>or click one in the library</p>
        </div>
      )}
      {menu && (
        <div className="canvas-menu-backdrop" onMouseDown={() => setMenu(null)}>
          <div
            className="canvas-context-menu"
            role="menu"
            style={{ left: menu.x, top: menu.y }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {menu.kind === 'edge'
              ? (() => {
                  const edge = document.edges.find(
                    (candidate) => candidate.id === menu.edgeId,
                  );
                  if (!edge) return null;
                  return (
                    <>
                      <h3>Connection</h3>
                      <button
                        role="menuitem"
                        onClick={() => {
                          select({ kind: 'edge', id: edge.id });
                          setMenu(null);
                        }}
                      >
                        Edit connection
                      </button>
                      <button
                        role="menuitem"
                        disabled={locked}
                        onClick={() => {
                          reverseEdge(edge.id);
                          setMenu(null);
                        }}
                      >
                        Reverse direction
                      </button>
                      <button
                        role="menuitem"
                        disabled={locked}
                        onClick={() => {
                          duplicateEdge(edge.id);
                          setMenu(null);
                        }}
                      >
                        Duplicate connection
                      </button>
                      <label>
                        Label
                        <input
                          autoFocus
                          value={labelDraft}
                          disabled={locked}
                          onChange={(event) =>
                            setLabelDraft(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              updateEdge(edge.id, { label: labelDraft });
                              setMenu(null);
                            }
                            if (event.key === 'Escape') setMenu(null);
                          }}
                        />
                      </label>
                      <button
                        role="menuitem"
                        disabled={locked}
                        onClick={() => {
                          toggleEdgeMonitored(edge.id);
                          setMenu(null);
                        }}
                      >
                        {edge.config.monitored
                          ? 'Remove monitoring'
                          : 'Add monitoring'}
                      </button>
                      <button
                        role="menuitem"
                        disabled={locked}
                        onClick={() => {
                          toggleEdgeDisabled(edge.id);
                          setMenu(null);
                        }}
                      >
                        {edge.config.disabled
                          ? 'Enable connection'
                          : 'Disable connection'}
                      </button>
                      <button
                        className="danger-menu-item"
                        role="menuitem"
                        disabled={locked}
                        onClick={() => {
                          deleteEdge(edge.id);
                          setMenu(null);
                        }}
                      >
                        Remove connection
                      </button>
                    </>
                  );
                })()
              : (() => {
                  const attached = document.edges.filter((edge) =>
                    menu.port === 'source'
                      ? edge.source === menu.nodeId
                      : edge.target === menu.nodeId,
                  );
                  return (
                    <>
                      <h3>Connection Point</h3>
                      {attached.length === 0 && (
                        <p>No connections on this port.</p>
                      )}
                      {attached.map((edge) => {
                        const source =
                          document.nodes.find((node) => node.id === edge.source)
                            ?.data.label ?? edge.source;
                        const target =
                          document.nodes.find((node) => node.id === edge.target)
                            ?.data.label ?? edge.target;
                        return (
                          <div className="port-edge-row" key={edge.id}>
                            <button
                              role="menuitem"
                              onClick={() => {
                                select({ kind: 'edge', id: edge.id });
                                setMenu(null);
                              }}
                            >
                              {source} → {target}
                            </button>
                            <button
                              aria-label={`Disconnect ${source} to ${target}`}
                              disabled={locked}
                              onClick={() => {
                                deleteEdge(edge.id);
                                setMenu(null);
                              }}
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                      {attached.length > 1 && (
                        <button
                          className="danger-menu-item"
                          disabled={locked}
                          onClick={() => {
                            setConfirmIds(attached.map((edge) => edge.id));
                            setMenu(null);
                          }}
                        >
                          Disconnect all ({attached.length})
                        </button>
                      )}
                      <button onClick={() => setMenu(null)}>Cancel</button>
                    </>
                  );
                })()}
          </div>
        </div>
      )}
      {confirmIds.length > 0 && (
        <div className="confirm-backdrop">
          <div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="disconnect-title"
          >
            <h2 id="disconnect-title">
              Disconnect {confirmIds.length} connections?
            </h2>
            <p>
              This removes every connection attached to this port. You can undo
              the operation.
            </p>
            <div>
              <button onClick={() => setConfirmIds([])}>Cancel</button>
              <button
                className="danger-action"
                disabled={locked}
                onClick={() => {
                  deleteEdges(confirmIds);
                  setConfirmIds([]);
                }}
              >
                Disconnect all
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
