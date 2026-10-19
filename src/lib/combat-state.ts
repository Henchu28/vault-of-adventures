import { DiceRoll } from '@dice-roller/rpg-dice-roller';

export type Alignment = 'player' | 'monster' | 'npc' | 'structure' | 'other';
export type Combatant = {
  id: string; name: string; hp: number; maxHp: number; ac: number;
  initFormula: string; alignment: Alignment; initRoll: number | null; initBreakdown?: string;
};
export type CombatSnapshot = { combatants: Combatant[]; turnIdx: number; round: number; addedGroupIds: string[] };
export const emptyCombat = (): CombatSnapshot => ({ combatants: [], turnIdx: 0, round: 1, addedGroupIds: [] });
export function rollFormulaOnce(formula: string): { parts: string[]; total: number } | null {
  if (formula.length > 500 || /\d{5,}d/i.test(formula)) return null;
  try {
    const roll = new DiceRoll(formula);
    if (!Number.isFinite(roll.total)) return null;
    return { total: roll.total, parts: [roll.output.slice(roll.output.indexOf(': ') + 2, roll.output.lastIndexOf(' = '))] };
  } catch { return null; }
}
export function restoreCombat(value: unknown): CombatSnapshot {
  if (!value || typeof value !== 'object') return emptyCombat();
  const data = value as Partial<CombatSnapshot>;
  return {
    combatants: Array.isArray(data.combatants) ? data.combatants : [],
    turnIdx: typeof data.turnIdx === 'number' ? data.turnIdx : 0,
    round: typeof data.round === 'number' ? data.round : 1,
    addedGroupIds: Array.isArray(data.addedGroupIds) ? data.addedGroupIds : [],
  };
}
export const createStatusRows = () => Array.from({ length: 8 }, (_, index) => ({ slot: index + 1, name: '', max_hp: 0, current_hp: 0, notes: '' }));