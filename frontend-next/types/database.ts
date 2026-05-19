export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      diagnoses: {
        Row: {
          id: string;
          user_id: string;
          plant_label: string | null;
          disease_label: string | null;
          plant_confidence: number | null;
          disease_confidence: number | null;
          status: string;
          recommendation: string | null;
          image_url: string | null;
          model_version: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plant_label?: string | null;
          disease_label?: string | null;
          plant_confidence?: number | null;
          disease_confidence?: number | null;
          status: string;
          recommendation?: string | null;
          image_url?: string | null;
          model_version?: string | null;
          created_at?: string;
        };
        Update: {
          plant_label?: string | null;
          disease_label?: string | null;
          plant_confidence?: number | null;
          disease_confidence?: number | null;
          status?: string;
          recommendation?: string | null;
          image_url?: string | null;
          model_version?: string | null;
        };
        Relationships: [];
      };
      diagnosis_images: {
        Row: {
          id: string;
          diagnosis_id: string;
          user_id: string;
          storage_path: string;
          image_url: string;
          plant_label: string | null;
          disease_label: string | null;
          plant_confidence: number | null;
          disease_confidence: number | null;
          analysis_status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          diagnosis_id: string;
          user_id: string;
          storage_path: string;
          image_url: string;
          plant_label?: string | null;
          disease_label?: string | null;
          plant_confidence?: number | null;
          disease_confidence?: number | null;
          analysis_status: string;
          created_at?: string;
        };
        Update: {
          storage_path?: string;
          image_url?: string;
          plant_label?: string | null;
          disease_label?: string | null;
          plant_confidence?: number | null;
          disease_confidence?: number | null;
          analysis_status?: string;
        };
        Relationships: [];
      };
      feedbacks: {
        Row: {
          id: string;
          diagnosis_id: string;
          user_id: string;
          is_correct: boolean | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          diagnosis_id: string;
          user_id: string;
          is_correct?: boolean | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          is_correct?: boolean | null;
          note?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};