import { capture } from '../../../shared/api/result';
import { getSupabaseClient } from '../../../shared/api/supabase';
import type { InventoryItemInput, StockMovementInput } from '../schemas/inventory';

export interface InventoryItem extends InventoryItemInput {
  id: string;
  current_qty: number;
}
export interface StockMovement {
  id: number;
  inventory_item_id: string;
  movement_type: string;
  qty_change: number;
  reference_id: string | null;
  note: string | null;
  created_at: string;
}
export interface OpnameRecord {
  id: string;
  status: 'draft' | 'finalized';
  opened_at: string;
  finalized_at: string | null;
}
export interface OpnameLine {
  opname_id: string;
  inventory_item_id: string;
  system_qty: number;
  counted_qty: number | null;
  inventory_items: { name: string; unit: string } | null;
}

export async function loadInventory() {
  return capture(async () => {
    const client = getSupabaseClient();
    const [items, movements] = await Promise.all([
      client
        .from('inventory_items')
        .select('id, name, unit, current_qty, min_qty, unit_cost, is_active')
        .eq('is_active', true)
        .order('name'),
      client
        .from('stock_movements')
        .select('id, inventory_item_id, movement_type, qty_change, reference_id, note, created_at')
        .order('created_at', { ascending: false })
        .limit(300),
    ]);
    if (items.error) throw items.error;
    if (movements.error) throw movements.error;
    return {
      items: items.data as InventoryItem[],
      movements: movements.data as StockMovement[],
    };
  });
}

export async function saveInventoryItem(item: InventoryItemInput) {
  return capture(async () => {
    const { data, error } = await getSupabaseClient().rpc('upsert_inventory_item', {
      p_item: item,
    });
    if (error) throw error;
    return data;
  });
}

export async function recordMovement(input: StockMovementInput) {
  return capture(async () => {
    const { data, error } = await getSupabaseClient().rpc('record_stock_movement', {
      p_item_id: input.itemId,
      p_type: input.type,
      p_qty: input.quantity,
      p_note: input.note ?? null,
      p_reference_id: null,
    });
    if (error) throw error;
    return data;
  });
}

export async function loadOpnames() {
  return capture(async () => {
    const { data, error } = await getSupabaseClient()
      .from('stock_opnames')
      .select('id, status, opened_at, finalized_at')
      .order('opened_at', { ascending: false });
    if (error) throw error;
    return data as OpnameRecord[];
  });
}

export async function startOpname() {
  return capture(async () => {
    const { data, error } = await getSupabaseClient().rpc('open_stock_opname');
    if (error) throw error;
    return data as OpnameRecord;
  });
}

export async function loadOpname(opnameId: string) {
  return capture(async () => {
    const [opname, lines] = await Promise.all([
      getSupabaseClient()
        .from('stock_opnames')
        .select('id, status, opened_at, finalized_at')
        .eq('id', opnameId)
        .single(),
      getSupabaseClient()
        .from('stock_opname_lines')
        .select(
          'opname_id, inventory_item_id, system_qty, counted_qty, inventory_items(name, unit)'
        )
        .eq('opname_id', opnameId),
    ]);
    if (opname.error) throw opname.error;
    if (lines.error) throw lines.error;
    return {
      opname: opname.data as OpnameRecord,
      lines: lines.data as unknown as OpnameLine[],
    };
  });
}

export async function saveOpnameCount(opnameId: string, itemId: string, countedQty: number) {
  return capture(async () => {
    const { data, error } = await getSupabaseClient().rpc('save_stock_opname_count', {
      p_opname_id: opnameId,
      p_item_id: itemId,
      p_counted_qty: countedQty,
    });
    if (error) throw error;
    return data;
  });
}

export async function finalizeOpname(opnameId: string) {
  return capture(async () => {
    const { data, error } = await getSupabaseClient().rpc('finalize_stock_opname', {
      p_opname_id: opnameId,
    });
    if (error) throw error;
    return data as OpnameRecord;
  });
}
