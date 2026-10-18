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
      bookings: {
        Row: {
          amount: number
          bay: string
          cold_room_id: string
          crates: number
          created_at: string
          crop: string
          days: number
          farmer_id: string
          id: string
          paid: boolean
          pass_no: string
          pay_method: string | null
          pay_mode: string
          utr: string | null
        }
        Insert: {
          amount: number
          bay: string
          cold_room_id: string
          crates: number
          created_at?: string
          crop: string
          days: number
          farmer_id: string
          id?: string
          paid?: boolean
          pass_no: string
          pay_method?: string | null
          pay_mode: string
          utr?: string | null
        }
        Update: {
          amount?: number
          bay?: string
          cold_room_id?: string
          crates?: number
          created_at?: string
          crop?: string
          days?: number
          farmer_id?: string
          id?: string
          paid?: boolean
          pass_no?: string
          pay_method?: string | null
          pay_mode?: string
          utr?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_cold_room_id_fkey"
            columns: ["cold_room_id"]
            isOneToOne: false
            referencedRelation: "cold_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      cold_rooms: {
        Row: {
          address: string
          badges: string[]
          district: string
          humidity: number
          id: string
          lat: number
          lng: number
          name: string
          name_hi: string | null
          phone: string | null
          pin: string | null
          rate_per_crate_day: number
          state: string
          tags: string[]
          temp_c: number
          total_slots: number
        }
        Insert: {
          address: string
          badges?: string[]
          district: string
          humidity: number
          id?: string
          lat: number
          lng: number
          name: string
          name_hi?: string | null
          phone?: string | null
          pin?: string | null
          rate_per_crate_day: number
          state: string
          tags?: string[]
          temp_c: number
          total_slots: number
        }
        Update: {
          address?: string
          badges?: string[]
          district?: string
          humidity?: number
          id?: string
          lat?: number
          lng?: number
          name?: string
          name_hi?: string | null
          phone?: string | null
          pin?: string | null
          rate_per_crate_day?: number
          state?: string
          tags?: string[]
          temp_c?: number
          total_slots?: number
        }
        Relationships: []
      }
      lot_handover: {
        Row: {
          attempts: number
          code: string
          farmer_id: string
          lot_id: string
        }
        Insert: {
          attempts?: number
          code: string
          farmer_id: string
          lot_id: string
        }
        Update: {
          attempts?: number
          code?: string
          farmer_id?: string
          lot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lot_handover_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: true
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      lots: {
        Row: {
          buyer_id: string | null
          buyer_name: string | null
          cold_deduction: number
          created_at: string
          crop: string
          farmer_district: string | null
          farmer_id: string
          farmer_name: string
          grade: string
          gross: number
          id: string
          kg: number
          lot_code: string
          net_amount: number
          ordered_at: string | null
          price_per_kg: number
          settled_at: string | null
          status: string
          transport_deduction: number
          utr: string | null
        }
        Insert: {
          buyer_id?: string | null
          buyer_name?: string | null
          cold_deduction?: number
          created_at?: string
          crop: string
          farmer_district?: string | null
          farmer_id: string
          farmer_name: string
          grade?: string
          gross: number
          id?: string
          kg: number
          lot_code: string
          net_amount: number
          ordered_at?: string | null
          price_per_kg: number
          settled_at?: string | null
          status?: string
          transport_deduction?: number
          utr?: string | null
        }
        Update: {
          buyer_id?: string | null
          buyer_name?: string | null
          cold_deduction?: number
          created_at?: string
          crop?: string
          farmer_district?: string | null
          farmer_id?: string
          farmer_name?: string
          grade?: string
          gross?: number
          id?: string
          kg?: number
          lot_code?: string
          net_amount?: number
          ordered_at?: string | null
          price_per_kg?: number
          settled_at?: string | null
          status?: string
          transport_deduction?: number
          utr?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          district: string | null
          fpo_id: string | null
          full_name: string
          id: string
          id_number: string | null
          id_type: string | null
          org_name: string | null
          phone: string | null
          state: string | null
          updated_at: string
          upi_id: string | null
          village: string | null
        }
        Insert: {
          created_at?: string
          district?: string | null
          fpo_id?: string | null
          full_name?: string
          id: string
          id_number?: string | null
          id_type?: string | null
          org_name?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          upi_id?: string | null
          village?: string | null
        }
        Update: {
          created_at?: string
          district?: string | null
          fpo_id?: string | null
          full_name?: string
          id?: string
          id_number?: string | null
          id_type?: string | null
          org_name?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          upi_id?: string | null
          village?: string | null
        }
        Relationships: []
      }
      scans: {
        Row: {
          batch_code: string
          confidence: number
          created_at: string
          crop: string
          farmer_id: string
          grade: string
          id: string
          notes: string | null
          shelf_cold: number
          shelf_no: number
          spoilage: string
          uniformity: number
        }
        Insert: {
          batch_code: string
          confidence: number
          created_at?: string
          crop: string
          farmer_id: string
          grade: string
          id?: string
          notes?: string | null
          shelf_cold: number
          shelf_no: number
          spoilage: string
          uniformity: number
        }
        Update: {
          batch_code?: string
          confidence?: number
          created_at?: string
          crop?: string
          farmer_id?: string
          grade?: string
          id?: string
          notes?: string | null
          shelf_cold?: number
          shelf_no?: number
          spoilage?: string
          uniformity?: number
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: undefined
      }
      cold_room_free_slots: {
        Args: never
        Returns: {
          cold_room_id: string
          free: number
        }[]
      }
      cancel_lot: { Args: { _lot_id: string }; Returns: undefined }
      confirm_delivery: {
        Args: { _code: string; _lot_id: string }
        Returns: Json
      }
      create_booking: {
        Args: {
          _cold_room_id: string
          _crates: number
          _crop: string
          _days: number
          _pay_method?: string
          _pay_mode: string
          _utr?: string
        }
        Returns: Database["public"]["Tables"]["bookings"]["Row"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      pay_booking_dues: {
        Args: { _booking_ids: string[]; _pay_method: string; _utr: string }
        Returns: number
      }
      place_order: { Args: { _lot_id: string }; Returns: undefined }
      regenerate_handover_code: { Args: { _lot_id: string }; Returns: string }
    }
    Enums: {
      app_role: "farmer" | "buyer"
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
      app_role: ["farmer", "buyer"],
    },
  },
} as const
