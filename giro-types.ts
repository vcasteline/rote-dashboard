export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      bikes: {
        Row: {
          class_id: string | null
          id: string
          static_bike_id: number | null
        }
        Insert: {
          class_id?: string | null
          id?: string
          static_bike_id?: number | null
        }
        Update: {
          class_id?: string | null
          id?: string
          static_bike_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bikes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bikes_static_bike_id_fkey"
            columns: ["static_bike_id"]
            isOneToOne: false
            referencedRelation: "static_bikes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_schedules: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          instructor_id: string | null
          start_time: string
          weekday: string | null
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          instructor_id?: string | null
          start_time: string
          weekday?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          instructor_id?: string | null
          start_time?: string
          weekday?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_schedules_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string | null
          date: string
          end_time: string
          id: string
          instructor_id: string | null
          is_cancelled: boolean | null
          location: string | null
          name: string | null
          schedule_id: string | null
          start_time: string
          waitlist_enabled: boolean | null
        }
        Insert: {
          created_at?: string | null
          date: string
          end_time: string
          id?: string
          instructor_id?: string | null
          is_cancelled?: boolean | null
          location?: string | null
          name?: string | null
          schedule_id?: string | null
          start_time: string
          waitlist_enabled?: boolean | null
        }
        Update: {
          created_at?: string | null
          date?: string
          end_time?: string
          id?: string
          instructor_id?: string | null
          is_cancelled?: boolean | null
          location?: string | null
          name?: string | null
          schedule_id?: string | null
          start_time?: string
          waitlist_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "class_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      instructors: {
        Row: {
          bio: string | null
          id: string
          name: string
          profile_picture_url: string | null
        }
        Insert: {
          bio?: string | null
          id?: string
          name: string
          profile_picture_url?: string | null
        }
        Update: {
          bio?: string | null
          id?: string
          name?: string
          profile_picture_url?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          sent: boolean | null
          title: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          sent?: boolean | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          sent?: boolean | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      packages: {
        Row: {
          class_credits: number
          created_at: string | null
          expiration_days: number | null
          id: string
          name: string
          price: number
        }
        Insert: {
          class_credits: number
          created_at?: string | null
          expiration_days?: number | null
          id?: string
          name: string
          price: number
        }
        Update: {
          class_credits?: number
          created_at?: string | null
          expiration_days?: number | null
          id?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
      purchases: {
        Row: {
          authorization_code: string | null
          credits_remaining: number
          expiration_date: string | null
          id: string
          package_id: string | null
          purchase_date: string | null
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          authorization_code?: string | null
          credits_remaining: number
          expiration_date?: string | null
          id?: string
          package_id?: string | null
          purchase_date?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          authorization_code?: string | null
          credits_remaining?: number
          expiration_date?: string | null
          id?: string
          package_id?: string | null
          purchase_date?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_bikes: {
        Row: {
          bike_id: string | null
          id: string
          reservation_id: string | null
        }
        Insert: {
          bike_id?: string | null
          id?: string
          reservation_id?: string | null
        }
        Update: {
          bike_id?: string | null
          id?: string
          reservation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_bikes_bike_id_fkey"
            columns: ["bike_id"]
            isOneToOne: true
            referencedRelation: "bikes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_bikes_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_credits: {
        Row: {
          credits_used: number | null
          id: string
          purchase_id: string | null
          reservation_id: string | null
        }
        Insert: {
          credits_used?: number | null
          id?: string
          purchase_id?: string | null
          reservation_id?: string | null
        }
        Update: {
          credits_used?: number | null
          id?: string
          purchase_id?: string | null
          reservation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_credits_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_credits_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          class_id: string | null
          created_at: string | null
          id: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      static_bikes: {
        Row: {
          id: number
          number: number
        }
        Insert: {
          id?: number
          number: number
        }
        Update: {
          id?: number
          number?: number
        }
        Relationships: []
      }
      banners: {
        Row: {
          id: string
          title: string
          description: string | null
          is_active: boolean | null
          start_date: string | null
          end_date: string | null
          background_color: string | null
          text_color: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          is_active?: boolean | null
          start_date?: string | null
          end_date?: string | null
          background_color?: string | null
          text_color?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          is_active?: boolean | null
          start_date?: string | null
          end_date?: string | null
          background_color?: string | null
          text_color?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          address: string | null
          birthday: string | null
          cedula: string | null
          created_at: string | null
          email: string
          id: string
          name: string | null
          phone: string | null
        }
        Insert: {
          address?: string | null
          birthday?: string | null
          cedula?: string | null
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          phone?: string | null
        }
        Update: {
          address?: string | null
          birthday?: string | null
          cedula?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          phone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_reservation: {
        Args: { p_reservation_id: string }
        Returns: Json
      }
      generate_weekly_classes: {
        Args: { start_date_input: string }
        Returns: undefined
      }
      join_waitlist: {
        Args: { p_user_id: string; p_class_id: string }
        Returns: Json
      }
      make_reservation: {
        Args:
          | { p_user_id: string; p_class_id: string; p_bike_ids: string[] }
          | {
              p_user_id: string
              p_class_id: string
              p_bike_ids: string[]
              p_purchase_id: string
              p_credits_to_use: number
            }
        Returns: Json
      }
      modify_reservation: {
        Args: { p_reservation_id: string; p_new_bike_ids: string[] }
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
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
