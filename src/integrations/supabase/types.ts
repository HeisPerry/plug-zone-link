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
      dispute_messages: {
        Row: {
          author_id: string
          body: string | null
          created_at: string
          dispute_id: string
          file_name: string | null
          file_url: string | null
          id: string
          is_admin: boolean
        }
        Insert: {
          author_id: string
          body?: string | null
          created_at?: string
          dispute_id: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_admin?: boolean
        }
        Update: {
          author_id?: string
          body?: string | null
          created_at?: string
          dispute_id?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_admin?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "dispute_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_messages_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          buyer_id: string
          created_at: string
          description: string
          id: string
          opened_by: string
          order_id: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          description: string
          id?: string
          opened_by: string
          order_id: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          description?: string
          id?: string
          opened_by?: string
          order_id?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_seller_id_fkey"
            columns: ["seller_id"]
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
          attachment_name: string | null
          attachment_size: number | null
          attachment_type: string | null
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string
          delivered_at: string | null
          id: string
          read: boolean
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          read?: boolean
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          read?: boolean
          read_at?: string | null
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
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_id: string | null
          created_at: string
          escrow_status: string | null
          id: string
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          escrow_status?: string | null
          id?: string
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          escrow_status?: string | null
          id?: string
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          ad_id: string
          buyer_id: string
          buyer_name: string | null
          buyer_phone: string | null
          confirmed_at: string | null
          created_at: string
          delivered_at: string | null
          delivery_address: string | null
          delivery_method: string | null
          escrow_status: string
          id: string
          notes: string | null
          order_number: string | null
          payment_status: string
          quantity: number
          seller_id: string
          shipped_at: string | null
          status: string
          total_price: number
          tracking_note: string | null
          updated_at: string
        }
        Insert: {
          ad_id: string
          buyer_id: string
          buyer_name?: string | null
          buyer_phone?: string | null
          confirmed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_method?: string | null
          escrow_status?: string
          id?: string
          notes?: string | null
          order_number?: string | null
          payment_status?: string
          quantity?: number
          seller_id: string
          shipped_at?: string | null
          status?: string
          total_price: number
          tracking_note?: string | null
          updated_at?: string
        }
        Update: {
          ad_id?: string
          buyer_id?: string
          buyer_name?: string | null
          buyer_phone?: string | null
          confirmed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_method?: string | null
          escrow_status?: string
          id?: string
          notes?: string | null
          order_number?: string | null
          payment_status?: string
          quantity?: number
          seller_id?: string
          shipped_at?: string | null
          status?: string
          total_price?: number
          tracking_note?: string | null
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
          last_seen_at: string | null
          longest_streak: number
          notification_prefs: Json
          phone_number: string | null
          referred_by: string | null
          show_last_seen: boolean
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
          last_seen_at?: string | null
          longest_streak?: number
          notification_prefs?: Json
          phone_number?: string | null
          referred_by?: string | null
          show_last_seen?: boolean
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
          last_seen_at?: string | null
          longest_streak?: number
          notification_prefs?: Json
          phone_number?: string | null
          referred_by?: string | null
          show_last_seen?: boolean
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
      reviews: {
        Row: {
          ad_id: string | null
          comment: string | null
          created_at: string
          id: string
          order_id: string
          rating: number
          reviewer_id: string
          seller_id: string
          updated_at: string
        }
        Insert: {
          ad_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          rating: number
          reviewer_id: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          ad_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          rating?: number
          reviewer_id?: string
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_seller_id_fkey"
            columns: ["seller_id"]
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
      seller_profiles: {
        Row: {
          about: string | null
          business_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          payout_account_last4: string | null
          payout_account_name: string | null
          payout_bank: string | null
          payout_method: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          about?: string | null
          business_name: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          payout_account_last4?: string | null
          payout_account_name?: string | null
          payout_bank?: string | null
          payout_method?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          about?: string | null
          business_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          payout_account_last4?: string | null
          payout_account_name?: string | null
          payout_bank?: string | null
          payout_method?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          order_id: string | null
          payee_id: string
          payer_id: string
          platform_fee: number
          provider: string | null
          reference: string
          seller_earnings: number
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string | null
          payee_id: string
          payer_id: string
          platform_fee?: number
          provider?: string | null
          reference: string
          seller_earnings?: number
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string | null
          payee_id?: string
          payer_id?: string
          platform_fee?: number
          provider?: string | null
          reference?: string
          seller_earnings?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payee_id_fkey"
            columns: ["payee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          currency: string
          destination: string | null
          id: string
          method: string
          processed_at: string | null
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          currency?: string
          destination?: string | null
          id?: string
          method?: string
          processed_at?: string | null
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          currency?: string
          destination?: string | null
          id?: string
          method?: string
          processed_at?: string | null
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_seller_id_fkey"
            columns: ["seller_id"]
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
      admin_overview: {
        Args: never
        Returns: {
          active_ads: number
          escrow_held: number
          gross_sales: number
          open_disputes: number
          pending_withdrawals: number
          platform_fees: number
          total_ads: number
          total_orders: number
          total_users: number
        }[]
      }
      become_seller: {
        Args: {
          p_about?: string
          p_business_name: string
          p_contact_email?: string
          p_contact_phone?: string
          p_payout_account_name?: string
          p_payout_account_number?: string
          p_payout_bank?: string
          p_payout_method?: string
        }
        Returns: string
      }
      confirm_receipt: { Args: { p_order: string }; Returns: undefined }
      daily_check_in: {
        Args: never
        Returns: {
          already_checked_in: boolean
          current_streak: number
          longest_streak: number
        }[]
      }
      delete_my_account: { Args: never; Returns: undefined }
      display_name_of: { Args: { p_user: string }; Returns: string }
      expire_stale_negotiations: { Args: never; Returns: undefined }
      generate_affiliate_code: { Args: never; Returns: string }
      generate_order_number: { Args: never; Returns: string }
      get_or_create_conversation: { Args: { p_other: string }; Returns: string }
      get_profile_stats: {
        Args: { p_user: string }
        Returns: {
          ads_count: number
          avg_rating: number
          completed_orders: number
          purchases: number
          referrals: number
          review_count: number
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
      get_seller_earnings: {
        Args: { p_user: string }
        Returns: {
          available: number
          escrow_held: number
          pending_withdrawals: number
          platform_fees: number
          released: number
          total_sales: number
          withdrawn: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_username_available: { Args: { p_username: string }; Returns: boolean }
      make_offer: {
        Args: { p_ad: string; p_message?: string; p_price: number }
        Returns: string
      }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_messages_delivered: { Args: never; Returns: number }
      notify: {
        Args: {
          p_actor?: string
          p_body: string
          p_entity_id?: string
          p_entity_type?: string
          p_link: string
          p_title: string
          p_type: string
          p_user: string
        }
        Returns: undefined
      }
      open_dispute: {
        Args: { p_description: string; p_order: string; p_reason: string }
        Returns: string
      }
      pay_order_test_mode: { Args: { p_order: string }; Returns: string }
      place_order: {
        Args: {
          p_ad: string
          p_buyer_name?: string
          p_buyer_phone?: string
          p_delivery_address?: string
          p_delivery_method?: string
          p_notes?: string
          p_quantity?: number
        }
        Returns: string
      }
      platform_fee_rate: { Args: never; Returns: number }
      record_affiliate_click: { Args: { p_code: string }; Returns: string }
      request_withdrawal: {
        Args: { p_amount: number; p_destination?: string; p_method?: string }
        Returns: string
      }
      resolve_dispute: {
        Args: { p_dispute: string; p_outcome: string; p_resolution?: string }
        Returns: undefined
      }
      respond_to_offer: {
        Args: {
          p_action: string
          p_message?: string
          p_negotiation: string
          p_price?: number
        }
        Returns: undefined
      }
      set_order_fulfilment: {
        Args: { p_note?: string; p_order: string; p_stage: string }
        Returns: undefined
      }
      set_withdrawal_status: {
        Args: { p_note?: string; p_status: string; p_withdrawal: string }
        Returns: undefined
      }
      touch_last_seen: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "buyer" | "seller" | "admin"
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
      app_role: ["buyer", "seller", "admin"],
    },
  },
} as const
