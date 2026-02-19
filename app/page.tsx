'use client';

import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, AreaChart, Area,
  Legend,
} from 'recharts';
import {
  BarChart3, TrendingUp, AlertTriangle, Clock, FileText,
  ChevronDown, ChevronUp, Search, ChevronLeft, ChevronRight,
  ArrowUpDown, Filter, Activity, Shield, Users, Calendar,
  BookOpen, Download, Lock,
} from 'lucide-react';
import {
  ANALYSIS_META, SUMMARY, DAILY_ANALYSIS, WHATIF_DATA,
  CONCURRENT_HEATMAP, CONCURRENT_HEATMAP_BY_MONTH,
  CASE_LOG, CROSS_VALIDATION, AFTER_HOURS_DATA,
} from './data/analysis-data';
import type { CaseLogEntry, DailyAnalysisRow, AfterHoursRow } from './data/analysis-data';

// ── Brand Colors ───────────────────────────────────────────────────────
const NAVY_DEEP = '#091525';
const NAVY = '#0E1F35';
const NAVY_MID = '#152A42';
const GOLD = '#C9A84C';
const GOLD_LIGHT = '#DFC06A';
const SLATE = '#5A6B7D';
const LIGHT_BG = '#F0F2F5';
const EMERALD = '#10b981';
const RED = '#ef4444';
const AMBER = '#f59e0b';

const MONTH_LABELS: Record<string, string> = {
  'all': 'All Months (Oct 2025 – Jan 2026)',
  '10': 'October 2025',
  '11': 'November 2025',
  '12': 'December 2025',
  '01': 'January 2026',
};

// ── Section IDs ────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'summary', label: 'Executive Summary', icon: BarChart3 },
  { id: 'daily', label: 'Daily Analysis', icon: Calendar },
  { id: 'crossval', label: 'Cross-Validation', icon: Shield },
  { id: 'whatif', label: 'What-If Analysis', icon: AlertTriangle },
  { id: 'concurrent', label: 'Concurrent Analysis', icon: Activity },
  { id: 'afterhours', label: 'After-Hours', icon: Clock },
  { id: 'surge', label: 'Surge Coverage', icon: TrendingUp },
  { id: 'caselog', label: 'Case Log', icon: FileText },
  { id: 'schedules', label: 'Schedules', icon: Calendar },
  { id: 'methodology', label: 'Methodology', icon: BookOpen },
] as const;

// ── Surge Coverage Requests (January 2026) ────────────────────────────
const SURGE_REQUESTS = [
  { date: '2026-01-12', dow: 'Mon', type: 'Extra Site', timeSlot: '7:00a – 3:00p', status: 'Confirmed' as const, providerType: 'MD' },
  { date: '2026-01-13', dow: 'Tue', type: 'Extra Site', timeSlot: '7:00a – 3:00p', status: 'Confirmed' as const, providerType: 'CRNA' },
  { date: '2026-01-16', dow: 'Fri', type: 'Late Coverage', timeSlot: '3:00p – 7:00p', status: 'Confirmed' as const, providerType: 'CRNA' },
  { date: '2026-01-19', dow: 'Mon', type: 'Extra Site', timeSlot: '7:00a – 3:00p', status: 'Confirmed' as const, providerType: 'MD' },
  { date: '2026-01-20', dow: 'Tue', type: 'Extra Site', timeSlot: '7:00a – 3:00p', status: 'Confirmed' as const, providerType: 'CRNA' },
  { date: '2026-01-21', dow: 'Wed', type: 'Extra Site', timeSlot: '7:00a – 3:00p', status: 'Confirmed' as const, providerType: 'CRNA' },
  { date: '2026-01-22', dow: 'Thu', type: 'Extra Site', timeSlot: '7:00a – 3:00p', status: 'Confirmed' as const, providerType: 'CRNA' },
  { date: '2026-01-22', dow: 'Thu', type: 'Late Coverage', timeSlot: '3:00p – 7:00p', status: 'Not Approved' as const, providerType: null },
  { date: '2026-01-28', dow: 'Wed', type: 'Extra Site', timeSlot: '7:00a – 3:00p', status: 'Confirmed' as const, providerType: 'MD' },
  { date: '2026-01-28', dow: 'Wed', type: 'Late Coverage', timeSlot: '3:00p – 7:00p', status: 'Confirmed' as const, providerType: 'CRNA' },
  { date: '2026-01-29', dow: 'Thu', type: 'Late Coverage', timeSlot: '3:00p – 7:00p', status: 'Confirmed' as const, providerType: 'CRNA' },
];

// ── Schedule PDFs ──────────────────────────────────────────────────────
const SCHEDULE_PDFS = [
  // October 2025
  { date: '2025-10-01', file: '10-1-25.pdf', dow: 'Wed' },
  { date: '2025-10-02', file: '10-2-25.pdf', dow: 'Thu' },
  { date: '2025-10-03', file: '10-3-25.pdf', dow: 'Fri' },
  { date: '2025-10-06', file: '10-6-25.pdf', dow: 'Mon' },
  { date: '2025-10-07', file: '10-7-25.pdf', dow: 'Tue' },
  { date: '2025-10-08', file: '10-8-25.pdf', dow: 'Wed' },
  { date: '2025-10-09', file: '10-9-25.pdf', dow: 'Thu' },
  { date: '2025-10-10', file: '10-10-25.pdf', dow: 'Fri' },
  { date: '2025-10-13', file: '10-13-25.pdf', dow: 'Mon' },
  { date: '2025-10-14', file: '10-14-25.pdf', dow: 'Tue' },
  { date: '2025-10-16', file: '10-16-25.pdf', dow: 'Thu' },
  { date: '2025-10-17', file: '10-17-25.pdf', dow: 'Fri' },
  { date: '2025-10-20', file: '10-20-25.pdf', dow: 'Mon' },
  { date: '2025-10-21', file: '10-21-25.pdf', dow: 'Tue' },
  { date: '2025-10-22', file: '10-22-25.pdf', dow: 'Wed' },
  { date: '2025-10-23', file: '10-23-25.pdf', dow: 'Thu' },
  { date: '2025-10-24', file: '10-24-25.pdf', dow: 'Fri' },
  { date: '2025-10-27', file: '10-27-25.pdf', dow: 'Mon' },
  { date: '2025-10-28', file: '10-28-25.pdf', dow: 'Tue' },
  { date: '2025-10-29', file: '10-29-25.pdf', dow: 'Wed' },
  { date: '2025-10-30', file: '10-30-25.pdf', dow: 'Thu' },
  { date: '2025-10-31', file: '10-31-25.pdf', dow: 'Fri' },
  // November 2025
  { date: '2025-11-03', file: '11-3-25.pdf', dow: 'Mon' },
  { date: '2025-11-04', file: '11-4-25.pdf', dow: 'Tue' },
  { date: '2025-11-05', file: '11-5-25.pdf', dow: 'Wed' },
  { date: '2025-11-06', file: '11-6-25.pdf', dow: 'Thu' },
  { date: '2025-11-07', file: '11-7-25.pdf', dow: 'Fri' },
  { date: '2025-11-10', file: '11-10-25.pdf', dow: 'Mon' },
  { date: '2025-11-11', file: '11-11-25.pdf', dow: 'Tue' },
  { date: '2025-11-12', file: '11-12-25.pdf', dow: 'Wed' },
  { date: '2025-11-13', file: '11-13-25.pdf', dow: 'Thu' },
  { date: '2025-11-17', file: '11-17-25.pdf', dow: 'Mon' },
  // December 2025
  { date: '2025-12-01', file: '12-01-25.pdf', dow: 'Mon' },
  { date: '2025-12-02', file: '12-02-25.pdf', dow: 'Tue' },
  { date: '2025-12-03', file: '12-03-25.pdf', dow: 'Wed' },
  { date: '2025-12-04', file: '12-04-25.pdf', dow: 'Thu' },
  { date: '2025-12-05', file: '12-05-25.pdf', dow: 'Fri' },
  { date: '2025-12-08', file: '12-08-25.pdf', dow: 'Mon' },
  { date: '2025-12-09', file: '12-09-25.pdf', dow: 'Tue' },
  { date: '2025-12-10', file: '12-10-25.pdf', dow: 'Wed' },
  { date: '2025-12-11', file: '12-11-25.pdf', dow: 'Thu' },
  { date: '2025-12-12', file: '12-12-25.pdf', dow: 'Fri' },
  { date: '2025-12-15', file: '12-15-25.pdf', dow: 'Mon' },
  { date: '2025-12-16', file: '12-16-25.pdf', dow: 'Tue' },
  { date: '2025-12-17', file: '12-17-25.pdf', dow: 'Wed' },
  { date: '2025-12-18', file: '12-18-25.pdf', dow: 'Thu' },
  { date: '2025-12-19', file: '12-19-25.pdf', dow: 'Fri' },
  { date: '2025-12-22', file: '12-22-25.pdf', dow: 'Mon' },
  { date: '2025-12-23', file: '12-23-25.pdf', dow: 'Tue' },
  { date: '2025-12-24', file: '12-24-25.pdf', dow: 'Wed' },
  { date: '2025-12-26', file: '12-26-25.pdf', dow: 'Fri' },
  { date: '2025-12-30', file: '12-30-25.pdf', dow: 'Tue' },
  // January 2026
  { date: '2026-01-02', file: '1-2-26.pdf', dow: 'Fri' },
  { date: '2026-01-05', file: '1-5-26.pdf', dow: 'Mon' },
  { date: '2026-01-06', file: '1-6-26.pdf', dow: 'Tue' },
  { date: '2026-01-07', file: '1-7-26.pdf', dow: 'Wed' },
  { date: '2026-01-09', file: '1-9-26.pdf', dow: 'Fri' },
  { date: '2026-01-13', file: '1-13-26.pdf', dow: 'Tue' },
  { date: '2026-01-14', file: '1-14-26.pdf', dow: 'Wed' },
  { date: '2026-01-15', file: '1-15-26.pdf', dow: 'Thu' },
  { date: '2026-01-16', file: '1-16-26.pdf', dow: 'Fri' },
  { date: '2026-01-22', file: '1-22-26.pdf', dow: 'Thu' },
  { date: '2026-01-23', file: '1-23-26.pdf', dow: 'Fri' },
  { date: '2026-01-27', file: '1-27-26.pdf', dow: 'Tue' },
  { date: '2026-01-28', file: '1-28-26.pdf', dow: 'Wed' },
  { date: '2026-01-29', file: '1-29-26.pdf', dow: 'Thu' },
  { date: '2026-01-30', file: '1-30-26.pdf', dow: 'Fri' },
];

