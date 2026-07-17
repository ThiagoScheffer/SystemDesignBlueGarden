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
import { useMemo, useState } from 'react';
import type { ComponentType } from '../../domain/architecture/types';
import { componentDefinitionMap } from '../../domain/components/definitions';
import {
  ArchitectureNode,
  type ArchitectureFlowNode,
} from './ArchitectureNode';
import { useEditorStore } from './editorStore';

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

  const edges = useMemo<Edge[]>(
    () =>
      document.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label || edge.config.protocol,
        selected: selection?.kind === 'edge' && selection.id === edge.id,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 1.6 },
      })),
    [document.edges, selection],
  );

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
    if (connection.source && connection.target) {
      addEdge(connection.source, connection.target);
    }
  };

  const selectNode: NodeMouseHandler<ArchitectureFlowNode> = (_, node) =>
    select({ kind: 'node', id: node.id });
  const showNodeInfo: NodeMouseHandler<ArchitectureFlowNode> = (_, node) =>
    toggleInfoNode(node.id);
  const selectEdge: EdgeMouseHandler = (_, edge) =>
    select({ kind: 'edge', id: edge.id });

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData(
      'application/blue-garden-component',
    ) as ComponentType;
    if (!type || !componentDefinitionMap[type] || !instance) return;
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
        onPaneClick={() => select(null)}
        onConnect={connect}
        onNodeDragStart={checkpoint}
        onNodeDragStop={commitTransaction}
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
