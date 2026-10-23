# Architecture rules
- Master-only saved records are shared through role-based Supabase policies, not account ownership filters, so all masters use the same library.
- CombatWorkspace owns independent tab snapshots; each tracker reports participants, initiative, turn, round and used groups for explicit shared saves.
- Use the RPG Dice Roller library for damage expressions so multiplication, division and parentheses follow mathematical precedence without evaluating JavaScript.
- Status Actual uses eight pre-existing shared rows and field-level updates, preventing one user's save from overwriting unrelated fields.- Live updates use one public broadcast channel ('app-sync') fed by statement-level DB triggers that send only the table name; pages refetch, so RLS still governs what each user sees.
- Visited pages stay mounted (hidden) via KeepAlivePages so state and music playback survive navigation; pages with mount side effects opt out via `fresh`.
- Saved combat tabs autosave and reload remote changes; players read combats only through get_combats_public, which strips non-player HP/AC.
