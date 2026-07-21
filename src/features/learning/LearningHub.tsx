import { BookOpen, Clock3, Layers3, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { challenges, learningTemplates } from '../../domain/learning/content';
import type { ChallengeAttempt } from '../../domain/learning/types';
import type { useLearningController } from './useLearningController';
import { ArchitecturePreview } from './ArchitecturePreview';
import { ComparisonView } from './ComparisonView';
import { useLearningStore } from './learningStore';

type Controller = ReturnType<typeof useLearningController>;

export function LearningHub({ controller }: { controller: Controller }) {
  const open = useLearningStore((state) => state.hubOpen);
  const tab = useLearningStore((state) => state.hubTab);
  const attempts = useLearningStore((state) => state.attempts);
  const loading = useLearningStore((state) => state.loading);
  const setOpen = useLearningStore((state) => state.setHubOpen);
  const setTab = useLearningStore((state) => state.setHubTab);
  const [review, setReview] = useState<ChallengeAttempt | null>(null);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) =>
      event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [open, setOpen]);
  if (!open) return null;
  return (
    <div
      className="learning-backdrop"
      onMouseDown={(event) =>
        event.target === event.currentTarget && setOpen(false)
      }
    >
      <section
        className="learning-hub"
        role="dialog"
        aria-modal="true"
        aria-labelledby="learning-title"
      >
        <header>
          <div>
            <span className="eyebrow">Practice system design</span>
            <h2 id="learning-title">Learning Studio</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close Learning Studio"
          >
            <X size={18} />
          </button>
        </header>
        <nav aria-label="Learning Studio sections">
          {(['challenges', 'templates', 'progress'] as const).map((entry) => (
            <button
              key={entry}
              className={tab === entry ? 'is-active' : ''}
              onClick={() => {
                setTab(entry);
                setReview(null);
              }}
            >
              {entry}
            </button>
          ))}
        </nav>
        <div className="learning-content">
          {tab === 'challenges' && (
            <div className="learning-card-grid">
              {challenges.map((challenge) => (
                <article className="learning-card" key={challenge.id}>
                  <div className="learning-card-heading">
                    <BookOpen size={18} />
                    <div>
                      <span>
                        {challenge.level} ·{' '}
                        {challenge.level === 'beginner'
                          ? '30'
                          : challenge.level === 'advanced'
                            ? '60'
                            : '45'}{' '}
                        min
                      </span>
                      <h3>{challenge.title}</h3>
                    </div>
                  </div>
                  <p>{challenge.summary}</p>
                  <div className="concept-tags">
                    {challenge.concepts.map((concept) => (
                      <span key={concept}>{concept}</span>
                    ))}
                  </div>
                  <div className="learning-card-actions">
                    <button
                      onClick={() =>
                        void controller.startChallenge(challenge.id, 'guided')
                      }
                    >
                      Start guided
                    </button>
                    <button
                      onClick={() =>
                        void controller.startChallenge(
                          challenge.id,
                          'interview',
                        )
                      }
                    >
                      <Clock3 size={13} /> Interview
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          {tab === 'templates' && (
            <div className="template-list">
              {learningTemplates.map((template) => (
                <article className="template-card" key={template.id}>
                  <ArchitecturePreview templateId={template.id} />
                  <div>
                    <span>{template.level}</span>
                    <h3>{template.title}</h3>
                    <p>{template.summary}</p>
                    <div className="concept-tags">
                      {template.concepts.map((concept) => (
                        <span key={concept}>{concept}</span>
                      ))}
                    </div>
                    <strong>Known trade-off</strong>
                    <p>{template.knownTradeoffs[0]}</p>
                    <button
                      onClick={() =>
                        void controller.createFromTemplate(template.id)
                      }
                    >
                      <Layers3 size={14} /> Create project
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          {tab === 'progress' &&
            (review ? (
              <ComparisonView
                attempt={review}
                onTryAgain={() => void controller.tryAgain(review)}
              />
            ) : (
              <div className="attempt-list">
                {loading && <p>Loading training history…</p>}
                {!loading && attempts.length === 0 && (
                  <p>
                    No attempts yet. Start a challenge to build your local
                    history.
                  </p>
                )}
                {attempts.map((attempt) => (
                  <article key={attempt.id}>
                    <div>
                      <span
                        className={`attempt-status status-${attempt.status}`}
                      >
                        {attempt.status}
                      </span>
                      <h3>{attempt.challengeSnapshot.title}</h3>
                      <p>
                        {attempt.mode} · started{' '}
                        {new Date(attempt.startedAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      {attempt.comparison && (
                        <button onClick={() => setReview(attempt)}>
                          Review evidence
                        </button>
                      )}
                      <button
                        onClick={() => void controller.resumeAttempt(attempt)}
                      >
                        {attempt.status === 'in-progress'
                          ? 'Resume'
                          : 'Open project'}
                      </button>
                      <button
                        aria-label={`Delete ${attempt.challengeSnapshot.title} attempt`}
                        onClick={() => {
                          if (
                            window.confirm(
                              'Delete this attempt and its associated local architecture?',
                            )
                          )
                            void controller.removeAttempt(attempt);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
