# Architecture rules
- Master-only saved records are shared through role-based Supabase policies, not account ownership filters, so all masters use the same library.
- CombatWorkspace owns independent tab snapshots; each tracker reports participants, initiative, turn, round and used groups for explicit shared saves.
- Loading a saved combat replaces the active tab through the shared state helper so other tabs remain unchanged.
- Map and NPC geography use nullable numeric continent/region fields with dependent options from map-geography and the same database validation trigger function; null represents Unknown, while character campaign associations remain independent.
- Use the RPG Dice Roller library for damage expressions so multiplication, division and parentheses follow mathematical precedence without evaluating JavaScript.
- Status Actual autosaves field-level patches on eight pre-existing shared rows; acknowledgements clear only matching sent values so edits made during a save survive.
- Live updates use one public broadcast channel ('app-sync') and refresh only after change notifications, never on a timer or window focus; notifications contain only table names, so RLS governs every read.
- Visited pages stay mounted (hidden) via KeepAlivePages so state and music playback survive navigation; pages with mount side effects opt out via `fresh`.
- Nonempty combat tabs automatically create shared saves, serialize subsequent writes and reload remote changes only when clean; players read every participant through get_combats_public, which strips non-player HP/AC.
