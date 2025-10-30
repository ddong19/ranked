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

---

## Next Steps
- TBD
