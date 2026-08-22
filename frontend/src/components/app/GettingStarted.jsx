import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  Lock,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { Card } from '../ui/Card.jsx';
import { StatusPill } from '../ui/StatusPill.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { cn } from '../ui/cn.js';

/**
 * The getting-started checklist (docs/UX-ROADMAP.md Phase 3). `progress` is
 * the `/dashboard/onboarding` payload: groups → tasks, each with real
 * completion state from the server. The next undone, unlocked task gets the
 * one primary CTA on the screen; completed rows collapse behind a toggle so
 * the list shrinks as the user gets through it.
 */
export function GettingStarted({ progress, isLoading }) {
  if (isLoading || !progress) return <GettingStartedSkeleton />;

  const allTasks = progress.groups.flatMap((g) => g.tasks);
  const next = allTasks.find((t) => t.key === progress.nextTask) ?? null;
  const done = progress.percent >= 100;
  const creditsLeft = Math.max(0, progress.creditsAvailable - progress.creditsEarned);

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {done ? (
                <Trophy className="h-5 w-5 text-primary" aria-hidden="true" />
              ) : (
                <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
              )}
              <h2 className="text-base font-bold text-text">
                {done ? 'You’re all set' : `${progress.completedCount} of ${progress.totalCount} done`}
              </h2>
              <span className="text-sm font-semibold tabular-nums text-text-muted">{progress.percent}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percent}
              aria-label="Getting started progress"
              className="mt-3 h-2 max-w-xl overflow-hidden rounded-full bg-surface-sunken"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 ease-brand"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-text-muted">
              {done ? (
                <>
                  You earned <span className="font-semibold text-text">{progress.creditsEarned} credits</span> along
                  the way. Switch to Overview for your workspace at a glance.
                </>
              ) : (
                <>
                  <span className="font-semibold text-text">+{progress.creditsEarned}</span> of{' '}
                  {progress.creditsAvailable} reward credits earned
                  {creditsLeft > 0 && <> · {creditsLeft} still up for grabs</>}
                </>
              )}
            </p>
          </div>
          {next?.cta && (
            <div className="flex flex-col items-end gap-1">
              <Button variant="hero" iconRight={ArrowRight} to={next.cta.to}>
                {next.cta.label}
              </Button>
              <span className="text-[11px] text-text-muted">Next: {next.label}</span>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {progress.groups.map((group) => (
          <GroupCard key={group.key} group={group} nextTaskKey={progress.nextTask} />
        ))}
      </div>
    </div>
  );
}

function GroupCard({ group, nextTaskKey }) {
  const counted = group.tasks.filter((t) => t.available);
  const doneCount = counted.filter((t) => t.completed).length;
  const [showDone, setShowDone] = useState(false);
  const completedTasks = group.tasks.filter((t) => t.completed);
  const openTasks = group.tasks.filter((t) => !t.completed);
  const collapsible = completedTasks.length > 0 && !group.completed;

  return (
    <Card className={cn('flex flex-col p-4', group.completed && 'border-emerald-500/30')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-text">{group.label}</h3>
          <p className="mt-0.5 text-xs text-text-muted">{group.description}</p>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-xs font-semibold tabular-nums text-text-muted">
            {doneCount}/{counted.length}
          </span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {group.completed ? (
          <StatusPill tone="success" dot>
            Bonus earned · +{group.reward}
          </StatusPill>
        ) : (
          <StatusPill tone="accent">+{group.reward} bonus for the set</StatusPill>
        )}
        {group.requiresPlan && (
          <Link to="/app/billing" className="inline-flex">
            <StatusPill tone="warning">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Basic plan and up
            </StatusPill>
          </Link>
        )}
      </div>

      <ul className="mt-3 flex flex-col divide-y divide-border border-t border-border">
        {group.completed
          ? group.tasks.map((task) => <TaskRow key={task.key} task={task} compact />)
          : [
              ...openTasks.map((task) => (
                <TaskRow key={task.key} task={task} isNext={task.key === nextTaskKey} />
              )),
              ...(showDone ? completedTasks.map((task) => <TaskRow key={task.key} task={task} compact />) : []),
            ]}
      </ul>

      {collapsible && (
        <button
          type="button"
          onClick={() => setShowDone((v) => !v)}
          aria-expanded={showDone}
          className="mt-2 inline-flex items-center gap-1 self-start text-xs font-semibold text-text-muted hover:text-text"
        >
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showDone && 'rotate-180')} aria-hidden="true" />
          {showDone ? 'Hide' : 'Show'} {completedTasks.length} completed
        </button>
      )}
    </Card>
  );
}

function TaskRow({ task, isNext = false, compact = false }) {
  const locked = Boolean(task.requiresPlan) || !task.available;
  const Icon = task.completed ? CheckCircle2 : locked ? Lock : Circle;
  const iconClass = task.completed
    ? 'text-emerald-500'
    : isNext
      ? 'text-primary'
      : 'text-text-muted/60';

  return (
    <li
      className={cn(
        'flex items-center gap-3 py-2.5',
        compact && 'py-2',
        !task.available && 'opacity-60',
      )}
      data-task={task.key}
      data-state={task.completed ? 'done' : locked ? 'locked' : isNext ? 'next' : 'open'}
    >
      <Icon className={cn('h-4 w-4 shrink-0', iconClass)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium', task.completed ? 'text-text-muted line-through decoration-border' : 'text-text')}>
          {task.label}
        </p>
        {!compact && <p className="text-xs text-text-muted">{task.description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {task.reward > 0 && !task.completed && (
          <span className="text-[11px] font-bold tabular-nums text-text-muted">+{task.reward}</span>
        )}
        {task.completed && task.rewardedCredits > 0 && (
          <span className="text-[11px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            +{task.rewardedCredits}
          </span>
        )}
        {!task.completed && !task.available && <StatusPill tone="neutral">Coming soon</StatusPill>}
        {!task.completed && task.available && task.cta && !task.requiresPlan && (
          <Button
            variant={isNext ? 'primary' : 'ghost'}
            size="xs"
            iconRight={ArrowRight}
            to={task.cta.to}
            aria-label={`${task.cta.label}: ${task.label}`}
          >
            {isNext ? task.cta.label : 'Go'}
          </Button>
        )}
      </div>
    </li>
  );
}

function GettingStartedSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <Card className="p-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-3 h-2 max-w-xl" />
        <Skeleton className="mt-3 h-3 w-64" />
      </Card>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-2 h-3 w-52" />
            <div className="mt-4 flex flex-col gap-3">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
