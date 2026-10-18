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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          area_id: string | null
          body: string
          created_at: string
          division_id: string | null
          ends_at: string | null
          event_id: string
          id: string
          published: boolean
          severity: string
          starts_at: string | null
          title: string
        }
        Insert: {
          area_id?: string | null
          body?: string
          created_at?: string
          division_id?: string | null
          ends_at?: string | null
          event_id: string
          id?: string
          published?: boolean
          severity?: string
          starts_at?: string | null
          title: string
        }
        Update: {
          area_id?: string | null
          body?: string
          created_at?: string
          division_id?: string | null
          ends_at?: string | null
          event_id?: string
          id?: string
          published?: boolean
          severity?: string
          starts_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          h: number
          id: string
          kind: string
          name: string
          venue_id: string
          w: number
          x: number
          y: number
        }
        Insert: {
          h?: number
          id?: string
          kind?: string
          name: string
          venue_id: string
          w?: number
          x?: number
          y?: number
        }
        Update: {
          h?: number
          id?: string
          kind?: string
          name?: string
          venue_id?: string
          w?: number
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "areas_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          city: string | null
          id: string
          name: string
        }
        Insert: {
          city?: string | null
          id?: string
          name: string
        }
        Update: {
          city?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      courts: {
        Row: {
          area_id: string | null
          id: string
          label: string
          map_x: number
          map_y: number
          number: number | null
          stream_url: string | null
          venue_id: string
        }
        Insert: {
          area_id?: string | null
          id?: string
          label: string
          map_x?: number
          map_y?: number
          number?: number | null
          stream_url?: string | null
          venue_id: string
        }
        Update: {
          area_id?: string | null
          id?: string
          label?: string
          map_x?: number
          map_y?: number
          number?: number | null
          stream_url?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courts_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      day_division_sources: {
        Row: {
          division_id: string
          event_day_id: string
          source_id: string
        }
        Insert: {
          division_id: string
          event_day_id: string
          source_id: string
        }
        Update: {
          division_id?: string
          event_day_id?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_division_sources_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_division_sources_event_day_id_fkey"
            columns: ["event_day_id"]
            isOneToOne: false
            referencedRelation: "event_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_division_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      divisions: {
        Row: {
          age_group: string | null
          default_match_min: number
          event_id: string
          gender: string | null
          id: string
          name: string
        }
        Insert: {
          age_group?: string | null
          default_match_min?: number
          event_id: string
          gender?: string | null
          id?: string
          name: string
        }
        Update: {
          age_group?: string | null
          default_match_min?: number
          event_id?: string
          gender?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "divisions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_days: {
        Row: {
          date: string
          event_id: string
          id: string
          label: string
        }
        Insert: {
          date: string
          event_id: string
          id?: string
          label: string
        }
        Update: {
          date?: string
          event_id?: string
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_days_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          ends_on: string
          id: string
          name: string
          published: boolean
          registration_live: boolean
          registration_url: string
          slug: string
          starts_on: string
          venue_id: string | null
          walk_min: number
          warmup_min: number
        }
        Insert: {
          ends_on: string
          id?: string
          name: string
          published?: boolean
          registration_live?: boolean
          registration_url?: string
          slug: string
          starts_on: string
          venue_id?: string | null
          walk_min?: number
          warmup_min?: number
        }
        Update: {
          ends_on?: string
          id?: string
          name?: string
          published?: boolean
          registration_live?: boolean
          registration_url?: string
          slug?: string
          starts_on?: string
          venue_id?: string | null
          walk_min?: number
          warmup_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      info_links: {
        Row: {
          category: string
          description: string | null
          event_id: string
          id: string
          published: boolean
          sort: number
          title: string
          url: string | null
        }
        Insert: {
          category: string
          description?: string | null
          event_id: string
          id?: string
          published?: boolean
          sort?: number
          title: string
          url?: string | null
        }
        Update: {
          category?: string
          description?: string | null
          event_id?: string
          id?: string
          published?: boolean
          sort?: number
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "info_links_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_team_id: string | null
          court_id: string | null
          court_label_raw: string | null
          division_id: string | null
          est_duration_min: number
          event_day_id: string
          external_id: string | null
          home_team_id: string | null
          id: string
          pool: string | null
          source_id: string | null
          start_at: string
          status: string
          time_estimated: boolean
        }
        Insert: {
          away_team_id?: string | null
          court_id?: string | null
          court_label_raw?: string | null
          division_id?: string | null
          est_duration_min?: number
          event_day_id: string
          external_id?: string | null
          home_team_id?: string | null
          id?: string
          pool?: string | null
          source_id?: string | null
          start_at: string
          status?: string
          time_estimated?: boolean
        }
        Update: {
          away_team_id?: string | null
          court_id?: string | null
          court_label_raw?: string | null
          division_id?: string | null
          est_duration_min?: number
          event_day_id?: string
          external_id?: string | null
          home_team_id?: string | null
          id?: string
          pool?: string | null
          source_id?: string | null
          start_at?: string
          status?: string
          time_estimated?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_event_day_id_fkey"
            columns: ["event_day_id"]
            isOneToOne: false
            referencedRelation: "event_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          display_name: string
          id: string
          jersey_number: number | null
          team_id: string
        }
        Insert: {
          display_name: string
          id?: string
          jersey_number?: number | null
          team_id: string
        }
        Update: {
          display_name?: string
          id?: string
          jersey_number?: number | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          away_sets: number
          home_sets: number
          match_id: string
          set_scores: Json
          updated_at: string
        }
        Insert: {
          away_sets?: number
          home_sets?: number
          match_id: string
          set_scores?: Json
          updated_at?: string
        }
        Update: {
          away_sets?: number
          home_sets?: number
          match_id?: string
          set_scores?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      source_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          provenance: string
          rows_upserted: number
          source_id: string
          started_at: string
          status: string
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          provenance?: string
          rows_upserted?: number
          source_id: string
          started_at?: string
          status?: string
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          provenance?: string
          rows_upserted?: number
          source_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          config: Json
          created_at: string
          id: string
          kind: string
          last_provenance: string
          last_status: string
          last_success_at: string | null
          name: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          kind: string
          last_provenance?: string
          last_status?: string
          last_success_at?: string | null
          name: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          kind?: string
          last_provenance?: string
          last_status?: string
          last_success_at?: string | null
          name?: string
        }
        Relationships: []
      }
      sponsor_slots: {
        Row: {
          court_id: string | null
          event_id: string
          headline: string | null
          id: string
          offer_text: string | null
          placement: string
          published: boolean
          sponsor_id: string | null
        }
        Insert: {
          court_id?: string | null
          event_id: string
          headline?: string | null
          id?: string
          offer_text?: string | null
          placement: string
          published?: boolean
          sponsor_id?: string | null
        }
        Update: {
          court_id?: string | null
          event_id?: string
          headline?: string | null
          id?: string
          offer_text?: string | null
          placement?: string
          published?: boolean
          sponsor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_slots_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_slots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_slots_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          id: string
          logo_path: string | null
          name: string
          url: string | null
        }
        Insert: {
          id?: string
          logo_path?: string | null
          name: string
          url?: string | null
        }
        Update: {
          id?: string
          logo_path?: string | null
          name?: string
          url?: string | null
        }
        Relationships: []
      }
      staff_members: {
        Row: {
          display_name: string
          id: string
          role: string
          team_id: string
        }
        Insert: {
          display_name: string
          id?: string
          role?: string
          team_id: string
        }
        Update: {
          display_name?: string
          id?: string
          role?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          club_id: string | null
          division_id: string | null
          external_refs: Json
          id: string
          name: string
        }
        Insert: {
          club_id?: string | null
          division_id?: string | null
          external_refs?: Json
          id?: string
          name: string
        }
        Update: {
          club_id?: string | null
          division_id?: string | null
          external_refs?: Json
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          address: string | null
          floor_plan_path: string | null
          id: string
          name: string
          plan_height: number
          plan_width: number
        }
        Insert: {
          address?: string | null
          floor_plan_path?: string | null
          id?: string
          name: string
          plan_height?: number
          plan_width?: number
        }
        Update: {
          address?: string | null
          floor_plan_path?: string | null
          id?: string
          name?: string
          plan_height?: number
          plan_width?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "staff"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "staff"],
    },
  },
} as const
