# Ranked

A mobile app for creating and managing ranked lists. Think tier lists, top-10s, personal favorites — anything where order matters. Built with React Native and Expo, with optional cloud sync via Supabase.

---

## What it does

The core loop is simple: create a ranking, add items to it, drag them into order. Each item can have a short note attached. You can also paste in a whole list at once — the app parses numbered lists, bullet points, and comma-separated formats automatically.

The more interesting design decision is around authentication. Users aren't asked to sign in to use the app. Everything works immediately with data stored locally on device. An account only becomes relevant if you want cloud backup or multi-device access — and when you do sign up, your local data migrates over rather than disappearing.

---

## Tech stack

**Mobile / Frontend**
- React Native + Expo (~54)
- TypeScript with strict mode
- Expo Router for file-based navigation
- React Native Reanimated + Gesture Handler for drag-to-reorder and swipe-to-delete
- React Context for auth state

**Local storage**
- SQLite via expo-sqlite — rankings and items persist locally even without an account

**Backend / Cloud**
- Supabase (PostgreSQL + Auth)
- Email/password auth with session persistence via Async Storage
- Row Level Security on all cloud tables

---

## Project structure

```
app/                     # Expo Router screens (file-based routing)
  index.tsx              # Home — list of all rankings
  login.tsx              # Sign in / sign up
  profile.tsx            # Account info
  add-ranking.tsx
  ranking/[id]/          # Dynamic routes for a single ranking
    index.tsx
    add-item.tsx
    edit-item.tsx
    edit.tsx

src/
  components/            # Shared UI components
  contexts/              # AuthContext — user session, login, logout
  db/                    # SQLite setup + RankingService (all CRUD ops)
  lib/                   # Supabase client init
  logic/                 # useRankings hook — data fetching and mutation
  models/                # TypeScript types for Ranking and Item
  screens/               # Page-level components wired to app/ routes
  utils/                 # parseRankingListInput — bulk paste parsing

docs/                    # Architecture notes and Supabase schema
```

---

## Architecture notes

**Offline-first with optional sync.** SQLite is the source of truth on device. Every operation hits the local database first. Supabase is layered on top for users who want persistence beyond the device. The schema mirrors between local and cloud, with a `synced` flag tracking what's made it up.

**Anonymous → authenticated migration.** Anonymous users get a local `user_id = "anonymous"` — a real foreign key, not a null. When they sign up, that data gets migrated and re-keyed to their account. The goal was to avoid the conversion-killing "sign up before you can try it" pattern.

**RankingService as a static service layer.** All database interactions go through `src/db/rankingService.ts` — no direct SQL in components or hooks. This made it straightforward to add the Supabase layer without touching UI code.

**useRankings hook.** Maintains both an array (for rendering the list) and a Map (for O(1) item lookup by ID). Handles database initialization on first load and keeps both structures in sync.

**Bulk list parsing.** `parseRankingListInput` handles the common formats people use when copying lists from other places — numbered (`1. Item`), bulleted (`- Item`, `• Item`), inline notes (`Item (context here)`). Reasonable heuristics rather than strict format enforcement.

---

## Getting started

**Prerequisites:** Node.js, Expo CLI, and a Supabase project with the schema from `docs/supabase-schema.sql`.

```bash
npm install
```

Create a `.env` file in the project root:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

```bash
npx expo start
```

Then open in Expo Go (phone) or an iOS/Android simulator.