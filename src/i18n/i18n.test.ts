import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  PERMISSIONS,
  ROLES,
  SCOPE_LEVELS,
  AUDIT_ACTIONS,
  EVENT_CATEGORIES,
  RESOURCE_CATEGORIES,
  NOTIFICATION_CATEGORIES,
  ANNOUNCEMENT_STATUSES,
  EVENT_STATUSES,
  ACCOUNT_STATUSES,
  ENTITY_TYPES,
  SYNC_JOB_STATUSES,
  SYNC_STAGES,
  SYNC_EXCEPTION_KINDS,
  SYNC_EXCEPTION_STATUSES,
  TRANSLATION_STATES,
  RSVP_STATUSES,
  ATTENDANCE_STATUSES,
  PARTICIPANT_VISIBILITIES,
  AUDIENCE_SCOPES,
  AUDIENCE_VISIBILITIES,
  RESOURCE_LANGUAGES,
  DIGEST_FREQUENCIES,
  SPECIAL_ASSIGNMENT_STATES,
  ASSIGNMENT_SOURCES,
  LOCALES,
} from '@/domain';

import { DEFAULT_LOCALE } from './config';
import {
  formatDate,
  formatDateRange,
  formatFileSize,
  formatTime,
  getDateParts,
  sofiaWallTimeToIso,
  isoToSofiaWallTime,
  formatRelative,
} from './format';
import { getLanguage, i18n, setLanguage } from './index';
import { labelKeys } from './labels';
import { localize, localizeText } from './localize';
import { formatMessage } from './message';
import { buildResources, flattenKeys, getResourceSources, type TranslationTree } from './resources';
import { translateValidationMessage, vmsg } from './validation';

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const normalizeKey = (key: string): string => key.replace(PLURAL_SUFFIX, '');

