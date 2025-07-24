// TypeScript interfaces matching your Django backend models

export interface RankingItem {
  id: number; // Django auto-generated ID
  name: string; // matches your Item.name field
  notes?: string; // matches your Item.notes field
  rank: number; // matches your Item.rank field
  ranking: number; // foreign key to RankingList ID
}

export interface RankingList {
  id: number; // Django auto-generated ID
  title: string; // matches your RankingList.title field
  description?: string; // matches your RankingList.description field
  items?: RankingItem[]; // populated items for this ranking
}

// Additional interfaces for API responses
export interface CreateRankingRequest {
  title: string;
  description?: string;
}

export interface CreateItemRequest {
  name: string;
  notes?: string;
  rank: number;
  ranking: number;
}

export interface UpdateItemRankRequest {
  id: number;
  rank: number;
}

// Local state management types
export interface LocalRankingState {
  rankings: RankingList[];
  loading: boolean;
  error: string | null;
}

// Suggested additions for your Django models:
// 1. Add created_at and updated_at timestamps
// 2. Add user field for multi-user support: user = models.ForeignKey(User, on_delete=models.CASCADE)
// 3. Add category field: category = models.CharField(max_length=50, blank=True)
// 4. Add color field: color = models.CharField(max_length=7, default="#0a7ea4")  // hex color
// 5. Add is_public field: is_public = models.BooleanField(default=False)