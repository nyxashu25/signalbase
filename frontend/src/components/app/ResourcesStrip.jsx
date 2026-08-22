import { Link } from 'react-router-dom';
import { BookOpen, Coins, MessageCircle, ArrowUpRight } from 'lucide-react';
import { cn } from '../ui/cn.js';

// The three "where do I go from here" cards under the Home views
// (docs/UX-ROADMAP.md §3.4). Every link goes somewhere real in the app.
const RESOURCES = [
  {
    to: '/app/help',
    icon: BookOpen,
    title: 'Read the guide',
    body: 'Search, reveal, lists, sequences, billing — the whole product in five minutes.',
  },
  {
    to: '/app/help#credits',
    icon: Coins,
    title: 'How credits work',
    body: 'What costs credits, what doesn’t, and how your monthly grant renews.',
  },
  {
    to: '/app/tickets/new',
    icon: MessageCircle,
    title: 'Talk to us',
    body: 'Raise a support or sales ticket — replies land in your inbox and here.',
  },
];

export function ResourcesStrip({ className }) {
  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-3', className)}>
      {RESOURCES.map(({ to, icon: Icon, title, body }) => (
        <Link
          key={to}
          to={to}
          className="group flex gap-3 rounded-lg border border-border bg-surface-elevated p-4 transition-colors hover:border-text-muted/40 hover:bg-surface-hover"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-sm font-bold text-text">
              {title}
              <ArrowUpRight
                className="h-3.5 w-3.5 text-text-muted/60 opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden="true"
              />
            </span>
            <span className="mt-0.5 block text-xs text-text-muted">{body}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