describe('i18n resources', () => {
  it('loads EN and BG with English as default on first visit', () => {
    expect(DEFAULT_LOCALE).toBe('en');
    expect(getLanguage()).toBe('en');
    expect(i18n.t('app.name')).toBe('My DeMolay Bulgaria');
    expect(i18n.t('app.subtitle')).toBe('Member Portal');
    expect(i18n.getFixedT('bg')('app.subtitle')).toBe('Портал за членове');
    expect(i18n.getFixedT('bg')('nav.chapter')).toBe('Моята обител');
    expect(i18n.getFixedT('bg')('chapterTerm.plural')).toBe('Обители');
  });

  it('switching language updates <html lang>, persists for the session and translates', async () => {
    await setLanguage('bg');
    expect(document.documentElement.lang).toBe('bg');
    expect(window.sessionStorage.getItem('mdb.lang')).toBe('bg');
    expect(i18n.t('nav.home')).toBe('Начало');
    await setLanguage('en');
    expect(document.documentElement.lang).toBe('en');
    expect(i18n.t('nav.home')).toBe('Home');
  });

  it('uses correct plural forms in both languages', () => {
    const en = i18n.getFixedT('en');
    const bg = i18n.getFixedT('bg');
    expect(en('common.count.members', { count: 1 })).toBe('1 member');
    expect(en('common.count.members', { count: 5 })).toBe('5 members');
    expect(bg('common.count.members', { count: 1 })).toBe('1 член');
    expect(bg('common.count.members', { count: 5 })).toBe('5 членове');
    expect(bg('common.errors.rateLimited', { count: 60 })).toContain('60 секунди');
  });

  it('has identical key sets in EN and BG across en.json, bg.json and every fragment', () => {
    const sources = getResourceSources();
    const byFile = new Map<string, Set<string>>();
    for (const source of sources) {
      const base = source.file
        .replace(/\.(en|bg)\.json$/, '')
        .replace(/^(en|bg)\.json$/, 'central');
      const keyset = new Set(flattenKeys(source.tree).map(normalizeKey));
      byFile.set(`${base}|${source.locale}`, keyset);
    }
    const groups = new Set([...byFile.keys()].map((k) => k.split('|')[0] ?? ''));
    const problems: string[] = [];
    for (const group of groups) {
      const en = byFile.get(`${group}|en`) ?? new Set<string>();
      const bg = byFile.get(`${group}|bg`) ?? new Set<string>();
      const missingInBg = [...en].filter((k) => !bg.has(k));
      const missingInEn = [...bg].filter((k) => !en.has(k));
      if (missingInBg.length) problems.push(`${group}: missing in BG → ${missingInBg.join(', ')}`);
      if (missingInEn.length) problems.push(`${group}: missing in EN → ${missingInEn.join(', ')}`);
    }
    expect(problems).toEqual([]);
  });

  it('has no empty translation values', () => {
    const empty: string[] = [];
    const walk = (tree: TranslationTree, prefix: string, file: string) => {
      for (const [key, value] of Object.entries(tree)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'string') {
          if (value.trim() === '') empty.push(`${file}: ${path}`);
        } else walk(value, path, file);
      }
    };
    for (const source of getResourceSources()) walk(source.tree, '', source.file);
    expect(empty).toEqual([]);
  });

  it('fragments have exactly one top-level key matching the file name', () => {
    const problems = getResourceSources()
      .filter((s) => s.file.startsWith('fragments/'))
      .flatMap((s) => {
        const feature = s.file.replace(/^fragments\//, '').replace(/\.(en|bg)\.json$/, '');
        const keys = Object.keys(s.tree);
        return keys.length === 1 && keys[0] === feature
          ? []
          : [`${s.file}: top-level keys ${keys.join(', ')}`];
      });
    expect(problems).toEqual([]);
  });

  it('provides a label for every domain enum value and permission', () => {
    const merged = buildResources();
    const missing: string[] = [];
    const check = (key: string) => {
      for (const locale of LOCALES) {
        if (!i18n.exists(key, { lng: locale, fallbackLng: false }))
          missing.push(`${locale}:${key}`);
      }
    };
    expect(Object.keys(merged)).toEqual(['en', 'bg']);
    PERMISSIONS.forEach((p) => {
      check(labelKeys.permission(p));
      check(labelKeys.permissionDescription(p));
    });
    ROLES.forEach((r) => {
      check(labelKeys.role(r));
      check(labelKeys.roleDescription(r));
    });
    SCOPE_LEVELS.forEach((s) => check(labelKeys.scopeLevel(s)));
    AUDIT_ACTIONS.forEach((a) => check(labelKeys.auditAction(a)));
    EVENT_CATEGORIES.forEach((c) => check(labelKeys.eventCategory(c)));
    RESOURCE_CATEGORIES.forEach((c) => check(labelKeys.resourceCategory(c)));
    RESOURCE_LANGUAGES.forEach((c) => check(labelKeys.resourceLanguage(c)));
    NOTIFICATION_CATEGORIES.forEach((c) => check(labelKeys.notificationCategory(c)));
    ANNOUNCEMENT_STATUSES.forEach((s) => check(labelKeys.contentStatus(s)));
    EVENT_STATUSES.forEach((s) => check(labelKeys.eventStatus(s)));
    ACCOUNT_STATUSES.forEach((s) => check(labelKeys.accountStatus(s)));
    ENTITY_TYPES.forEach((s) => check(labelKeys.entityType(s)));
    SYNC_JOB_STATUSES.forEach((s) => check(labelKeys.syncStatus(s)));
    SYNC_STAGES.forEach((s) => check(labelKeys.syncStage(s)));
    SYNC_EXCEPTION_KINDS.forEach((s) => check(labelKeys.syncExceptionKind(s)));
    SYNC_EXCEPTION_STATUSES.forEach((s) => check(labelKeys.syncExceptionStatus(s)));
    TRANSLATION_STATES.forEach((s) => check(labelKeys.translationState(s)));
    RSVP_STATUSES.forEach((s) => check(labelKeys.rsvp(s)));
    ATTENDANCE_STATUSES.forEach((s) => check(labelKeys.attendance(s)));
    PARTICIPANT_VISIBILITIES.forEach((s) => check(labelKeys.participantVisibility(s)));
    AUDIENCE_SCOPES.forEach((s) => check(labelKeys.audienceScope(s)));
    AUDIENCE_VISIBILITIES.forEach((s) => check(labelKeys.audienceVisibility(s)));
    DIGEST_FREQUENCIES.forEach((s) => check(labelKeys.digest(s)));
    SPECIAL_ASSIGNMENT_STATES.forEach((s) => check(labelKeys.specialAssignmentState(s)));
    ASSIGNMENT_SOURCES.forEach((s) => check(labelKeys.assignmentSource(s)));
    LOCALES.forEach((l) => {
      check(labelKeys.language(l));
      check(labelKeys.languageCode(l));
    });
    expect(missing).toEqual([]);
  });
});

