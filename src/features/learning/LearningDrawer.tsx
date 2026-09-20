import { AlertTriangle, Calculator, FlaskConical, X } from 'lucide-react';
import {
  calculateCapacity,
  validateWorksheet,
} from '../../domain/learning/worksheet';
import type { CapacityWorksheet } from '../../domain/learning/types';
import type { useLearningController } from './useLearningController';
import { useLearningStore } from './learningStore';
import {
  isSimulationLocked,
  useSimulationStore,
} from '../simulation/simulationStore';
import { LearningRunComparison } from './LearningRunComparison';

type Controller = ReturnType<typeof useLearningController>;
const worksheetFields: Array<[keyof CapacityWorksheet, string, number]> = [
  ['activeUsers', 'Daily active users', 1],
  ['actionsPerUserPerDay', 'Actions per user/day', 1],
  ['readPercent', 'Read traffic (%)', 1],
  ['averagePayloadKB', 'Average payload (KB)', 0.1],
  ['storedRecordBytes', 'Stored record size (bytes per write)', 1],
  ['retentionDays', 'Retention (days)', 1],
  ['replicationFactor', 'Replication factor', 1],
  ['peakMultiplier', 'Peak multiplier', 0.1],
];

export function LearningDrawer({ controller }: { controller: Controller }) {
  const open = useLearningStore((state) => state.drawerOpen);
  const attempt = useLearningStore((state) => state.activeAttempt);
  const error = useLearningStore((state) => state.error);
  const comparisonRunning = useLearningStore(
    (state) => state.comparisonRunning,
  );
  const setOpen = useLearningStore((state) => state.setDrawerOpen);
  const setError = useLearningStore((state) => state.setError);
  const simulationStatus = useSimulationStore((state) => state.status);
  if (!open || !attempt) return null;
  const challenge = attempt.challengeSnapshot;
  const estimate = calculateCapacity(attempt.worksheet);
  const worksheetErrors = validateWorksheet(attempt.worksheet);
  const locked =
    isSimulationLocked(simulationStatus) || attempt.status !== 'in-progress';
  return (
    <aside
      className="learning-drawer"
      aria-label={`${challenge.title} learning workspace`}
    >
      <header>
        <div>
          <span className="eyebrow">{attempt.mode} challenge</span>
          <h2>{challenge.title}</h2>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close learning workspace"
        >
          <X size={17} />
        </button>
      </header>
      {error && (
        <div className="learning-error" role="alert">
          <AlertTriangle size={14} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      <section>
        <h3>Problem brief</h3>
        <p>{challenge.prompt}</p>
        <div className="concept-tags">
          {challenge.concepts.map((concept) => (
            <span key={concept}>{concept}</span>
          ))}
        </div>
      </section>
      {attempt.mode === 'guided' && (
        <section>
          <h3>Guided workflow</h3>
          <div className="guided-steps">
            {challenge.guidedSteps.map((step) => (
              <label key={step.id}>
                <input
                  type="checkbox"
                  disabled={locked}
                  checked={attempt.completedStepIds.includes(step.id)}
                  onChange={() => controller.toggleStep(step.id)}
                />
                <span>
                  <strong>{step.label}</strong>
                  <small>{step.hint}</small>
                </span>
              </label>
            ))}
          </div>
        </section>
      )}
      <section className="challenge-requirements">
        <h3>Requirements</h3>
        <strong>Suggested functional scope</strong>
        <ul>
          {challenge.functionalRequirements.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <strong>Suggested quality goals</strong>
        <ul>
          {challenge.nonFunctionalRequirements.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="learning-answer-fields">
        <h3>Your reasoning</h3>
        <label>
          Clarifying questions
          <textarea
            disabled={locked}
            rows={3}
            value={attempt.answers.clarifyingQuestions}
            onChange={(event) =>
              controller.updateAnswer('clarifyingQuestions', event.target.value)
            }
          />
        </label>
        <label>
          Functional requirements
          <textarea
            disabled={locked}
            rows={3}
            value={attempt.answers.functionalRequirements}
            onChange={(event) =>
              controller.updateAnswer(
                'functionalRequirements',
                event.target.value,
              )
            }
          />
        </label>
        <label>
          Non-functional requirements
          <textarea
            disabled={locked}
            rows={3}
            value={attempt.answers.nonFunctionalRequirements}
            onChange={(event) =>
              controller.updateAnswer(
                'nonFunctionalRequirements',
                event.target.value,
              )
            }
          />
        </label>
        <label>
          Data model and API decisions
          <textarea
            disabled={locked}
            rows={4}
            value={attempt.answers.dataAndApiDecisions}
            onChange={(event) =>
              controller.updateAnswer('dataAndApiDecisions', event.target.value)
            }
          />
        </label>
        <label>
          Bottlenecks and trade-offs
          <textarea
            disabled={locked}
            rows={4}
            value={attempt.answers.bottlenecksAndTradeoffs}
            onChange={(event) =>
              controller.updateAnswer(
                'bottlenecksAndTradeoffs',
                event.target.value,
              )
            }
          />
        </label>
      </section>
      <section>
        <h3>
          <Calculator size={15} /> Capacity worksheet
        </h3>
        <div className="worksheet-grid">
          {worksheetFields.map(([key, label, step]) => (
            <label key={key}>
              {label}
              <input
                type="number"
                min={
                  key === 'peakMultiplier' || key === 'replicationFactor'
                    ? 1
                    : 0
                }
                max={key === 'readPercent' ? 100 : undefined}
                step={step}
                disabled={locked}
                value={attempt.worksheet[key] ?? attempt.worksheet.averagePayloadKB * 1024}
                onChange={(event) =>
                  controller.updateWorksheet({
                    ...attempt.worksheet,
                    [key]: Number(event.target.value),
                  })
                }
              />
            </label>
          ))}
        </div>
        {worksheetErrors.length > 0 && (
          <ul className="worksheet-errors">
            {worksheetErrors.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        )}
        <div className="estimate-grid">
          <div>
            <span>Average RPS</span>
            <strong>{estimate.averageRps.toLocaleString()}</strong>
          </div>
          <div>
            <span>Peak RPS</span>
            <strong>{estimate.peakRps.toLocaleString()}</strong>
          </div>
          <div>
            <span>Read / write RPS</span>
            <strong>
              {estimate.readRps.toLocaleString()} /{' '}
              {estimate.writeRps.toLocaleString()}
            </strong>
          </div>
          <div>
            <span>Retained storage</span>
            <strong>{estimate.retainedStorageGB.toLocaleString()} GB</strong>
          </div>
          <div>
            <span>Monthly traffic</span>
            <strong>{estimate.monthlyTrafficGB.toLocaleString()} GB</strong>
          </div>
        </div>
        <div className="worksheet-actions">
          <button
            disabled={locked || worksheetErrors.length > 0}
            onClick={controller.applyRequirements}
          >
            Apply requirements
          </button>
          <button
            disabled={locked || worksheetErrors.length > 0}
            onClick={controller.applySimulationDefaults}
          >
            Apply simulation defaults
          </button>
          <button
            disabled={locked || worksheetErrors.length > 0}
            onClick={controller.applyBaseline}
          >
            Apply baseline traffic
          </button>
        </div>
      </section>
      <section className="incident-card">
        <h3>
          <FlaskConical size={15} /> Challenge incident
        </h3>
        <p>
          {attempt.revealedIncident
            ? challenge.incident.revealedDescription
            : challenge.incident.hiddenDescription}
        </p>
        {attempt.incidentRunCompleted && (
          <strong className="incident-complete">Incident run completed</strong>
        )}
        <button disabled={locked} onClick={controller.runIncident}>
          {attempt.revealedIncident
            ? 'Run incident again'
            : 'Reveal and run incident'}
        </button>
      </section>
      <LearningRunComparison attempt={attempt} />
      <footer>
        <button
          disabled={
            locked || !attempt.incidentRunCompleted || comparisonRunning
          }
          onClick={() => void controller.finishAttempt()}
        >
          {comparisonRunning ? 'Comparing designs…' : 'Finish and compare'}
        </button>
        <button
          className="danger-action"
          disabled={locked}
          onClick={() => {
            if (
              window.confirm(
                'End this attempt and reveal the reference without completing it?',
              )
            )
              controller.abandonAttempt();
          }}
        >
          Reveal reference and end attempt
        </button>
      </footer>
    </aside>
  );
}
