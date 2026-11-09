# Blob Gang

A multiplayer typing race in the browser. Players race as squishy jelly blob characters, and the passage text stays clean and readable while the blobs do the moving.

**Live app:** https://blobgang.lovable.app

## Features

- Create a race room and share its code, or join a friend's room by code
- Live race progress between players over a Supabase Realtime channel
- Solo mode with a ghost of a previous run to race against
- Six original blob characters (Zippy, Snooze, Grumbo, Bubbles, Captain Gloop, Mochi) drawn as one reusable SVG component with mood and animation variants
- Email sign-up with a unique username and a blob picker, profiles with totals and best WPM
- Results and leaderboard pages
- Optional narrator and sound effects with a control to turn them off

## How results are kept honest

Race stats are computed on the server, not trusted from the browser. Placement, points, result rows and profile totals are written by server-side SQL functions, and clients cannot write results or room state directly. Typing input accepts one character per insertion, so pasted or bulk-inserted text is rejected.

## Tech stack

React, TypeScript, TanStack Start and Router, Tailwind CSS, Framer Motion, Supabase (auth, Postgres with row-level security, Realtime), Vite, Vitest.

## Running locally

```sh
npm install
npm run dev
```

Other scripts: `npm run build`, `npm test`, `npm run lint`.

The committed `.env` contains only the project's public Supabase URL and publishable key, so a local run connects to the hosted backend. To run in isolation, point those values at your own Supabase project. Never commit service-role keys.

## Project notes

- `src/components/blob/Blob.tsx` is the blob character component; colours come from CSS tokens.
- `src/routes/` holds the file-based routes; signed-in pages live under `_authenticated/`.
- `src/lib/scoring.ts` has the WPM and accuracy calculations, with tests.
- `AGENTS.md` records the project's design rules.

## Status and license

Live and actively changing. Unit tests exist for scoring, routing and password recovery; they are run with `npm test`. No license has been specified yet.

## Built with

Built with AI assistance using [Lovable](https://lovable.dev) and edited by Rumman Hassan. Changes made in the Lovable editor are committed to this repository. Author: [Rumman Hassan](https://github.com/rummanhassan13) · [rummanhassan.cv](https://rummanhassan.cv)