import { getSupabaseClient } from '../../../shared/api/supabase';
import { capture, type Result } from '../../../shared/api/result';
import type { ReportDateRange } from '../schemas/report';

export interface SummaryReport {
  totalSales: number;
  totalTransactions: number;
  avgTransaction: number;
  totalDiscount: number;
  totalService: number;
  totalTax: number;
  totalVoid: number;
}

export interface DailyReportItem {
  date: string;
  totalSales: number;
  totalTransactions: number;
  avgTransaction: number;
}

export interface HourlyReportItem {
  hour: number;
  totalSales: number;
  totalTransactions: number;
}

export interface CategoryReportItem {
  category_id: string;
  category_name: string;
  totalSales: number;
  totalQty: number;
}

export interface ItemReportItem {
  menu_item_id: string;
  item_name: string;
  category_name: string;
  totalQty: number;
  totalSales: number;
}

export interface MethodReportItem {
  method: string;
  totalSales: number;
  totalTransactions: number;
}

export interface VoucherReportItem {
  voucher_id: string;
  voucher_code: string;
  voucher_name: string;
  usageCount: number;
  totalDiscount: number;
}

export async function loadSummaryReport(range: ReportDateRange): Promise<Result<SummaryReport>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc('get_sales_summary', {
      p_start_date: range.startDate,
      p_end_date: range.endDate,
    });
    if (error) throw error;
    return data as SummaryReport;
  });
}

export async function loadDailyReport(range: ReportDateRange): Promise<Result<DailyReportItem[]>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc('get_daily_sales', {
      p_start_date: range.startDate,
      p_end_date: range.endDate,
    });
    if (error) throw error;
    return data as DailyReportItem[];
  });
}

export async function loadHourlyReport(
  range: ReportDateRange
): Promise<Result<HourlyReportItem[]>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc('get_hourly_sales', {
      p_start_date: range.startDate,
      p_end_date: range.endDate,
    });
    if (error) throw error;
    return data as HourlyReportItem[];
  });
}

export async function loadCategoryReport(
  range: ReportDateRange
): Promise<Result<CategoryReportItem[]>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc('get_category_sales', {
      p_start_date: range.startDate,
      p_end_date: range.endDate,
    });
    if (error) throw error;
    return data as CategoryReportItem[];
  });
}

export async function loadItemReport(range: ReportDateRange): Promise<Result<ItemReportItem[]>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc('get_item_sales', {
      p_start_date: range.startDate,
      p_end_date: range.endDate,
    });
    if (error) throw error;
    return data as ItemReportItem[];
  });
}

export async function loadMethodReport(
  range: ReportDateRange
): Promise<Result<MethodReportItem[]>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc('get_method_sales', {
      p_start_date: range.startDate,
      p_end_date: range.endDate,
    });
    if (error) throw error;
    return data as MethodReportItem[];
  });
}

export async function loadVoucherReport(
  range: ReportDateRange
): Promise<Result<VoucherReportItem[]>> {
  return capture(async () => {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc('get_voucher_usage', {
      p_start_date: range.startDate,
      p_end_date: range.endDate,
    });
    if (error) throw error;
    return data as VoucherReportItem[];
  });
}
