import { FlaskConicalIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { personaLabelKey, useAuth } from '@/auth';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { cn } from '@/lib/utils';

import { DemoRoleSwitcher } from './DemoRoleSwitcher';

/**
 * Small dashed "Demo" chip for the header / mobile top bar. Opens the demo role switcher in a
 * popover. Only rendered in demo mode. While another role is being viewed, the chip names it.
 */
export function DemoChip({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { isDemoMode, demoOverride } = useAuth();
  if (!isDemoMode) return null;
  const roleName = demoOverride ? t(personaLabelKey(demoOverride.persona)) : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 max-w-56 gap-1.5 rounded-full border border-dashed border-input px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground pointer-coarse:min-h-9',
            demoOverride && 'border-gold bg-gold-soft text-gold-soft-foreground hover:bg-gold-soft',
            className,
          )}
          aria-label={
            roleName
              ? t('shell.demo.chipLabelViewing', { role: roleName })
              : t('shell.demo.chipLabel')
          }
        >
          <FlaskConicalIcon aria-hidden="true" className="size-3.5" />
          <span className="truncate">{roleName ?? t('shell.demo.chip')}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-1.5rem))]">
        <DemoRoleSwitcher showDescriptions={false} headingLevel={2} />
      </PopoverContent>
    </Popover>
  );
}
