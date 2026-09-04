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
      ads: {
        Row: {
          category: string
          created_at: string
          currency: string
          description: string
          details: Json
          id: string
          images: string[]
          location: string | null
          price: number
          seller_id: string
          status: string
          subcategory: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          currency?: string
          description: string
          details?: Json
          id?: string
          images?: string[]
          location?: string | null
          price: number
          seller_id: string
          status?: string
          subcategory?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          currency?: string
          description?: string
          details?: Json
          id?: string
          images?: string[]
          location?: string | null
          price?: number
          seller_id?: string
          status?: string
          subcategory?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_clicks: {
        Row: {
          affiliate_user_id: string
          clicked_at: string
          converted: boolean
          id: string
          ip_hash: string | null
        }
        Insert: {
          affiliate_user_id: string
          clicked_at?: string
          converted?: boolean
          id?: string
          ip_hash?: string | null
        }
        Update: {
          affiliate_user_id?: string
          clicked_at?: string
          converted?: boolean
          id?: string
          ip_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_affiliate_user_id_fkey"
            columns: ["affiliate_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          participant_one: string
          participant_two: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          participant_one: string
          participant_two: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          participant_one?: string
          participant_two?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant_one_fkey"
            columns: ["participant_one"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_two_fkey"
            columns: ["participant_two"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checkins: {
        Row: {
          check_in_date: string
          created_at: string
          id: string
          streak_count: number
          user_id: string
        }
        Insert: {
          check_in_date: string
          created_at?: string
          id?: string
          streak_count: number
          user_id: string
        }
        Update: {
          check_in_date?: string
          created_at?: string
          id?: string
          streak_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_airtime_orders: {
        Row: {
          amount: number
          created_at: string
          data_plan: string | null
          id: string
          phone_number: string
          provider: string
          recipient: string
          reference: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          data_plan?: string | null
          id?: string
          phone_number: string
          provider: string
          recipient?: string
          reference: string
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          data_plan?: string | null
          id?: string
          phone_number?: string
          provider?: string
          recipient?: string
          reference?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_airtime_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          id: string
          user_one: string
          user_two: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_one: string
          user_two: string
        }
        Update: {
          created_at?: string
          id?: string
          user_one?: string
          user_two?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_user_one_fkey"
            columns: ["user_one"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_two_fkey"
            columns: ["user_two"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiations: {
        Row: {
          ad_id: string
          buyer_id: string
          conversation_id: string | null
          counter_offer_price: number | null
          created_at: string
          expires_at: string
          id: string
          last_actor_id: string
          message: string | null
          offered_price: number
          order_id: string | null
          original_price: number
          previous_price: number | null
          round_number: number
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          ad_id: string
          buyer_id: string
          conversation_id?: string | null
          counter_offer_price?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          last_actor_id: string
          message?: string | null
          offered_price: number
          order_id?: string | null
          original_price: number
          previous_price?: number | null
          round_number?: number
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          ad_id?: string
          buyer_id?: string
          conversation_id?: string | null
          counter_offer_price?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          last_actor_id?: string
          message?: string | null
          offered_price?: number
          order_id?: string | null
          original_price?: number
          previous_price?: number | null
          round_number?: number
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiations_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_last_actor_id_fkey"
            columns: ["last_actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          ad_id: string
          buyer_id: string
          created_at: string
          id: string
          notes: string | null
          quantity: number
          seller_id: string
          status: string
          total_price: number
          updated_at: string
        }
        Insert: {
          ad_id: string
          buyer_id: string
          created_at?: string
          id?: string
          notes?: string | null
          quantity?: number
          seller_id: string
          status?: string
          total_price: number
          updated_at?: string
        }
        Update: {
          ad_id?: string
          buyer_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          quantity?: number
          seller_id?: string
          status?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          affiliate_code: string
          avatar_url: string | null
          bio: string | null
          created_at: string
          current_streak: number
          display_name: string
          id: string
          last_check_in: string | null
          longest_streak: number
          notification_prefs: Json
          phone_number: string | null
          referred_by: string | null
          total_referrals: number
          updated_at: string
          username: string
        }
        Insert: {
          affiliate_code: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_streak?: number
          display_name: string
          id: string
          last_check_in?: string | null
          longest_streak?: number
          notification_prefs?: Json
          phone_number?: string | null
          referred_by?: string | null
          total_referrals?: number
          updated_at?: string
          username: string
        }
        Update: {
          affiliate_code?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_streak?: number
          display_name?: string
          id?: string
          last_check_in?: string | null
          longest_streak?: number
          notification_prefs?: Json
          phone_number?: string | null
          referred_by?: string | null
          total_referrals?: number
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_contacts: {
        Row: {
          created_at: string
          id: string
          label: string
          phone_number: string
          provider: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          phone_number: string
          provider?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          phone_number?: string
          provider?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_contacts_user_id_fkey"
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
      accept_friend_request: { Args: { p_request: string }; Returns: undefined }
      daily_check_in: {
        Args: never
        Returns: {
          already_checked_in: boolean
          current_streak: number
          longest_streak: number
        }[]
      }
      delete_my_account: { Args: never; Returns: undefined }
      expire_stale_negotiations: { Args: never; Returns: undefined }
      generate_affiliate_code: { Args: never; Returns: string }
      get_or_create_conversation: { Args: { p_other: string }; Returns: string }
      get_profile_stats: {
        Args: { p_user: string }
        Returns: {
          ads_count: number
          completed_orders: number
          referrals: number
        }[]
      }
      get_public_stats: {
        Args: never
        Returns: {
          completed_orders: number
          total_ads: number
          total_checkins: number
          total_messages: number
          total_users: number
        }[]
      }
      is_username_available: { Args: { p_username: string }; Returns: boolean }
      make_offer: {
        Args: { p_ad: string; p_message?: string; p_price: number }
        Returns: string
      }
      record_affiliate_click: { Args: { p_code: string }; Returns: string }
      respond_to_offer: {
        Args: {
          p_action: string
          p_message?: string
          p_negotiation: string
          p_price?: number
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
