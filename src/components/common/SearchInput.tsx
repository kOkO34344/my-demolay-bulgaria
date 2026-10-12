import { SearchIcon, XIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

export interface SearchInputProps {
  /** Committed search text (e.g. from the URL `?q=`). External changes (Clear filters) sync in. */
  value: string;
  /** Called with the new text after `debounceMs` of no typing, immediately on Enter and on clear. */
  onChange: (value: string) => void;
  /** Translated label ("Search news"). Visually hidden unless `showLabel`. */
  label: string;
  showLabel?: boolean;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  id?: string;
}

/**
 * Debounced search field with a search icon, a labelled clear button and native `type="search"`
 * semantics (searchbox role). Pair with `useSearchParams` so searches are linkable.
 */
export function SearchInput({
  value,
  onChange,
  label,
  showLabel = false,
  placeholder,
  debounceMs = 300,
  className,
  id,
}: SearchInputProps) {
  const { t } = useTranslation();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState(value);
  const [lastExternal, setLastExternal] = useState(value);
  const [lastEmitted, setLastEmitted] = useState(value);

  // Sync external changes (e.g. "Clear filters") without clobbering text typed after our own emit.
  if (value !== lastExternal) {
    setLastExternal(value);
    if (value !== lastEmitted) {
      setDraft(value);
      setLastEmitted(value);
    }
  }

  useEffect(() => {
    if (draft === lastEmitted) return;
    const timer = window.setTimeout(() => {
      setLastEmitted(draft);
      onChange(draft);
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [draft, lastEmitted, debounceMs, onChange]);

  const commit = (next: string) => {
    setDraft(next);
    setLastEmitted(next);
    onChange(next);
  };

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className={cn(showLabel ? 'text-sm font-medium' : 'sr-only')}>
        {label}
      </label>
      <div className="relative">
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          value={draft}
          placeholder={placeholder ?? label}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit(draft);
            } else if (event.key === 'Escape' && draft) {
              event.preventDefault();
              commit('');
            }
          }}
          className={cn(
            'h-9 w-full min-w-0 rounded-md border border-input bg-card pr-10 pl-9 text-base shadow-xs focus-ring transition-[border-color] outline-none placeholder:text-muted-foreground focus-visible:border-ring md:text-sm dark:bg-background/50 pointer-coarse:h-11',
            '[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none',
          )}
        />
        {draft ? (
          <button
            type="button"
            onClick={() => {
              commit('');
              inputRef.current?.focus();
            }}
            aria-label={t('common.actions.clearSearch')}
            className="touch-hitbox absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground focus-ring hover:bg-accent hover:text-foreground"
          >
            <XIcon aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