// ── Helpers ────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function getBarColor(sites: number): string {
  if (sites > 10) return RED;
  if (sites === 10) return GOLD;
  return EMERALD;
}

// ── Excluded Dates ────────────────────────────────────────────────────
// Holidays and severe weather days excluded from analysis
const EXCLUDED_DATES: Record<string, string> = {
  '2025-11-27': 'Thanksgiving',
  '2025-11-28': 'Day After Thanksgiving',
  '2025-12-24': 'Christmas Eve',
  '2025-12-25': 'Christmas Day',
  '2025-12-26': 'Day After Christmas',
  '2026-01-01': 'New Year\'s Day',
  '2026-01-24': 'Severe Weather',
  '2026-01-25': 'Severe Weather',
};
const EXCLUDED_SET = new Set(Object.keys(EXCLUDED_DATES));

function filterByMonth<T extends { date: string }>(data: T[], month: string): T[] {
  const base = month === 'all' ? data : data.filter(d => d.date.substring(5, 7) === month);
  return base.filter(d => !EXCLUDED_SET.has(d.date));
}

// ── Sub-Components ─────────────────────────────────────────────────────

function KPICard({ icon: Icon, value, label, sublabel, color = GOLD }: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  value: string | number;
  label: string;
  sublabel?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
          <Icon size={20} color={color} />
        </div>
      </div>
      <div className="text-3xl font-bold mb-1" style={{ color: NAVY_DEEP }}>{value}</div>
      <div className="text-sm font-medium" style={{ color: SLATE }}>{label}</div>
      {sublabel && <div className="text-xs mt-1" style={{ color: '#8892A2' }}>{sublabel}</div>}
    </div>
  );
}

function CustomTooltip({ active, payload, label, filteredDaily }: {
  active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string;
  filteredDaily: DailyAnalysisRow[];
}) {
  if (!active || !payload?.length) return null;
  const row = filteredDaily.find(d => formatDate(d.date) === label || d.date === label);
  return (
    <div className="rounded-lg shadow-lg border p-3 text-sm" style={{ backgroundColor: NAVY_DEEP, borderColor: GOLD, color: '#fff' }}>
      <div className="font-semibold mb-1" style={{ color: GOLD }}>{row?.dow} {label}</div>
      {row && (
        <>
          <div>Cases: <span className="font-semibold">{row.totalCases}</span></div>
          <div>Min Sites (buffered): <span className="font-semibold">{row.minSitesWithBuffers}</span></div>
          <div>Min Sites (raw): <span className="font-semibold">{row.minSitesNoBuffers}</span></div>
          <div>Utilization: <span className="font-semibold">{row.utilizationPct}%</span></div>
        </>
      )}
    </div>
  );
}

function ConcurrentTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg shadow-lg border p-3 text-sm" style={{ backgroundColor: NAVY_DEEP, borderColor: GOLD, color: '#fff' }}>
      <div className="font-semibold mb-1" style={{ color: GOLD }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i}>{p.name}: <span className="font-semibold">{p.value}</span></div>
      ))}
    </div>
  );
}

function SectionHeader({ id, title, subtitle, icon: Icon }: {
  id: string; title: string; subtitle?: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}) {
  return (
    <div id={id} className="scroll-mt-20 mb-6 pt-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${GOLD}15` }}>
          <Icon size={22} color={GOLD} />
        </div>
        <h2 className="text-2xl font-bold" style={{ color: NAVY_DEEP }}>{title}</h2>
      </div>
      {subtitle && <p className="text-sm ml-12" style={{ color: SLATE }}>{subtitle}</p>}
      <div className="h-0.5 mt-3" style={{ background: `linear-gradient(to right, ${GOLD}, transparent)` }} />
    </div>
  );
}

// ── CSV Download Helper ────────────────────────────────────────────────
function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Main Page ──────────────────────────────────────────────────────────

const SITE_PASSWORD = 'MCAR0ck$';

