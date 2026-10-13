import { FlaskConicalIcon, RotateCcwIcon, Undo2Icon } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { ROLES, isRole } from '@/auth';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { labelKeys } from '@/i18n/public';
import { cn } from '@/lib/utils';

import { useDemoRoleSwitch, useResetDemo } from './hooks';

function ResetDemoDataButton({ onSidebar = false }: { onSidebar?: boolean }) {
  const { t } = useTranslation();
  const { resetDemo, isResetting } = useResetDemo();
  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="ghost"
          size="sm"
          disabled={isResetting}
          className={cn(
            'justify-start',
            onSidebar &&
              'h-8 px-2 text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-sidebar-ring',
          )}
        >
          <RotateCcwIcon aria-hidden="true" />
          {t('demo.resetData')}
        </Button>
      }
      title={t('shell.demo.resetTitle')}
      description={t('demo.resetDataDescription')}
      confirmLabel={t('shell.demo.resetConfirm')}
      pendingLabel={t('shell.demo.resetting')}
      variant="destructive"
      onConfirm={resetDemo}
    />
  );
}

/**
 * Compact demo area for the bottom of the desktop sidebar (dashed, clearly "prototype only"):
 * a labelled role select + Reset demo data. Renders nothing when demo mode is off.
 */
export function SidebarDemoPanel() {
  const { t } = useTranslation();
  const selectId = useId();
  const { isDemoMode, currentRole, actualRole, isOverridden, isSwitching, switchTo } =
    useDemoRoleSwitch();
  if (!isDemoMode || !currentRole) return null;

  return (
    <section
      aria-labelledby={`${selectId}-title`}
      className="mx-3 mb-3 rounded-lg border border-dashed border-sidebar-muted-foreground/45 p-3"
    >
      <h2
        id={`${selectId}-title`}
        className="flex items-center gap-1.5 font-sans text-xs font-semibold tracking-normal text-sidebar-foreground"
      >
        <FlaskConicalIcon aria-hidden="true" className="size-3.5 text-sidebar-primary" />
        {t('shell.demo.switcherTitle')}
      </h2>
      <label htmlFor={selectId} className="mt-2 block text-xs text-sidebar-muted-foreground">
        {t('shell.demo.viewingAsLabel')}
      </label>
      <Select
        value={currentRole}
        onValueChange={(value) => {
          if (isRole(value)) void switchTo(value);
        }}
        disabled={isSwitching}
      >
        <SelectTrigger
          id={selectId}
          size="sm"
          className="mt-1 w-full border-sidebar-border bg-sidebar-accent text-[0.8125rem] text-sidebar-accent-foreground focus-visible:border-sidebar-ring focus-visible:outline-sidebar-ring dark:bg-sidebar-accent dark:hover:bg-sidebar-accent [&_[data-slot=select-value]_[data-role-suffix]]:hidden [&_svg:not([class*='text-'])]:text-sidebar-muted-foreground"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" side="top" align="start">
          {ROLES.map((role) => (
            <SelectItem key={role} value={role}>
              {t(labelKeys.role(role))}
              {role === actualRole ? (
                <span data-role-suffix="" className="text-muted-foreground">
                  {t('shell.demo.yourRoleSuffix')}
                </span>
              ) : null}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="mt-2 flex flex-col items-stretch gap-0.5">
        {isOverridden ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void switchTo(null)}
            disabled={isSwitching}
            className="h-8 justify-start px-2 text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-sidebar-ring"
          >
            <Undo2Icon aria-hidden="true" />
            {t('demo.returnToMyRole')}
          </Button>
        ) : null}
        <ResetDemoDataButton onSidebar />
      </div>
    </section>
  );
}

/**
 * Full demo role switcher (radio list with role descriptions) for the More page and the header
 * "Demo" popover. Prototype-only; renders nothing when demo mode is off.
 */
export function DemoRoleSwitcher({
  showDescriptions = true,
  headingLevel = 2,
  className,
}: {
  showDescriptions?: boolean;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const { t } = useTranslation();
  const baseId = useId();
  const { isDemoMode, currentRole, actualRole, isOverridden, isSwitching, switchTo } =
    useDemoRoleSwitch();
  if (!isDemoMode || !currentRole) return null;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  return (
    <section
      aria-labelledby={`${baseId}-title`}
      aria-describedby={`${baseId}-desc`}
      className={cn('flex flex-col gap-3', className)}
    >
      <div className="flex flex-col gap-1">
        <Heading id={`${baseId}-title`} className="flex items-center gap-2 text-base font-bold">
          <FlaskConicalIcon aria-hidden="true" className="size-4 text-muted-foreground" />
          {t('shell.demo.switcherTitle')}
        </Heading>
        <p id={`${baseId}-desc`} className="text-sm text-muted-foreground">
          {t('demo.roleSwitcherDescription')}
        </p>
      </div>
      <RadioGroup
        value={currentRole}
        onValueChange={(value) => {
          if (isRole(value)) void switchTo(value);
        }}
        disabled={isSwitching}
        aria-label={t('shell.demo.viewingAsLabel')}
        className="gap-1.5"
      >
        {ROLES.map((role) => {
          const itemId = `${baseId}-${role}`;
          const selected = role === currentRole;
          return (
            <label
              key={role}
              htmlFor={itemId}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
                selected ? 'border-primary bg-secondary' : 'border-border bg-card hover:bg-accent',
              )}
            >
              <RadioGroupItem
                id={itemId}
                value={role}
                className="mt-0.5 focus-visible:outline-none"
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className={cn('text-sm', selected ? 'font-semibold' : 'font-medium')}>
                  {t(labelKeys.role(role))}
                  {role === actualRole ? (
                    <span className="font-normal text-muted-foreground">
                      {t('shell.demo.yourRoleSuffix')}
                    </span>
                  ) : null}
                </span>
                {showDescriptions ? (
                  <span className="text-xs text-muted-foreground">
                    {t(labelKeys.roleDescription(role))}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </RadioGroup>
      <div className="flex flex-wrap items-center gap-2">
        {isOverridden ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void switchTo(null)}
            disabled={isSwitching}
          >
            <Undo2Icon aria-hidden="true" />
            {t('demo.returnToMyRole')}
          </Button>
        ) : null}
        <ResetDemoDataButton />
      </div>
    </section>
  );
}
