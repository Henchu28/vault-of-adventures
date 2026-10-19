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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      campaign_inventory: {
        Row: {
          campaign_id: number
          created_at: string
          id: string
          item_name: string
          notes: string | null
          quantity: number
          updated_at: string
        }
        Insert: {
          campaign_id: number
          created_at?: string
          id?: string
          item_name: string
          notes?: string | null
          quantity?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: number
          created_at?: string
          id?: string
          item_name?: string
          notes?: string | null
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_inventory_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_rumors: {
        Row: {
          campaign_id: number
          created_at: string
          created_by: string
          id: string
          status: Database["public"]["Enums"]["rumor_status"]
          text: string
          updated_at: string
        }
        Insert: {
          campaign_id: number
          created_at?: string
          created_by: string
          id?: string
          status?: Database["public"]["Enums"]["rumor_status"]
          text: string
          updated_at?: string
        }
        Update: {
          campaign_id?: number
          created_at?: string
          created_by?: string
          id?: string
          status?: Database["public"]["Enums"]["rumor_status"]
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          description: string | null
          drive_folder_id: string | null
          id: number
          name: string
        }
        Insert: {
          description?: string | null
          drive_folder_id?: string | null
          id?: number
          name: string
        }
        Update: {
          description?: string | null
          drive_folder_id?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      character_photos: {
        Row: {
          created_at: string
          id: string
          image_url: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      characters: {
        Row: {
          apariencia: string | null
          Arquetipo: string | null
          description: string | null
          Edad: number | null
          Elemento: string | null
          Esencia: string | null
          Estado: string | null
          historia: string | null
          id: number
          ID_Campaña: number | null
          name: string
          Organización: string
          personalidad: string | null
          Raza: string | null
          user_id: string | null
        }
        Insert: {
          apariencia?: string | null
          Arquetipo?: string | null
          description?: string | null
          Edad?: number | null
          Elemento?: string | null
          Esencia?: string | null
          Estado?: string | null
          historia?: string | null
          id?: number
          ID_Campaña?: number | null
          name?: string
          Organización?: string
          personalidad?: string | null
          Raza?: string | null
          user_id?: string | null
        }
        Update: {
          apariencia?: string | null
          Arquetipo?: string | null
          description?: string | null
          Edad?: number | null
          Elemento?: string | null
          Esencia?: string | null
          Estado?: string | null
          historia?: string | null
          id?: number
          ID_Campaña?: number | null
          name?: string
          Organización?: string
          personalidad?: string | null
          Raza?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "characters_ID_Campaña_fkey"
            columns: ["ID_Campaña"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_Organización_fkey"
            columns: ["Organización"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_name"]
          },
        ]
      }
      current_status: {
        Row: {
          created_at: string
          current_hp: number
          max_hp: number
          name: string
          notes: string
          slot: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_hp?: number
          max_hp?: number
          name?: string
          notes?: string
          slot: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_hp?: number
          max_hp?: number
          name?: string
          notes?: string
          slot?: number
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          created_at: string
          file_type: string
          folder_path: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_type: string
          folder_path?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          file_type?: string
          folder_path?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      maps: {
        Row: {
          campaing_id: number | null
          description: string | null
          id: number
          image_url: string | null
          name: string
        }
        Insert: {
          campaing_id?: number | null
          description?: string | null
          id?: number
          image_url?: string | null
          name: string
        }
        Update: {
          campaing_id?: number | null
          description?: string | null
          id?: number
          image_url?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "maps_campaing_id_fkey"
            columns: ["campaing_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string | null
          created_at: string
          folder_path: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          folder_path?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          folder_path?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      npcs: {
        Row: {
          alignment: string
          apariencia: string | null
          Arquetipo: string | null
          description: string | null
          Edad: number
          Elemento: string | null
          Esencia: string | null
          Estado: string | null
          historia: string | null
          id: number
          ID_Campaña: number | null
          name: string
          Organización: string | null
          personalidad: string | null
          Raza: string | null
        }
        Insert: {
          alignment?: string
          apariencia?: string | null
          Arquetipo?: string | null
          description?: string | null
          Edad?: number
          Elemento?: string | null
          Esencia?: string | null
          Estado?: string | null
          historia?: string | null
          id?: number
          ID_Campaña?: number | null
          name: string
          Organización?: string | null
          personalidad?: string | null
          Raza?: string | null
        }
        Update: {
          alignment?: string
          apariencia?: string | null
          Arquetipo?: string | null
          description?: string | null
          Edad?: number
          Elemento?: string | null
          Esencia?: string | null
          Estado?: string | null
          historia?: string | null
          id?: number
          ID_Campaña?: number | null
          name?: string
          Organización?: string | null
          personalidad?: string | null
          Raza?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "npcs_campaign_id_fkey"
            columns: ["ID_Campaña"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npcs_Organización_fkey"
            columns: ["Organización"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["org_name"]
          },
        ]
      }
      organizations: {
        Row: {
          id: number
          lider: string | null
          n_acolites: number | null
          org_name: string
        }
        Insert: {
          id?: number
          lider?: string | null
          n_acolites?: number | null
          org_name?: string
        }
        Update: {
          id?: number
          lider?: string | null
          n_acolites?: number | null
          org_name?: string
        }
        Relationships: []
      }
      playlist_songs: {
        Row: {
          id: string
          playlist_id: string
          position: number
          song_id: number
        }
        Insert: {
          id?: string
          playlist_id: string
          position?: number
          song_id: number
        }
        Update: {
          id?: string
          playlist_id?: string
          position?: number
          song_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "playlist_songs_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_attacks: {
        Row: {
          created_at: string
          formula: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          formula: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          formula?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_combats: {
        Row: {
          created_at: string
          id: string
          name: string
          state: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          state?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          state?: Json
          updated_at?: string
        }
        Relationships: []
      }
      saved_creature_group_members: {
        Row: {
          created_at: string
          creature_id: string
          group_id: string
          id: string
          position: number
        }
        Insert: {
          created_at?: string
          creature_id: string
          group_id: string
          id?: string
          position?: number
        }
        Update: {
          created_at?: string
          creature_id?: string
          group_id?: string
          id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "saved_creature_group_members_creature_id_fkey"
            columns: ["creature_id"]
            isOneToOne: false
            referencedRelation: "saved_creatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_creature_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "saved_creature_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_creature_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_creatures: {
        Row: {
          ac: number
          alignment: string
          created_at: string
          hp: number
          id: string
          initiative_formula: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ac?: number
          alignment?: string
          created_at?: string
          hp?: number
          id?: string
          initiative_formula?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ac?: number
          alignment?: string
          created_at?: string
          hp?: number
          id?: string
          initiative_formula?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      songs: {
        Row: {
          file: string | null
          id: number
          name: string
        }
        Insert: {
          file?: string | null
          id?: number
          name?: string
        }
        Update: {
          file?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_characters_public: {
        Args: never
        Returns: {
          Arquetipo: string
          Edad: number
          Elemento: string
          Esencia: string
          Estado: string
          id: number
          ID_Campaña: number
          name: string
          Organización: string
          Raza: string
          user_id: string
        }[]
      }
      get_npcs_public: {
        Args: never
        Returns: {
          alignment: string
          Arquetipo: string
          Edad: number
          Elemento: string
          Esencia: string
          Estado: string
          id: number
          ID_Campaña: number
          name: string
          Organización: string
          Raza: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "master" | "player"
      rumor_status: "unknown" | "cold" | "warm" | "hot" | "proven"
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
      app_role: ["master", "player"],
      rumor_status: ["unknown", "cold", "warm", "hot", "proven"],
    },
  },
} as const
