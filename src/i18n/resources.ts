import bg from './bg.json';
import { SUPPORTED_LOCALES, type Locale } from './config';
import en from './en.json';

/** A nested translation tree as stored in the JSON files. */
export interface TranslationTree {
  [key: string]: string | TranslationTree;
}

interface JsonModule {
  default: TranslationTree;
}

/**
 * Fragment files let parallel feature teams own their strings without editing the central files:
 *   src/i18n/fragments/<feature>.en.json   and   src/i18n/fragments/<feature>.bg.json
 * Each fragment has exactly ONE top-level key: the feature namespace (e.g. { "news": { … } }).
 * Fragments are deep-merged over the central en.json / bg.json at startup.
 */
const enFragments = import.meta.glob<JsonModule>('./fragments/*.en.json', { eager: true });
const bgFragments = import.meta.glob<JsonModule>('./fragments/*.bg.json', { eager: true });

function isTree(value: unknown): value is TranslationTree {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Deep-merges `source` into a copy of `target`. Leaves in `source` win. */
export function deepMerge(target: TranslationTree, source: TranslationTree): TranslationTree {
  const out: TranslationTree = { ...target };
  for (const [key, value] of Object.entries(source)) {
    const existing = out[key];
    out[key] = isTree(existing) && isTree(value) ? deepMerge(existing, value) : value;
  }
  return out;
}

export interface ResourceSource {
  /** e.g. "en.json" or "fragments/news.en.json" */
  file: string;
  locale: Locale;
  tree: TranslationTree;
}

function fragmentSources(modules: Record<string, JsonModule>, locale: Locale): ResourceSource[] {
  return Object.entries(modules)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, mod]) => ({ file: path.replace(/^\.\//, ''), locale, tree: mod.default }));
}

/** Every translation source file, in merge order (central file first). Used by parity tests. */
export function getResourceSources(): ResourceSource[] {
  return [
    { file: 'en.json', locale: 'en', tree: en },
    { file: 'bg.json', locale: 'bg', tree: bg },
    ...fragmentSources(enFragments, 'en'),
    ...fragmentSources(bgFragments, 'bg'),
  ];
}

/** Final merged translation tree per locale (central + all fragments). */
export function buildResources(): Record<Locale, TranslationTree> {
  const sources = getResourceSources();
  const result = {} as Record<Locale, TranslationTree>;
  for (const locale of SUPPORTED_LOCALES) {
    result[locale] = sources
      .filter((s) => s.locale === locale)
      .reduce<TranslationTree>((acc, s) => deepMerge(acc, s.tree), {});
  }
  return result;
}

/** Flattens a tree to dotted keys: { a: { b: 'x' } } -> ['a.b']. */
export function flattenKeys(tree: TranslationTree, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isTree(value)) keys.push(...flattenKeys(value, path));
    else keys.push(path);
  }
  return keys;
}
