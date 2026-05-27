export type SrLevelType = 'horizontal' | 'angular_trendline' | 'dynamic_ema';
export type SrLevelRole = 'support' | 'resistance' | 'flip_zone';

export type SrLevelInput = {
  isActive?: boolean;
  lastTouchedDate?: string | null;
  levelRole?: SrLevelRole | null;
  notes?: string | null;
  price: number;
  symbol: string;
  touchCount?: number;
  type: SrLevelType;
};

export type SrLevelRow = {
  created_at: string;
  id: string;
  is_active: boolean;
  last_touched_date: string | null;
  level_role: string | null;
  notes: string | null;
  price: number;
  symbol: string;
  touch_count: number;
  type: string;
  updated_at: string;
  user_id: string;
};
