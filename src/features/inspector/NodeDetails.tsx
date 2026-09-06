import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ArchitectureNodeV1 } from '../../domain/architecture/types';
import { componentDefinitionMap } from '../../domain/components/definitions';
import {
  getLearningTips,
  rankLearningResources,
} from '../../domain/simulation/learningTips';
import { useEditorStore } from '../canvas/editorStore';
import {
  isSimulationLocked,
  useSimulationStore,
} from '../simulation/simulationStore';

export function NodeDetails({ node }: { node: ArchitectureNodeV1 }) {
  const document = useEditorStore((state) => state.document);
  const definition = componentDefinitionMap[node.type];
  const infoOpen = useEditorStore(
    (state) => state.expandedInfoNodeId === node.id,
  );
  const closeInfoNode = useEditorStore((state) => state.closeInfoNode);
  const beginTransaction = useEditorStore((state) => state.beginTransaction);
  const commitTransaction = useEditorStore((state) => state.commitTransaction);
  const updateNodeTransient = useEditorStore(
    (state) => state.updateNodeTransient,
  );
  const metric = useSimulationStore(
    (state) => state.ticks.at(-1)?.nodes[node.id],
  );
  const simulationStatus = useSimulationStore((state) => state.status);
  const activeDiagnostic = useSimulationStore(
    (state) => state.activeDiagnostic,
  );
  const closeDiagnostic = useSimulationStore((state) => state.closeDiagnostic);
  const learningTipsEnabled = useSimulationStore(
    (state) => state.learningTipsEnabled,
  );
  const simulationLocked = isSimulationLocked(simulationStatus);
  const diagnosticOpen = activeDiagnostic?.nodeId === node.id;
  const bottleneckDiagnostics =
    metric?.diagnostics.filter((entry) => entry.category === 'bottleneck') ??
    [];
  const displayedDiagnostics =
    metric?.diagnostics.filter(
      (entry) => entry.category === activeDiagnostic?.category,
    ) ?? [];
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

  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener = window.document.activeElement;
    const panel = panelRef.current;
    panel?.querySelector<HTMLButtonElement>('button')?.focus();
    const escape = (event: KeyboardEvent) => {
      if (
        event.key !== 'Escape' ||
        window.document.querySelector('[aria-modal="true"]')
      )
        return;
      event.preventDefault();
      commitTransaction();
      closeInfoNode();
      closeDiagnostic();
    };
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('keydown', escape);
      commitTransaction();
      const shouldRestore =
        window.document.activeElement === window.document.body ||
        panel?.contains(window.document.activeElement);
      if (shouldRestore)
        window.requestAnimationFrame(() => {
          if (
            opener instanceof HTMLElement &&
            opener.isConnected &&
            window.document.activeElement === window.document.body
          )
            opener.focus();
        });
    };
  }, [closeDiagnostic, closeInfoNode, commitTransaction]);
  const commitAndClose = () => {
    commitTransaction();
    closeInfoNode();
  };
  return (
    <div ref={panelRef} className="node-details">
      {diagnosticOpen && (
        <section
          className={`diagnostic-detail diagnostic-${activeDiagnostic.category}`}
          aria-label={`${node.data.label} ${activeDiagnostic.category} details`}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <header>
            <div>
              <span>{node.data.label} / Live diagnostic</span>
              <h3>
                {activeDiagnostic.category === 'error'
                  ? 'Failing requests'
                  : 'Bottleneck details'}
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
          <div className="detail-body">
            <div className="diagnostic-list">
              {displayedDiagnostics.length === 0 && (
                <p role="status">No current findings for this category.</p>
              )}
              {displayedDiagnostics.map((entry) => (
                <article
                  key={entry.id}
                  className={`severity-${entry.severity}`}
                >
                  <strong>{entry.title}</strong>
                  <span className="severity-label">{entry.severity}</span>
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
            {learningTipsEnabled && displayedDiagnostics.length > 0 && (
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
          </div>
        </section>
      )}

      {infoOpen && (
        <section
          className="component-guide"
          aria-label={`${definition.label} information`}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <header>
            <div>
              <span>{node.data.label} / Component guide</span>
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
          <div className="detail-body">
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
          </div>
        </section>
      )}
    </div>
  );
}
