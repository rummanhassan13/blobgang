# Blobgang

Create "Blob Gang": a funky, bubbly but minimalist multiplayer typing race web app (React + TypeScript + Tailwind + Framer Motion). Players race as squishy jelly blob characters instead of cars. The typing text must stay clean and highly readable; the blobs are the heroes. Use Lovable Cloud (Supabase) for auth, realtime and storage.

STEP 1 (this message): foundation, look and feel, blobs, auth, database.

LOOK AND FEEL
- Soft off-white background with 2-3 huge blurred pastel colour blobs slowly morphing (Framer Motion / CSS, GPU-friendly, behind everything).
- Fonts: Fredoka or Nunito for UI, a clean readable font (e.g. Inter or Atkinson Hyperlegible) for passage text.
- Pill-shaped buttons, rounded corners everywhere, springy hover states. Mobile responsive, keyboard-first on desktop.
- Design tokens in index.css / tailwind config, pastel palette.

BLOBS: 6 ORIGINAL blobs as reusable SVG React components (<Blob type size mood />) with simple dot eyes, no copyrighted characters:
1. Zippy: lime green teardrop
2. Snooze: lavender pancake (sleepy flat eyes)
3. Grumbo: red square-ish grump (grumpy brows)
4. Bubbles: pink sphere
5. Captain Gloop: blue blob with a little sailor hat
6. Mochi: peach blob with rosy cheeks
Support idle wobble, squash and stretch, jiggle, shake and happy-wobble animation variants via Framer Motion.

AUTH + PROFILES
- Email sign-up and login. Sign-up asks for username (unique) and chosen blob via a blob picker grid.
- profiles table (id references auth.users, username unique, blob, total_points, best_wpm, races_played, created_at) with trigger to create profile on sign-up, RLS so anyone authenticated can read profiles and users can only edit their own.

DATABASE (with RLS)
- passages (id, text, difficulty, length) seeded with 50 short original passages of varied length (roughly 15 to 60 words), clean ASCII punctuation.
- rooms (id, code, host_id, passage_id, status: lobby|countdown|racing|finished, starts_at, created_at)
- room_players (room_id, user_id, blob, username, progress, wpm, accuracy, finished_at, placement)
- race_results (id, user_id, room_id nullable, mode solo|multi, passage_id, wpm, accuracy, points, created_at)
- ghost_runs (user_id, passage_id, keystroke timeline json, wpm) for solo ghosts.

Pages (stubs fine for now): Landing, Auth, Home (create room, join by code, solo), Lobby, Race, Results, Leaderboard, Profile. Make the landing page lovely with blobs bouncing around. Build it cleanly and tell me what you did; I'll send follow-up steps for rooms, realtime race, solo ghost, results and leaderboard.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://blobgang.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f715cb09-df9b-4f7d-a0d6-3f399740ec54).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
