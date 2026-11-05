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
      ghost_runs: {
        Row: {
          created_at: string
          passage_id: number
          timeline: Json
          user_id: string
          wpm: number
        }
        Insert: {
          created_at?: string
          passage_id: number
          timeline?: Json
          user_id: string
          wpm: number
        }
        Update: {
          created_at?: string
          passage_id?: number
          timeline?: Json
          user_id?: string
          wpm?: number
        }
        Relationships: [
          {
            foreignKeyName: "ghost_runs_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "passages"
            referencedColumns: ["id"]
          },
        ]
      }
      passages: {
        Row: {
          difficulty: string
          id: number
          length: number
          text: string
        }
        Insert: {
          difficulty?: string
          id?: number
          length: number
          text: string
        }
        Update: {
          difficulty?: string
          id?: number
          length?: number
          text?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          best_wpm: number
          blob: Database["public"]["Enums"]["blob_type"]
          created_at: string
          id: string
          races_played: number
          total_points: number
          username: string
        }
        Insert: {
          best_wpm?: number
          blob?: Database["public"]["Enums"]["blob_type"]
          created_at?: string
          id: string
          races_played?: number
          total_points?: number
          username: string
        }
        Update: {
          best_wpm?: number
          blob?: Database["public"]["Enums"]["blob_type"]
          created_at?: string
          id?: string
          races_played?: number
          total_points?: number
          username?: string
        }
        Relationships: []
      }
      race_checkpoints: {
        Row: {
          char_index: number
          client_ts: string
          errors: number
          id: number
          room_id: string
          server_ts: string
          user_id: string
        }
        Insert: {
          char_index: number
          client_ts: string
          errors?: number
          id?: number
          room_id: string
          server_ts?: string
          user_id: string
        }
        Update: {
          char_index?: number
          client_ts?: string
          errors?: number
          id?: number
          room_id?: string
          server_ts?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "race_checkpoints_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      race_results: {
        Row: {
          accuracy: number
          created_at: string
          id: string
          mode: Database["public"]["Enums"]["race_mode"]
          passage_id: number
          points: number
          room_id: string | null
          user_id: string
          wpm: number
        }
        Insert: {
          accuracy: number
          created_at?: string
          id?: string
          mode: Database["public"]["Enums"]["race_mode"]
          passage_id: number
          points?: number
          room_id?: string | null
          user_id: string
          wpm: number
        }
        Update: {
          accuracy?: number
          created_at?: string
          id?: string
          mode?: Database["public"]["Enums"]["race_mode"]
          passage_id?: number
          points?: number
          room_id?: string | null
          user_id?: string
          wpm?: number
        }
        Relationships: [
          {
            foreignKeyName: "race_results_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "passages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_results_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_players: {
        Row: {
          accuracy: number
          blob: Database["public"]["Enums"]["blob_type"]
          connected: boolean
          errors: number
          finished_at: string | null
          joined_at: string
          placement: number | null
          points: number
          progress: number
          room_id: string
          user_id: string
          username: string
          wpm: number
        }
        Insert: {
          accuracy?: number
          blob: Database["public"]["Enums"]["blob_type"]
          connected?: boolean
          errors?: number
          finished_at?: string | null
          joined_at?: string
          placement?: number | null
          points?: number
          progress?: number
          room_id: string
          user_id: string
          username: string
          wpm?: number
        }
        Update: {
          accuracy?: number
          blob?: Database["public"]["Enums"]["blob_type"]
          connected?: boolean
          errors?: number
          finished_at?: string | null
          joined_at?: string
          placement?: number | null
          points?: number
          progress?: number
          room_id?: string
          user_id?: string
          username?: string
          wpm?: number
        }
        Relationships: [
          {
            foreignKeyName: "room_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          code: string
          created_at: string
          host_id: string
          id: string
          next_room_code: string | null
          passage_id: number | null
          starting_players: number | null
          starts_at: string | null
          status: Database["public"]["Enums"]["room_status"]
        }
        Insert: {
          code: string
          created_at?: string
          host_id: string
          id?: string
          next_room_code?: string | null
          passage_id?: number | null
          starting_players?: number | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["room_status"]
        }
        Update: {
          code?: string
          created_at?: string
          host_id?: string
          id?: string
          next_room_code?: string | null
          passage_id?: number | null
          starting_players?: number | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["room_status"]
        }
        Relationships: [
          {
            foreignKeyName: "rooms_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "passages"
            referencedColumns: ["id"]
          },
        ]
      }
      solo_checkpoints: {
        Row: {
          char_index: number
          client_ts: string
          errors: number
          id: number
          server_ts: string
          solo_id: string
          user_id: string
        }
        Insert: {
          char_index: number
          client_ts: string
          errors?: number
          id?: number
          server_ts?: string
          solo_id: string
          user_id: string
        }
        Update: {
          char_index?: number
          client_ts?: string
          errors?: number
          id?: number
          server_ts?: string
          solo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solo_checkpoints_solo_id_fkey"
            columns: ["solo_id"]
            isOneToOne: false
            referencedRelation: "solo_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      solo_sessions: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          passage_id: number
          starts_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          passage_id: number
          starts_at: string
          user_id: string
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          passage_id?: number
          starts_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solo_sessions_passage_id_fkey"
            columns: ["passage_id"]
            isOneToOne: false
            referencedRelation: "passages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_room: {
        Args: { _room_id: string }
        Returns: Database["public"]["Enums"]["room_status"]
      }
      apply_profile_result: {
        Args: { _points: number; _user_id: string; _wpm: number }
        Returns: undefined
      }
      get_leaderboard: {
        Args: { _limit?: number; _period: string }
        Returns: {
          best_wpm: number
          blob: Database["public"]["Enums"]["blob_type"]
          is_me: boolean
          points: number
          rank: number
          user_id: string
          username: string
        }[]
      }
      join_room: {
        Args: { _code: string }
        Returns: {
          code: string
          created_at: string
          host_id: string
          id: string
          next_room_code: string | null
          passage_id: number | null
          starting_players: number | null
          starts_at: string | null
          status: Database["public"]["Enums"]["room_status"]
        }
        SetofOptions: {
          from: "*"
          to: "rooms"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      leave_room: { Args: { _room_id: string }; Returns: undefined }
      race_again: { Args: { _room_id: string }; Returns: string }
      record_multi_result: {
        Args: {
          _accuracy: number
          _errors: number
          _finished_at: string
          _room_id: string
          _user_id: string
          _wpm: number
        }
        Returns: {
          already: boolean
          placement: number
          points: number
        }[]
      }
      server_time: { Args: never; Returns: string }
      set_player_connected: {
        Args: { _connected: boolean; _room_id: string; _user_id: string }
        Returns: undefined
      }
      start_race: { Args: { _room_id: string }; Returns: string }
      username_available: { Args: { _username: string }; Returns: boolean }
    }
    Enums: {
      blob_type: "zippy" | "snooze" | "grumbo" | "bubbles" | "gloop" | "mochi"
      race_mode: "solo" | "multi"
      room_status: "lobby" | "countdown" | "racing" | "finished"
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
      blob_type: ["zippy", "snooze", "grumbo", "bubbles", "gloop", "mochi"],
      race_mode: ["solo", "multi"],
      room_status: ["lobby", "countdown", "racing", "finished"],
    },
  },
} as const
