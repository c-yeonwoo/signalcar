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
  public: {
    Tables: {
      brands: {
        Row: {
          country: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          name_en: string | null
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          name_en?: string | null
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          name_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      buyer_prefs: {
        Row: {
          answers: Json
          body_pref: string | null
          budget_max: number | null
          created_at: string
          fuel_pref: string | null
          mileage: string | null
          purpose: string | null
          seats: string | null
          timing: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          body_pref?: string | null
          budget_max?: number | null
          created_at?: string
          fuel_pref?: string | null
          mileage?: string | null
          purpose?: string | null
          seats?: string | null
          timing?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          body_pref?: string | null
          budget_max?: number | null
          created_at?: string
          fuel_pref?: string | null
          mileage?: string | null
          purpose?: string | null
          seats?: string | null
          timing?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      car_features_daily: {
        Row: {
          brain_version: string
          computed_at: string
          days_to_facelift: number | null
          discount_ratio: number | null
          facelift_note: string | null
          feature_date: string
          list_price: number | null
          median_deal_price: number | null
          p25_deal_price: number | null
          p75_deal_price: number | null
          promo_amount: number | null
          promo_percentile: number | null
          sales_momentum: number | null
          sales_registered_count: number | null
          sample_size: number
          timing_reasons: Json
          timing_score: number
          timing_verdict: string
          trim_id: string
        }
        Insert: {
          brain_version: string
          computed_at?: string
          days_to_facelift?: number | null
          discount_ratio?: number | null
          facelift_note?: string | null
          feature_date: string
          list_price?: number | null
          median_deal_price?: number | null
          p25_deal_price?: number | null
          p75_deal_price?: number | null
          promo_amount?: number | null
          promo_percentile?: number | null
          sales_momentum?: number | null
          sales_registered_count?: number | null
          sample_size?: number
          timing_reasons?: Json
          timing_score?: number
          timing_verdict?: string
          trim_id: string
        }
        Update: {
          brain_version?: string
          computed_at?: string
          days_to_facelift?: number | null
          discount_ratio?: number | null
          facelift_note?: string | null
          feature_date?: string
          list_price?: number | null
          median_deal_price?: number | null
          p25_deal_price?: number | null
          p75_deal_price?: number | null
          promo_amount?: number | null
          promo_percentile?: number | null
          sales_momentum?: number | null
          sales_registered_count?: number | null
          sample_size?: number
          timing_reasons?: Json
          timing_score?: number
          timing_verdict?: string
          trim_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_features_daily_trim_id_fkey"
            columns: ["trim_id"]
            isOneToOne: false
            referencedRelation: "trims"
            referencedColumns: ["id"]
          },
        ]
      }
      car_profiles: {
        Row: {
          benefits: Json
          body_type_label: string | null
          coach: string | null
          facelift: Json | null
          fuel_efficiency: number | null
          headline: string | null
          image_color: string | null
          insurance_annual: number | null
          promo_amount: number | null
          promo_label: string | null
          promo_note: string | null
          published: boolean
          slug: string
          trim_id: string
          updated_at: string
        }
        Insert: {
          benefits?: Json
          body_type_label?: string | null
          coach?: string | null
          facelift?: Json | null
          fuel_efficiency?: number | null
          headline?: string | null
          image_color?: string | null
          insurance_annual?: number | null
          promo_amount?: number | null
          promo_label?: string | null
          promo_note?: string | null
          published?: boolean
          slug: string
          trim_id: string
          updated_at?: string
        }
        Update: {
          benefits?: Json
          body_type_label?: string | null
          coach?: string | null
          facelift?: Json | null
          fuel_efficiency?: number | null
          headline?: string | null
          image_color?: string | null
          insurance_annual?: number | null
          promo_amount?: number | null
          promo_label?: string | null
          promo_note?: string | null
          published?: boolean
          slug?: string
          trim_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_profiles_trim_id_fkey"
            columns: ["trim_id"]
            isOneToOne: true
            referencedRelation: "trims"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_reports: {
        Row: {
          contract_month: string | null
          contract_price: number
          created_at: string
          discount_amount: number | null
          finance_type: Database["public"]["Enums"]["finance_type"] | null
          id: string
          list_price: number | null
          options_taken: Json | null
          raw_doc_ref: string | null
          region: string | null
          source: Database["public"]["Enums"]["deal_source"]
          trim_id: string
          updated_at: string
          user_id: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          contract_month?: string | null
          contract_price: number
          created_at?: string
          discount_amount?: number | null
          finance_type?: Database["public"]["Enums"]["finance_type"] | null
          id?: string
          list_price?: number | null
          options_taken?: Json | null
          raw_doc_ref?: string | null
          region?: string | null
          source?: Database["public"]["Enums"]["deal_source"]
          trim_id: string
          updated_at?: string
          user_id?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          contract_month?: string | null
          contract_price?: number
          created_at?: string
          discount_amount?: number | null
          finance_type?: Database["public"]["Enums"]["finance_type"] | null
          id?: string
          list_price?: number | null
          options_taken?: Json | null
          raw_doc_ref?: string | null
          region?: string | null
          source?: Database["public"]["Enums"]["deal_source"]
          trim_id?: string
          updated_at?: string
          user_id?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "deal_reports_trim_id_fkey"
            columns: ["trim_id"]
            isOneToOne: false
            referencedRelation: "trims"
            referencedColumns: ["id"]
          },
        ]
      }
      ingest_loop_config: {
        Row: {
          enabled: boolean
          job_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          job_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          job_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ingest_run_requests: {
        Row: {
          claimed_at: string | null
          finished_at: string | null
          id: string
          job_id: string
          requested_at: string
          requested_by: string | null
          result: Json
          status: string
        }
        Insert: {
          claimed_at?: string | null
          finished_at?: string | null
          id?: string
          job_id: string
          requested_at?: string
          requested_by?: string | null
          result?: Json
          status?: string
        }
        Update: {
          claimed_at?: string | null
          finished_at?: string | null
          id?: string
          job_id?: string
          requested_at?: string
          requested_by?: string | null
          result?: Json
          status?: string
        }
        Relationships: []
      }
      ingest_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          pipeline: string
          started_at: string
          stats: Json
          status: string
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          pipeline: string
          started_at?: string
          stats?: Json
          status?: string
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          pipeline?: string
          started_at?: string
          stats?: Json
          status?: string
        }
        Relationships: []
      }
      news_items: {
        Row: {
          created_at: string
          id: string
          kind: string
          published_at: string | null
          source_id: string | null
          subtitle: string | null
          tag: string | null
          title: string
          url: string | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          published_at?: string | null
          source_id?: string | null
          subtitle?: string | null
          tag?: string | null
          title: string
          url?: string | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          published_at?: string | null
          source_id?: string | null
          subtitle?: string | null
          tag?: string | null
          title?: string
          url?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_items_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      source_documents: {
        Row: {
          brand_hint: string | null
          content_type: string | null
          created_at: string
          fetched_at: string
          file_name: string | null
          id: string
          meta: Json
          parsed_at: string | null
          source_id: string
          url: string
        }
        Insert: {
          brand_hint?: string | null
          content_type?: string | null
          created_at?: string
          fetched_at?: string
          file_name?: string | null
          id?: string
          meta?: Json
          parsed_at?: string | null
          source_id: string
          url: string
        }
        Update: {
          brand_hint?: string | null
          content_type?: string | null
          created_at?: string
          fetched_at?: string
          file_name?: string | null
          id?: string
          meta?: Json
          parsed_at?: string | null
          source_id?: string
          url?: string
        }
        Relationships: []
      }
      negotiation_briefs: {
        Row: {
          budget: number | null
          created_at: string
          finance_pref: string | null
          id: string
          llm_output: Json | null
          model_version: string | null
          region: string | null
          status: Database["public"]["Enums"]["brief_status"]
          target_options: Json
          trim_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          finance_pref?: string | null
          id?: string
          llm_output?: Json | null
          model_version?: string | null
          region?: string | null
          status?: Database["public"]["Enums"]["brief_status"]
          target_options?: Json
          trim_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          finance_pref?: string | null
          id?: string
          llm_output?: Json | null
          model_version?: string | null
          region?: string | null
          status?: Database["public"]["Enums"]["brief_status"]
          target_options?: Json
          trim_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_briefs_trim_id_fkey"
            columns: ["trim_id"]
            isOneToOne: false
            referencedRelation: "trims"
            referencedColumns: ["id"]
          },
        ]
      }
      market_events: {
        Row: {
          created_at: string
          event_date: string | null
          event_type: string
          id: string
          impact: string | null
          source_url: string | null
          title: string | null
          trim_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          event_date?: string | null
          event_type: string
          id?: string
          impact?: string | null
          source_url?: string | null
          title?: string | null
          trim_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          event_date?: string | null
          event_type?: string
          id?: string
          impact?: string | null
          source_url?: string | null
          title?: string | null
          trim_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      outcome_events: {
        Row: {
          brain_version: string | null
          car_slug: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json
          session_id: string | null
          trim_id: string | null
          user_id: string | null
        }
        Insert: {
          brain_version?: string | null
          car_slug?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          session_id?: string | null
          trim_id?: string | null
          user_id?: string | null
        }
        Update: {
          brain_version?: string | null
          car_slug?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          session_id?: string | null
          trim_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      official_promotions: {
        Row: {
          amount: number
          captured_at: string
          created_at: string
          description: string | null
          discount_type: Database["public"]["Enums"]["promotion_type"]
          id: string
          month: string
          source_url: string | null
          trim_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          captured_at?: string
          created_at?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["promotion_type"]
          id?: string
          month: string
          source_url?: string | null
          trim_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          captured_at?: string
          created_at?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["promotion_type"]
          id?: string
          month?: string
          source_url?: string | null
          trim_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "official_promotions_trim_id_fkey"
            columns: ["trim_id"]
            isOneToOne: false
            referencedRelation: "trims"
            referencedColumns: ["id"]
          },
        ]
      }
      price_alerts: {
        Row: {
          created_at: string
          id: string
          target_price: number
          trim_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_price: number
          trim_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_price?: number
          trim_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      price_signals: {
        Row: {
          computed_at: string
          id: string
          median_deal_price: number | null
          month: string
          promo_percentile: number | null
          sample_size: number
          timing_verdict: Database["public"]["Enums"]["timing_verdict"] | null
          trim_id: string
        }
        Insert: {
          computed_at?: string
          id?: string
          median_deal_price?: number | null
          month: string
          promo_percentile?: number | null
          sample_size?: number
          timing_verdict?: Database["public"]["Enums"]["timing_verdict"] | null
          trim_id: string
        }
        Update: {
          computed_at?: string
          id?: string
          median_deal_price?: number | null
          month?: string
          promo_percentile?: number | null
          sample_size?: number
          timing_verdict?: Database["public"]["Enums"]["timing_verdict"] | null
          trim_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_signals_trim_id_fkey"
            columns: ["trim_id"]
            isOneToOne: false
            referencedRelation: "trims"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_signups: {
        Row: {
          car_id: string | null
          created_at: string
          email: string
          id: string
          source: string | null
          user_id: string | null
        }
        Insert: {
          car_id?: string | null
          created_at?: string
          email: string
          id?: string
          source?: string | null
          user_id?: string | null
        }
        Update: {
          car_id?: string | null
          created_at?: string
          email?: string
          id?: string
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      digest_signups: {
        Row: {
          created_at: string
          email: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          nickname: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          is_admin?: boolean
          nickname?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          nickname?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quote_diagnoses: {
        Row: {
          created_at: string
          doc_path: string
          id: string
          result: Json | null
          status: Database["public"]["Enums"]["brief_status"]
          trim_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_path: string
          id?: string
          result?: Json | null
          status?: Database["public"]["Enums"]["brief_status"]
          trim_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          doc_path?: string
          id?: string
          result?: Json | null
          status?: Database["public"]["Enums"]["brief_status"]
          trim_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_diagnoses_trim_id_fkey"
            columns: ["trim_id"]
            isOneToOne: false
            referencedRelation: "trims"
            referencedColumns: ["id"]
          },
        ]
      }
      report_unlocks: {
        Row: {
          id: string
          source: Database["public"]["Enums"]["unlock_source"]
          trim_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          id?: string
          source: Database["public"]["Enums"]["unlock_source"]
          trim_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          id?: string
          source?: Database["public"]["Enums"]["unlock_source"]
          trim_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_unlocks_trim_id_fkey"
            columns: ["trim_id"]
            isOneToOne: false
            referencedRelation: "trims"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_stats: {
        Row: {
          created_at: string
          id: string
          month: string
          registered_count: number
          source: string | null
          trim_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          registered_count?: number
          source?: string | null
          trim_id: string
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          registered_count?: number
          source?: string | null
          trim_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_stats_trim_id_fkey"
            columns: ["trim_id"]
            isOneToOne: false
            referencedRelation: "trims"
            referencedColumns: ["id"]
          },
        ]
      }
      trim_options: {
        Row: {
          category: Database["public"]["Enums"]["option_category"]
          created_at: string
          id: string
          is_default: boolean
          name: string
          notes: string | null
          price: number | null
          trim_id: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["option_category"]
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          notes?: string | null
          price?: number | null
          trim_id: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["option_category"]
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          notes?: string | null
          price?: number | null
          trim_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trim_options_trim_id_fkey"
            columns: ["trim_id"]
            isOneToOne: false
            referencedRelation: "trims"
            referencedColumns: ["id"]
          },
        ]
      }
      trims: {
        Row: {
          base_price: number | null
          created_at: string
          discontinued_at: string | null
          id: string
          name: string
          notes: string | null
          released_at: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          base_price?: number | null
          created_at?: string
          discontinued_at?: string | null
          id?: string
          name: string
          notes?: string | null
          released_at?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          base_price?: number | null
          created_at?: string
          discontinued_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          released_at?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trims_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          body_type: Database["public"]["Enums"]["body_type"] | null
          brand_id: string
          created_at: string
          discontinued_at: string | null
          fuel_type: Database["public"]["Enums"]["fuel_type"] | null
          generation: string | null
          id: string
          launched_at: string | null
          model_name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          body_type?: Database["public"]["Enums"]["body_type"] | null
          brand_id: string
          created_at?: string
          discontinued_at?: string | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          generation?: string | null
          id?: string
          launched_at?: string | null
          model_name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          body_type?: Database["public"]["Enums"]["body_type"] | null
          brand_id?: string
          created_at?: string
          discontinued_at?: string | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          generation?: string | null
          id?: string
          launched_at?: string | null
          model_name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist: {
        Row: {
          created_at: string
          id: string
          trim_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          trim_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          trim_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_trim_id_fkey"
            columns: ["trim_id"]
            isOneToOne: false
            referencedRelation: "trims"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      unlock_briefing_with_credit: {
        Args: { p_trim_id: string }
        Returns: undefined
      }
    }
    Enums: {
      body_type:
        | "sedan"
        | "suv"
        | "hatchback"
        | "wagon"
        | "coupe"
        | "convertible"
        | "pickup"
        | "van"
        | "minivan"
        | "other"
      brief_status: "pending" | "done" | "failed"
      deal_source: "manual" | "receipt_ocr" | "community"
      finance_type: "cash" | "installment" | "lease" | "rent"
      fuel_type:
        | "gasoline"
        | "diesel"
        | "hybrid"
        | "phev"
        | "ev"
        | "lpg"
        | "hydrogen"
        | "other"
      option_category:
        | "exterior"
        | "interior"
        | "convenience"
        | "safety"
        | "powertrain"
        | "package"
        | "other"
      promotion_type: "cash" | "finance" | "trade_in" | "other"
      timing_verdict: "buy" | "wait" | "neutral"
      unlock_source: "deal_report" | "purchase"
      verification_status: "unverified" | "receipt_verified" | "flagged"
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
  public: {
    Enums: {
      body_type: [
        "sedan",
        "suv",
        "hatchback",
        "wagon",
        "coupe",
        "convertible",
        "pickup",
        "van",
        "minivan",
        "other",
      ],
      brief_status: ["pending", "done", "failed"],
      deal_source: ["manual", "receipt_ocr", "community"],
      finance_type: ["cash", "installment", "lease", "rent"],
      fuel_type: [
        "gasoline",
        "diesel",
        "hybrid",
        "phev",
        "ev",
        "lpg",
        "hydrogen",
        "other",
      ],
      option_category: [
        "exterior",
        "interior",
        "convenience",
        "safety",
        "powertrain",
        "package",
        "other",
      ],
      promotion_type: ["cash", "finance", "trade_in", "other"],
      timing_verdict: ["buy", "wait", "neutral"],
      unlock_source: ["deal_report", "purchase"],
      verification_status: ["unverified", "receipt_verified", "flagged"],
    },
  },
} as const
