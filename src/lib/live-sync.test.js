import { describe, expect, test } from 'bun:test';
import { acknowledgePatch, AUTOSAVE_DELAY_MS, shouldShareCombat } from './live-sync';

describe('Automatic shared updates', () => {
  test('a new combat with a monster is shared without manual saving', () => {
    expect(shouldShareCombat({ combatants: [{ name: 'Goblin', alignment: 'monster' }] })).toBe(true);
    expect(shouldShareCombat({ combatants: [] })).toBe(false);
  });
  test('removing all participants from a saved combat is shared', () => {
    expect(shouldShareCombat({ combatants: [] }, 'saved-combat')).toBe(true);
  });
  test('Status Actual automatically saves after a short typing pause', () => {
    expect(AUTOSAVE_DELAY_MS).toBeGreaterThan(0);
    expect(AUTOSAVE_DELAY_MS).toBeLessThanOrEqual(1000);
  });
  test('saving a name does not clear newer health or annotation edits', () => {
    expect(acknowledgePatch({ name: 'Auryn', current_hp: 12, notes: 'Veneno' }, { name: 'Auryn' }))
      .toEqual({ current_hp: 12, notes: 'Veneno' });
  });
  test('an older health save does not acknowledge a newer health edit', () => {
    expect(acknowledgePatch({ current_hp: 9 }, { current_hp: 12 })).toEqual({ current_hp: 9 });
  });
});