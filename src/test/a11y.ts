import axe, { type Result, type RunOptions } from 'axe-core';

/**
 * Runs axe-core against a rendered tree (jsdom). Colour contrast cannot be computed in jsdom, so it
 * is disabled here (contrast is verified at the token level — see the token comments in src/styles/globals.css — and in E2E).
 *   expect(await axeViolations(container)).toEqual([]);
 */
export async function axeViolations(
  node: Element = document.body,
  options: RunOptions = {},
): Promise<Result[]> {
  const results = await axe.run(node, {
    ...options,
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
      ...options.rules,
    },
  });
  return results.violations;
}

/** Compact violation summary for readable assertion failures. */
export function summarizeViolations(violations: Result[]): string[] {
  return violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.length} node${v.nodes.length === 1 ? '' : 's'})`,
  );
}
