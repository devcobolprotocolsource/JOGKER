export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          entity: string;
          entity_id: string | null;
          id: number;
          payload: Json | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          entity: string;
          entity_id?: string | null;
          id?: never;
          payload?: Json | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          entity?: string;
          entity_id?: string | null;
          id?: never;
          payload?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          is_active: boolean;
          name: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          is_active?: boolean;
          name: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          is_active?: boolean;
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      daily_sequences: {
        Row: {
          day: string;
          last_no: number;
        };
        Insert: {
          day: string;
          last_no: number;
        };
        Update: {
          day?: string;
          last_no?: number;
        };
        Relationships: [];
      };
      inventory_items: {
        Row: {
          current_qty: number;
          id: string;
          is_active: boolean;
          min_qty: number;
          name: string;
          unit: string;
          unit_cost: number;
        };
        Insert: {
          current_qty?: number;
          id?: string;
          is_active?: boolean;
          min_qty?: number;
          name: string;
          unit: string;
          unit_cost?: number;
        };
        Update: {
          current_qty?: number;
          id?: string;
          is_active?: boolean;
          min_qty?: number;
          name?: string;
          unit?: string;
          unit_cost?: number;
        };
        Relationships: [];
      };
      menu_item_modifier_groups: {
        Row: {
          group_id: string;
          menu_item_id: string;
        };
        Insert: {
          group_id: string;
          menu_item_id: string;
        };
        Update: {
          group_id?: string;
          menu_item_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'menu_item_modifier_groups_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'modifier_groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'menu_item_modifier_groups_menu_item_id_fkey';
            columns: ['menu_item_id'];
            isOneToOne: false;
            referencedRelation: 'menu_items';
            referencedColumns: ['id'];
          },
        ];
      };
      menu_items: {
        Row: {
          category_id: string;
          created_at: string;
          description: string | null;
          id: string;
          image_path: string | null;
          is_active: boolean;
          is_available: boolean;
          name: string;
          price: number;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          is_available?: boolean;
          name: string;
          price: number;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          is_available?: boolean;
          name?: string;
          price?: number;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'menu_items_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      modifier_groups: {
        Row: {
          id: string;
          max_select: number;
          min_select: number;
          name: string;
        };
        Insert: {
          id?: string;
          max_select?: number;
          min_select?: number;
          name: string;
        };
        Update: {
          id?: string;
          max_select?: number;
          min_select?: number;
          name?: string;
        };
        Relationships: [];
      };
      modifier_options: {
        Row: {
          extra_price: number;
          group_id: string;
          id: string;
          is_active: boolean;
          name: string;
        };
        Insert: {
          extra_price?: number;
          group_id: string;
          id?: string;
          is_active?: boolean;
          name: string;
        };
        Update: {
          extra_price?: number;
          group_id?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'modifier_options_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'modifier_groups';
            referencedColumns: ['id'];
          },
        ];
      };
      order_items: {
        Row: {
          created_at: string;
          id: string;
          is_voided: boolean;
          item_name: string;
          line_total: number;
          menu_item_id: string;
          modifiers: Json;
          note: string | null;
          order_id: string;
          qty: number;
          unit_price: number;
          void_reason: string | null;
          voided_at: string | null;
          voided_by: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_voided?: boolean;
          item_name: string;
          line_total: number;
          menu_item_id: string;
          modifiers?: Json;
          note?: string | null;
          order_id: string;
          qty: number;
          unit_price: number;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_voided?: boolean;
          item_name?: string;
          line_total?: number;
          menu_item_id?: string;
          modifiers?: Json;
          note?: string | null;
          order_id?: string;
          qty?: number;
          unit_price?: number;
          void_reason?: string | null;
          voided_at?: string | null;
          voided_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'order_items_menu_item_id_fkey';
            columns: ['menu_item_id'];
            isOneToOne: false;
            referencedRelation: 'menu_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_items_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_items_voided_by_fkey';
            columns: ['voided_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      orders: {
        Row: {
          bill_state: Database['public']['Enums']['bill_state'] | null;
          cancel_reason: string | null;
          closed_at: string | null;
          created_at: string;
          created_by: string;
          customer_name: string | null;
          discount_total: number;
          grand_total: number;
          id: string;
          order_no: string;
          order_type: Database['public']['Enums']['order_type'];
          rounding_amount: number;
          service_amount: number;
          shift_id: string;
          status: Database['public']['Enums']['order_status'];
          subtotal: number;
          table_label: string | null;
          tax_amount: number;
          updated_at: string;
          voucher_code: string | null;
          voucher_id: string | null;
        };
        Insert: {
          bill_state?: Database['public']['Enums']['bill_state'] | null;
          cancel_reason?: string | null;
          closed_at?: string | null;
          created_at?: string;
          created_by: string;
          customer_name?: string | null;
          discount_total?: number;
          grand_total?: number;
          id?: string;
          order_no: string;
          order_type: Database['public']['Enums']['order_type'];
          rounding_amount?: number;
          service_amount?: number;
          shift_id: string;
          status?: Database['public']['Enums']['order_status'];
          subtotal?: number;
          table_label?: string | null;
          tax_amount?: number;
          updated_at?: string;
          voucher_code?: string | null;
          voucher_id?: string | null;
        };
        Update: {
          bill_state?: Database['public']['Enums']['bill_state'] | null;
          cancel_reason?: string | null;
          closed_at?: string | null;
          created_at?: string;
          created_by?: string;
          customer_name?: string | null;
          discount_total?: number;
          grand_total?: number;
          id?: string;
          order_no?: string;
          order_type?: Database['public']['Enums']['order_type'];
          rounding_amount?: number;
          service_amount?: number;
          shift_id?: string;
          status?: Database['public']['Enums']['order_status'];
          subtotal?: number;
          table_label?: string | null;
          tax_amount?: number;
          updated_at?: string;
          voucher_code?: string | null;
          voucher_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_shift_id_fkey';
            columns: ['shift_id'];
            isOneToOne: false;
            referencedRelation: 'shifts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_voucher_id_fkey';
            columns: ['voucher_id'];
            isOneToOne: false;
            referencedRelation: 'vouchers';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_accounts: {
        Row: {
          account_name: string;
          account_no: string;
          created_at: string;
          id: string;
          is_active: boolean;
          method: Database['public']['Enums']['payment_method'];
          provider: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          account_name: string;
          account_no: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          method: Database['public']['Enums']['payment_method'];
          provider: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          account_name?: string;
          account_no?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          method?: Database['public']['Enums']['payment_method'];
          provider?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          method: Database['public']['Enums']['payment_method'];
          note: string | null;
          order_id: string;
          payment_account_id: string | null;
          proof_path: string | null;
          received_amount: number | null;
          reference_no: string | null;
          status: Database['public']['Enums']['payment_status'];
          verified_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          method: Database['public']['Enums']['payment_method'];
          note?: string | null;
          order_id: string;
          payment_account_id?: string | null;
          proof_path?: string | null;
          received_amount?: number | null;
          reference_no?: string | null;
          status?: Database['public']['Enums']['payment_status'];
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          method?: Database['public']['Enums']['payment_method'];
          note?: string | null;
          order_id?: string;
          payment_account_id?: string | null;
          proof_path?: string | null;
          received_amount?: number | null;
          reference_no?: string | null;
          status?: Database['public']['Enums']['payment_status'];
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_payment_account_id_fkey';
            columns: ['payment_account_id'];
            isOneToOne: false;
            referencedRelation: 'payment_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_verified_by_fkey';
            columns: ['verified_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          is_active: boolean;
          role: Database['public']['Enums']['role_type'];
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name: string;
          id: string;
          is_active?: boolean;
          role?: Database['public']['Enums']['role_type'];
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          role?: Database['public']['Enums']['role_type'];
        };
        Relationships: [];
      };
      recipe_lines: {
        Row: {
          inventory_item_id: string;
          menu_item_id: string;
          qty_per_serving: number;
        };
        Insert: {
          inventory_item_id: string;
          menu_item_id: string;
          qty_per_serving: number;
        };
        Update: {
          inventory_item_id?: string;
          menu_item_id?: string;
          qty_per_serving?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'recipe_lines_inventory_item_id_fkey';
            columns: ['inventory_item_id'];
            isOneToOne: false;
            referencedRelation: 'inventory_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recipe_lines_menu_item_id_fkey';
            columns: ['menu_item_id'];
            isOneToOne: false;
            referencedRelation: 'menu_items';
            referencedColumns: ['id'];
          },
        ];
      };
      refunds: {
        Row: {
          actor_id: string | null;
          amount: number;
          created_at: string;
          id: string;
          payment_id: string;
          reason: string;
        };
        Insert: {
          actor_id?: string | null;
          amount: number;
          created_at?: string;
          id?: string;
          payment_id: string;
          reason: string;
        };
        Update: {
          actor_id?: string | null;
          amount?: number;
          created_at?: string;
          id?: string;
          payment_id?: string;
          reason?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'refunds_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'refunds_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
        ];
      };
      shifts: {
        Row: {
          actual_cash: number | null;
          closed_at: string | null;
          closed_by: string | null;
          difference: number | null;
          expected_cash: number | null;
          id: string;
          note: string | null;
          opened_at: string;
          opened_by: string;
          opening_cash: number;
          status: Database['public']['Enums']['shift_status'];
        };
        Insert: {
          actual_cash?: number | null;
          closed_at?: string | null;
          closed_by?: string | null;
          difference?: number | null;
          expected_cash?: number | null;
          id?: string;
          note?: string | null;
          opened_at?: string;
          opened_by: string;
          opening_cash: number;
          status?: Database['public']['Enums']['shift_status'];
        };
        Update: {
          actual_cash?: number | null;
          closed_at?: string | null;
          closed_by?: string | null;
          difference?: number | null;
          expected_cash?: number | null;
          id?: string;
          note?: string | null;
          opened_at?: string;
          opened_by?: string;
          opening_cash?: number;
          status?: Database['public']['Enums']['shift_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'shifts_closed_by_fkey';
            columns: ['closed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'shifts_opened_by_fkey';
            columns: ['opened_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      stock_movements: {
        Row: {
          actor_id: string | null;
          created_at: string;
          id: number;
          inventory_item_id: string;
          movement_type: Database['public']['Enums']['movement_type'];
          note: string | null;
          qty_change: number;
          reference_id: string | null;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          id?: never;
          inventory_item_id: string;
          movement_type: Database['public']['Enums']['movement_type'];
          note?: string | null;
          qty_change: number;
          reference_id?: string | null;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          id?: never;
          inventory_item_id?: string;
          movement_type?: Database['public']['Enums']['movement_type'];
          note?: string | null;
          qty_change?: number;
          reference_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'stock_movements_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_movements_inventory_item_id_fkey';
            columns: ['inventory_item_id'];
            isOneToOne: false;
            referencedRelation: 'inventory_items';
            referencedColumns: ['id'];
          },
        ];
      };
      stock_opname_lines: {
        Row: {
          counted_qty: number | null;
          inventory_item_id: string;
          opname_id: string;
          system_qty: number;
        };
        Insert: {
          counted_qty?: number | null;
          inventory_item_id: string;
          opname_id: string;
          system_qty: number;
        };
        Update: {
          counted_qty?: number | null;
          inventory_item_id?: string;
          opname_id?: string;
          system_qty?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'stock_opname_lines_inventory_item_id_fkey';
            columns: ['inventory_item_id'];
            isOneToOne: false;
            referencedRelation: 'inventory_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_opname_lines_opname_id_fkey';
            columns: ['opname_id'];
            isOneToOne: false;
            referencedRelation: 'stock_opnames';
            referencedColumns: ['id'];
          },
        ];
      };
      stock_opnames: {
        Row: {
          finalized_at: string | null;
          id: string;
          opened_at: string;
          opened_by: string | null;
          status: string;
        };
        Insert: {
          finalized_at?: string | null;
          id?: string;
          opened_at?: string;
          opened_by?: string | null;
          status?: string;
        };
        Update: {
          finalized_at?: string | null;
          id?: string;
          opened_at?: string;
          opened_by?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'stock_opnames_opened_by_fkey';
            columns: ['opened_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      store_settings: {
        Row: {
          accent_color: string;
          address: string | null;
          allow_negative_stock: boolean;
          font_family: string;
          id: number;
          logo_path: string | null;
          open_hours: Json;
          paper_width_mm: number;
          phone: string | null;
          primary_color: string;
          receipt_footer: string | null;
          receipt_header: string | null;
          require_verified_payment_before_complete: boolean;
          rounding_rule: string;
          service_percent: number;
          store_name: string;
          tax_percent: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          accent_color?: string;
          address?: string | null;
          allow_negative_stock?: boolean;
          font_family?: string;
          id?: number;
          logo_path?: string | null;
          open_hours?: Json;
          paper_width_mm?: number;
          phone?: string | null;
          primary_color?: string;
          receipt_footer?: string | null;
          receipt_header?: string | null;
          require_verified_payment_before_complete?: boolean;
          rounding_rule?: string;
          service_percent?: number;
          store_name: string;
          tax_percent?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          accent_color?: string;
          address?: string | null;
          allow_negative_stock?: boolean;
          font_family?: string;
          id?: number;
          logo_path?: string | null;
          open_hours?: Json;
          paper_width_mm?: number;
          phone?: string | null;
          primary_color?: string;
          receipt_footer?: string | null;
          receipt_header?: string | null;
          require_verified_payment_before_complete?: boolean;
          rounding_rule?: string;
          service_percent?: number;
          store_name?: string;
          tax_percent?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'store_settings_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      voucher_redemptions: {
        Row: {
          created_at: string;
          discount: number;
          id: string;
          order_id: string;
          voucher_id: string;
        };
        Insert: {
          created_at?: string;
          discount: number;
          id?: string;
          order_id: string;
          voucher_id: string;
        };
        Update: {
          created_at?: string;
          discount?: number;
          id?: string;
          order_id?: string;
          voucher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'voucher_redemptions_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: true;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'voucher_redemptions_voucher_id_fkey';
            columns: ['voucher_id'];
            isOneToOne: false;
            referencedRelation: 'vouchers';
            referencedColumns: ['id'];
          },
        ];
      };
      vouchers: {
        Row: {
          code: string;
          created_by: string | null;
          id: string;
          is_active: boolean;
          max_discount: number | null;
          min_subtotal: number;
          name: string;
          per_order_limit: number;
          total_quota: number | null;
          type: Database['public']['Enums']['voucher_type'];
          used_count: number;
          valid_from: string;
          valid_until: string;
          value: number;
        };
        Insert: {
          code: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean;
          max_discount?: number | null;
          min_subtotal?: number;
          name: string;
          per_order_limit?: number;
          total_quota?: number | null;
          type: Database['public']['Enums']['voucher_type'];
          used_count?: number;
          valid_from: string;
          valid_until: string;
          value: number;
        };
        Update: {
          code?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean;
          max_discount?: number | null;
          min_subtotal?: number;
          name?: string;
          per_order_limit?: number;
          total_quota?: number | null;
          type?: Database['public']['Enums']['voucher_type'];
          used_count?: number;
          valid_from?: string;
          valid_until?: string;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'vouchers_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      _append_order_items: {
        Args: {
          p_order_id: string;
          p_items: Json;
        };
        Returns: number;
      };
      _recalculate_order: {
        Args: {
          p_order_id: string;
          p_voucher_id?: string;
        };
        Returns: undefined;
      };
      _voucher_discount: {
        Args: {
          p_voucher_id: string;
          p_subtotal: number;
        };
        Returns: number;
      };
      add_items_to_open_bill: {
        Args: {
          p_order_id: string;
          p_items: Json;
        };
        Returns: {
          bill_state: Database['public']['Enums']['bill_state'] | null;
          cancel_reason: string | null;
          closed_at: string | null;
          created_at: string;
          created_by: string;
          customer_name: string | null;
          discount_total: number;
          grand_total: number;
          id: string;
          order_no: string;
          order_type: Database['public']['Enums']['order_type'];
          rounding_amount: number;
          service_amount: number;
          shift_id: string;
          status: Database['public']['Enums']['order_status'];
          subtotal: number;
          table_label: string | null;
          tax_amount: number;
          updated_at: string;
          voucher_code: string | null;
          voucher_id: string | null;
        };
      };
      apply_voucher: {
        Args: {
          p_order_id: string;
          p_code: string;
        };
        Returns: {
          bill_state: Database['public']['Enums']['bill_state'] | null;
          cancel_reason: string | null;
          closed_at: string | null;
          created_at: string;
          created_by: string;
          customer_name: string | null;
          discount_total: number;
          grand_total: number;
          id: string;
          order_no: string;
          order_type: Database['public']['Enums']['order_type'];
          rounding_amount: number;
          service_amount: number;
          shift_id: string;
          status: Database['public']['Enums']['order_status'];
          subtotal: number;
          table_label: string | null;
          tax_amount: number;
          updated_at: string;
          voucher_code: string | null;
          voucher_id: string | null;
        };
      };
      cancel_order: {
        Args: {
          p_order_id: string;
          p_reason: string;
        };
        Returns: {
          bill_state: Database['public']['Enums']['bill_state'] | null;
          cancel_reason: string | null;
          closed_at: string | null;
          created_at: string;
          created_by: string;
          customer_name: string | null;
          discount_total: number;
          grand_total: number;
          id: string;
          order_no: string;
          order_type: Database['public']['Enums']['order_type'];
          rounding_amount: number;
          service_amount: number;
          shift_id: string;
          status: Database['public']['Enums']['order_status'];
          subtotal: number;
          table_label: string | null;
          tax_amount: number;
          updated_at: string;
          voucher_code: string | null;
          voucher_id: string | null;
        };
      };
      change_order_status: {
        Args: {
          p_order_id: string;
          p_to_status: Database['public']['Enums']['order_status'];
        };
        Returns: {
          bill_state: Database['public']['Enums']['bill_state'] | null;
          cancel_reason: string | null;
          closed_at: string | null;
          created_at: string;
          created_by: string;
          customer_name: string | null;
          discount_total: number;
          grand_total: number;
          id: string;
          order_no: string;
          order_type: Database['public']['Enums']['order_type'];
          rounding_amount: number;
          service_amount: number;
          shift_id: string;
          status: Database['public']['Enums']['order_status'];
          subtotal: number;
          table_label: string | null;
          tax_amount: number;
          updated_at: string;
          voucher_code: string | null;
          voucher_id: string | null;
        };
      };
      close_open_bill: {
        Args: {
          p_order_id: string;
          p_payments: Json;
        };
        Returns: {
          bill_state: Database['public']['Enums']['bill_state'] | null;
          cancel_reason: string | null;
          closed_at: string | null;
          created_at: string;
          created_by: string;
          customer_name: string | null;
          discount_total: number;
          grand_total: number;
          id: string;
          order_no: string;
          order_type: Database['public']['Enums']['order_type'];
          rounding_amount: number;
          service_amount: number;
          shift_id: string;
          status: Database['public']['Enums']['order_status'];
          subtotal: number;
          table_label: string | null;
          tax_amount: number;
          updated_at: string;
          voucher_code: string | null;
          voucher_id: string | null;
        };
      };
      close_shift: {
        Args: {
          p_actual_cash: number;
          p_note?: string;
        };
        Returns: {
          actual_cash: number | null;
          closed_at: string | null;
          closed_by: string | null;
          difference: number | null;
          expected_cash: number | null;
          id: string;
          note: string | null;
          opened_at: string;
          opened_by: string;
          opening_cash: number;
          status: Database['public']['Enums']['shift_status'];
        };
      };
      create_order: {
        Args: {
          p_order_type: Database['public']['Enums']['order_type'];
          p_items: Json;
          p_voucher_code?: string;
          p_table_label?: string;
          p_bill_mode?: string;
        };
        Returns: {
          bill_state: Database['public']['Enums']['bill_state'] | null;
          cancel_reason: string | null;
          closed_at: string | null;
          created_at: string;
          created_by: string;
          customer_name: string | null;
          discount_total: number;
          grand_total: number;
          id: string;
          order_no: string;
          order_type: Database['public']['Enums']['order_type'];
          rounding_amount: number;
          service_amount: number;
          shift_id: string;
          status: Database['public']['Enums']['order_status'];
          subtotal: number;
          table_label: string | null;
          tax_amount: number;
          updated_at: string;
          voucher_code: string | null;
          voucher_id: string | null;
        };
      };
      current_role_type: {
        Args: Record<PropertyKey, never>;
        Returns: Database['public']['Enums']['role_type'];
      };
      finalize_stock_opname: {
        Args: {
          p_opname_id: string;
        };
        Returns: {
          finalized_at: string | null;
          id: string;
          opened_at: string;
          opened_by: string | null;
          status: string;
        };
      };
      get_category_sales: {
        Args: {
          p_from: string;
          p_to: string;
        };
        Returns: {
          category_id: string;
          category_name: string;
          totalQty: number;
          totalSales: number;
        }[];
      };
      get_daily_sales: {
        Args: {
          p_from: string;
          p_to: string;
        };
        Returns: {
          avgTransaction: number;
          date: string;
          totalSales: number;
          totalTransactions: number;
        }[];
      };
      get_hourly_sales: {
        Args: {
          p_from: string;
          p_to: string;
        };
        Returns: {
          hour: number;
          totalSales: number;
          totalTransactions: number;
        }[];
      };
      get_item_sales: {
        Args: {
          p_from: string;
          p_to: string;
        };
        Returns: {
          category_name: string;
          item_name: string;
          menu_item_id: string;
          totalQty: number;
          totalSales: number;
        }[];
      };
      get_method_sales: {
        Args: {
          p_from: string;
          p_to: string;
        };
        Returns: {
          method: string;
          totalSales: number;
          totalTransactions: number;
        }[];
      };
      get_sales_summary: {
        Args: {
          p_from: string;
          p_to: string;
        };
        Returns: Json;
      };
      get_voucher_usage: {
        Args: {
          p_from: string;
          p_to: string;
        };
        Returns: {
          totalDiscount: number;
          usageCount: number;
          voucher_code: string;
          voucher_id: string;
          voucher_name: string;
        }[];
      };
      is_staff: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_super_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      open_shift: {
        Args: {
          p_opening_cash: number;
        };
        Returns: {
          actual_cash: number | null;
          closed_at: string | null;
          closed_by: string | null;
          difference: number | null;
          expected_cash: number | null;
          id: string;
          note: string | null;
          opened_at: string;
          opened_by: string;
          opening_cash: number;
          status: Database['public']['Enums']['shift_status'];
        };
      };
      open_stock_opname: {
        Args: Record<PropertyKey, never>;
        Returns: {
          finalized_at: string | null;
          id: string;
          opened_at: string;
          opened_by: string | null;
          status: string;
        };
      };
      record_stock_movement: {
        Args: {
          p_item_id: string;
          p_type: Database['public']['Enums']['movement_type'];
          p_qty: number;
          p_note?: string;
          p_reference_id?: string;
        };
        Returns: {
          actor_id: string | null;
          created_at: string;
          id: number;
          inventory_item_id: string;
          movement_type: Database['public']['Enums']['movement_type'];
          note: string | null;
          qty_change: number;
          reference_id: string | null;
        };
      };
      save_stock_opname_count: {
        Args: {
          p_opname_id: string;
          p_item_id: string;
          p_counted_qty: number;
        };
        Returns: {
          counted_qty: number | null;
          inventory_item_id: string;
          opname_id: string;
          system_qty: number;
        };
      };
      set_menu_item_available: {
        Args: {
          p_item_id: string;
          p_is_available: boolean;
        };
        Returns: {
          category_id: string;
          created_at: string;
          description: string | null;
          id: string;
          image_path: string | null;
          is_active: boolean;
          is_available: boolean;
          name: string;
          price: number;
          sort_order: number;
          updated_at: string;
        };
      };
      set_staff_active: {
        Args: {
          p_active: boolean;
          p_user_id: string;
        };
        Returns: Database['public']['Tables']['profiles']['Row'];
      };
      set_staff_role: {
        Args: {
          p_role: Database['public']['Enums']['role_type'];
          p_user_id: string;
        };
        Returns: Database['public']['Tables']['profiles']['Row'];
      };
      set_payment_account_active: {
        Args: {
          p_account_id: string;
          p_is_active: boolean;
        };
        Returns: {
          account_name: string;
          account_no: string;
          id: string;
          is_active: boolean;
          method: Database['public']['Enums']['payment_method'];
          provider: string;
          sort_order: number;
        };
      };
      set_voucher_active: {
        Args: {
          p_voucher_id: string;
          p_is_active: boolean;
        };
        Returns: {
          code: string;
          created_by: string | null;
          id: string;
          is_active: boolean;
          max_discount: number | null;
          min_subtotal: number;
          name: string;
          per_order_limit: number;
          total_quota: number | null;
          type: Database['public']['Enums']['voucher_type'];
          used_count: number;
          valid_from: string;
          valid_until: string;
          value: number;
        };
      };
      submit_payment: {
        Args: {
          p_order_id: string;
          p_method: Database['public']['Enums']['payment_method'];
          p_amount: number;
          p_payment_account_id?: string;
          p_reference_no?: string;
          p_proof_path?: string;
          p_received_amount?: number;
        };
        Returns: {
          amount: number;
          created_at: string;
          id: string;
          method: Database['public']['Enums']['payment_method'];
          note: string | null;
          order_id: string;
          payment_account_id: string | null;
          proof_path: string | null;
          received_amount: number | null;
          reference_no: string | null;
          status: Database['public']['Enums']['payment_status'];
          verified_at: string | null;
          verified_by: string | null;
        };
      };
      update_store_settings: {
        Args: {
          p_settings: Json;
        };
        Returns: {
          accent_color: string;
          address: string | null;
          allow_negative_stock: boolean;
          font_family: string;
          id: number;
          logo_path: string | null;
          open_hours: Json;
          paper_width_mm: number;
          phone: string | null;
          primary_color: string;
          receipt_footer: string | null;
          receipt_header: string | null;
          require_verified_payment_before_complete: boolean;
          rounding_rule: string;
          service_percent: number;
          store_name: string;
          tax_percent: number;
          updated_at: string;
          updated_by: string | null;
        };
      };
      upsert_category: {
        Args: {
          p_id: string;
          p_name: string;
          p_sort_order?: number;
          p_is_active?: boolean;
        };
        Returns: {
          id: string;
          is_active: boolean;
          name: string;
          sort_order: number;
        };
      };
      upsert_inventory_item: {
        Args: {
          p_item: Json;
        };
        Returns: {
          current_qty: number;
          id: string;
          is_active: boolean;
          min_qty: number;
          name: string;
          unit: string;
          unit_cost: number;
        };
      };
      upsert_menu_item: {
        Args: {
          p_item: Json;
        };
        Returns: {
          category_id: string;
          created_at: string;
          description: string | null;
          id: string;
          image_path: string | null;
          is_active: boolean;
          is_available: boolean;
          name: string;
          price: number;
          sort_order: number;
          updated_at: string;
        };
      };
      upsert_payment_account: {
        Args: {
          p_account: Json;
        };
        Returns: {
          account_name: string;
          account_no: string;
          id: string;
          is_active: boolean;
          method: Database['public']['Enums']['payment_method'];
          provider: string;
          sort_order: number;
        };
      };
      upsert_voucher: {
        Args: {
          p_voucher: Json;
        };
        Returns: {
          code: string;
          created_by: string | null;
          id: string;
          is_active: boolean;
          max_discount: number | null;
          min_subtotal: number;
          name: string;
          per_order_limit: number;
          total_quota: number | null;
          type: Database['public']['Enums']['voucher_type'];
          used_count: number;
          valid_from: string;
          valid_until: string;
          value: number;
        };
      };
      verify_payment: {
        Args: {
          p_payment_id: string;
          p_approve: boolean;
          p_note?: string;
        };
        Returns: {
          amount: number;
          created_at: string;
          id: string;
          method: Database['public']['Enums']['payment_method'];
          note: string | null;
          order_id: string;
          payment_account_id: string | null;
          proof_path: string | null;
          received_amount: number | null;
          reference_no: string | null;
          status: Database['public']['Enums']['payment_status'];
          verified_at: string | null;
          verified_by: string | null;
        };
      };
      void_order_item: {
        Args: {
          p_item_id: string;
          p_reason: string;
        };
        Returns: {
          bill_state: Database['public']['Enums']['bill_state'] | null;
          cancel_reason: string | null;
          closed_at: string | null;
          created_at: string;
          created_by: string;
          customer_name: string | null;
          discount_total: number;
          grand_total: number;
          id: string;
          order_no: string;
          order_type: Database['public']['Enums']['order_type'];
          rounding_amount: number;
          service_amount: number;
          shift_id: string;
          status: Database['public']['Enums']['order_status'];
          subtotal: number;
          table_label: string | null;
          tax_amount: number;
          updated_at: string;
          voucher_code: string | null;
          voucher_id: string | null;
        };
      };
    };
    Enums: {
      bill_state: 'open' | 'closed';
      movement_type: 'purchase' | 'sale' | 'void_return' | 'adjustment' | 'opname' | 'waste';
      order_status: 'new' | 'processing' | 'ready' | 'completed' | 'cancelled';
      order_type: 'dine_in' | 'takeaway';
      payment_method: 'cash' | 'transfer' | 'ewallet';
      payment_status: 'pending_verification' | 'verified' | 'rejected';
      role_type: 'super_admin' | 'admin';
      shift_status: 'open' | 'closed';
      voucher_type: 'percent' | 'nominal';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  PublicTableNameOrOptions extends
    keyof (PublicSchema['Tables'] & PublicSchema['Views']) | { schema: keyof Database },
  TableName extends (PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    ? (PublicSchema['Tables'] & PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends (PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends (PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema['Enums'] | { schema: keyof Database },
  EnumName extends (PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof PublicSchema['CompositeTypes'] | { schema: keyof Database },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema['CompositeTypes']
    ? PublicSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;
