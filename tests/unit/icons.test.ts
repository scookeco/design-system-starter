import { describe, expect, it } from 'vitest';
import * as icons from '../../src/components/Icon/icons';
import { iconsByName } from '../../src/components/Icon/names';
import * as entry from '../../src/index';

const definitions = Object.entries(icons);

describe('the icon set', () => {
  it('lists every icon once in names.ts, keyed by its own name', () => {
    expect(Object.keys(iconsByName)).toHaveLength(definitions.length);
    for (const [exportName, icon] of definitions) {
      expect(iconsByName[icon.name as keyof typeof iconsByName], `${exportName} is missing from iconsByName`).toBe(icon);
    }
  });

  it('names each export after its icon ("chevron-down" is ChevronDownIcon)', () => {
    for (const [exportName, icon] of definitions) {
      expect(exportName).toBe(`${icon.name.replace(/(^|-)([a-z])/g, (_match: string, _dash: string, letter: string) => letter.toUpperCase())}Icon`);
    }
  });

  it('exports every icon from the public entry', () => {
    for (const [exportName, icon] of definitions) expect((entry as Record<string, unknown>)[exportName]).toBe(icon);
  });
});
