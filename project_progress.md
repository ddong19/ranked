# Project Progress Documentation

## Overview
This document tracks the progress of rewriting the ranked project to make it cleaner and more buildable.

## Completed Work

### 1. Database Models (2025-10-30)

#### Ranking Model
Created in [src/models/Ranking.ts](src/models/Ranking.ts)
- `id: number` - Primary key
- `title: string` - Ranking title
- `description: string | null` - Optional description

#### Item Model
Created in [src/models/Item.ts](src/models/Item.ts)
- `id: number` - Primary key
- `name: string` - Item name
- `notes: string | null` - Optional notes
- `rank: number` - Item's rank position
- `ranking_id: number` - Foreign key reference to Ranking

### 2. Database Setup (2025-10-30)
- Created [src/db/database.ts](src/db/database.ts) with SQLite initialization
- Database file: `ranked.db` (persists locally)
- Integrated initialization into [App.tsx](App.tsx) on startup
- With expo-sqlite, the ranked.db file is stored locally on the device's filesystem. The data will persist:
    - Between app restarts
    - Even if you close and reopen the app
    - Until you uninstall the app or manually delete the database
    - The database is permanent storage on the device, not temporary or in-memory.
---

## Next Steps
- TBD
