import { createResource } from 'solid-js';
import {
  loadSummaryReport,
  loadDailyReport,
  loadHourlyReport,
  loadCategoryReport,
  loadItemReport,
  loadMethodReport,
  loadVoucherReport,
} from '../api/reports';
import {
  setReportsLoading,
  setSummaryReport,
  setDailyReport,
  setHourlyReport,
  setCategoryReport,
  setItemReport,
  setMethodReport,
  setVoucherReport,
  getReportsState,
} from '../state/reports';
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

function getDateRange(): ReportDateRange {
  return getReportsState().dateRange;
}

export function createSummaryResource() {
  const [resource] = createResource<SummaryReport | null, ReportDateRange>(
    getDateRange,
    async (range) => {
      if (!range.startDate || !range.endDate) return null;
      setReportsLoading(true);
      const result = await loadSummaryReport(range);
      setReportsLoading(false);
      if (!result.ok) return null;
      setSummaryReport(result.data);
      return result.data;
    },
    { initialValue: null }
  );
  return resource;
}

export function createDailyResource() {
  const [resource] = createResource<DailyReportItem[], ReportDateRange>(
    getDateRange,
    async (range) => {
      if (!range.startDate || !range.endDate) return [];
      const result = await loadDailyReport(range);
      if (!result.ok) return [];
      setDailyReport(result.data);
      return result.data;
    },
    { initialValue: [] as DailyReportItem[] }
  );
  return resource;
}

export function createHourlyResource() {
  const [resource] = createResource<HourlyReportItem[], ReportDateRange>(
    getDateRange,
    async (range) => {
      if (!range.startDate || !range.endDate) return [];
      const result = await loadHourlyReport(range);
      if (!result.ok) return [];
      setHourlyReport(result.data);
      return result.data;
    },
    { initialValue: [] as HourlyReportItem[] }
  );
  return resource;
}

export function createCategoryResource() {
  const [resource] = createResource<CategoryReportItem[], ReportDateRange>(
    getDateRange,
    async (range) => {
      if (!range.startDate || !range.endDate) return [];
      const result = await loadCategoryReport(range);
      if (!result.ok) return [];
      setCategoryReport(result.data);
      return result.data;
    },
    { initialValue: [] as CategoryReportItem[] }
  );
  return resource;
}

export function createItemResource() {
  const [resource] = createResource<ItemReportItem[], ReportDateRange>(
    getDateRange,
    async (range) => {
      if (!range.startDate || !range.endDate) return [];
      const result = await loadItemReport(range);
      if (!result.ok) return [];
      setItemReport(result.data);
      return result.data;
    },
    { initialValue: [] as ItemReportItem[] }
  );
  return resource;
}

export function createMethodResource() {
  const [resource] = createResource<MethodReportItem[], ReportDateRange>(
    getDateRange,
    async (range) => {
      if (!range.startDate || !range.endDate) return [];
      const result = await loadMethodReport(range);
      if (!result.ok) return [];
      setMethodReport(result.data);
      return result.data;
    },
    { initialValue: [] as MethodReportItem[] }
  );
  return resource;
}

export function createVoucherResource() {
  const [resource] = createResource<VoucherReportItem[], ReportDateRange>(
    getDateRange,
    async (range) => {
      if (!range.startDate || !range.endDate) return [];
      const result = await loadVoucherReport(range);
      if (!result.ok) return [];
      setVoucherReport(result.data);
      return result.data;
    },
    { initialValue: [] as VoucherReportItem[] }
  );
  return resource;
}

type ReportResourceType =
  'summary' | 'daily' | 'hourly' | 'category' | 'item' | 'method' | 'voucher';

export function refetchActiveReport(activeTab: ReportResourceType) {
  switch (activeTab) {
    case 'summary':
      break;
    case 'daily':
      break;
    case 'hourly':
      break;
    case 'category':
      break;
    case 'item':
      break;
    case 'method':
      break;
    case 'voucher':
      break;
  }
}
