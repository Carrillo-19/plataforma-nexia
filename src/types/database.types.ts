// Tipos del esquema `public` alineados con supabase/schema.sql.
// Formato compatible con `supabase gen types typescript`; cuando el proyecto
// esté enlazado, regenerar con:
//   npx supabase gen types typescript --project-id <id> --schema public > src/types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          name: string;
          industry_type: Database["public"]["Enums"]["industry_type"];
          ai_prompt_context: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          industry_type: Database["public"]["Enums"]["industry_type"];
          ai_prompt_context?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          industry_type?: Database["public"]["Enums"]["industry_type"];
          ai_prompt_context?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          business_id: string;
          role: Database["public"]["Enums"]["user_role"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          business_id: string;
          role?: Database["public"]["Enums"]["user_role"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          business_id: string;
          phone_number: string;
          full_name: string | null;
          loyalty_visits: number;
          preferences_summary: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          phone_number: string;
          full_name?: string | null;
          loyalty_visits?: number;
          preferences_summary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          phone_number?: string;
          full_name?: string | null;
          loyalty_visits?: number;
          preferences_summary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      resources: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          capacity: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          capacity?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          capacity?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resources_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      reservations: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string;
          resource_id: string;
          start_time: string;
          end_time: string;
          status: Database["public"]["Enums"]["reservation_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          customer_id: string;
          resource_id: string;
          start_time: string;
          end_time: string;
          status?: Database["public"]["Enums"]["reservation_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          customer_id?: string;
          resource_id?: string;
          start_time?: string;
          end_time?: string;
          status?: Database["public"]["Enums"]["reservation_status"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_customer_fkey";
            columns: ["business_id", "customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "reservations_resource_fkey";
            columns: ["business_id", "resource_id"];
            isOneToOne: false;
            referencedRelation: "resources";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      conversations: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string;
          channel: Database["public"]["Enums"]["conversation_channel"];
          is_bot_active: boolean;
          last_message_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          customer_id: string;
          channel: Database["public"]["Enums"]["conversation_channel"];
          is_bot_active?: boolean;
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          customer_id?: string;
          channel?: Database["public"]["Enums"]["conversation_channel"];
          is_bot_active?: boolean;
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_customer_fkey";
            columns: ["business_id", "customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          business_id: string;
          conversation_id: string;
          sender_type: Database["public"]["Enums"]["message_sender_type"];
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          conversation_id: string;
          sender_type: Database["public"]["Enums"]["message_sender_type"];
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          conversation_id?: string;
          sender_type?: Database["public"]["Enums"]["message_sender_type"];
          content?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_fkey";
            columns: ["business_id", "conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_business_for_current_user: {
        Args: {
          p_name: string;
          p_industry_type: Database["public"]["Enums"]["industry_type"];
          p_timezone?: string;
        };
        Returns: string;
      };
    };
    Enums: {
      industry_type: "restaurant" | "barbershop" | "hotel" | "services" | "other";
      user_role: "owner" | "admin" | "agent";
      reservation_status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
      conversation_channel: "whatsapp" | "voice";
      message_sender_type: "ai" | "human_admin" | "customer";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export const Constants = {
  public: {
    Enums: {
      industry_type: ["restaurant", "barbershop", "hotel", "services", "other"],
      user_role: ["owner", "admin", "agent"],
      reservation_status: ["pending", "confirmed", "cancelled", "completed", "no_show"],
      conversation_channel: ["whatsapp", "voice"],
      message_sender_type: ["ai", "human_admin", "customer"],
    },
  },
} as const satisfies { public: { Enums: { [K in keyof PublicSchema["Enums"]]: readonly PublicSchema["Enums"][K][] } } };
