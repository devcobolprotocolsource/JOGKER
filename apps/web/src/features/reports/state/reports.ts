import { createStore } from 'solid-js/store';
import { createSignal } from 'solid-js';
import type { ReportDateRange } from '../schemas/report';
import type {
  SummaryReport,
  DailyReportItem,
  HourlyReportItem,
  CategoryReportItem,
  ItemReportItem,
  MethodReportItem,
  VoucherReportItem,
} from '../api/reports';

interface ReportsState {
  dateRange: ReportDateRange;
  summary: SummaryReport | null;
  daily: DailyReportItem[];
  hourly: HourlyReportItem[];
  category: CategoryReportItem[];
  item: ItemReportItem[];
  method: MethodReportItem[];
  voucher: VoucherReportItem[];
  loading: boolean;
  activeTab: string;
}

const [reportsState, setReportsState] = createStore<ReportsState>({
  dateRange: { startDate: '', endDate: '' },
  summary: null,
  daily: [],
  hourly: [],
  category: [],
  item: [],
  method: [],
  voucher: [],
  loading: false,
  activeTab: 'summary',
});

export function getReportsState() {
  return reportsState;
}

export function setReportsDateRange(range: ReportDateRange) {
  setReportsState('dateRange', range);
}

export function setReportsLoading(loading: boolean) {
  setReportsState('loading', loading);
}

export function setSummaryReport(report: SummaryReport) {
  setReportsState('summary', report);
}

export function setDailyReport(report: DailyReportItem[]) {
  setReportsState('daily', report);
}

export function setHourlyReport(report: HourlyReportItem[]) {
  setReportsState('hourly', report);
}

export function setCategoryReport(report: CategoryReportItem[]) {
  setReportsState('category', report);
}

export function setItemReport(report: ItemReportItem[]) {
  setReportsState('item', report);
}

export function setMethodReport(report: MethodReportItem[]) {
  setReportsState('method', report);
}

export function setVoucherReport(report: VoucherReportItem[]) {
  setReportsState('voucher', report);
}

export function setActiveTab(tab: string) {
  setReportsState('activeTab', tab);
}

export const [csvExporting, setCsvExporting] = createSignal(false);
