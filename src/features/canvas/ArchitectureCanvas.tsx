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
  type NodeChange,
  type NodeMouseHandler,
  type NodeTypes,
  type ReactFlowInstance,
} from '@xyflow/react';
import { useEffect, useMemo, useState } from 'react';
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
  const [instance, setInstance] = useState<ReactFlowInstance<
    ArchitectureFlowNode,
    Edge
  > | null>(null);
  const simulationStatus = useSimulationStore((state) => state.status);
  const latestTick = useSimulationStore((state) => state.ticks.at(-1));
  const activeDiagnostic = useSimulationStore(
    (state) => state.activeDiagnostic,
  );
  const closeDiagnostic = useSimulationStore((state) => state.closeDiagnostic);
  const locked = isSimulationLocked(simulationStatus);

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
        data: { architecture: node },
        selected: selection?.kind === 'node' && selection.id === node.id,
      })),
    [document.nodes, selection],
  );

  const edges = useMemo<Edge[]>(() => {
    const diagnosticStates = computeAffectedEdgeStates(
      document.edges,
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
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label || edge.config.protocol,
        ariaLabel: `${edge.label || edge.config.protocol} connection: ${stateDescription}`,
        className: diagnosticState ? `edge-${diagnosticState}` : undefined,
        selected: selection?.kind === 'edge' && selection.id === edge.id,
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: traffic > 0,
        style: {
          strokeWidth: traffic > 0 ? 2.3 : 1.6,
          strokeDasharray:
            diagnosticState === 'affected-error'
              ? '7 4'
              : diagnosticState === 'bottleneck'
                ? '4 4'
                : undefined,
        },
      };
    });
  }, [document.edges, latestTick, selection]);

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
    if (activeDiagnostic?.nodeId !== node.id) closeDiagnostic();
    select({ kind: 'node', id: node.id });
  };
  const showNodeInfo: NodeMouseHandler<ArchitectureFlowNode> = (_, node) => {
    closeDiagnostic();
    toggleInfoNode(node.id);
  };
  const selectEdge: EdgeMouseHandler = (_, edge) =>
    select({ kind: 'edge', id: edge.id });

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
        onPaneClick={() => {
          closeDiagnostic();
          select(null);
        }}
        onConnect={connect}
        onNodeDragStart={checkpoint}
        onNodeDragStop={commitTransaction}
        nodesDraggable={!locked}
        nodesConnectable={!locked}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        minZoom={0.25}
        maxZoom={2}
        deleteKeyCode={null}
        defaultEdgeOptions={{ markerEnd: { type: MarkerType.ArrowClosed } }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) => {
            const architecture = (
              node.data as {
                architecture?: ArchitectureFlowNode['data']['architecture'];
              }
            ).architecture;
            return architecture
              ? componentDefinitionMap[architecture.type].color
              : '#64748b';
          }}
        />
        <Controls showInteractive={false} />
      </ReactFlow>
      {document.nodes.length === 0 && (
        <div className="canvas-empty" aria-hidden="true">
          <span>Start your architecture</span>
          <strong>Drag a component here</strong>
          <p>or click one in the library</p>
        </div>
      )}
    </main>
  );
}
