export type Profile = {
  id: string;
  email: string | null;
  full_name: string;
  country: string;
  last_ip: string | null;
  browser: string;
  device: string;
  is_active: boolean;
  is_online: boolean;
  is_admin: boolean;
  withdrawn_at: string | null;
  generations_count: number;
  downloads_count: number;
  last_seen_at: string | null;
  created_at: string;
};

export type GenerationRow = {
  id: string;
  user_id: string;
  label: string;
  prompt: string;
  image_path: string;
  image_url: string;
  download_count: number;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string;
          country?: string;
          last_ip?: string | null;
          browser?: string;
          device?: string;
          is_active?: boolean;
          is_online?: boolean;
          is_admin?: boolean;
          withdrawn_at?: string | null;
          generations_count?: number;
          downloads_count?: number;
          last_seen_at?: string | null;
          created_at?: string;
        };
        Update: {
          email?: string | null;
          full_name?: string;
          country?: string;
          last_ip?: string | null;
          browser?: string;
          device?: string;
          is_active?: boolean;
          is_online?: boolean;
          is_admin?: boolean;
          withdrawn_at?: string | null;
          generations_count?: number;
          downloads_count?: number;
          last_seen_at?: string | null;
        };
        Relationships: [];
      };
      generations: {
        Row: GenerationRow;
        Insert: {
          id?: string;
          user_id: string;
          label?: string;
          prompt?: string;
          image_path?: string;
          image_url?: string;
          download_count?: number;
          created_at?: string;
        };
        Update: {
          label?: string;
          prompt?: string;
          image_path?: string;
          image_url?: string;
          download_count?: number;
        };
        Relationships: [];
      };
      cloudinary_settings: {
        Row: {
          id: number;
          cloud_name: string;
          upload_preset: string;
          folder: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          cloud_name?: string;
          upload_preset?: string;
          folder?: string;
          updated_at?: string;
        };
        Update: {
          cloud_name?: string;
          upload_preset?: string;
          folder?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      sync_admin_flag: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      touch_presence: {
        Args: { online?: boolean };
        Returns: undefined;
      };
      withdraw_account: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      increment_download: {
        Args: { generation_id: string };
        Returns: number;
      };
      increment_profile_downloads: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
    Enums: Record<string, never>;
  };
};
