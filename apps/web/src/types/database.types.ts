// Generated from Voltaryx migrations. Regenerate with: pnpm supabase:types

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Rel = {
  foreignKeyName: string
  columns: string[]
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: string[]
}

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id:            string
          slug:          string
          name:          string
          logo_url:      string | null
          primary_color: string
          plan:          'starter' | 'pro' | 'enterprise'
          is_active:     boolean
          created_at:    string
          updated_at:    string
        }
        Insert: { slug: string; name: string; logo_url?: string | null; primary_color?: string; plan?: string; is_active?: boolean }
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>
        Relationships: Rel[]
      }

      profiles: {
        Row: {
          id:         string
          tenant_id:  string
          full_name:  string
          role:       'super_admin' | 'tenant_admin' | 'supervisor' | 'technician' | 'commercial'
          avatar_url: string | null
          phone:      string | null
          is_active:  boolean
          created_at: string
          updated_at: string
        }
        Insert: { id: string; tenant_id: string; full_name: string; role?: string; avatar_url?: string | null; phone?: string | null; is_active?: boolean }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: [
          { foreignKeyName: 'profiles_tenant_id_fkey'; columns: ['tenant_id']; isOneToOne: false; referencedRelation: 'tenants'; referencedColumns: ['id'] }
        ]
      }

      customers: {
        Row: {
          id:         string
          tenant_id:  string
          name:       string
          tax_id:     string | null
          industry:   string | null
          tier:       'vip' | 'premium' | 'standard'
          notes:      string | null
          is_active:  boolean
          created_at: string
          updated_at: string
        }
        Insert: { tenant_id: string; name: string; tax_id?: string | null; industry?: string | null; tier?: string; notes?: string | null; is_active?: boolean }
        Update: Partial<Database['public']['Tables']['customers']['Insert']>
        Relationships: Rel[]
      }

      sites: {
        Row: {
          id:              string
          tenant_id:       string
          customer_id:     string
          name:            string
          address:         string | null
          city:            string | null
          country:         string
          lat:             number | null
          lng:             number | null
          access_notes:    string | null
          primary_contact: string | null
          primary_phone:   string | null
          is_active:       boolean
          created_at:      string
          updated_at:      string
        }
        Insert: { tenant_id: string; customer_id: string; name: string; address?: string | null; city?: string | null; country?: string; lat?: number | null; lng?: number | null; access_notes?: string | null; primary_contact?: string | null; primary_phone?: string | null; is_active?: boolean }
        Update: Partial<Database['public']['Tables']['sites']['Insert']>
        Relationships: [
          { foreignKeyName: 'sites_customer_id_fkey'; columns: ['customer_id']; isOneToOne: false; referencedRelation: 'customers'; referencedColumns: ['id'] }
        ]
      }

      asset_types: {
        Row: {
          id:         string
          tenant_id:  string
          name:       string
          category:   'ups' | 'stabilizer' | 'battery_bank' | 'precision_ac' | 'other'
          checklist:  Json
          created_at: string
          updated_at: string
        }
        Insert: { tenant_id: string; name: string; category: string; checklist?: Json }
        Update: Partial<Database['public']['Tables']['asset_types']['Insert']>
        Relationships: Rel[]
      }

      assets: {
        Row: {
          id:                string
          tenant_id:         string
          site_id:           string
          asset_type_id:     string | null
          name:              string
          brand:             string | null
          model:             string | null
          serial_number:     string | null
          capacity_kva:      number | null
          installation_date: string | null
          warranty_expiry:   string | null
          status:            'operational' | 'degraded' | 'critical' | 'retired'
          location_notes:    string | null
          is_active:         boolean
          created_at:        string
          updated_at:        string
        }
        Insert: { tenant_id: string; site_id: string; name: string; asset_type_id?: string | null; brand?: string | null; model?: string | null; serial_number?: string | null; capacity_kva?: number | null; installation_date?: string | null; warranty_expiry?: string | null; status?: string; location_notes?: string | null; is_active?: boolean }
        Update: Partial<Database['public']['Tables']['assets']['Insert']>
        Relationships: [
          { foreignKeyName: 'assets_site_id_fkey'; columns: ['site_id']; isOneToOne: false; referencedRelation: 'sites'; referencedColumns: ['id'] }
        ]
      }

      work_orders: {
        Row: {
          id:                     string
          tenant_id:              string
          order_number:           string
          customer_id:            string
          site_id:                string
          assigned_to:            string | null
          supervisor_id:          string | null
          type:                   'preventive' | 'corrective' | 'emergency' | 'installation' | 'inspection'
          status:                 'scheduled' | 'in_transit' | 'on_site' | 'in_progress' | 'completed' | 'cancelled'
          priority:               'low' | 'normal' | 'high' | 'critical'
          scheduled_date:         string
          scheduled_time:         string | null
          estimated_duration_min: number | null
          started_at:             string | null
          arrived_at:             string | null
          completed_at:           string | null
          description:            string | null
          internal_notes:         string | null
          completion_notes:       string | null
          requires_signature:     boolean
          signed_by:              string | null
          signed_at:              string | null
          signature_url:          string | null
          report_url:             string | null
          created_at:             string
          updated_at:             string
        }
        Insert: { tenant_id: string; customer_id: string; site_id: string; type: string; scheduled_date: string; order_number?: string; assigned_to?: string | null; supervisor_id?: string | null; status?: string; priority?: string; scheduled_time?: string | null; estimated_duration_min?: number | null; description?: string | null; internal_notes?: string | null; requires_signature?: boolean }
        Update: Partial<Database['public']['Tables']['work_orders']['Insert']> & {
          started_at?: string | null; arrived_at?: string | null; completed_at?: string | null;
          completion_notes?: string | null; signed_by?: string | null; signed_at?: string | null;
          signature_url?: string | null; report_url?: string | null;
        }
        Relationships: [
          { foreignKeyName: 'work_orders_customer_id_fkey'; columns: ['customer_id']; isOneToOne: false; referencedRelation: 'customers'; referencedColumns: ['id'] },
          { foreignKeyName: 'work_orders_site_id_fkey'; columns: ['site_id']; isOneToOne: false; referencedRelation: 'sites'; referencedColumns: ['id'] },
          { foreignKeyName: 'work_orders_assigned_to_fkey'; columns: ['assigned_to']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }

      work_order_assets: {
        Row: {
          id:             string
          tenant_id:      string
          work_order_id:  string
          asset_id:       string
          checklist_data: Json
          completed_at:   string | null
          created_at:     string
          updated_at:     string
        }
        Insert: { tenant_id: string; work_order_id: string; asset_id: string; checklist_data?: Json; completed_at?: string | null }
        Update: Partial<Database['public']['Tables']['work_order_assets']['Insert']>
        Relationships: [
          { foreignKeyName: 'work_order_assets_work_order_id_fkey'; columns: ['work_order_id']; isOneToOne: false; referencedRelation: 'work_orders'; referencedColumns: ['id'] },
          { foreignKeyName: 'work_order_assets_asset_id_fkey'; columns: ['asset_id']; isOneToOne: false; referencedRelation: 'assets'; referencedColumns: ['id'] }
        ]
      }

      findings: {
        Row: {
          id:               string
          tenant_id:        string
          work_order_id:    string
          asset_id:         string | null
          reported_by:      string | null
          title:            string
          description:      string | null
          severity:         'low' | 'medium' | 'high' | 'critical'
          category:         'electrical' | 'mechanical' | 'thermal' | 'physical' | 'software' | 'other' | null
          status:           'open' | 'in_progress' | 'resolved' | 'wont_fix'
          resolution_notes: string | null
          resolved_at:      string | null
          is_opportunity:   boolean
          estimated_value:  number | null
          created_at:       string
          updated_at:       string
        }
        Insert: { tenant_id: string; work_order_id: string; title: string; severity?: string; description?: string | null; asset_id?: string | null; reported_by?: string | null; category?: string | null; status?: string; resolution_notes?: string | null; is_opportunity?: boolean; estimated_value?: number | null }
        Update: Partial<Database['public']['Tables']['findings']['Insert']> & { resolved_at?: string | null }
        Relationships: [
          { foreignKeyName: 'findings_work_order_id_fkey'; columns: ['work_order_id']; isOneToOne: false; referencedRelation: 'work_orders'; referencedColumns: ['id'] }
        ]
      }

      photos: {
        Row: {
          id:              string
          tenant_id:       string
          work_order_id:   string
          asset_id:        string | null
          finding_id:      string | null
          uploaded_by:     string | null
          storage_path:    string
          thumbnail_path:  string | null
          caption:         string | null
          taken_at:        string
          file_size_bytes: number | null
          width:           number | null
          height:          number | null
          created_at:      string
        }
        Insert: { tenant_id: string; work_order_id: string; storage_path: string; asset_id?: string | null; finding_id?: string | null; uploaded_by?: string | null; thumbnail_path?: string | null; caption?: string | null; taken_at?: string; file_size_bytes?: number | null; width?: number | null; height?: number | null }
        Update: Partial<Database['public']['Tables']['photos']['Insert']>
        Relationships: Rel[]
      }

      opportunities: {
        Row: {
          id:              string
          tenant_id:       string
          customer_id:     string
          site_id:         string | null
          finding_id:      string | null
          created_by:      string | null
          assigned_to:     string | null
          title:           string
          description:     string | null
          stage:           'identified' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
          probability:     number | null
          estimated_value: number | null
          currency:        string
          expected_close:  string | null
          lost_reason:     string | null
          created_at:      string
          updated_at:      string
        }
        Insert: { tenant_id: string; customer_id: string; title: string; site_id?: string | null; finding_id?: string | null; created_by?: string | null; assigned_to?: string | null; description?: string | null; stage?: string; probability?: number | null; estimated_value?: number | null; currency?: string; expected_close?: string | null }
        Update: Partial<Database['public']['Tables']['opportunities']['Insert']>
        Relationships: Rel[]
      }

      contracts: {
        Row: {
          id:                    string
          tenant_id:             string
          customer_id:           string
          opportunity_id:        string | null
          contract_number:       string
          type:                  'maintenance' | 'monitoring' | 'project' | 'adhoc'
          status:                'draft' | 'active' | 'expired' | 'cancelled'
          start_date:            string
          end_date:              string | null
          value:                 number | null
          currency:              string
          billing_cycle:         'monthly' | 'quarterly' | 'annual' | 'one_time' | null
          sla_response_hours:    number | null
          sla_resolution_hours:  number | null
          visits_per_year:       number | null
          notes:                 string | null
          document_url:          string | null
          created_at:            string
          updated_at:            string
        }
        Insert: { tenant_id: string; customer_id: string; contract_number: string; type: string; start_date: string; opportunity_id?: string | null; status?: string; end_date?: string | null; value?: number | null; currency?: string; billing_cycle?: string | null; sla_response_hours?: number | null; sla_resolution_hours?: number | null; visits_per_year?: number | null; notes?: string | null; document_url?: string | null }
        Update: Partial<Database['public']['Tables']['contracts']['Insert']>
        Relationships: Rel[]
      }
    }

    Views:     Record<string, never>
    Functions: Record<string, never>
    Enums:     Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
