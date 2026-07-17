import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ComponentType } from '../../domain/architecture/types';
import { componentDefinitions } from '../../domain/components/definitions';
import { useEditorStore } from '../canvas/editorStore';
import { iconMap } from './iconMap';
import {
  isSimulationLocked,
  useSimulationStore,
} from '../simulation/simulationStore';

const categories = [
  'Client & edge',
  'Compute',
  'Data',
  'Messaging',
  'Operations',
  'Structure',
] as const;

export function ComponentPalette() {
  const [query, setQuery] = useState('');
  const addNode = useEditorStore((state) => state.addNode);
  const status = useSimulationStore((state) => state.status);
  const locked = isSimulationLocked(status);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return componentDefinitions;
    return componentDefinitions.filter(
      (definition) =>
        definition.label.toLowerCase().includes(normalized) ||
        definition.description.toLowerCase().includes(normalized),
    );
  }, [query]);

  const startDrag = (
    event: React.DragEvent<HTMLButtonElement>,
    type: ComponentType,
  ) => {
    event.dataTransfer.setData('application/blue-garden-component', type);
    event.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className="palette panel" aria-label="Component library">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Build</span>
          <h2>Components</h2>
        </div>
        <span className="count-badge">{componentDefinitions.length}</span>
      </div>
      <label className="search-field">
        <Search aria-hidden="true" size={15} />
        <span className="sr-only">Search components</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search components"
        />
      </label>
      <div className="palette-scroll">
        {categories.map((category) => {
          const definitions = filtered.filter(
            (definition) => definition.category === category,
          );
          if (definitions.length === 0) return null;
          return (
            <section key={category} className="component-group">
              <h3>{category}</h3>
              <div className="component-list">
                {definitions.map((definition) => {
                  const Icon = iconMap[definition.icon];
                  return (
                    <button
                      type="button"
                      className="component-item"
                      key={definition.type}
                      draggable
                      disabled={locked}
                      onDragStart={(event) => startDrag(event, definition.type)}
                      onClick={() => addNode(definition.type)}
                      title={definition.description}
                    >
                      <span
                        className="component-icon"
                        style={
                          {
                            '--component-color': definition.color,
                          } as React.CSSProperties
                        }
                      >
                        <Icon aria-hidden="true" size={17} />
                      </span>
                      <span>{definition.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
        {filtered.length === 0 && (
          <p className="empty-copy">No matching components.</p>
        )}
      </div>
    </aside>
  );
}
