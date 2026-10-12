/**
 * PLACEHOLDER – owned by the admin agent (layout created by the shell agent; extend freely).
 * Administration frame: owns the page <h1> and the section tabs (permission-filtered with
 * `visibleAdminTabs`); each section renders through <Outlet/> and starts at <h2>.
 * Keep the default export; the route table in src/app/routes.ts lazy-loads it.
 */
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';

import { usePolicy } from '@/auth';
import { DemoDataBadge } from '@/components/common/Badges';
import { PageHeader } from '@/components/common/PageHeader';
import { LinkTabs } from '@/components/common/ResponsiveTabs';
import { paths } from '@/lib/routes';

export default function AdminLayout() {
  const { t } = useTranslation();
  const policy = usePolicy();
  const tabs = policy.visibleAdminTabs().map((tab) => ({
    to: paths.adminSection(tab.section),
    label: t(tab.labelKey),
  }));

  return (
    <>
      {/* documentTitle={null}: the route table titles each section ("Roles — My DeMolay Bulgaria"). */}
      <PageHeader title={t('nav.administration')} documentTitle={null} meta={<DemoDataBadge />} />
      <LinkTabs tabs={tabs} label={t('shell.admin.sectionsLabel')} className="mb-6" />
      <Outlet />
    </>
  );
}
