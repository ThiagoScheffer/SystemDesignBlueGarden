import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { architectureDocumentSchema } from '../../domain/architecture/schema';
import { assessProject } from '../../domain/architecture/projectAssessment';
import { simulationDefaultsForScale } from '../../domain/architecture/projectSettings';
import type { ProjectSettings } from '../../domain/architecture/types';
import { useEditorStore } from '../canvas/editorStore';

const numberValue = (value: string) =>
  value === '' ? undefined : Number(value);

export function ProjectSettingsDrawer({
  open,
  onClose,
  locked,
}: {
  open: boolean;
  onClose: () => void;
  locked: boolean;
}) {
  const document = useEditorStore((state) => state.document);
  const save = useEditorStore((state) => state.saveProjectSettings);
  const [name, setName] = useState(document.metadata.name);
  const [description, setDescription] = useState(
    document.metadata.description ?? '',
  );
  const [settings, setSettings] = useState<ProjectSettings>(() =>
    structuredClone(document.projectSettings),
  );
  const [error, setError] = useState('');

  useEffect(() => {
    const escape = (event: KeyboardEvent) =>
      event.key === 'Escape' && onClose();
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [onClose]);

  const findings = useMemo(
    () =>
      assessProject({
        ...document,
        metadata: { ...document.metadata, name, description },
        projectSettings: settings,
      }),
    [description, document, name, settings],
  );
  if (!open) return null;

  const updateDefaults = (
    field: keyof ProjectSettings['simulationDefaults'],
    value: number,
  ) =>
    setSettings((current) => ({
      ...current,
      simulationDefaults: { ...current.simulationDefaults, [field]: value },
    }));
  const updateCustom = (
    field: keyof NonNullable<ProjectSettings['customScale']>,
    value?: number,
  ) =>
    setSettings((current) => ({
      ...current,
      customScale: { ...current.customScale, [field]: value },
    }));
  const commit = () => {
    const candidate = {
      ...document,
      metadata: {
        ...document.metadata,
        name: name.trim(),
        description: description || undefined,
      },
      projectSettings: settings,
    };
    const parsed = architectureDocumentSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ?? 'Review the project settings.',
      );
      return;
    }
    save({
      name: name.trim(),
      description: description || undefined,
      projectSettings: settings,
    });
    onClose();
  };
  const showCustom =
    settings.expectedScale === 'custom' || settings.expectedUsers === 'custom';

  return (
    <div
      className="settings-overlay"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <aside
        className="settings-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-settings-title"
      >
        <header>
          <div>
            <span className="eyebrow">Project configuration</span>
            <h2 id="project-settings-title">Project Settings</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close project settings"
          >
            <X size={18} />
          </button>
        </header>
        {locked && (
          <p className="settings-lock" role="status">
            Settings are locked while a simulation is running.
          </p>
        )}
        <section>
          <h3>General</h3>
          <label>
            Project name
            <input
              value={name}
              maxLength={120}
              disabled={locked}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Description
            <textarea
              value={description}
              maxLength={300}
              disabled={locked}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className="field-help">
            <span>
              {description.length < 100
                ? 'A description of 100+ characters helps architecture matching.'
                : 'Good level of project context.'}
            </span>
            <span>{description.length}/300</span>
          </div>
        </section>
        <section id="settings-requirements">
          <h3>Requirements</h3>
          <div className="settings-grid">
            <label>
              Expected scale
              <select
                disabled={locked}
                value={settings.expectedScale}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    expectedScale: e.target
                      .value as ProjectSettings['expectedScale'],
                  })
                }
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label>
              Expected users
              <select
                disabled={locked}
                value={settings.expectedUsers}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    expectedUsers: e.target
                      .value as ProjectSettings['expectedUsers'],
                  })
                }
              >
                <option value="under-100">Under 100</option>
                <option value="100-1000">100–1,000</option>
                <option value="1000-100000">1,000–100,000</option>
                <option value="over-100000">Over 100,000</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label>
              Complexity
              <select
                disabled={locked}
                value={settings.expectedComplexity}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    expectedComplexity: e.target
                      .value as ProjectSettings['expectedComplexity'],
                  })
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="very-high">Very high</option>
              </select>
            </label>
          </div>
          {showCustom && (
            <div className="settings-grid custom-requirements">
              {(
                [
                  ['registeredUsers', 'Registered users'],
                  ['monthlyActiveUsers', 'Monthly active'],
                  ['dailyActiveUsers', 'Daily active'],
                  ['concurrentUsers', 'Concurrent users'],
                  ['requestsPerSecond', 'Requests / second'],
                  ['dailyTransactions', 'Daily transactions'],
                  ['storageGB', 'Storage (GB)'],
                  ['monthlyTrafficGB', 'Monthly traffic (GB)'],
                  ['peakTrafficMultiplier', 'Peak multiplier'],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    type="number"
                    min={key === 'peakTrafficMultiplier' ? 1 : 0}
                    step={key === 'peakTrafficMultiplier' ? 0.1 : 1}
                    disabled={locked}
                    value={settings.customScale?.[key] ?? ''}
                    onChange={(e) =>
                      updateCustom(key, numberValue(e.target.value))
                    }
                  />
                </label>
              ))}
            </div>
          )}
        </section>
        <section id="settings-simulation">
          <h3>Simulation Defaults</h3>
          <button
            className="secondary-action"
            type="button"
            disabled={locked}
            onClick={() =>
              setSettings({
                ...settings,
                simulationDefaults: simulationDefaultsForScale(settings),
              })
            }
          >
            Apply recommended defaults
          </button>
          <div className="settings-grid">
            <label>
              Initial RPS
              <input
                type="number"
                min="0"
                disabled={locked}
                value={settings.simulationDefaults.initialRps}
                onChange={(e) =>
                  updateDefaults('initialRps', Number(e.target.value))
                }
              />
            </label>
            <label>
              Peak RPS
              <input
                type="number"
                min="0"
                disabled={locked}
                value={settings.simulationDefaults.peakRps}
                onChange={(e) =>
                  updateDefaults('peakRps', Number(e.target.value))
                }
              />
            </label>
            <label>
              Ambient failure (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                disabled={locked}
                value={settings.simulationDefaults.ambientFailureRate * 100}
                onChange={(e) =>
                  updateDefaults(
                    'ambientFailureRate',
                    Number(e.target.value) / 100,
                  )
                }
              />
            </label>
            <label>
              Duration (seconds)
              <input
                type="number"
                min="1"
                max="86400"
                disabled={locked}
                value={settings.simulationDefaults.durationSeconds}
                onChange={(e) =>
                  updateDefaults('durationSeconds', Number(e.target.value))
                }
              />
            </label>
          </div>
        </section>
        <section>
          <h3>Visibility</h3>
          <label>
            Visibility
            <select
              disabled={locked}
              value={settings.visibility}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  visibility: e.target.value as ProjectSettings['visibility'],
                })
              }
            >
              <option value="private">Private</option>
              <option value="shared">Shared</option>
              <option value="public-template">Public template</option>
            </select>
          </label>
          {settings.visibility !== 'private' && (
            <p className="visibility-notice">
              This is local/exported metadata only. It does not publish the
              design or grant permissions.
            </p>
          )}
        </section>
        <section>
          <h3>Architecture recommendations</h3>
          {findings.length ? (
            <ul className="settings-findings">
              {findings.map((finding) => (
                <li key={finding.id}>
                  <strong>{finding.title}</strong>
                  <span>{finding.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No requirement-based findings for the current design.</p>
          )}
        </section>
        {error && (
          <p role="alert" className="settings-error">
            {error}
          </p>
        )}
        <footer>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary-action"
            type="button"
            disabled={locked}
            onClick={commit}
          >
            Save settings
          </button>
        </footer>
      </aside>
    </div>
  );
}
