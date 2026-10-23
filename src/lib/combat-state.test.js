import { describe, expect, test } from 'bun:test';
import { createStatusRows, emptyCombat, restoreCombat, rollFormulaOnce } from './combat-state';

describe('Combat rules', () => {
  test('multiplication and division have precedence', () => {
    expect(rollFormulaOnce('2+3*4/2')?.total).toBe(8);
  });
  test('parentheses change the calculation order', () => {
    expect(rollFormulaOnce('(2+3)*4/2')?.total).toBe(10);
  });
  test('dice participate in multiplication and division', () => {
    expect(rollFormulaOnce('(2d1+4)*3/2')?.total).toBe(9);
  });
  test('dice never produce zero', () => {
    expect(rollFormulaOnce('100d1')?.total).toBe(100);
  });
  test('independent combats do not share participants', () => {
    const first = emptyCombat(); const second = emptyCombat();
    first.addedGroupIds.push('azur');
    expect(second.addedGroupIds).toEqual([]);
  });
  test('saved combat restores participants, armor, health, turns, round and groups', () => {
    const state = { combatants: [{ id: 'shinro', name: 'Shinro', hp: 21, maxHp: 40, ac: 17, initFormula: '1d20+3', alignment: 'player', initRoll: 19 }], turnIdx: 0, round: 4, addedGroupIds: ['azur'] };
    expect(restoreCombat(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });
  test('status board has exactly eight editable slots', () => {
    expect(createStatusRows().map(row => row.slot)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
import { stableStringify } from './combat-state';
describe('Live combat sync', () => {
  test('key order does not change the comparison with the database copy', () => {
    expect(stableStringify({ round: 2, turnIdx: 1, combatants: [{ name: 'Auryn', hp: 5 }] }))
      .toBe(stableStringify({ combatants: [{ hp: 5, name: 'Auryn' }], turnIdx: 1, round: 2 }));
  });
  test('a different HP is detected as a change', () => {
    expect(stableStringify({ hp: 5 })).not.toBe(stableStringify({ hp: 4 }));
  });
});
