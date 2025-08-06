// TypeScript interfaces for the rankings database schema

// Database Type Definitions
export interface Database {
  public: {
    Tables: {
      ranking: {
        Row: {
          id: number;
          title: string;
          description: string | null;
        };
        Insert: {
          id?: number;
          title: string;
          description?: string | null;
        };
        Update: {
          id?: number;
          title?: string;
          description?: string | null;
        };
      };
      item: {
        Row: {
          id: number;
          name: string;
          notes: string | null;
          rank: number;
          ranking_id: number;
        };
        Insert: {
          id?: number;
          name: string;
          notes?: string | null;
          rank: number;
          ranking_id: number;
        };
        Update: {
          id?: number;
          name?: string;
          notes?: string | null;
          rank?: number;
          ranking_id?: number;
        };
      };
    };
  };
}

// Application Types (matching database schema)
export type Ranking = Database['public']['Tables']['ranking']['Row'];
export type RankingInsert = Database['public']['Tables']['ranking']['Insert'];
export type RankingUpdate = Database['public']['Tables']['ranking']['Update'];

export type Item = Database['public']['Tables']['item']['Row'];
export type ItemInsert = Database['public']['Tables']['item']['Insert'];
export type ItemUpdate = Database['public']['Tables']['item']['Update'];

// Extended types for app usage
export interface RankingWithItems extends Ranking {
  item: Item[];
}

// API Request types
export interface CreateRankingRequest {
  title: string;
  description?: string;
}

export interface CreateItemRequest {
  name: string;
  notes?: string;
  rank: number;
  ranking_id: number;
}

export interface UpdateItemRankRequest {
  id: number;
  rank: number;
}

// Local state management types
export interface RankingsState {
  rankings: RankingWithItems[];
  loading: boolean;
  error: string | null;
}