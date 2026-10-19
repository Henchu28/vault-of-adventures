# Architecture rules
- Master-only saved records are shared through role-based Supabase policies, not account ownership filters, so all masters use the same library.
- CombatWorkspace owns independent tab snapshots; each tracker reports participants, initiative, turn, round and used groups for explicit shared saves.
- Use the RPG Dice Roller library for damage expressions so multiplication, division and parentheses follow mathematical precedence without evaluating JavaScript.
- Status Actual uses eight pre-existing shared rows and field-level updates, preventing one user's save from overwriting unrelated fields.