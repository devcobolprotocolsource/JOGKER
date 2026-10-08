import { getSupabaseClient } from '../../../shared/api/supabase';
import { capture, type Result } from '../../../shared/api/result';
import { openShift, closeShift } from '../../../shared/stores/shift';

export interface ShiftSummary {
  orderCount: number;
  openBillCount: number;
  cash: number;
  transfer: number;
  ewallet: number;
  expectedCash: number;
}

export async function loadShiftSummary(
  shiftId: string,
  openingCash: number
): Promise<Result<ShiftSummary>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const ordersResult = await client
      .from('orders')
      .select('id, bill_state')
      .eq('shift_id', shiftId);
    if (ordersResult.error) throw ordersResult.error;
    const orders = ordersResult.data ?? [];
    const orderIds = orders.map((order) => order.id);
    let paymentRows: { amount: number; method: string }[] = [];
    if (orderIds.length > 0) {
      const paymentsResult = await client
        .from('payments')
        .select('amount, method, status')
        .in('order_id', orderIds)
        .eq('status', 'verified');
      if (paymentsResult.error) throw paymentsResult.error;
      paymentRows = paymentsResult.data ?? [];
    }
    const totals = { cash: 0, transfer: 0, ewallet: 0 };
    for (const payment of paymentRows) {
      if (
        payment.method === 'cash' ||
        payment.method === 'transfer' ||
        payment.method === 'ewallet'
      ) {
        totals[payment.method] += payment.amount;
      }
    }
    return {
      orderCount: orders.length,
      openBillCount: orders.filter((order) => order.bill_state === 'open').length,
      ...totals,
      expectedCash: openingCash + totals.cash,
    };
  });
}

export async function startShift(openingCash: number) {
  return openShift(openingCash);
}

export async function finishShift(actualCash: number, note?: string) {
  return closeShift(actualCash, note);
}
