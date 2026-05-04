export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          account_name: string | null;
          account_type: string | null;
          archived_at: string | null;
          balance_amount: number | null;
          balance_at: string | null;
          connection_id: string | null;
          created_at: string;
          currency_code: string;
          external_id: string | null;
          iban: string | null;
          id: string;
          updated_at: string;
          wallet_id: string;
        };
        Insert: {
          account_name?: string | null;
          account_type?: string | null;
          archived_at?: string | null;
          balance_amount?: number | null;
          balance_at?: string | null;
          connection_id?: string | null;
          created_at?: string;
          currency_code: string;
          external_id?: string | null;
          iban?: string | null;
          id?: string;
          updated_at?: string;
          wallet_id: string;
        };
        Update: {
          account_name?: string | null;
          account_type?: string | null;
          archived_at?: string | null;
          balance_amount?: number | null;
          balance_at?: string | null;
          connection_id?: string | null;
          created_at?: string;
          currency_code?: string;
          external_id?: string | null;
          iban?: string | null;
          id?: string;
          updated_at?: string;
          wallet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bank_accounts_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: false;
            referencedRelation: "bank_connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bank_accounts_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: false;
            referencedRelation: "bank_connections_safe";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bank_accounts_wallet_id_fkey";
            columns: ["wallet_id"];
            isOneToOne: false;
            referencedRelation: "wallets";
            referencedColumns: ["id"];
          },
        ];
      };
      bank_connections: {
        Row: {
          consent_expires_at: string | null;
          created_at: string;
          encrypted_credentials: string | null;
          external_id: string;
          id: string;
          institution_id: string;
          institution_logo: string | null;
          institution_name: string;
          last_error: string | null;
          last_error_at: string | null;
          last_synced_at: string | null;
          provider: string;
          status: Database["public"]["Enums"]["connection_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          consent_expires_at?: string | null;
          created_at?: string;
          encrypted_credentials?: string | null;
          external_id: string;
          id?: string;
          institution_id: string;
          institution_logo?: string | null;
          institution_name: string;
          last_error?: string | null;
          last_error_at?: string | null;
          last_synced_at?: string | null;
          provider: string;
          status?: Database["public"]["Enums"]["connection_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          consent_expires_at?: string | null;
          created_at?: string;
          encrypted_credentials?: string | null;
          external_id?: string;
          id?: string;
          institution_id?: string;
          institution_logo?: string | null;
          institution_name?: string;
          last_error?: string | null;
          last_error_at?: string | null;
          last_synced_at?: string | null;
          provider?: string;
          status?: Database["public"]["Enums"]["connection_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bank_connections_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          archived_at: string | null;
          color: string | null;
          created_at: string;
          direction: Database["public"]["Enums"]["transaction_direction"] | null;
          display_order: number;
          emoji: string | null;
          group_id: string | null;
          id: string;
          name: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          archived_at?: string | null;
          color?: string | null;
          created_at?: string;
          direction?: Database["public"]["Enums"]["transaction_direction"] | null;
          display_order?: number;
          emoji?: string | null;
          group_id?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          archived_at?: string | null;
          color?: string | null;
          created_at?: string;
          direction?: Database["public"]["Enums"]["transaction_direction"] | null;
          display_order?: number;
          emoji?: string | null;
          group_id?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "categories_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "category_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "categories_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      category_groups: {
        Row: {
          archived_at: string | null;
          color: string | null;
          created_at: string;
          display_order: number;
          emoji: string | null;
          id: string;
          name: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          archived_at?: string | null;
          color?: string | null;
          created_at?: string;
          display_order?: number;
          emoji?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          archived_at?: string | null;
          color?: string | null;
          created_at?: string;
          display_order?: number;
          emoji?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "category_groups_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      classification_history: {
        Row: {
          category_id: string | null;
          confidence: number | null;
          id: string;
          occurred_at: string;
          reasoning: string | null;
          source: Database["public"]["Enums"]["classification_source"];
          source_ref: string | null;
          transaction_id: string;
        };
        Insert: {
          category_id?: string | null;
          confidence?: number | null;
          id?: string;
          occurred_at?: string;
          reasoning?: string | null;
          source: Database["public"]["Enums"]["classification_source"];
          source_ref?: string | null;
          transaction_id: string;
        };
        Update: {
          category_id?: string | null;
          confidence?: number | null;
          id?: string;
          occurred_at?: string;
          reasoning?: string | null;
          source?: Database["public"]["Enums"]["classification_source"];
          source_ref?: string | null;
          transaction_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "classification_history_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "classification_history_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      exchange_rates: {
        Row: {
          base_currency: string;
          date: string;
          fetched_at: string;
          rate: number;
          source: string;
          target_currency: string;
        };
        Insert: {
          base_currency: string;
          date: string;
          fetched_at?: string;
          rate: number;
          source?: string;
          target_currency: string;
        };
        Update: {
          base_currency?: string;
          date?: string;
          fetched_at?: string;
          rate?: number;
          source?: string;
          target_currency?: string;
        };
        Relationships: [];
      };
      patterns: {
        Row: {
          active: boolean;
          category_id: string;
          created_at: string;
          id: string;
          manual_confirmations: number;
          manual_overrides: number;
          match_count: number;
          pattern: string;
          pattern_type: string;
          region: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          category_id: string;
          created_at?: string;
          id?: string;
          manual_confirmations?: number;
          manual_overrides?: number;
          match_count?: number;
          pattern: string;
          pattern_type: string;
          region?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          category_id?: string;
          created_at?: string;
          id?: string;
          manual_confirmations?: number;
          manual_overrides?: number;
          match_count?: number;
          pattern?: string;
          pattern_type?: string;
          region?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "patterns_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      rules: {
        Row: {
          active: boolean;
          category_id: string;
          created_at: string;
          id: string;
          match_amount_max: number | null;
          match_amount_min: number | null;
          match_count: number;
          match_kind: Database["public"]["Enums"]["transaction_kind"] | null;
          match_merchant: string | null;
          match_type: string | null;
          priority: number;
          set_notes: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          category_id: string;
          created_at?: string;
          id?: string;
          match_amount_max?: number | null;
          match_amount_min?: number | null;
          match_count?: number;
          match_kind?: Database["public"]["Enums"]["transaction_kind"] | null;
          match_merchant?: string | null;
          match_type?: string | null;
          priority?: number;
          set_notes?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          category_id?: string;
          created_at?: string;
          id?: string;
          match_amount_max?: number | null;
          match_amount_min?: number | null;
          match_count?: number;
          match_kind?: Database["public"]["Enums"]["transaction_kind"] | null;
          match_merchant?: string | null;
          match_type?: string | null;
          priority?: number;
          set_notes?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rules_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rules_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      sync_state: {
        Row: {
          account_id: string | null;
          completed_at: string | null;
          connection_id: string;
          created_at: string;
          error_message: string | null;
          id: string;
          retryable: boolean | null;
          started_at: string;
          status: Database["public"]["Enums"]["sync_status"];
          transaction_count: number;
        };
        Insert: {
          account_id?: string | null;
          completed_at?: string | null;
          connection_id: string;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          retryable?: boolean | null;
          started_at?: string;
          status: Database["public"]["Enums"]["sync_status"];
          transaction_count?: number;
        };
        Update: {
          account_id?: string | null;
          completed_at?: string | null;
          connection_id?: string;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          retryable?: boolean | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["sync_status"];
          transaction_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sync_state_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sync_state_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: false;
            referencedRelation: "bank_connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sync_state_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: false;
            referencedRelation: "bank_connections_safe";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          account_id: string | null;
          amount: number;
          archived_at: string | null;
          awaiting_payment_id: string | null;
          booked_at: string;
          category_id: string | null;
          classification_confidence: number | null;
          classification_source: Database["public"]["Enums"]["classification_source"] | null;
          classified_at: string | null;
          created_at: string;
          currency_code: string;
          description: string | null;
          direction: Database["public"]["Enums"]["transaction_direction"];
          external_id: string | null;
          fx_rate: number | null;
          fx_source_amount: number | null;
          fx_source_currency: string | null;
          hidden: boolean;
          id: string;
          internal_dedupe_key: string | null;
          kind: Database["public"]["Enums"]["transaction_kind"];
          merchant_normalized: string | null;
          merchant_raw: string | null;
          notes: string | null;
          provider: string | null;
          raw: Json | null;
          updated_at: string;
          value_at: string;
          wallet_id: string;
        };
        Insert: {
          account_id?: string | null;
          amount: number;
          archived_at?: string | null;
          awaiting_payment_id?: string | null;
          booked_at: string;
          category_id?: string | null;
          classification_confidence?: number | null;
          classification_source?: Database["public"]["Enums"]["classification_source"] | null;
          classified_at?: string | null;
          created_at?: string;
          currency_code: string;
          description?: string | null;
          direction: Database["public"]["Enums"]["transaction_direction"];
          external_id?: string | null;
          fx_rate?: number | null;
          fx_source_amount?: number | null;
          fx_source_currency?: string | null;
          hidden?: boolean;
          id?: string;
          internal_dedupe_key?: string | null;
          kind?: Database["public"]["Enums"]["transaction_kind"];
          merchant_normalized?: string | null;
          merchant_raw?: string | null;
          notes?: string | null;
          provider?: string | null;
          raw?: Json | null;
          updated_at?: string;
          value_at: string;
          wallet_id: string;
        };
        Update: {
          account_id?: string | null;
          amount?: number;
          archived_at?: string | null;
          awaiting_payment_id?: string | null;
          booked_at?: string;
          category_id?: string | null;
          classification_confidence?: number | null;
          classification_source?: Database["public"]["Enums"]["classification_source"] | null;
          classified_at?: string | null;
          created_at?: string;
          currency_code?: string;
          description?: string | null;
          direction?: Database["public"]["Enums"]["transaction_direction"];
          external_id?: string | null;
          fx_rate?: number | null;
          fx_source_amount?: number | null;
          fx_source_currency?: string | null;
          hidden?: boolean;
          id?: string;
          internal_dedupe_key?: string | null;
          kind?: Database["public"]["Enums"]["transaction_kind"];
          merchant_normalized?: string | null;
          merchant_raw?: string | null;
          notes?: string | null;
          provider?: string | null;
          raw?: Json | null;
          updated_at?: string;
          value_at?: string;
          wallet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey";
            columns: ["wallet_id"];
            isOneToOne: false;
            referencedRelation: "wallets";
            referencedColumns: ["id"];
          },
        ];
      };
      user_preferences: {
        Row: {
          created_at: string;
          display_currency: string;
          email_notifications: boolean;
          period_mode: Database["public"]["Enums"]["period_mode"];
          posthog_opt_in: boolean;
          theme: string;
          updated_at: string;
          user_id: string;
          week_start: number;
        };
        Insert: {
          created_at?: string;
          display_currency: string;
          email_notifications?: boolean;
          period_mode?: Database["public"]["Enums"]["period_mode"];
          posthog_opt_in?: boolean;
          theme?: string;
          updated_at?: string;
          user_id: string;
          week_start?: number;
        };
        Update: {
          created_at?: string;
          display_currency?: string;
          email_notifications?: boolean;
          period_mode?: Database["public"]["Enums"]["period_mode"];
          posthog_opt_in?: boolean;
          theme?: string;
          updated_at?: string;
          user_id?: string;
          week_start?: number;
        };
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          archived_at: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          region: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          region: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          region?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      wallets: {
        Row: {
          archived_at: string | null;
          color: string | null;
          created_at: string;
          currency_code: string;
          emoji: string | null;
          id: string;
          manual: boolean;
          name: string;
          owner_id: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          color?: string | null;
          created_at?: string;
          currency_code: string;
          emoji?: string | null;
          id?: string;
          manual?: boolean;
          name: string;
          owner_id: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          color?: string | null;
          created_at?: string;
          currency_code?: string;
          emoji?: string | null;
          id?: string;
          manual?: boolean;
          name?: string;
          owner_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wallets_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      bank_connections_safe: {
        Row: {
          consent_expires_at: string | null;
          created_at: string | null;
          id: string | null;
          institution_id: string | null;
          institution_logo: string | null;
          institution_name: string | null;
          last_error: string | null;
          last_error_at: string | null;
          last_synced_at: string | null;
          provider: string | null;
          status: Database["public"]["Enums"]["connection_status"] | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          consent_expires_at?: string | null;
          created_at?: string | null;
          id?: string | null;
          institution_id?: string | null;
          institution_logo?: string | null;
          institution_name?: string | null;
          last_error?: string | null;
          last_error_at?: string | null;
          last_synced_at?: string | null;
          provider?: string | null;
          status?: Database["public"]["Enums"]["connection_status"] | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          consent_expires_at?: string | null;
          created_at?: string | null;
          id?: string | null;
          institution_id?: string | null;
          institution_logo?: string | null;
          institution_name?: string | null;
          last_error?: string | null;
          last_error_at?: string | null;
          last_synced_at?: string | null;
          provider?: string | null;
          status?: Database["public"]["Enums"]["connection_status"] | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bank_connections_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      decrypt_bank_credentials: {
        Args: { ciphertext: string; key: string };
        Returns: string;
      };
      encrypt_bank_credentials: {
        Args: { key: string; plaintext: string };
        Returns: string;
      };
      uuid_v7: { Args: never; Returns: string };
    };
    Enums: {
      audit_event_type:
        | "data_export"
        | "account_deletion"
        | "connection_revoked"
        | "sensitive_view"
        | "rule_applied";
      awaiting_payment_source: "manual" | "auto_detected";
      awaiting_payment_status: "pending" | "matched" | "overdue" | "cancelled" | "completed";
      classification_source: "user_rule" | "global_pattern" | "ai" | "manual" | "inherited";
      connection_status:
        | "pending_consent"
        | "connected"
        | "expired"
        | "reconnecting"
        | "revoked"
        | "error";
      goal_status: "active" | "achieved" | "abandoned" | "paused";
      period_mode: "week" | "month" | "quarter" | "year" | "custom";
      sync_status: "never_synced" | "syncing" | "synced" | "error";
      transaction_direction: "debit" | "credit";
      transaction_kind:
        | "card_payment"
        | "transfer"
        | "exchange"
        | "fee"
        | "cash_withdrawal"
        | "standing_order"
        | "direct_debit"
        | "other";
      wallet_member_role: "owner" | "member" | "viewer";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      audit_event_type: [
        "data_export",
        "account_deletion",
        "connection_revoked",
        "sensitive_view",
        "rule_applied",
      ],
      awaiting_payment_source: ["manual", "auto_detected"],
      awaiting_payment_status: ["pending", "matched", "overdue", "cancelled", "completed"],
      classification_source: ["user_rule", "global_pattern", "ai", "manual", "inherited"],
      connection_status: [
        "pending_consent",
        "connected",
        "expired",
        "reconnecting",
        "revoked",
        "error",
      ],
      goal_status: ["active", "achieved", "abandoned", "paused"],
      period_mode: ["week", "month", "quarter", "year", "custom"],
      sync_status: ["never_synced", "syncing", "synced", "error"],
      transaction_direction: ["debit", "credit"],
      transaction_kind: [
        "card_payment",
        "transfer",
        "exchange",
        "fee",
        "cash_withdrawal",
        "standing_order",
        "direct_debit",
        "other",
      ],
      wallet_member_role: ["owner", "member", "viewer"],
    },
  },
} as const;
