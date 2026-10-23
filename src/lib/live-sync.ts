export const SHARED_REFRESH_MS = 3000;
export const AUTOSAVE_DELAY_MS = 600;

/** A successful write may only acknowledge the exact field values it sent. */
export function acknowledgePatch<T extends object>(pending: Partial<T>, sent: Partial<T>): Partial<T> {
  const remaining = { ...pending };
  for (const key of Object.keys(sent) as (keyof T)[]) {
    if (Object.is(remaining[key], sent[key])) delete remaining[key];
  }
  return remaining;
}

export function shouldShareCombat(state: { combatants: unknown[] }, savedId?: string): boolean {
  return Boolean(savedId) || state.combatants.length > 0;
}