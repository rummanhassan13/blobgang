<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Blob characters are a single SVG component (`src/components/blob/Blob.tsx`) driven by `type`/`mood`/`animation` props; colours come from `--blob-*` tokens so palette changes stay in CSS.
- Signed-in pages live under `src/routes/_authenticated/` (client-only gate); landing and auth stay public.
- Profiles are created by an `auth.users` trigger from signup metadata (username, blob); usernames are unique case-insensitively and pre-checked via the `username_available` RPC.
- Race stats (wpm, accuracy, placement, points, profile totals) are written only by the `submitResult` server function using the admin client; clients have no INSERT/UPDATE on room_players/race_results and only `blob` on profiles. Room state changes go through SECURITY DEFINER RPCs (join_room, start_race, advance_room, set_player_connected).
- Live race progress goes over a Realtime broadcast/presence channel, never DB writes; supabase-js RPC calls must be awaited or `.then()`'d or they never run.
