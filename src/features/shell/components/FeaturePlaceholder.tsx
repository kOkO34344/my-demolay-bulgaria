import { HammerIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { Section } from '@/components/common/Section';

/**
 * Neutral "being built" screen used by PLACEHOLDER page files until the owning feature agent replaces
 * them. `variant="section"` is for pages rendered inside a layout that already owns the <h1>
 * (Administration sections).
 */
export function FeaturePlaceholder({
  titleKey,
  variant = 'page',
}: {
  /** i18n key of the page title (usually the nav label). */
  titleKey: string;
  variant?: 'page' | 'section';
}) {
  const { t } = useTranslation();
  const empty = (
    <EmptyState
      variant="card"
      icon={HammerIcon}
      title={t('shell.placeholder.title')}
      description={t('shell.placeholder.description')}
    />
  );
  if (variant === 'section') {
    return (
      <Section title={t(titleKey)} headingLevel={2}>
        {empty}
      </Section>
    );
  }
  return (
    <>
      <PageHeader title={t(titleKey)} />
      {empty}
    </>
  );
}