export default function ScheduleAnalysisPage() {
  // ── Auth gate ──
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const handleLogin = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (passwordInput === SITE_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  }, [passwordInput]);

  // ── Global filters ──
  const [monthFilter, setMonthFilter] = useState<string>('all');
  // ── Case log local filters ──
  const [caseSearch, setCaseSearch] = useState('');
  const [caseSiteFilter, setCaseSiteFilter] = useState('all');
  const [casePage, setCasePage] = useState(0);
  const [caseSortKey, setCaseSortKey] = useState<keyof CaseLogEntry>('caseNum');
  const [caseSortDir, setCaseSortDir] = useState<'asc' | 'desc'>('asc');
  const CASES_PER_PAGE = 50;

  // ── UI state ──
  const [methodOpen, setMethodOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('summary');

  // ── Month-filtered base datasets ──
  const monthDailyData = useMemo(() => filterByMonth(DAILY_ANALYSIS, monthFilter), [monthFilter]);
  const monthCases = useMemo(() => filterByMonth(CASE_LOG, monthFilter), [monthFilter]);
  const monthCrossVal = useMemo(() => {
    const filtered = filterByMonth(CROSS_VALIDATION, monthFilter);
    return filtered.filter(r => r.scheduledSites !== null);
  }, [monthFilter]);

  // ── Daily chart data (weekdays only) ──
  const filteredDaily = useMemo(() => {
    return monthDailyData.filter(d => d.isWeekday);
  }, [monthDailyData]);

  // ── Dynamic KPIs computed from filtered data (always recomputed to respect exclusions) ──
  const kpis = useMemo(() => {
    const weekdayData = monthDailyData.filter(d => d.isWeekday);
    const totalCases = monthCases.length;
    const avgMinSites = weekdayData.length > 0
      ? +(weekdayData.reduce((s, d) => s + d.minSitesWithBuffers, 0) / weekdayData.length).toFixed(1)
      : 0;
    const maxMinSites = weekdayData.length > 0
      ? Math.max(...weekdayData.map(d => d.minSitesWithBuffers))
      : 0;
    const daysGe10 = weekdayData.filter(d => d.minSitesWithBuffers >= 10).length;
    const whatif9 = weekdayData.reduce((s, d) => s + d.whatif9Uncovered, 0);
    const whatif8 = weekdayData.reduce((s, d) => s + d.whatif8Uncovered, 0);

    const dateLabel = monthFilter === 'all'
      ? ANALYSIS_META.dateRange
      : (() => {
          const dates = monthDailyData.map(d => d.date).sort();
          return dates.length > 0 ? `${formatDateFull(dates[0])} to ${formatDateFull(dates[dates.length - 1])}` : '';
        })();

    return {
      totalCases,
      avgMinSites,
      maxMinSites,
      weekdays: weekdayData.length,
      daysGe10,
      whatif9,
      whatif8,
      dateLabel,
      weekdayCount: weekdayData.length,
      weekendCount: monthDailyData.filter(d => !d.isWeekday).length,
    };
  }, [monthFilter, monthDailyData, monthCases]);

  // ── What-if (always recomputed to respect exclusions) ──
  const whatifStats = useMemo(() => {
    const weekdayData = monthDailyData.filter(d => d.isWeekday);
    const nineTotal = weekdayData.reduce((s, d) => s + d.whatif9Uncovered, 0);
    const nineDays = weekdayData.filter(d => d.whatif9Uncovered > 0).length;
    const eightTotal = weekdayData.reduce((s, d) => s + d.whatif8Uncovered, 0);
    const eightDays = weekdayData.filter(d => d.whatif8Uncovered > 0).length;

    // Filter samples respecting exclusions
    const nineSamples = WHATIF_DATA.nineSites.samples.filter(
      s => !EXCLUDED_SET.has(s.date) && (monthFilter === 'all' || s.date.substring(5, 7) === monthFilter)
    );
    const eightSamples = WHATIF_DATA.eightSites.samples.filter(
      s => !EXCLUDED_SET.has(s.date) && (monthFilter === 'all' || s.date.substring(5, 7) === monthFilter)
    );

    return {
      nine: { total: nineTotal, daysAffected: nineDays, samples: nineSamples },
      eight: { total: eightTotal, daysAffected: eightDays, samples: eightSamples },
    };
  }, [monthFilter, monthDailyData]);

  // ── Concurrent heatmap data by month ──
  const concurrentData = useMemo(() => {
    if (monthFilter === 'all') return CONCURRENT_HEATMAP;
    return CONCURRENT_HEATMAP_BY_MONTH[monthFilter] || CONCURRENT_HEATMAP;
  }, [monthFilter]);

  const peakSlot = useMemo(() =>
    concurrentData.reduce((max, s) =>
      s.avgConcurrentBuffered > max.avgConcurrentBuffered ? s : max, concurrentData[0]),
    [concurrentData]
  );

  // ── Cross-validation stats ──
  const cvStats = useMemo(() => {
    const total = monthCrossVal.length;
    if (total === 0) return { total: 0, algoGe10: 0, schedGe10: 0, bothGe10: 0 };
    const algoGe10 = monthCrossVal.filter(r => r.algorithmMinSites >= 10).length;
    const schedGe10 = monthCrossVal.filter(r => r.scheduledSites !== null && r.scheduledSites >= 10).length;
    const bothGe10 = monthCrossVal.filter(r => r.algorithmMinSites >= 10 && r.scheduledSites !== null && r.scheduledSites >= 10).length;
    return { total, algoGe10, schedGe10, bothGe10 };
  }, [monthCrossVal]);

  // ── Case log with local filters ──
  const filteredCases = useMemo(() => {
    let data = [...monthCases];
    if (caseSearch) {
      const q = caseSearch.toLowerCase();
      data = data.filter(c =>
        c.procedure.toLowerCase().includes(q) ||
        c.formTitle.toLowerCase().includes(q) ||
        c.date.includes(q)
      );
    }
    if (caseSiteFilter !== 'all') {
      data = data.filter(c => c.siteType === caseSiteFilter);
    }
    data.sort((a, b) => {
      const aVal = a[caseSortKey];
      const bVal = b[caseSortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return caseSortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return caseSortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return data;
  }, [monthCases, caseSearch, caseSiteFilter, caseSortKey, caseSortDir]);

  const totalCasePages = Math.ceil(filteredCases.length / CASES_PER_PAGE);
  const pagedCases = filteredCases.slice(casePage * CASES_PER_PAGE, (casePage + 1) * CASES_PER_PAGE);

  function toggleCaseSort(key: keyof CaseLogEntry) {
    if (caseSortKey === key) {
      setCaseSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setCaseSortKey(key);
      setCaseSortDir('asc');
    }
    setCasePage(0);
  }

  // Reset case page when month changes
  const handleMonthChange = useCallback((newMonth: string) => {
    setMonthFilter(newMonth);
    setCasePage(0);
  }, []);

  const siteTypes = [...new Set(CASE_LOG.map(c => c.siteType))].sort();

  function scrollTo(id: string) {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  // ── Download Monthly Report ──
  const downloadMonthlyReport = useCallback(() => {
    const label = MONTH_LABELS[monthFilter] || 'All Months';
    const weekdayData = monthDailyData.filter(d => d.isWeekday);

    // Build a comprehensive report as CSV
    const lines: string[][] = [];

    // Header section
    lines.push(['Meridian Anesthesia — Site-of-Service Necessity Analysis']);
    lines.push([`Medical City Arlington — ${label}`]);
    lines.push([`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`]);
    lines.push([]);

    // Executive Summary
    lines.push(['=== EXECUTIVE SUMMARY ===']);
    lines.push(['Metric', 'Value']);
    lines.push(['Total Non-L&D Cases', String(kpis.totalCases)]);
    lines.push(['Weekdays Analyzed', String(kpis.weekdays)]);
    lines.push(['Avg Min Sites Needed (Weekdays)', String(kpis.avgMinSites)]);
    lines.push(['Peak Sites (Single Day Max)', String(kpis.maxMinSites)]);
    lines.push(['Days Needing >= 10 Sites', `${kpis.daysGe10} of ${kpis.weekdays} (${kpis.weekdays > 0 ? Math.round(kpis.daysGe10 / kpis.weekdays * 100) : 0}%)`]);
    lines.push(['Patients At Risk (9 Sites)', String(kpis.whatif9)]);
    lines.push(['Patients At Risk (8 Sites)', String(kpis.whatif8)]);
    lines.push([]);

    // Daily Analysis
    lines.push(['=== DAILY ANALYSIS (WEEKDAYS) ===']);
    lines.push(['Date', 'Day', 'Cases', 'Min Sites (Buffered)', 'Min Sites (Raw)', 'Utilization %', 'At Risk @9', 'At Risk @8']);
    weekdayData.forEach(d => {
      lines.push([d.date, d.dow, String(d.totalCases), String(d.minSitesWithBuffers), String(d.minSitesNoBuffers),
        String(d.utilizationPct), String(d.whatif9Uncovered), String(d.whatif8Uncovered)]);
    });
    lines.push([]);

    // Cross-validation (if applicable for this month)
    if (monthCrossVal.length > 0) {
      lines.push(['=== CROSS-VALIDATION ===']);
      lines.push(['Date', 'Day', 'Cases', 'Algorithm Min Sites', 'Algorithm (Raw)', 'Scheduled Sites', 'Delta']);
      monthCrossVal.forEach(r => {
        const delta = r.scheduledSites !== null ? r.algorithmMinSites - r.scheduledSites : '';
        lines.push([r.date, r.dow, String(r.totalCases), String(r.algorithmMinSites),
          String(r.algorithmMinSitesNoBuf), r.scheduledSites !== null ? String(r.scheduledSites) : 'N/A',
          String(delta)]);
      });
      lines.push([]);
    }

    // Case Log
    lines.push(['=== DE-IDENTIFIED CASE LOG ===']);
    lines.push(['Case #', 'Date', 'Start', 'End', 'Duration (min)', 'Site Type', 'Procedure', 'Form Title']);
    monthCases.forEach(c => {
      lines.push([String(c.caseNum), c.date, c.startTime, c.endTime, String(c.durationMins),
        c.siteType, c.procedure, c.formTitle]);
    });

    const monthSlugMap: Record<string, string> = { '10': 'oct-2025', '11': 'nov-2025', '12': 'dec-2025', '01': 'jan-2026' };
    const monthSlug = monthFilter === 'all' ? 'oct2025-jan2026' : (monthSlugMap[monthFilter] || monthFilter);
    downloadCSV(`mca-sos-analysis-${monthSlug}.csv`,
      lines[0].length > 1 ? [] : [],  // We handle headers inline
      lines
    );
  }, [monthFilter, monthDailyData, monthCrossVal, monthCases, kpis]);

  // ── Simpler CSV download for case log only ──
  const downloadCaseLog = useCallback(() => {
    const caseSlugMap: Record<string, string> = { '10': 'oct-2025', '11': 'nov-2025', '12': 'dec-2025', '01': 'jan-2026' };
    const caseSlug = monthFilter === 'all' ? 'oct2025-jan2026' : (caseSlugMap[monthFilter] || monthFilter);
    downloadCSV(
      `mca-case-log-${caseSlug}.csv`,
      ['Case #', 'Date', 'Start', 'End', 'Duration (min)', 'Site Type', 'Procedure', 'Form Title'],
      monthCases.map(c => [String(c.caseNum), c.date, c.startTime, c.endTime, String(c.durationMins), c.siteType, c.procedure, c.formTitle])
    );
  }, [monthFilter, monthCases]);

  // ── Password Gate ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${NAVY_DEEP} 0%, ${NAVY_MID} 100%)` }}>
        <div className="w-full max-w-md mx-4">
          <div className="text-center mb-8">
            <Image src="/meridian-anesthesia-logo-white.svg" alt="Meridian Anesthesia"
              width={200} height={60} className="h-14 w-auto mx-auto mb-4" />
            <div className="w-16 h-0.5 mx-auto mb-4" style={{ backgroundColor: GOLD }} />
            <h1 className="text-xl font-bold text-white">Site-of-Service Necessity Analysis</h1>
            <p className="text-sm mt-1" style={{ color: SLATE }}>Medical City Arlington &middot; Oct 2025 – Jan 2026</p>
          </div>

          <form onSubmit={handleLogin} className="rounded-xl p-8 shadow-2xl border" style={{ backgroundColor: NAVY, borderColor: `${GOLD}30` }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-lg" style={{ backgroundColor: `${GOLD}15` }}>
                <Lock size={20} color={GOLD} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Protected Report</h2>
                <p className="text-xs" style={{ color: SLATE }}>Enter the password to access the analysis</p>
              </div>
            </div>

            <input
              type="password"
              value={passwordInput}
              onChange={e => { setPasswordInput(e.target.value); setPasswordError(false); }}
              placeholder="Enter password"
              autoFocus
              className="w-full px-4 py-3 rounded-lg text-sm font-medium outline-none transition-all"
              style={{
                backgroundColor: NAVY_MID,
                border: `1.5px solid ${passwordError ? RED : `${GOLD}40`}`,
                color: '#fff',
              }}
            />
            {passwordError && (
              <p className="text-xs mt-2 font-medium" style={{ color: RED }}>
                Incorrect password. Please try again.
              </p>
            )}

            <button
              type="submit"
              className="w-full mt-4 py-3 rounded-lg text-sm font-bold transition-all hover:opacity-90"
              style={{ backgroundColor: GOLD, color: NAVY_DEEP }}
            >
              Access Report
            </button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: SLATE }}>
            Meridian Anesthesia &middot; A Division of National Partners in Healthcare
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: LIGHT_BG }}>
      {/* ── Hero Header ─────────────────────────────────────────────── */}
      <header
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${NAVY_DEEP} 0%, ${NAVY_MID} 100%)`,
          borderBottom: `3px solid ${GOLD}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-6">
            <Image
              src="/meridian-anesthesia-logo-white.svg"
              alt="Meridian Anesthesia"
              width={200}
              height={60}
              className="h-14 w-auto"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Site-of-Service Necessity Analysis
          </h1>
          <p className="text-xl md:text-2xl font-light mb-2" style={{ color: GOLD_LIGHT }}>
            {ANALYSIS_META.facility} &mdash; {ANALYSIS_META.dateRange}
          </p>
          <p className="text-sm italic" style={{ color: SLATE }}>
            A Division of National Partners in Healthcare
          </p>
        </div>
        <div className="absolute top-0 right-0 w-1/3 h-full opacity-10"
          style={{ background: `radial-gradient(circle at 80% 50%, ${GOLD} 0%, transparent 70%)` }} />
      </header>

      {/* ── Sticky Nav with Global Month Filter ─────────────────────── */}
      <nav className="sticky top-0 z-50 border-b shadow-sm" style={{ backgroundColor: '#fff', borderColor: '#D8DCE3' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-4 py-2">
            {/* Section tabs */}
            <div className="flex gap-1 overflow-x-auto -mx-1 flex-1">
              {SECTIONS.map(s => {
                const Icon = s.icon;
                const isActive = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                    style={{
                      backgroundColor: isActive ? `${GOLD}15` : 'transparent',
                      color: isActive ? NAVY_DEEP : SLATE,
                      border: isActive ? `1px solid ${GOLD}40` : '1px solid transparent',
                    }}
                  >
                    <Icon size={14} color={isActive ? GOLD : SLATE} />
                    <span className="hidden md:inline">{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Global month filter */}
            <div className="flex items-center gap-2 border-l pl-4 shrink-0" style={{ borderColor: '#D8DCE3' }}>
              <Calendar size={14} color={GOLD} />
              <select
                value={monthFilter}
                onChange={e => handleMonthChange(e.target.value)}
                className="px-3 py-2 rounded-lg border text-sm font-semibold"
                style={{
                  borderColor: monthFilter !== 'all' ? GOLD : '#D8DCE3',
                  color: NAVY,
                  backgroundColor: monthFilter !== 'all' ? `${GOLD}10` : '#fff',
                }}
              >
                <option value="all">All Months</option>
                <option value="10">October 2025</option>
                <option value="11">November 2025</option>
                <option value="12">December 2025</option>
                <option value="01">January 2026</option>
              </select>

              {/* Download button */}
              <button
                onClick={downloadMonthlyReport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: NAVY_DEEP }}
                title={`Download ${MONTH_LABELS[monthFilter]} report as CSV`}
              >
                <Download size={14} />
                <span className="hidden lg:inline">Download</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Active filter banner ─────────────────────────────────────── */}
      {monthFilter !== 'all' && (
        <div className="border-b" style={{ backgroundColor: `${GOLD}08`, borderColor: `${GOLD}30` }}>
          <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between">
            <p className="text-sm font-medium" style={{ color: NAVY }}>
              <span style={{ color: GOLD }}>Filtered:</span> Showing {MONTH_LABELS[monthFilter]} data only
              &nbsp;&middot;&nbsp; {kpis.totalCases.toLocaleString()} cases across {kpis.weekdays} weekdays
            </p>
            <button
              onClick={() => handleMonthChange('all')}
              className="text-xs px-2 py-1 rounded border hover:bg-white transition-colors"
              style={{ borderColor: `${GOLD}40`, color: NAVY }}
            >
              Clear Filter
            </button>
          </div>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 pb-16">

        {/* ── Executive Summary ─────────────────────────────────────── */}
        <SectionHeader id="summary" title="Executive Summary" icon={BarChart3}
          subtitle={`Key performance indicators — ${MONTH_LABELS[monthFilter]}`} />

        <div className="bg-white rounded-xl border border-border p-6 mb-6 shadow-sm">
          <p className="text-base leading-relaxed" style={{ color: NAVY }}>
            Analysis of <strong>{kpis.totalCases.toLocaleString()}</strong> non-L&amp;D
            anesthesia cases over <strong>{kpis.weekdays} weekdays</strong>{monthFilter !== 'all' ? ` in ${MONTH_LABELS[monthFilter]}` : ''} demonstrates
            that {ANALYSIS_META.facility} consistently requires <strong>10 or more simultaneous
            sites of service</strong>. On average, the mathematical minimum number of concurrent sites
            needed is <strong>{kpis.avgMinSites}</strong>, exceeding the {ANALYSIS_META.contractSites}-site
            contract on <strong>{kpis.weekdays > 0 ? Math.round(kpis.daysGe10 / kpis.weekdays * 100) : 0}%</strong> of
            operating weekdays. Reducing capacity to 9 sites would affect{' '}
            <strong>{kpis.whatif9} patients</strong>; reducing to 8 would
            affect <strong>{kpis.whatif8}</strong>.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <KPICard icon={FileText} value={kpis.totalCases.toLocaleString()} label="Non-L&D Cases" sublabel={MONTH_LABELS[monthFilter]} />
          <KPICard icon={TrendingUp} value={kpis.avgMinSites} label="Avg Min Sites" sublabel="Per weekday (with buffers)" />
          <KPICard icon={BarChart3} value={kpis.maxMinSites} label="Peak Sites" sublabel="Single-day maximum" color={RED} />
          <KPICard icon={Calendar} value={`${kpis.weekdays > 0 ? Math.round(kpis.daysGe10 / kpis.weekdays * 100) : 0}%`} label="Days >= 10 Sites" sublabel={`${kpis.daysGe10} of ${kpis.weekdays} weekdays`} />
          <KPICard icon={AlertTriangle} value={kpis.whatif9} label="At Risk (9 Sites)" sublabel="Patients affected" color={AMBER} />
          <KPICard icon={Users} value={kpis.whatif8} label="At Risk (8 Sites)" sublabel="Patients affected" color={RED} />
        </div>

        {/* ── Weekend Staffing & Exclusions Notes ─────────────────── */}
        <div className="space-y-3 mb-8">
          <div className="rounded-xl border p-4 flex items-start gap-3" style={{ backgroundColor: `${NAVY}05`, borderColor: '#D8DCE3' }}>
            <Clock size={18} color={GOLD} className="shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold" style={{ color: NAVY_DEEP }}>Weekend Staffing</div>
              <p className="text-sm mt-0.5" style={{ color: NAVY }}>
                Weekends require <strong>2 sites of service from 7:00 AM – 3:00 PM</strong> and{' '}
                <strong>1 site thereafter</strong>. The analysis focuses on weekday operations,
                where the staffing demand is significantly higher and drives contract requirements.
              </p>
            </div>
          </div>
          <div className="rounded-xl border p-4 flex items-start gap-3" style={{ backgroundColor: `${NAVY}05`, borderColor: '#D8DCE3' }}>
            <Filter size={18} color={SLATE} className="shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold" style={{ color: NAVY_DEEP }}>Excluded Dates</div>
              <p className="text-sm mt-0.5" style={{ color: NAVY }}>
                The following dates are excluded from all calculations, charts, and statistics due to
                reduced or atypical volumes:{' '}
                <strong>Thanksgiving</strong> (Nov 27–28),{' '}
                <strong>Christmas</strong> (Dec 24–26),{' '}
                <strong>New Year&rsquo;s Day</strong> (Jan 1), and{' '}
                <strong>Severe Weather Days</strong> (Jan 24–25).
              </p>
            </div>
          </div>
        </div>

        {/* ── Daily Analysis Chart ──────────────────────────────────── */}
        <SectionHeader id="daily" title="Daily Analysis" icon={Calendar}
          subtitle={`Minimum simultaneous sites of service needed per day (weekdays) — ${MONTH_LABELS[monthFilter]}`} />

        <div className="bg-white rounded-xl border border-border p-6 mb-8 shadow-sm">
          <div className="flex flex-wrap gap-4 mb-6 items-center justify-between">
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: RED }} /> &gt;10 Sites</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: GOLD }} /> =10 Sites</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: EMERALD }} /> &lt;10 Sites</span>
            </div>
            <div className="text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: `${NAVY}08`, color: SLATE }}>
              Weekdays only &middot; Weekends: 2 sites (7a–3p), 1 site thereafter
            </div>
          </div>

          <div className="w-full" style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredDaily} margin={{ top: 5, right: 20, bottom: 60, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tickFormatter={formatDate} angle={-45} textAnchor="end" fontSize={11}
                  tick={{ fill: SLATE }} interval={filteredDaily.length > 40 ? 2 : 0} />
                <YAxis tick={{ fill: SLATE, fontSize: 12 }} domain={[0, 'dataMax + 2']}
                  label={{ value: 'Min Sites Needed', angle: -90, position: 'insideLeft', fill: SLATE, fontSize: 12 }} />
                <Tooltip content={<CustomTooltip filteredDaily={filteredDaily} />} />
                <ReferenceLine y={10} stroke={GOLD} strokeDasharray="6 4" strokeWidth={2}
                  label={{ value: 'Contract: 10 Sites', position: 'right', fill: GOLD, fontSize: 11, fontWeight: 600 }} />
                <Bar dataKey="minSitesWithBuffers" radius={[3, 3, 0, 0]}>
                  {filteredDaily.map((entry, index) => (
                    <Cell key={index} fill={getBarColor(entry.minSitesWithBuffers)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs mt-3 text-center" style={{ color: SLATE }}>
            Showing {filteredDaily.length} days. Each bar = mathematical minimum concurrent sites needed (with 30-min pre / 15-min post buffers).
          </p>
        </div>

        {/* ── Cross-Validation ──────────────────────────────────────── */}
        <SectionHeader id="crossval" title="Cross-Validation" icon={Shield}
          subtitle={`Algorithm results validated against actual daily OR schedules${monthFilter !== 'all' ? ` — ${MONTH_LABELS[monthFilter]}` : ' (Oct 1 – Nov 17)'}`} />

        {monthCrossVal.length > 0 ? (
          <>
            <div className="bg-white rounded-xl border border-border p-6 mb-4 shadow-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: `${GOLD}10` }}>
                  <div className="text-2xl font-bold" style={{ color: NAVY_DEEP }}>{cvStats.total}</div>
                  <div className="text-xs font-medium" style={{ color: SLATE }}>Matched Days</div>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: `${EMERALD}10` }}>
                  <div className="text-2xl font-bold" style={{ color: NAVY_DEEP }}>{cvStats.total > 0 ? Math.round(cvStats.schedGe10 / cvStats.total * 100) : 0}%</div>
                  <div className="text-xs font-medium" style={{ color: SLATE }}>Schedule Shows &ge;10</div>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: `${EMERALD}10` }}>
                  <div className="text-2xl font-bold" style={{ color: NAVY_DEEP }}>{cvStats.total > 0 ? Math.round(cvStats.algoGe10 / cvStats.total * 100) : 0}%</div>
                  <div className="text-xs font-medium" style={{ color: SLATE }}>Algorithm Says &ge;10</div>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: `${GOLD}10` }}>
                  <div className="text-2xl font-bold" style={{ color: NAVY_DEEP }}>{cvStats.total > 0 ? Math.round(cvStats.bothGe10 / cvStats.total * 100) : 0}%</div>
                  <div className="text-xs font-medium" style={{ color: SLATE }}>Both Agree &ge;10</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-border shadow-sm mb-8 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: NAVY_DEEP, color: '#fff' }}>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Day</th>
                    <th className="px-4 py-3 text-right font-semibold">Cases</th>
                    <th className="px-4 py-3 text-right font-semibold">Algorithm (buf)</th>
                    <th className="px-4 py-3 text-right font-semibold">Algorithm (raw)</th>
                    <th className="px-4 py-3 text-right font-semibold">Scheduled Sites</th>
                    <th className="px-4 py-3 text-right font-semibold">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {monthCrossVal.map((row, i) => {
                    const delta = row.scheduledSites !== null ? row.algorithmMinSites - row.scheduledSites : null;
                    return (
                      <tr key={row.date} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                        <td className="px-4 py-2.5 font-medium" style={{ color: NAVY }}>{formatDate(row.date)}</td>
                        <td className="px-4 py-2.5" style={{ color: SLATE }}>{row.dow.substring(0, 3)}</td>
                        <td className="px-4 py-2.5 text-right">{row.totalCases}</td>
                        <td className="px-4 py-2.5 text-right font-semibold"
                          style={{ color: row.algorithmMinSites >= 10 ? RED : EMERALD }}>{row.algorithmMinSites}</td>
                        <td className="px-4 py-2.5 text-right" style={{ color: SLATE }}>{row.algorithmMinSitesNoBuf}</td>
                        <td className="px-4 py-2.5 text-right font-semibold"
                          style={{ color: row.scheduledSites !== null && row.scheduledSites >= 10 ? NAVY : AMBER }}>
                          {row.scheduledSites ?? '\u2014'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium"
                          style={{ color: delta !== null ? (delta >= 0 ? SLATE : RED) : SLATE }}>
                          {delta !== null ? (delta >= 0 ? `+${delta}` : delta) : '\u2014'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl border border-border p-8 mb-8 shadow-sm text-center">
            <Shield size={32} color={SLATE} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm" style={{ color: SLATE }}>
              No cross-validation data available for {MONTH_LABELS[monthFilter]}.
              Schedule PDFs were only available for October 1 – November 17, 2025.
            </p>
            <button onClick={() => handleMonthChange('all')} className="mt-3 text-sm font-medium px-3 py-1 rounded-lg border"
              style={{ borderColor: GOLD, color: NAVY }}>
              View All Months
            </button>
          </div>
        )}

        {/* ── What-If Analysis ──────────────────────────────────────── */}
        <SectionHeader id="whatif" title="What-If Analysis" icon={AlertTriangle}
          subtitle={`Patient impact of reducing contracted sites — ${MONTH_LABELS[monthFilter]}`} />

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl border-l-4 border border-border shadow-sm overflow-hidden"
            style={{ borderLeftColor: AMBER }}>
            <div className="p-6">
              <h3 className="text-lg font-bold mb-1" style={{ color: NAVY_DEEP }}>What if only 9 sites?</h3>
              <p className="text-sm mb-4" style={{ color: SLATE }}>Impact of reducing by 1 site below contract</p>
              <div className="flex gap-6 mb-4">
                <div>
                  <div className="text-3xl font-bold" style={{ color: AMBER }}>{whatifStats.nine.total}</div>
                  <div className="text-xs" style={{ color: SLATE }}>Patients Affected</div>
                </div>
                <div>
                  <div className="text-3xl font-bold" style={{ color: NAVY }}>{whatifStats.nine.daysAffected}</div>
                  <div className="text-xs" style={{ color: SLATE }}>Days Impacted</div>
                </div>
                <div>
                  <div className="text-3xl font-bold" style={{ color: NAVY }}>
                    {kpis.weekdays > 0 ? Math.round(whatifStats.nine.daysAffected / kpis.weekdays * 100) : 0}%
                  </div>
                  <div className="text-xs" style={{ color: SLATE }}>Of Weekdays</div>
                </div>
              </div>
              {whatifStats.nine.samples.length > 0 && (
                <>
                  <div className="text-xs font-semibold uppercase mb-2" style={{ color: SLATE }}>Sample Affected Cases</div>
                  <div className="space-y-1">
                    {whatifStats.nine.samples.slice(0, 5).map((s, i) => (
                      <div key={i} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: LIGHT_BG, color: NAVY }}>
                        {formatDate(s.date)} &middot; {s.procedure} <span style={{ color: SLATE }}>({s.siteType})</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border-l-4 border border-border shadow-sm overflow-hidden"
            style={{ borderLeftColor: RED }}>
            <div className="p-6">
              <h3 className="text-lg font-bold mb-1" style={{ color: NAVY_DEEP }}>What if only 8 sites?</h3>
              <p className="text-sm mb-4" style={{ color: SLATE }}>Impact of reducing by 2 sites below contract</p>
              <div className="flex gap-6 mb-4">
                <div>
                  <div className="text-3xl font-bold" style={{ color: RED }}>{whatifStats.eight.total}</div>
                  <div className="text-xs" style={{ color: SLATE }}>Patients Affected</div>
                </div>
                <div>
                  <div className="text-3xl font-bold" style={{ color: NAVY }}>{whatifStats.eight.daysAffected}</div>
                  <div className="text-xs" style={{ color: SLATE }}>Days Impacted</div>
                </div>
                <div>
                  <div className="text-3xl font-bold" style={{ color: NAVY }}>
                    {kpis.weekdays > 0 ? Math.round(whatifStats.eight.daysAffected / kpis.weekdays * 100) : 0}%
                  </div>
                  <div className="text-xs" style={{ color: SLATE }}>Of Weekdays</div>
                </div>
              </div>
              {whatifStats.eight.samples.length > 0 && (
                <>
                  <div className="text-xs font-semibold uppercase mb-2" style={{ color: SLATE }}>Sample Affected Cases</div>
                  <div className="space-y-1">
                    {whatifStats.eight.samples.slice(0, 5).map((s, i) => (
                      <div key={i} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: LIGHT_BG, color: NAVY }}>
                        {formatDate(s.date)} &middot; {s.procedure} <span style={{ color: SLATE }}>({s.siteType})</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Concurrent Analysis ───────────────────────────────────── */}
        <SectionHeader id="concurrent" title="Concurrent Site Snapshot" icon={Activity}
          subtitle={`Simultaneous active cases throughout the day vs. algorithm-proven provider need — ${MONTH_LABELS[monthFilter]}`} />

        <div className="bg-white rounded-xl border border-border p-6 mb-8 shadow-sm">
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${GOLD}10` }}>
              <div className="text-xl font-bold" style={{ color: NAVY_DEEP }}>{peakSlot.avgConcurrentBuffered}</div>
              <div className="text-xs" style={{ color: SLATE }}>Peak Avg (buffered) at {peakSlot.time}</div>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${RED}10` }}>
              <div className="text-xl font-bold" style={{ color: RED }}>{peakSlot.maxConcurrentBuffered}</div>
              <div className="text-xs" style={{ color: SLATE }}>Max ever (buffered)</div>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${RED}10` }}>
              <div className="text-xl font-bold" style={{ color: RED }}>{kpis.avgMinSites}</div>
              <div className="text-xs" style={{ color: SLATE }}>Avg Min Sites (algorithm)</div>
            </div>
          </div>

          <div className="w-full" style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={concurrentData.map(d => ({ ...d, algorithmMinSites: Number(kpis.avgMinSites) }))} margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                <defs>
                  <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GOLD} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={GOLD} stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="navyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={NAVY} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={NAVY} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="time" fontSize={11} tick={{ fill: SLATE }} interval={3} />
                <YAxis tick={{ fill: SLATE, fontSize: 12 }} domain={[0, 'dataMax + 2']}
                  label={{ value: 'Concurrent Sites', angle: -90, position: 'insideLeft', fill: SLATE, fontSize: 12 }} />
                <Tooltip content={<ConcurrentTooltip />} />
                <ReferenceLine y={10} stroke={GOLD} strokeDasharray="6 4" strokeWidth={2}
                  label={{ value: 'Contract: 10', position: 'right', fill: GOLD, fontSize: 11, fontWeight: 600 }} />
                <Area type="monotone" dataKey="avgConcurrentBuffered" name="Avg Concurrent (buffered)"
                  stroke={GOLD} fill="url(#goldGradient)" strokeWidth={2} />
                <Area type="monotone" dataKey="avgConcurrent" name="Avg Concurrent (raw)"
                  stroke={NAVY_MID} fill="url(#navyGradient)" strokeWidth={1.5} strokeDasharray="4 2" />
                <Area type="monotone" dataKey="algorithmMinSites" name={`Algorithm Min Sites (avg ${kpis.avgMinSites})`}
                  stroke={RED} fill="none" strokeWidth={2} strokeDasharray="8 4" />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs mt-3 text-center" style={{ color: SLATE }}>
            Averaged across {monthFilter === 'all' ? ANALYSIS_META.weekdayCount : kpis.weekdayCount} weekdays{monthFilter !== 'all' ? ` in ${MONTH_LABELS[monthFilter]}` : ''}.
            The gold and navy lines show <strong>concurrent active cases</strong> at each time of day — this is what a point-in-time snapshot sees.
            The <span style={{ color: RED }}>red dashed line</span> shows the <strong>algorithm-proven minimum providers needed</strong> —
            this accounts for non-concurrent commitments (setup, turnover, block scheduling) that concurrent snapshots miss.
            The gap between the concurrent lines and the red line represents hidden provider demand.
          </p>
        </div>

        {/* ── After-Hours Coverage ──────────────────────────────────── */}
        <SectionHeader id="afterhours" title="After-Hours Coverage Analysis" icon={Clock}
          subtitle={`Sites still active at 3:00 PM and 5:00 PM vs. contract step-down — ${MONTH_LABELS[monthFilter]}`} />

        {(() => {
          const ahFiltered = filterByMonth(AFTER_HOURS_DATA, monthFilter);
          const exc3 = ahFiltered.filter(r => r.at3pmBuffered > 6).length;
          const exc5 = ahFiltered.filter(r => r.at5pmBuffered > 3).length;
          const avg3 = ahFiltered.length > 0 ? +(ahFiltered.reduce((s, r) => s + r.at3pmBuffered, 0) / ahFiltered.length).toFixed(1) : 0;
          const avg5 = ahFiltered.length > 0 ? +(ahFiltered.reduce((s, r) => s + r.at5pmBuffered, 0) / ahFiltered.length).toFixed(1) : 0;
          const max3 = ahFiltered.length > 0 ? Math.max(...ahFiltered.map(r => r.at3pmBuffered)) : 0;
          const max5 = ahFiltered.length > 0 ? Math.max(...ahFiltered.map(r => r.at5pmBuffered)) : 0;
          const pct3 = ahFiltered.length > 0 ? Math.round(exc3 / ahFiltered.length * 100) : 0;
          const pct5 = ahFiltered.length > 0 ? Math.round(exc5 / ahFiltered.length * 100) : 0;

          return (
            <div className="bg-white rounded-xl border border-border shadow-sm mb-8 overflow-hidden">
              <div className="p-6">
                <p className="text-sm leading-relaxed mb-5" style={{ color: NAVY }}>
                  Under the contract, staffing steps down to <strong>6 sites at 3:00 PM</strong> and{' '}
                  <strong>3 sites at 5:00 PM</strong>. This analysis measures how many sites of service
                  are still actively running at those times, revealing how frequently actual case volume
                  exceeds the contracted step-down levels.
                </p>

                {/* KPI cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg border text-center" style={{ borderColor: '#D8DCE3' }}>
                    <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: SLATE }}>At 3:00 PM</div>
                    <div className="text-2xl font-bold" style={{ color: NAVY_DEEP }}>{avg3}</div>
                    <div className="text-xs mt-1" style={{ color: SLATE }}>Avg sites active</div>
                  </div>
                  <div className="p-4 rounded-lg border text-center" style={{ borderColor: '#D8DCE3' }}>
                    <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: SLATE }}>3pm Exceeds Contract</div>
                    <div className="text-2xl font-bold" style={{ color: exc3 > 0 ? RED : EMERALD }}>{pct3}%</div>
                    <div className="text-xs mt-1" style={{ color: SLATE }}>{exc3} of {ahFiltered.length} days &gt; 6 sites</div>
                  </div>
                  <div className="p-4 rounded-lg border text-center" style={{ borderColor: '#D8DCE3' }}>
                    <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: SLATE }}>At 5:00 PM</div>
                    <div className="text-2xl font-bold" style={{ color: NAVY_DEEP }}>{avg5}</div>
                    <div className="text-xs mt-1" style={{ color: SLATE }}>Avg sites active</div>
                  </div>
                  <div className="p-4 rounded-lg border text-center" style={{ borderColor: '#D8DCE3' }}>
                    <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: SLATE }}>5pm Exceeds Contract</div>
                    <div className="text-2xl font-bold" style={{ color: exc5 > 0 ? RED : EMERALD }}>{pct5}%</div>
                    <div className="text-xs mt-1" style={{ color: SLATE }}>{exc5} of {ahFiltered.length} days &gt; 3 sites</div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-lg border" style={{ borderColor: '#D8DCE3' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: NAVY_DEEP }}>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Day</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white">Cases</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white">Sites @ 3pm</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white">vs. 6</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white">Sites @ 5pm</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white">vs. 3</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ahFiltered.map((r, i) => {
                        const d3 = r.at3pmBuffered - 6;
                        const d5 = r.at5pmBuffered - 3;
                        return (
                          <tr key={r.date} className={i % 2 === 0 ? 'bg-white' : ''} style={i % 2 !== 0 ? { backgroundColor: '#F8F9FA' } : undefined}>
                            <td className="px-4 py-2.5 font-medium" style={{ color: NAVY_DEEP }}>
                              {new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </td>
                            <td className="px-4 py-2.5" style={{ color: NAVY }}>{r.dow}</td>
                            <td className="px-4 py-2.5 text-center" style={{ color: SLATE }}>{r.totalCases}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className="inline-block px-2 py-0.5 rounded text-xs font-bold"
                                style={{
                                  backgroundColor: d3 > 0 ? `${RED}15` : d3 === 0 ? `${GOLD}15` : `${EMERALD}15`,
                                  color: d3 > 0 ? RED : d3 === 0 ? GOLD : EMERALD,
                                }}>{r.at3pmBuffered}</span>
                            </td>
                            <td className="px-4 py-2.5 text-center text-xs font-semibold"
                              style={{ color: d3 > 0 ? RED : d3 === 0 ? SLATE : EMERALD }}>
                              {d3 > 0 ? `+${d3}` : d3 === 0 ? '—' : d3}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className="inline-block px-2 py-0.5 rounded text-xs font-bold"
                                style={{
                                  backgroundColor: d5 > 0 ? `${RED}15` : d5 === 0 ? `${GOLD}15` : `${EMERALD}15`,
                                  color: d5 > 0 ? RED : d5 === 0 ? GOLD : EMERALD,
                                }}>{r.at5pmBuffered}</span>
                            </td>
                            <td className="px-4 py-2.5 text-center text-xs font-semibold"
                              style={{ color: d5 > 0 ? RED : d5 === 0 ? SLATE : EMERALD }}>
                              {d5 > 0 ? `+${d5}` : d5 === 0 ? '—' : d5}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs mt-4" style={{ color: SLATE }}>
                  Site counts include 30-min pre-case and 15-min post-case buffers.
                  Red values exceed the contracted step-down level for that time.
                  {ahFiltered.length} weekdays shown{monthFilter !== 'all' ? ` for ${MONTH_LABELS[monthFilter]}` : ''}.
                </p>
              </div>
            </div>
          );
        })()}

        {/* ── Surge Coverage ────────────────────────────────────────── */}
        <SectionHeader id="surge" title="Surge Coverage Requests" icon={TrendingUp}
          subtitle="Additional sites of service requested beyond the 10-site contract — January 2026" />

        <div className="bg-white rounded-xl border border-border shadow-sm mb-8 overflow-hidden">
          <div className="p-6">
            <p className="text-sm leading-relaxed mb-4" style={{ color: NAVY }}>
              During January 2026, Medical City Arlington submitted <strong>{SURGE_REQUESTS.length} surge coverage
              requests</strong> across <strong>{new Set(SURGE_REQUESTS.map(s => s.date)).size} unique days</strong>,
              requesting additional anesthesia providers beyond the contracted 10 sites.
              Each request represents a day where case volume exceeded the capacity of the standing contract.
            </p>

            {/* Surge stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-3 rounded-lg text-center" style={{ backgroundColor: `${GOLD}10` }}>
                <div className="text-xl font-bold" style={{ color: NAVY_DEEP }}>{SURGE_REQUESTS.length}</div>
                <div className="text-xs" style={{ color: SLATE }}>Total Requests</div>
              </div>
              <div className="p-3 rounded-lg text-center" style={{ backgroundColor: `${EMERALD}10` }}>
                <div className="text-xl font-bold" style={{ color: EMERALD }}>{SURGE_REQUESTS.filter(s => s.status === 'Confirmed').length}</div>
                <div className="text-xs" style={{ color: SLATE }}>Confirmed</div>
              </div>
              <div className="p-3 rounded-lg text-center" style={{ backgroundColor: `${RED}10` }}>
                <div className="text-xl font-bold" style={{ color: RED }}>{SURGE_REQUESTS.filter(s => s.status === 'Not Approved').length}</div>
                <div className="text-xs" style={{ color: SLATE }}>Not Approved</div>
              </div>
              <div className="p-3 rounded-lg text-center" style={{ backgroundColor: `${NAVY}08` }}>
                <div className="text-xl font-bold" style={{ color: NAVY_DEEP }}>{new Set(SURGE_REQUESTS.map(s => s.date)).size}</div>
                <div className="text-xs" style={{ color: SLATE }}>Days Affected</div>
              </div>
            </div>

            {/* Surge table */}
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: '#D8DCE3' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: NAVY_DEEP }}>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Day</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">Time Slot</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white">Algorithm Sites</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white">Provider</th>
                  </tr>
                </thead>
                <tbody>
                  {SURGE_REQUESTS.map((s, i) => {
                    const algoDay = DAILY_ANALYSIS.find(d => d.date === s.date);
                    const algoSites = algoDay?.minSitesWithBuffers ?? '—';
                    return (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : ''} style={i % 2 !== 0 ? { backgroundColor: '#F8F9FA' } : undefined}>
                        <td className="px-4 py-3 font-medium" style={{ color: NAVY_DEEP }}>
                          {new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-4 py-3" style={{ color: NAVY }}>{s.dow}</td>
                        <td className="px-4 py-3" style={{ color: NAVY }}>{s.type}</td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: SLATE }}>{s.timeSlot}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-bold"
                            style={{
                              backgroundColor: typeof algoSites === 'number' && algoSites > 10 ? `${RED}15` : typeof algoSites === 'number' && algoSites === 10 ? `${GOLD}15` : `${EMERALD}15`,
                              color: typeof algoSites === 'number' && algoSites > 10 ? RED : typeof algoSites === 'number' && algoSites === 10 ? GOLD : EMERALD,
                            }}>
                            {algoSites}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: s.status === 'Confirmed' ? `${EMERALD}15` : `${RED}15`,
                              color: s.status === 'Confirmed' ? EMERALD : RED,
                            }}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-medium" style={{ color: SLATE }}>
                          {s.providerType ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Key insight callout */}
            <div className="mt-6 rounded-xl p-4 border" style={{ backgroundColor: `${RED}06`, borderColor: `${RED}20` }}>
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} color={RED} className="shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold mb-1" style={{ color: NAVY_DEEP }}>Key Insight: Denied Requests Understate True Demand</div>
                  <p className="text-sm leading-relaxed" style={{ color: NAVY }}>
                    On days where a surge request was <strong>not approved</strong>, the actual site demand would have been
                    even higher than what the algorithm shows. The algorithm calculates minimum sites based on cases that
                    were performed — but when an additional site is denied, cases may be delayed, cancelled, or
                    rescheduled, <strong>artificially suppressing</strong> the true concurrent site count for that day.
                    The {SURGE_REQUESTS.filter(s => s.status === 'Not Approved').length} denied request{SURGE_REQUESTS.filter(s => s.status === 'Not Approved').length !== 1 ? 's' : ''} in
                    January would have pushed the site count even higher on {SURGE_REQUESTS.filter(s => s.status === 'Not Approved').length === 1 ? 'that day' : 'those days'}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── De-identified Case Log ────────────────────────────────── */}
        <SectionHeader id="caselog" title="De-identified Case Log" icon={FileText}
          subtitle={`${monthCases.length.toLocaleString()} non-L&D cases${monthFilter !== 'all' ? ` in ${MONTH_LABELS[monthFilter]}` : ''} — patient names, encounter numbers, and surgeon identifiers removed`} />

        <div className="bg-white rounded-xl border border-border shadow-sm mb-8">
          <div className="p-4 border-b flex flex-wrap gap-4 items-center" style={{ borderColor: '#D8DCE3' }}>
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" color={SLATE} />
              <input type="text" placeholder="Search procedures, form titles, dates..."
                value={caseSearch} onChange={e => { setCaseSearch(e.target.value); setCasePage(0); }}
                className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#D8DCE3', color: NAVY }} />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={14} color={SLATE} />
              <select value={caseSiteFilter} onChange={e => { setCaseSiteFilter(e.target.value); setCasePage(0); }}
                className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#D8DCE3', color: NAVY }}>
                <option value="all">All Site Types</option>
                {siteTypes.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <button
              onClick={downloadCaseLog}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50 transition-colors"
              style={{ borderColor: '#D8DCE3', color: NAVY }}
              title="Download case log as CSV"
            >
              <Download size={14} /> CSV
            </button>
            <div className="text-xs" style={{ color: SLATE }}>{filteredCases.length.toLocaleString()} cases</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: NAVY_DEEP, color: '#fff' }}>
                  {([
                    ['caseNum', '#'], ['date', 'Date'], ['startTime', 'Start'], ['endTime', 'End'],
                    ['durationMins', 'Duration'], ['siteType', 'Site Type'], ['procedure', 'Procedure'], ['formTitle', 'Form Title'],
                  ] as [keyof CaseLogEntry, string][]).map(([key, label]) => (
                    <th key={key} className="px-3 py-3 text-left font-semibold cursor-pointer hover:opacity-80"
                      onClick={() => toggleCaseSort(key)}>
                      <div className="flex items-center gap-1">
                        {label}
                        <ArrowUpDown size={12} className={caseSortKey === key ? 'opacity-100' : 'opacity-30'} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedCases.map((c, i) => (
                  <tr key={c.caseNum} className={`hover:bg-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                    <td className="px-3 py-2" style={{ color: SLATE }}>{c.caseNum}</td>
                    <td className="px-3 py-2 font-medium" style={{ color: NAVY }}>{formatDate(c.date)}</td>
                    <td className="px-3 py-2" style={{ color: NAVY }}>{c.startTime}</td>
                    <td className="px-3 py-2" style={{ color: NAVY }}>{c.endTime}</td>
                    <td className="px-3 py-2" style={{ color: NAVY }}>{c.durationMins} min</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded text-xs font-medium" style={{
                        backgroundColor: c.siteType === 'OR' ? `${NAVY}10` : c.siteType === 'Cardiac/Cath Lab' ? `${RED}10` : c.siteType === 'GI' ? `${EMERALD}10` : `${AMBER}10`,
                        color: c.siteType === 'OR' ? NAVY : c.siteType === 'Cardiac/Cath Lab' ? RED : c.siteType === 'GI' ? EMERALD : AMBER,
                      }}>{c.siteType}</span>
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ color: NAVY }}>{c.procedure}</td>
                    <td className="px-3 py-2 text-xs" style={{ color: SLATE }}>{c.formTitle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: '#D8DCE3' }}>
            <div className="text-xs" style={{ color: SLATE }}>
              Page {casePage + 1} of {totalCasePages || 1} ({filteredCases.length.toLocaleString()} cases)
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCasePage(p => Math.max(0, p - 1))} disabled={casePage === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm disabled:opacity-30"
                style={{ borderColor: '#D8DCE3', color: NAVY }}>
                <ChevronLeft size={14} /> Prev
              </button>
              <button onClick={() => setCasePage(p => Math.min(totalCasePages - 1, p + 1))} disabled={casePage >= totalCasePages - 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm disabled:opacity-30"
                style={{ borderColor: '#D8DCE3', color: NAVY }}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Schedule PDFs ───────────────────────────────────────── */}
        <SectionHeader id="schedules" title="Daily OR Schedules" icon={Calendar}
          subtitle="Original daily OR assignment schedules used for cross-validation (Oct 2025 – Jan 2026)" />

        <div className="bg-white rounded-xl border border-border shadow-sm mb-8 p-6">
          <p className="text-sm mb-4" style={{ color: NAVY }}>
            These are the actual daily OR assignment schedules from Medical City Arlington. Each PDF shows the
            scheduled rooms and assignments for that day. We manually reviewed each schedule to count non-L&amp;D
            sites of service, which were then compared against our algorithm&rsquo;s results in the Cross-Validation section above.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filterByMonth(SCHEDULE_PDFS, monthFilter).map(s => {
              const d = new Date(s.date + 'T12:00:00');
              const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <a
                  key={s.date}
                  href={`/schedules/${s.file}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium hover:shadow-md transition-all hover:border-gold"
                  style={{ borderColor: '#D8DCE3', color: NAVY }}
                >
                  <FileText size={14} color={GOLD} className="shrink-0" />
                  <div>
                    <div className="font-semibold text-sm">{label}</div>
                    <div className="text-xs" style={{ color: SLATE }}>{s.dow}</div>
                  </div>
                </a>
              );
            })}
          </div>
          <p className="text-xs mt-4" style={{ color: SLATE }}>
            {filterByMonth(SCHEDULE_PDFS, monthFilter).length} schedules shown &middot; {SCHEDULE_PDFS.length} total available &middot; Click to open PDF in new tab
          </p>
        </div>

        {/* ── Methodology ───────────────────────────────────────────── */}
        <SectionHeader id="methodology" title="Methodology" icon={BookOpen}
          subtitle="How we developed a site-of-service analysis algorithm for Medical City Arlington" />

        <div className="bg-white rounded-xl border border-border shadow-sm mb-8 overflow-hidden">
          {/* Always-visible intro */}
          <div className="p-6">
            <h3 className="text-lg font-bold mb-3" style={{ color: NAVY_DEEP }}>
              Algorithm Designed for MCA&rsquo;s Workflow
            </h3>
            <p className="text-sm leading-relaxed mb-4" style={{ color: NAVY }}>
              We developed a purpose-built algorithm specifically for Medical City Arlington&rsquo;s anesthesia workflow.
              Unlike generic scheduling analyses, our approach accounts for the unique operational realities at MCA &mdash;
              including pre-case setup, post-case turnover, and the critical distinction between operative anesthesia
              (where one provider commits to one site for the full case) and L&amp;D coverage (where a single provider
              can manage multiple concurrent labor epidurals). The algorithm processes every case from Graphium EMR
              data and mathematically proves the minimum number of simultaneous sites of service required.
            </p>

            {/* ── Algorithmic Diagram ── */}
            <div className="rounded-xl p-6 mb-6" style={{ backgroundColor: NAVY_DEEP }}>
              <h4 className="text-sm font-bold uppercase tracking-wide mb-6 text-center" style={{ color: GOLD }}>
                Site-of-Service Analysis Pipeline
              </h4>

              {/* Flow diagram using CSS/HTML */}
              <div className="flex flex-col items-center gap-3">

                {/* Step 1 */}
                <div className="w-full max-w-2xl rounded-lg p-4 border" style={{ backgroundColor: NAVY_MID, borderColor: `${GOLD}40` }}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold" style={{ backgroundColor: GOLD, color: NAVY_DEEP }}>1</div>
                    <div>
                      <div className="font-bold text-white text-sm">Data Ingestion</div>
                      <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                        Import all cases from Graphium EMR Case Detail export. Extract anesthesia start time, anesthesia end time, procedure type, and form title for each encounter.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center" style={{ color: GOLD }}>&#9660;</div>

                {/* Step 2 */}
                <div className="w-full max-w-2xl rounded-lg p-4 border" style={{ backgroundColor: NAVY_MID, borderColor: `${GOLD}40` }}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold" style={{ backgroundColor: GOLD, color: NAVY_DEEP }}>2</div>
                    <div>
                      <div className="font-bold text-white text-sm">Site Classification &amp; L&amp;D Exclusion</div>
                      <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                        Classify each case by site type: OR, Cardiac/Cath Lab, GI, IR, or Short/MAC based on procedure and form title keywords.
                        Exclude L&amp;D cases (labor epidurals are managed differently &mdash; one provider covers multiple concurrent patients).
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center" style={{ color: GOLD }}>&#9660;</div>

                {/* Step 3 */}
                <div className="w-full max-w-2xl rounded-lg p-4 border" style={{ backgroundColor: NAVY_MID, borderColor: `${GOLD}40` }}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold" style={{ backgroundColor: GOLD, color: NAVY_DEEP }}>3</div>
                    <div>
                      <div className="font-bold text-white text-sm">Buffer Application</div>
                      <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                        Expand each case&rsquo;s time interval to include realistic site commitment:
                      </div>
                      <div className="flex gap-4 mt-2">
                        <div className="px-3 py-1.5 rounded text-xs font-mono" style={{ backgroundColor: `${GOLD}20`, color: GOLD_LIGHT }}>
                          start = anes_start &minus; 30 min
                        </div>
                        <div className="px-3 py-1.5 rounded text-xs font-mono" style={{ backgroundColor: `${GOLD}20`, color: GOLD_LIGHT }}>
                          end = anes_end + 15 min
                        </div>
                      </div>
                      <div className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                        Pre-case buffer (30 min): room setup, patient positioning, line placement.
                        Post-case buffer (15 min): emergence, transport, room turnover.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center" style={{ color: GOLD }}>&#9660;</div>

                {/* Step 4 */}
                <div className="w-full max-w-2xl rounded-lg p-4 border-2" style={{ backgroundColor: NAVY_MID, borderColor: GOLD }}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold" style={{ backgroundColor: GOLD, color: NAVY_DEEP }}>4</div>
                    <div>
                      <div className="font-bold text-sm" style={{ color: GOLD }}>Interval Partitioning Algorithm</div>
                      <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                        For each day, sort all buffered case intervals by start time. Use a greedy algorithm
                        with a min-heap to assign cases to the earliest-available site. When a case starts before
                        any existing site finishes, a new site is opened. The total sites opened equals the
                        mathematical minimum concurrent sites needed &mdash; this is provably optimal.
                      </div>
                      <div className="mt-3 p-3 rounded text-xs font-mono" style={{ backgroundColor: NAVY_DEEP, color: GOLD_LIGHT }}>
                        <div>sort cases by start_time</div>
                        <div>heap = [ ] &nbsp;&nbsp;<span style={{ color: SLATE }}># min-heap of (end_time, site_id)</span></div>
                        <div className="mt-1">for each case:</div>
                        <div>&nbsp;&nbsp;if heap[0].end &le; case.start &rarr; <span style={{ color: EMERALD }}>reuse site</span></div>
                        <div>&nbsp;&nbsp;else &rarr; <span style={{ color: AMBER }}>open new site</span></div>
                        <div className="mt-1">return total_sites_opened</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center" style={{ color: GOLD }}>&#9660;</div>

                {/* Step 5 */}
                <div className="w-full max-w-2xl rounded-lg p-4 border" style={{ backgroundColor: NAVY_MID, borderColor: `${GOLD}40` }}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold" style={{ backgroundColor: GOLD, color: NAVY_DEEP }}>5</div>
                    <div>
                      <div className="font-bold text-white text-sm">What-If Simulation</div>
                      <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                        Re-run the algorithm with artificial site caps (9 sites, 8 sites) to identify
                        which patients would be uncovered &mdash; i.e., arriving when all available sites
                        are already committed. These are real patients who would face delayed or cancelled procedures.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center" style={{ color: GOLD }}>&#9660;</div>

                {/* Step 6 */}
                <div className="w-full max-w-2xl rounded-lg p-4 border" style={{ backgroundColor: NAVY_MID, borderColor: `${GOLD}40` }}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold" style={{ backgroundColor: GOLD, color: NAVY_DEEP }}>6</div>
                    <div>
                      <div className="font-bold text-white text-sm">Cross-Validation &amp; Reporting</div>
                      <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                        Compare algorithm results against {SCHEDULE_PDFS.length} actual daily OR schedules (manually reviewed).
                        Generate daily, monthly, and aggregate reports with KPIs, utilization metrics,
                        concurrent site heatmaps, and de-identified case logs.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Result */}
                <div className="mt-2 w-full max-w-2xl rounded-xl p-4 text-center" style={{ backgroundColor: `${GOLD}20`, border: `2px solid ${GOLD}` }}>
                  <div className="text-sm font-bold" style={{ color: GOLD }}>Result</div>
                  <div className="text-xl font-bold text-white mt-1">
                    Avg {kpis.avgMinSites} sites needed &middot; {kpis.weekdays > 0 ? Math.round(kpis.daysGe10 / kpis.weekdays * 100) : 0}% of days exceed contract
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                    Mathematically proven minimum — real-world needs are often higher
                  </div>
                </div>
              </div>
            </div>

            {/* ── Why Concurrent Site Analysis Fails ── */}
            <div className="mt-6 rounded-xl p-6 border" style={{ backgroundColor: `${RED}04`, borderColor: `${RED}20` }}>
              <h3 className="text-lg font-bold mb-2" style={{ color: NAVY_DEEP }}>
                Why &ldquo;Concurrent Site&rdquo; Analysis Produces Flawed Results
              </h3>
              <p className="text-sm leading-relaxed mb-5" style={{ color: NAVY }}>
                Some analyses attempt to determine staffing needs by sampling the number of anesthesia cases
                happening at the same moment throughout the day. While this seems intuitive, it produces
                <strong> systematically inaccurate results</strong> because it confuses <em>billing time</em> with
                <em> site commitment time</em>. A provider assigned to a site cannot leave to cover another
                case between procedures — they are dedicated to that location for the full block,
                regardless of how much actual anesthesia time is recorded. Below are real-world examples
                from MCA&rsquo;s workflow that illustrate these failures.
              </p>

              <div className="space-y-4">
                {/* Example 1: TEE Block */}
                <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#D8DCE3' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ backgroundColor: RED, color: 'white' }}>1</div>
                    <div>
                      <div className="font-bold text-sm mb-1" style={{ color: NAVY_DEEP }}>Cardiac/TEE Block Scheduling</div>
                      <p className="text-sm leading-relaxed" style={{ color: NAVY }}>
                        A provider scheduled for <strong>6 TEEs from 7:00 AM – 1:00 PM</strong> may only record
                        ~120 minutes of total anesthesia time (about 20 minutes per procedure). A concurrent site
                        analysis would see that provider as &ldquo;idle&rdquo; for <strong>66% of the block</strong>,
                        suggesting the site is available for reallocation. In reality, the provider is committed
                        to the cath lab for the full 6 hours — they cannot leave to cover an OR case between TEEs.
                        The cardiologist expects anesthesia to be present and ready for each case in sequence.
                        <strong> One site, one provider, 6 hours — but only 2 hours of billing time.</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Example 2: Turnover & Setup */}
                <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#D8DCE3' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ backgroundColor: RED, color: 'white' }}>2</div>
                    <div>
                      <div className="font-bold text-sm mb-1" style={{ color: NAVY_DEEP }}>OR Turnover &amp; Pre-Case Setup</div>
                      <p className="text-sm leading-relaxed" style={{ color: NAVY }}>
                        Between consecutive OR cases, a provider spends <strong>30–45 minutes</strong> on
                        emergence, transport, PACU handoff, room turnover, next-patient evaluation, IV access,
                        positioning, and induction. None of this shows up in &ldquo;anesthesia time,&rdquo; yet
                        the provider is fully occupied and the site is unavailable. Concurrent analysis that only
                        looks at overlapping anesthesia start/end times sees a <strong>&ldquo;gap&rdquo;</strong> between
                        cases and may conclude the site was unoccupied — when in reality the
                        provider <strong>was committed to that site the entire time.</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Example 3: Late Starts & Add-Ons */}
                <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#D8DCE3' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ backgroundColor: RED, color: 'white' }}>3</div>
                    <div>
                      <div className="font-bold text-sm mb-1" style={{ color: NAVY_DEEP }}>Late Starts &amp; Surgeon-Driven Delays</div>
                      <p className="text-sm leading-relaxed" style={{ color: NAVY }}>
                        When a surgeon&rsquo;s first case starts at <strong>8:30 AM instead of 7:00 AM</strong>,
                        the anesthesia provider assigned to that room is still committed from 7:00. They&rsquo;re
                        evaluating the patient, placing lines, and waiting for the surgical team. A concurrent
                        site snapshot at 7:15 shows no active anesthesia — but that site is absolutely occupied.
                        Similarly, <strong>add-on cases</strong> may arrive mid-afternoon with only 1–2 hours of
                        actual procedure time, but the provider must stay committed through room setup, the case,
                        and post-case duties.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Example 4: IR & Short Cases */}
                <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#D8DCE3' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ backgroundColor: RED, color: 'white' }}>4</div>
                    <div>
                      <div className="font-bold text-sm mb-1" style={{ color: NAVY_DEEP }}>Interventional Radiology &amp; Short/MAC Cases</div>
                      <p className="text-sm leading-relaxed" style={{ color: NAVY }}>
                        IR suites and short/MAC rooms often have <strong>multiple short procedures with
                        significant wait time</strong> between cases. An IR provider may cover 4–5 procedures
                        across a full day, each lasting 15–30 minutes, but the provider is assigned to that
                        suite for the block. Between procedures they&rsquo;re evaluating the next patient,
                        reviewing imaging, and coordinating with the radiologist. A concurrent analysis sees
                        5 brief spikes of activity and concludes this provider was only &ldquo;needed&rdquo;
                        for 2 hours — <strong>missing the 8+ hours of dedicated site commitment.</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary callout */}
              <div className="mt-5 rounded-lg p-4" style={{ backgroundColor: NAVY_DEEP }}>
                <p className="text-sm leading-relaxed text-center" style={{ color: '#E5E7EB' }}>
                  <strong style={{ color: GOLD }}>The fundamental flaw:</strong> Concurrent analysis counts
                  <em> billing time</em>, not <em>site commitment time</em>. Our interval partitioning algorithm
                  avoids this entirely — it calculates the minimum number of providers who must be simultaneously
                  committed to separate sites, accounting for the full lifecycle of each case from pre-case setup
                  through post-case turnover.
                </p>
              </div>
            </div>
          </div>

          {/* Expandable detailed methodology */}
          <button onClick={() => setMethodOpen(!methodOpen)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            style={{ borderTop: `1px solid #D8DCE3` }}>
            <div>
              <h4 className="text-sm font-bold" style={{ color: NAVY_DEEP }}>
                Detailed Definitions &amp; Data Sources
              </h4>
              <p className="text-xs" style={{ color: SLATE }}>
                Click to {methodOpen ? 'collapse' : 'expand'}
              </p>
            </div>
            {methodOpen ? <ChevronUp size={18} color={SLATE} /> : <ChevronDown size={18} color={SLATE} />}
          </button>

          {methodOpen && (
            <div className="px-6 pb-6 space-y-6" style={{ borderTop: `1px solid #D8DCE3` }}>
              <div className="pt-6">
                <h4 className="font-bold mb-2" style={{ color: NAVY_DEEP }}>What is a Site of Service?</h4>
                <p className="text-sm leading-relaxed" style={{ color: NAVY }}>
                  A &ldquo;site of service&rdquo; is a physical location where an anesthesia provider delivers care
                  to a single patient at a time. At Medical City Arlington, non-L&amp;D sites include operating rooms (ORs),
                  cardiac catheterization labs, GI suites, and interventional radiology suites. Each site requires its own
                  dedicated anesthesia provider for the duration of the case.
                </p>
              </div>
              <div>
                <h4 className="font-bold mb-2" style={{ color: NAVY_DEEP }}>Why L&amp;D Is Excluded</h4>
                <p className="text-sm leading-relaxed" style={{ color: NAVY }}>
                  Labor &amp; Delivery (L&amp;D) is excluded because a single provider can manage multiple simultaneous
                  labor epidurals. This fundamentally differs from operative anesthesia where one provider occupies one
                  site for the entire case. L&amp;D is staffed and contracted separately.
                </p>
              </div>
              <div>
                <h4 className="font-bold mb-2" style={{ color: NAVY_DEEP }}>Data Sources</h4>
                <ul className="text-sm space-y-2" style={{ color: NAVY }}>
                  <li><strong>Case Data:</strong> Graphium EMR Case Detail export, {ANALYSIS_META.dateRange}. {ANALYSIS_META.totalNonLdCases.toLocaleString()} non-L&amp;D cases across {ANALYSIS_META.weekdayCount} weekdays and {ANALYSIS_META.weekendCount} weekends.</li>
                  <li><strong>Schedule PDFs:</strong> {SCHEDULE_PDFS.length} daily OR assignment schedules (Oct 2025 &ndash; Jan 2026), manually reviewed to count non-L&amp;D sites for cross-validation. Available for download in the Schedules section above.</li>
                  <li><strong>De-identification:</strong> All patient names, encounter numbers, surgeon names, and EMR links have been removed. Only timing, procedure descriptions, and site classifications are retained.</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-2" style={{ color: NAVY_DEEP }}>Limitations</h4>
                <ul className="text-sm space-y-1 list-disc list-inside" style={{ color: NAVY }}>
                  <li>Algorithm assumes no scheduling preference &mdash; any case can use any site</li>
                  <li>Real-world constraints (room specialization, equipment) may require additional sites</li>
                  <li>Buffer times are fixed estimates; actual turnover varies</li>
                  <li>Weekend staffing is fixed at 2 sites (7a&ndash;3p) and 1 site thereafter; weekday analysis drives contract</li>
                  <li>Only 1 L&amp;D case was identified in this dataset &mdash; the Graphium export may have pre-filtered L&amp;D</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="py-8 text-center" style={{ backgroundColor: NAVY_DEEP, borderTop: `2px solid ${GOLD}` }}>
        <Image src="/meridian-anesthesia-logo-white.svg" alt="Meridian Anesthesia"
          width={160} height={48} className="h-10 w-auto mx-auto mb-3" />
        <p className="text-sm italic" style={{ color: GOLD }}>A Division of National Partners in Healthcare</p>
        <p className="text-xs mt-2" style={{ color: SLATE }}>
          Analysis generated {ANALYSIS_META.analysisDate} &middot; All patient data de-identified
        </p>
      </footer>
    </div>
  );
}
