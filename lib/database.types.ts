export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          broker_name: string | null
          created_at: string
          currency: string
          id: string
          is_archived: boolean
          is_main: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          broker_name?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_archived?: boolean
          is_main?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          broker_name?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_archived?: boolean
          is_main?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_class: Database["public"]["Enums"]["asset_class"]
          created_at: string
          currency: string
          exchange: string | null
          id: string
          name: string | null
          symbol: string
        }
        Insert: {
          asset_class?: Database["public"]["Enums"]["asset_class"]
          created_at?: string
          currency?: string
          exchange?: string | null
          id?: string
          name?: string | null
          symbol: string
        }
        Update: {
          asset_class?: Database["public"]["Enums"]["asset_class"]
          created_at?: string
          currency?: string
          exchange?: string | null
          id?: string
          name?: string | null
          symbol?: string
        }
        Relationships: []
      }
      daily_account_snapshots: {
        Row: {
          account_id: string
          cash_balance: number | null
          created_at: string
          equity: number
          id: string
          realized_pnl: number | null
          snapshot_date: string
          user_id: string
        }
        Insert: {
          account_id: string
          cash_balance?: number | null
          created_at?: string
          equity: number
          id?: string
          realized_pnl?: number | null
          snapshot_date: string
          user_id: string
        }
        Update: {
          account_id?: string
          cash_balance?: number | null
          created_at?: string
          equity?: number
          id?: string
          realized_pnl?: number | null
          snapshot_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_account_snapshots_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_account_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          base_currency: string
          created_at: string
          display_name: string | null
          id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          base_currency?: string
          created_at?: string
          display_name?: string | null
          id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          display_name?: string | null
          id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      sr_levels: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_touched_date: string | null
          level_role: string | null
          notes: string | null
          price: number
          symbol: string
          touch_count: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_touched_date?: string | null
          level_role?: string | null
          notes?: string | null
          price: number
          symbol: string
          touch_count?: number
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_touched_date?: string | null
          level_role?: string | null
          notes?: string | null
          price?: number
          symbol?: string
          touch_count?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sr_levels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stop_loss_history: {
        Row: {
          created_at: string
          id: string
          moved_at: string
          new_price: number
          old_price: number
          reason: string | null
          trade_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          moved_at?: string
          new_price: number
          old_price: number
          reason?: string | null
          trade_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          moved_at?: string
          new_price?: number
          old_price?: number
          reason?: string | null
          trade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stop_loss_history_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stop_loss_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      strategies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_archived: boolean
          market_conditions: string | null
          must_have_rules: string[]
          name: string
          preferred_rules: string[]
          qualitative_notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          market_conditions?: string | null
          must_have_rules?: string[]
          name: string
          preferred_rules?: string[]
          qualitative_notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          market_conditions?: string | null
          must_have_rules?: string[]
          name?: string
          preferred_rules?: string[]
          qualitative_notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_checklists: {
        Row: {
          candlestick_pattern: string | null
          checklist_date: string
          correlation_pairs: string[] | null
          created_at: string
          deceleration_evidence: string | null
          deceleration_pass: boolean | null
          decision: string | null
          decision_reason: string | null
          direction: string | null
          ema_zone_visited_pass: boolean | null
          ema50_position_pass: boolean | null
          emotional_rating: number | null
          id: string
          indicator_signal: string | null
          market_condition_note: string | null
          market_condition_pass: boolean | null
          market_phase: string | null
          market_phase_pass: boolean | null
          mtf_confirmation: string | null
          news_check_clear: boolean | null
          reversal_pattern: string | null
          reversal_sr_pass: boolean | null
          rr_on_trade: number | null
          rr_to_last_swing: number | null
          rr_to_next_sr: number | null
          sr_reaction_pass: boolean | null
          sr_touch_count: number | null
          sr_types: string[] | null
          strategy_id: string
          strategy_type: string
          symbol: string
          total_sr_touches: number | null
          trade_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          candlestick_pattern?: string | null
          checklist_date: string
          correlation_pairs?: string[] | null
          created_at?: string
          deceleration_evidence?: string | null
          deceleration_pass?: boolean | null
          decision?: string | null
          decision_reason?: string | null
          direction?: string | null
          ema_zone_visited_pass?: boolean | null
          ema50_position_pass?: boolean | null
          emotional_rating?: number | null
          id?: string
          indicator_signal?: string | null
          market_condition_note?: string | null
          market_condition_pass?: boolean | null
          market_phase?: string | null
          market_phase_pass?: boolean | null
          mtf_confirmation?: string | null
          news_check_clear?: boolean | null
          reversal_pattern?: string | null
          reversal_sr_pass?: boolean | null
          rr_on_trade?: number | null
          rr_to_last_swing?: number | null
          rr_to_next_sr?: number | null
          sr_reaction_pass?: boolean | null
          sr_touch_count?: number | null
          sr_types?: string[] | null
          strategy_id: string
          strategy_type?: string
          symbol: string
          total_sr_touches?: number | null
          trade_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          candlestick_pattern?: string | null
          checklist_date?: string
          correlation_pairs?: string[] | null
          created_at?: string
          deceleration_evidence?: string | null
          deceleration_pass?: boolean | null
          decision?: string | null
          decision_reason?: string | null
          direction?: string | null
          ema_zone_visited_pass?: boolean | null
          ema50_position_pass?: boolean | null
          emotional_rating?: number | null
          id?: string
          indicator_signal?: string | null
          market_condition_note?: string | null
          market_condition_pass?: boolean | null
          market_phase?: string | null
          market_phase_pass?: boolean | null
          mtf_confirmation?: string | null
          news_check_clear?: boolean | null
          reversal_pattern?: string | null
          reversal_sr_pass?: boolean | null
          rr_on_trade?: number | null
          rr_to_last_swing?: number | null
          rr_to_next_sr?: number | null
          sr_reaction_pass?: boolean | null
          sr_touch_count?: number | null
          sr_types?: string[] | null
          strategy_id?: string
          strategy_type?: string
          symbol?: string
          total_sr_touches?: number | null
          trade_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_checklists_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_checklists_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_checklists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          type: Database["public"]["Enums"]["tag_type"]
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          type?: Database["public"]["Enums"]["tag_type"]
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["tag_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_images: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          storage_path: string
          trade_id: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          storage_path: string
          trade_id: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          storage_path?: string
          trade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_images_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_images_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_psychology: {
        Row: {
          conviction_level: number | null
          created_at: string
          emotional_state: string | null
          energy_level: number | null
          entry_timing: string | null
          exit_timing: string | null
          focus_level: number | null
          followed_plan: boolean | null
          htf_bias: string | null
          id: string
          lesson: string | null
          market_condition: string | null
          moved_stop_loss: boolean | null
          moved_take_profit: boolean | null
          position_size_adherence: string | null
          session: string | null
          setup_quality: number | null
          trade_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conviction_level?: number | null
          created_at?: string
          emotional_state?: string | null
          energy_level?: number | null
          entry_timing?: string | null
          exit_timing?: string | null
          focus_level?: number | null
          followed_plan?: boolean | null
          htf_bias?: string | null
          id?: string
          lesson?: string | null
          market_condition?: string | null
          moved_stop_loss?: boolean | null
          moved_take_profit?: boolean | null
          position_size_adherence?: string | null
          session?: string | null
          setup_quality?: number | null
          trade_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conviction_level?: number | null
          created_at?: string
          emotional_state?: string | null
          energy_level?: number | null
          entry_timing?: string | null
          exit_timing?: string | null
          focus_level?: number | null
          followed_plan?: boolean | null
          htf_bias?: string | null
          id?: string
          lesson?: string | null
          market_condition?: string | null
          moved_stop_loss?: boolean | null
          moved_take_profit?: boolean | null
          position_size_adherence?: string | null
          session?: string | null
          setup_quality?: number | null
          trade_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_psychology_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: true
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_psychology_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_tags: {
        Row: {
          created_at: string
          tag_id: string
          trade_id: string
        }
        Insert: {
          created_at?: string
          tag_id: string
          trade_id: string
        }
        Update: {
          created_at?: string
          tag_id?: string
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_tags_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          account_id: string
          asset_id: string
          checklist_id: string | null
          closed_at: string | null
          created_at: string
          direction: Database["public"]["Enums"]["trade_direction"]
          entry_order_type: string | null
          entry_price: number
          exit_price: number | null
          fees: number
          gross_pnl: number | null
          htf_timeframe: string | null
          id: string
          intended_entry_price: number | null
          is_bulletproof: boolean | null
          management_option: string | null
          net_pnl: number | null
          notes: string | null
          opened_at: string
          order_expired: boolean | null
          order_expiry_at: string | null
          order_placed_at: string | null
          order_triggered: boolean | null
          planned_rr: number | null
          quantity: number
          r_multiple: number | null
          risk_amount: number | null
          rr_to_last_swing: number | null
          rr_to_next_sr: number | null
          slippage_pips: number | null
          status: Database["public"]["Enums"]["trade_status"]
          stop_loss_price: number | null
          strategy_id: string | null
          take_profit_price: number | null
          timeframe: string | null
          trailing_stop_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          asset_id: string
          checklist_id?: string | null
          closed_at?: string | null
          created_at?: string
          direction: Database["public"]["Enums"]["trade_direction"]
          entry_order_type?: string | null
          entry_price: number
          exit_price?: number | null
          fees?: number
          gross_pnl?: number | null
          htf_timeframe?: string | null
          id?: string
          intended_entry_price?: number | null
          is_bulletproof?: boolean | null
          management_option?: string | null
          net_pnl?: number | null
          notes?: string | null
          opened_at: string
          order_expired?: boolean | null
          order_expiry_at?: string | null
          order_placed_at?: string | null
          order_triggered?: boolean | null
          planned_rr?: number | null
          quantity: number
          r_multiple?: number | null
          risk_amount?: number | null
          rr_to_last_swing?: number | null
          rr_to_next_sr?: number | null
          slippage_pips?: number | null
          status?: Database["public"]["Enums"]["trade_status"]
          stop_loss_price?: number | null
          strategy_id?: string | null
          take_profit_price?: number | null
          timeframe?: string | null
          trailing_stop_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          asset_id?: string
          checklist_id?: string | null
          closed_at?: string | null
          created_at?: string
          direction?: Database["public"]["Enums"]["trade_direction"]
          entry_order_type?: string | null
          entry_price?: number
          exit_price?: number | null
          fees?: number
          gross_pnl?: number | null
          htf_timeframe?: string | null
          id?: string
          intended_entry_price?: number | null
          is_bulletproof?: boolean | null
          management_option?: string | null
          net_pnl?: number | null
          notes?: string | null
          opened_at?: string
          order_expired?: boolean | null
          order_expiry_at?: string | null
          order_placed_at?: string | null
          order_triggered?: boolean | null
          planned_rr?: number | null
          quantity?: number
          r_multiple?: number | null
          risk_amount?: number | null
          rr_to_last_swing?: number | null
          rr_to_next_sr?: number | null
          slippage_pips?: number | null
          status?: Database["public"]["Enums"]["trade_status"]
          stop_loss_price?: number | null
          strategy_id?: string | null
          take_profit_price?: number | null
          timeframe?: string | null
          trailing_stop_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "strategy_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      asset_class: "stock" | "option" | "future" | "forex" | "crypto" | "other"
      tag_type:
        | "strategy"
        | "emotion"
        | "mistake"
        | "setup"
        | "session"
        | "custom"
        | "psychology"
        | "market_context"
      trade_direction: "long" | "short"
      trade_status: "open" | "closed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      asset_class: ["stock", "option", "future", "forex", "crypto", "other"],
      tag_type: [
        "strategy",
        "emotion",
        "mistake",
        "setup",
        "session",
        "custom",
        "psychology",
        "market_context",
      ],
      trade_direction: ["long", "short"],
      trade_status: ["open", "closed", "cancelled"],
    },
  },
} as const