describe('localize', () => {
  it('picks the requested language', () => {
    const r = localize({ en: { title: 'Hello' }, bg: { title: 'Здравей' } }, 'bg');
    expect(r).toEqual({
      value: { title: 'Здравей' },
      lang: 'bg',
      isFallback: false,
      isMissing: false,
    });
  });

  it('falls back to the other language and flags it', () => {
    const r = localize({ en: { title: 'Hello' }, bg: { title: '  ' } }, 'bg');
    expect(r.value).toEqual({ title: 'Hello' });
    expect(r.lang).toBe('en');
    expect(r.isFallback).toBe(true);
  });

  it('reports missing content', () => {
    expect(localize({}, 'en').isMissing).toBe(true);
    expect(localizeText(null, 'en')).toBe('');
    expect(localizeText({ en: '', bg: 'Обител' }, 'en')).toBe('Обител');
  });
});

describe('formatting (Europe/Sofia)', () => {
  const instant = '2026-10-15T15:30:00.000Z'; // 18:30 in Sofia (EEST)

  it('formats dates with Bulgarian conventions', () => {
    expect(formatDate(instant, 'bg', 'long')).toBe('15 октомври 2026 г.');
    expect(formatDate(instant, 'en', 'long')).toBe('15 October 2026');
    expect(formatTime(instant, 'bg')).toBe('18:30');
    expect(formatTime(instant, 'en')).toBe('18:30');
    expect(getDateParts(instant, 'bg')).toMatchObject({ day: '15', monthShort: 'окт.' });
    expect(getDateParts(instant, 'en')).toMatchObject({ day: '15', monthShort: 'Oct' });
  });

  it('formats ranges, sizes and relative times', () => {
    expect(formatDateRange(instant, '2026-10-17T09:00:00.000Z', 'en', { withTime: false })).toBe(
      '15–17 October 2026',
    );
    expect(formatFileSize(1_250_000, 'bg')).toBe('1,3 MB');
    expect(formatFileSize(512_000, 'en')).toBe('512 kB');
    const now = new Date('2026-10-15T16:00:00.000Z');
    expect(formatRelative('2026-10-15T15:55:00.000Z', 'bg', { now })).toBe('преди 5 минути');
    expect(formatRelative('2026-10-14T15:00:00.000Z', 'en', { now })).toBe('yesterday');
  });

  it('converts Sofia wall time to UTC ISO and back (DST-aware)', () => {
    expect(sofiaWallTimeToIso('2026-10-15', '18:30')).toBe(instant);
    expect(sofiaWallTimeToIso('2026-12-15', '18:30')).toBe('2026-12-15T16:30:00.000Z');
    expect(isoToSofiaWallTime(instant)).toEqual({ date: '2026-10-15', time: '18:30' });
  });
});

describe('validation messages', () => {
  it('translates zod issues produced by the global error map', () => {
    const schema = z.object({ name: z.string().min(1), email: z.email(), bio: z.string().max(3) });
    const result = schema.safeParse({ name: '', email: 'nope', bio: 'long text' });
    expect(result.success).toBe(false);
    const messages = result.error?.issues.map((i) =>
      translateValidationMessage(i18n.getFixedT('bg'), i.message),
    );
    expect(messages).toEqual([
      'Полето е задължително.',
      'Въведете валиден имейл адрес.',
      'Въведете най-много 3 знака.',
    ]);
  });

  it('supports explicit keys with params and passes through plain text', () => {
    const t = i18n.getFixedT('en');
    expect(translateValidationMessage(t, vmsg('validation.tooShort', { count: 10 }))).toBe(
      'Use at least 10 characters.',
    );
    expect(translateValidationMessage(t, 'Some raw message')).toBe('Some raw message');
  });
});

describe('formatMessage', () => {
  it('renders literal and key-based messages with localized params', () => {
    const t = i18n.getFixedT('bg');
    expect(formatMessage({ kind: 'text', text: { en: 'Hi', bg: 'Здравей' } }, t, 'bg')).toBe(
      'Здравей',
    );
    expect(
      formatMessage(
        {
          kind: 'key',
          key: 'scopes.chapterNamed',
          params: { chapter: { en: 'Sofia', bg: 'София' } },
        },
        t,
        'bg',
      ),
    ).toBe('Обител: София');
  });
});
