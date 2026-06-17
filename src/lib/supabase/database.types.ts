export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      game_players: {
        Row: {
          game_id: string;
          is_durak: boolean;
          is_first_out: boolean;
          is_last_out: boolean;
          player_id: string;
        };
        Insert: {
          game_id: string;
          is_durak?: boolean;
          is_first_out?: boolean;
          is_last_out?: boolean;
          player_id: string;
        };
        Update: {
          game_id?: string;
          is_durak?: boolean;
          is_first_out?: boolean;
          is_last_out?: boolean;
          player_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "game_players_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "game_players_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
      games: {
        Row: {
          created_at: string;
          deck_count: number | null;
          ended_at: string | null;
          group_id: string;
          id: string;
          logged_by: string;
          metrics: Json | null;
          notes: string | null;
          started_at: string;
          status: Database["public"]["Enums"]["game_status"];
          trump_suit: Database["public"]["Enums"]["trump_suit"] | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deck_count?: number | null;
          ended_at?: string | null;
          group_id: string;
          id?: string;
          logged_by: string;
          metrics?: Json | null;
          notes?: string | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["game_status"];
          trump_suit?: Database["public"]["Enums"]["trump_suit"] | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deck_count?: number | null;
          ended_at?: string | null;
          group_id?: string;
          id?: string;
          logged_by?: string;
          metrics?: Json | null;
          notes?: string | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["game_status"];
          trump_suit?: Database["public"]["Enums"]["trump_suit"] | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "games_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      group_members: {
        Row: {
          group_id: string;
          joined_at: string;
          role: string;
          user_id: string;
        };
        Insert: {
          group_id: string;
          joined_at?: string;
          role?: string;
          user_id: string;
        };
        Update: {
          group_id?: string;
          joined_at?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      groups: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          name: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          name: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          name?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      player_claims: {
        Row: {
          claimed_at: string | null;
          claimed_by: string | null;
          created_at: string;
          created_by: string;
          expires_at: string;
          group_id: string;
          player_id: string;
          token: string;
        };
        Insert: {
          claimed_at?: string | null;
          claimed_by?: string | null;
          created_at?: string;
          created_by: string;
          expires_at?: string;
          group_id: string;
          player_id: string;
          token?: string;
        };
        Update: {
          claimed_at?: string | null;
          claimed_by?: string | null;
          created_at?: string;
          created_by?: string;
          expires_at?: string;
          group_id?: string;
          player_id?: string;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "player_claims_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "player_claims_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
      players: {
        Row: {
          auth_user_id: string | null;
          created_at: string;
          display_name: string;
          group_id: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          auth_user_id?: string | null;
          created_at?: string;
          display_name: string;
          group_id: string;
          id?: string;
          updated_at?: string;
        };
        Update: {
          auth_user_id?: string | null;
          created_at?: string;
          display_name?: string;
          group_id?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "players_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_game_player_integrity: {
        Args: { p_game_id: string };
        Returns: undefined;
      };
      claim_details: {
        Args: { p_token: string };
        Returns: {
          already_member: boolean;
          group_name: string;
          player_name: string;
          status: string;
        }[];
      };
      claim_player: {
        Args: { p_token: string };
        Returns: {
          created_at: string;
          created_by: string;
          id: string;
          name: string;
          timezone: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "groups";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_group: {
        Args: { p_display_name?: string; p_name: string; p_timezone?: string };
        Returns: {
          created_at: string;
          created_by: string;
          id: string;
          name: string;
          timezone: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "groups";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_player_claim: {
        Args: { p_player_id: string };
        Returns: {
          claimed_at: string | null;
          claimed_by: string | null;
          created_at: string;
          created_by: string;
          expires_at: string;
          group_id: string;
          player_id: string;
          token: string;
        };
        SetofOptions: {
          from: "*";
          to: "player_claims";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      finish_game: {
        Args: {
          p_deck_count?: number;
          p_game_id: string;
          p_notes?: string;
          p_participants: Json;
          p_trump_suit?: Database["public"]["Enums"]["trump_suit"];
        };
        Returns: {
          created_at: string;
          deck_count: number | null;
          ended_at: string | null;
          group_id: string;
          id: string;
          logged_by: string;
          metrics: Json | null;
          notes: string | null;
          started_at: string;
          status: Database["public"]["Enums"]["game_status"];
          trump_suit: Database["public"]["Enums"]["trump_suit"] | null;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "games";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      group_roster: {
        Args: { p_group_id: string };
        Returns: {
          display_name: string;
          games_played: number;
          id: string;
        }[];
      };
      group_stats: { Args: { p_group_id: string }; Returns: Json };
      is_group_member: { Args: { p_group_id: string }; Returns: boolean };
      is_group_owner: { Args: { p_group_id: string }; Returns: boolean };
      is_member_of_game: { Args: { p_game_id: string }; Returns: boolean };
      log_game: {
        Args: {
          p_deck_count?: number;
          p_ended_at?: string;
          p_group_id: string;
          p_notes?: string;
          p_participants: Json;
          p_started_at?: string;
          p_trump_suit?: Database["public"]["Enums"]["trump_suit"];
        };
        Returns: {
          created_at: string;
          deck_count: number | null;
          ended_at: string | null;
          group_id: string;
          id: string;
          logged_by: string;
          metrics: Json | null;
          notes: string | null;
          started_at: string;
          status: Database["public"]["Enums"]["game_status"];
          trump_suit: Database["public"]["Enums"]["trump_suit"] | null;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "games";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      most_played_group: { Args: never; Returns: string };
      player_stats: {
        Args: { p_group_id: string; p_player_id: string };
        Returns: Json;
      };
      start_game: {
        Args: {
          p_deck_count?: number;
          p_group_id: string;
          p_notes?: string;
          p_participants: Json;
          p_trump_suit?: Database["public"]["Enums"]["trump_suit"];
        };
        Returns: {
          created_at: string;
          deck_count: number | null;
          ended_at: string | null;
          group_id: string;
          id: string;
          logged_by: string;
          metrics: Json | null;
          notes: string | null;
          started_at: string;
          status: Database["public"]["Enums"]["game_status"];
          trump_suit: Database["public"]["Enums"]["trump_suit"] | null;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "games";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      game_status: "in_progress" | "completed";
      trump_suit: "hearts" | "diamonds" | "clubs" | "spades";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
      game_status: ["in_progress", "completed"],
      trump_suit: ["hearts", "diamonds", "clubs", "spades"],
    },
  },
} as const;
