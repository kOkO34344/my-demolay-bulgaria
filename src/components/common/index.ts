/**
 * Shared application building blocks (owned by the shell team). Documented with props and examples in
 * CONVENTIONS-shell.md. Import from '@/components/common'.
 */
export { PageHeader, type PageHeaderProps, type PageHeaderBreadcrumb } from './PageHeader';
export { Section, SectionCard, PageStack } from './Section';
export { EmptyState, type EmptyStateProps } from './EmptyState';
export {
  ErrorState,
  NotFoundState,
  OfflineState,
  type ErrorStateProps,
  type NotFoundStateProps,
  type OfflineStateProps,
} from './ErrorState';
export { PermissionDenied, type PermissionDeniedProps } from './PermissionDenied';
export {
  ListSkeleton,
  CardGridSkeleton,
  TableSkeleton,
  DetailSkeleton,
  FormSkeleton,
  PageSkeleton,
  FullPageLoader,
  type PageSkeletonVariant,
} from './LoadingSkeletons';
export {
  ConfirmDialog,
  type ConfirmDialogProps,
  type ConfirmDetails,
  type ConfirmReasonField,
} from './ConfirmDialog';
export { ResponsiveDialog, type ResponsiveDialogProps } from './ResponsiveDialog';
export { SideDrawer, type SideDrawerProps } from './SideDrawer';
export {
  DataTable,
  type DataTableColumn,
  type DataTableProps,
  type DataTablePagination,
  type SortState,
  type SortDirection,
} from './DataTable';
export { SearchInput, type SearchInputProps } from './SearchInput';
export {
  SegmentedFilter,
  type SegmentedFilterProps,
  type SegmentedOption,
} from './SegmentedFilter';
export { FilterSelect, type FilterSelectProps, type FilterOption } from './FilterSelect';
export {
  StatusBadge,
  RoleBadge,
  ScopeBadge,
  AudienceBadge,
  DemoDataBadge,
  ImportedPositionLabel,
  type StatusBadgeInput,
  type StatusBadgeProps,
} from './Badges';
export {
  DateBlock,
  DateTime,
  type DateBlockProps,
  type DateTimeProps,
  type DateTimeFormat,
} from './DateDisplay';
export { UserAvatar, type UserAvatarProps } from './UserAvatar';
export { LanguageToggle, type LanguageToggleProps } from './LanguageToggle';
export { ThemeToggle, type ThemeToggleProps } from './ThemeToggle';
export { PasswordInput, type PasswordInputProps } from './PasswordInput';
export {
  TextField,
  PasswordField,
  TextareaField,
  SelectField,
  CheckboxField,
  SwitchField,
  FormErrorAlert,
  type SelectFieldOption,
} from './FormFields';
export { applyServerErrors } from './formErrors';
export { SuccessCheck, type SuccessCheckProps } from './SuccessCheck';
export { KeyValueList, type KeyValueItem, type KeyValueListProps } from './KeyValueList';
export {
  WorkflowStepper,
  ContentWorkflowStepper,
  type WorkflowStep,
  type WorkflowStepperProps,
} from './WorkflowStepper';
export {
  ResponsiveTabs,
  LinkTabs,
  type ResponsiveTab,
  type ResponsiveTabsProps,
  type LinkTab,
} from './ResponsiveTabs';
export { InfoNotice, type InfoNoticeProps } from './InfoNotice';
export { useChapterName } from './useChapterName';
export { useDocumentTitleOverride } from './useDocumentTitleOverride';
