/**
 * Public i18n API for components: `import { useLocale, useFormatters, … } from '@/i18n/public'`.
 * (src/i18n/index.ts initialises the i18next singleton and is imported once by the app/test setup.)
 */
export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  TIME_ZONE,
  INTL_LOCALES,
  isLocale,
  otherLocale,
  type Locale,
} from './config';
export {
  formatDate,
  formatDateWithWeekday,
  formatDateTime,
  formatTime,
  formatMonthYear,
  formatDateRange,
  formatRelative,
  formatNumber,
  formatFileSize,
  getDateParts,
  getDateFnsLocale,
  toSofiaDateKey,
  toSofiaMonthKey,
  sofiaWallTimeToIso,
  isoToSofiaWallTime,
  type DateInput,
  type DateStyle,
  type DateParts,
} from './format';
export { localize, localizeText, isEmptyTranslation, type Localized } from './localize';
export { formatMessage } from './message';
export { vmsg, translateValidationMessage, decodeValidationMessage } from './validation';
export { labelKeys } from './labels';
export {
  useLocale,
  useLocalized,
  useFormatters,
  useMessageFormatter,
  useDocumentTitle,
} from './hooks';
