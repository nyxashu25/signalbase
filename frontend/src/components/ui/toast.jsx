import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { cn } from './cn.js';

const ToastContext = createContext(null);

const TONES = {
  success: { Icon: CheckCircle2, icon: 'text-emerald-500' },
  info: { Icon: Info, icon: 'text-sky-500' },
  warning: { Icon: AlertTriangle, icon: 'text-amber-500' },
  error: { Icon: XCircle, icon: 'text-red-500' },
};

const DEFAULT_DURATION_MS = 5000;
let nextId = 1;

/**
 * Top-right toast stack. `useToast()` returns a function:
 *   toast({ tone, title, body, action, actionTo, onAction, duration })
 * or the shorthand helpers toast.success(title, body) etc. Toasts are
 * the mutation-feedback channel for the app — anything that used to be an
 * inline red line after a save/submit goes here instead.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (opts) => {
      const id = nextId++;
      const toast = { id, tone: 'info', duration: DEFAULT_DURATION_MS, ...opts };
      setToasts((list) => [...list, toast].slice(-5));
      if (toast.duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), toast.duration),
        );
      }
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  const api = useMemo(() => {
    const fn = (opts) => push(opts);
    for (const tone of Object.keys(TONES)) {
      fn[tone] = (title, body, extra) => push({ tone, title, body, ...extra });
    }
    fn.dismiss = dismiss;
    return fn;
  }, [push, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Outside a provider (e.g. a unit test rendering one component) —
    // degrade to a no-op rather than throwing so the component still works.
    const noop = () => {};
    for (const tone of Object.keys(TONES)) noop[tone] = () => {};
    noop.dismiss = () => {};
    return noop;
  }
  return ctx;
}

function Toaster({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-4 z-[90] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      {toasts.map((t) => {
        const { Icon, icon } = TONES[t.tone] ?? TONES.info;
        return (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 rounded-md border border-border bg-surface-elevated p-3.5 text-sm shadow-dp-md dp-slide-in-right"
          >
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', icon)} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              {t.title && <p className="font-semibold text-text">{t.title}</p>}
              {t.body && <p className={cn(t.title && 'mt-0.5', 'text-text-muted')}>{t.body}</p>}
              {t.action &&
                (t.actionTo ? (
                  <Link
                    to={t.actionTo}
                    onClick={() => onDismiss(t.id)}
                    className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
                  >
                    {t.action}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      t.onAction?.();
                      onDismiss(t.id);
                    }}
                    className="mt-2 text-xs font-semibold text-primary hover:underline"
                  >
                    {t.action}
                  </button>
                ))}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss"
              className="-mr-1 -mt-1 rounded-sm p-1 text-text-muted hover:bg-surface-hover hover:text-text"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
