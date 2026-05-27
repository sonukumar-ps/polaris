export type EntryOrderType = 'pending_buy_stop' | 'pending_sell_stop' | 'market';
export type ManagementOption = 'basic' | 'intermediate' | 'advanced';

export type OrderManagementInput = {
  checklistId?: string | null;
  entryOrderType?: EntryOrderType | null;
  intendedEntryPrice?: number | null;
  isBulletproof?: boolean | null;
  managementOption?: ManagementOption | null;
  orderExpiredAt?: string | null;  // ISO timestamptz
  orderExpiry?: boolean | null;    // convenience: did the order expire?
  orderPlacedAt?: string | null;   // ISO timestamptz
  orderTriggered?: boolean | null;
  rrToLastSwing?: number | null;
  rrToNextSr?: number | null;
  slippagePips?: number | null;
  trailingStopCount?: number | null;
};

export type StopLossHistoryInput = {
  movedAt?: string;  // ISO timestamptz — defaults to now()
  newPrice: number;
  oldPrice: number;
  reason?: string;
  tradeId: string;
};

export type StopLossHistoryRow = {
  created_at: string;
  id: string;
  moved_at: string;
  new_price: number;
  old_price: number;
  reason: string | null;
  trade_id: string;
  user_id: string;
};
