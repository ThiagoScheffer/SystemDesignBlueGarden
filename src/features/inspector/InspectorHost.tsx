import { useEditorStore } from '../canvas/editorStore';
import { useSimulationStore } from '../simulation/simulationStore';
import { Inspector } from './Inspector';
import { NodeDetails } from './NodeDetails';
import { usePresentationStore } from '../../app/presentationStore';

export function InspectorHost() {
  const document = useEditorStore((state) => state.document);
  const infoNodeId = useEditorStore((state) => state.expandedInfoNodeId);
  const diagnostic = useSimulationStore((state) => state.activeDiagnostic);
  const detailNode = document.nodes.find(
    (node) => node.id === (diagnostic?.nodeId ?? infoNodeId),
  );
  return (
    <div className="inspector-host" id="inspector-panel">
      <div className="panel-hide-bar">
        <button
          type="button"
          className="button-compact"
          aria-label="Hide Inspector"
          onClick={() => {
            usePresentationStore.getState().togglePanel('inspector');
            window.document.getElementById('inspector-toggle')?.focus();
          }}
        >
          Hide Inspector
        </button>
      </div>
      {/* Keep inspector mode and scroll position while details temporarily replace it. */}
      <div className="inspector-content" hidden={!!detailNode}>
        <Inspector />
      </div>
      {detailNode && (
        <NodeDetails
          key={`${detailNode.id}-${diagnostic?.category ?? 'guide'}`}
          node={detailNode}
        />
      )}
    </div>
  );
}
