import { createContext, useContext } from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import { Info } from 'lucide-react';
import { cn } from './cn.js';

const HasProviderContext = createContext(false);

// Mount once at the app-shell root; every <Tooltip> below it shares the
// provider's delay/skip-delay group behaviour. A <Tooltip> rendered outside
// one (a unit test, the admin panel) quietly wraps itself in a local
// provider instead of throwing.
export function TooltipProvider({ children, ...props }) {
  return (
    <RadixTooltip.Provider {...props}>
      <HasProviderContext.Provider value>{children}</HasProviderContext.Provider>
    </RadixTooltip.Provider>
  );
}

export function Tooltip(props) {
  const hasProvider = useContext(HasProviderContext);
  if (hasProvider) return <TooltipInner {...props} />;
  return (
    <RadixTooltip.Provider delayDuration={250}>
      <TooltipInner {...props} />
    </RadixTooltip.Provider>
  );
}

function TooltipInner({ content, children, side = 'top', align = 'center', delayDuration }) {
  if (!content) return children;
  return (
    <RadixTooltip.Root delayDuration={delayDuration}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          align={align}
          sideOffset={6}
          collisionPadding={8}
          className="z-[80] max-w-xs rounded-sm bg-ink-950 px-2.5 py-1.5 text-xs font-medium leading-snug text-white shadow-dp-md dp-pop-in"
        >
          {content}
          <RadixTooltip.Arrow className="fill-ink-950" width={10} height={5} />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

// The ⓘ affordance next to a metric label — the same pattern Apollo puts on
// every KPI tile. Renders an accessible button so keyboard users can reach
// the hint too.
export function InfoHint({ content, className }) {
  return (
    <Tooltip content={content}>
      <button
        type="button"
        aria-label="More info"
        className={cn(
          'inline-flex h-4 w-4 items-center justify-center rounded-full text-text-muted/70 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
          className,
        )}
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </Tooltip>
  );
}
