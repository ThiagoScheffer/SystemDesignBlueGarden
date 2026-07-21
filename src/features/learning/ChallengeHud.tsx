import { BookOpenCheck, Clock3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ChallengeAttempt } from '../../domain/learning/types';
import { useLearningStore } from './learningStore';

const remaining = (attempt: ChallengeAttempt, now: number) =>
  attempt.deadlineAt
    ? Math.max(0, new Date(attempt.deadlineAt).getTime() - now)
    : null;
const formatTime = (milliseconds: number) =>
  `${String(Math.floor(milliseconds / 3_600_000)).padStart(2, '0')}:${String(Math.floor((milliseconds % 3_600_000) / 60_000)).padStart(2, '0')}:${String(Math.floor((milliseconds % 60_000) / 1_000)).padStart(2, '0')}`;

export function ChallengeHud() {
  const attempt = useLearningStore((state) => state.activeAttempt);
  const setDrawerOpen = useLearningStore((state) => state.setDrawerOpen);
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!attempt?.deadlineAt || attempt.status !== 'in-progress') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [attempt?.deadlineAt, attempt?.status]);
  if (!attempt) return null;
  const time = now ? remaining(attempt, now) : null;
  return (
    <button
      type="button"
      className="challenge-hud"
      onClick={() => setDrawerOpen(true)}
      aria-label={`Open ${attempt.challengeSnapshot.title} learning workspace`}
    >
      <BookOpenCheck size={14} />
      <span>{attempt.challengeSnapshot.title}</span>
      <small>{attempt.mode}</small>
      {time !== null && (
        <strong className={time === 0 ? 'timer-expired' : ''}>
          <Clock3 size={12} />{' '}
          {time === 0 ? 'Time expired — continue when ready' : formatTime(time)}
        </strong>
      )}
      {attempt.status !== 'in-progress' && <strong>{attempt.status}</strong>}
    </button>
  );
}
