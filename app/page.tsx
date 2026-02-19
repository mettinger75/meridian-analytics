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
  CASE_LOG, CROSS_VALIDATION,
} from './data/analysis-data';
import type { CaseLogEntry, DailyAnalysisRow } from './data/analysis-data';

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
  { id: 'caselog', label: 'Case Log', icon: FileText },
  { id: 'schedules', label: 'Schedules', icon: Calendar },
  { id: 'methodology', label: 'Methodology', icon: BookOpen },
] as const;

// ── Schedule PDFs ──────────────────────────────────────────────────────
const SCHEDULE_PDFS = [
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

function filterByMonth<T extends { date: string }>(data: T[], month: string): T[] {
  if (month === 'all') return data;
  return data.filter(d => d.date.substring(5, 7) === month);
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
  const [dayTypeFilter, setDayTypeFilter] = useState<'weekday' | 'weekend' | 'all'>('weekday');

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

  // ── Daily chart data (applies day-type filter on top of month) ──
  const filteredDaily = useMemo(() => {
    return monthDailyData.filter(d => {
      if (dayTypeFilter === 'weekday' && !d.isWeekday) return false;
      if (dayTypeFilter === 'weekend' && d.isWeekday) return false;
      return true;
    });
  }, [monthDailyData, dayTypeFilter]);

  // ── Dynamic KPIs computed from filtered data ──
  const kpis = useMemo(() => {
    if (monthFilter === 'all') {
      return {
        totalCases: ANALYSIS_META.totalNonLdCases,
        avgMinSites: SUMMARY.avgMinSitesNeeded,
        maxMinSites: SUMMARY.maxMinSitesNeeded,
        weekdays: SUMMARY.totalWeekdays,
        daysGe10: SUMMARY.daysNeeding10Plus,
        whatif9: SUMMARY.whatif9Uncovered,
        whatif8: SUMMARY.whatif8Uncovered,
        dateLabel: ANALYSIS_META.dateRange,
        weekdayCount: ANALYSIS_META.weekdayCount,
        weekendCount: ANALYSIS_META.weekendCount,
      };
    }
    const weekdayData = monthDailyData.filter(d => d.isWeekday);
    const totalCases = monthDailyData.reduce((s, d) => s + d.totalCases, 0);
    const avgMinSites = weekdayData.length > 0
      ? +(weekdayData.reduce((s, d) => s + d.minSitesWithBuffers, 0) / weekdayData.length).toFixed(1)
      : 0;
    const maxMinSites = monthDailyData.length > 0
      ? Math.max(...monthDailyData.map(d => d.minSitesWithBuffers))
      : 0;
    const daysGe10 = weekdayData.filter(d => d.minSitesWithBuffers >= 10).length;
    const whatif9 = monthDailyData.reduce((s, d) => s + d.whatif9Uncovered, 0);
    const whatif8 = monthDailyData.reduce((s, d) => s + d.whatif8Uncovered, 0);

    const dates = monthDailyData.map(d => d.date).sort();
    const dateLabel = dates.length > 0
      ? `${formatDateFull(dates[0])} to ${formatDateFull(dates[dates.length - 1])}`
      : '';

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
  }, [monthFilter, monthDailyData]);

  // ── What-if per month ──
  const whatifStats = useMemo(() => {
    if (monthFilter === 'all') {
      return {
        nine: {
          total: WHATIF_DATA.nineSites.totalUncovered,
          daysAffected: WHATIF_DATA.nineSites.daysAffected,
          samples: WHATIF_DATA.nineSites.samples,
        },
        eight: {
          total: WHATIF_DATA.eightSites.totalUncovered,
          daysAffected: WHATIF_DATA.eightSites.daysAffected,
          samples: WHATIF_DATA.eightSites.samples,
        },
      };
    }
    const weekdayData = monthDailyData.filter(d => d.isWeekday);
    const nineTotal = weekdayData.reduce((s, d) => s + d.whatif9Uncovered, 0);
    const nineDays = weekdayData.filter(d => d.whatif9Uncovered > 0).length;
    const eightTotal = weekdayData.reduce((s, d) => s + d.whatif8Uncovered, 0);
    const eightDays = weekdayData.filter(d => d.whatif8Uncovered > 0).length;

    // Filter samples for this month
    const nineSamples = WHATIF_DATA.nineSites.samples.filter(
      s => s.date.substring(5, 7) === monthFilter
    );
    const eightSamples = WHATIF_DATA.eightSites.samples.filter(
      s => s.date.substring(5, 7) === monthFilter
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

        {/* ── Daily Analysis Chart ──────────────────────────────────── */}
        <SectionHeader id="daily" title="Daily Analysis" icon={Calendar}
          subtitle={`Minimum simultaneous sites of service needed per day — ${MONTH_LABELS[monthFilter]}`} />

        <div className="bg-white rounded-xl border border-border p-6 mb-8 shadow-sm">
          <div className="flex flex-wrap gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold uppercase mb-1" style={{ color: SLATE }}>Day Type</label>
              <select value={dayTypeFilter} onChange={e => setDayTypeFilter(e.target.value as 'weekday' | 'weekend' | 'all')}
                className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#D8DCE3', color: NAVY }}>
                <option value="weekday">Weekdays Only</option>
                <option value="weekend">Weekends Only</option>
                <option value="all">All Days</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: RED }} /> &gt;10 Sites</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: GOLD }} /> =10 Sites</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: EMERALD }} /> &lt;10 Sites</span>
              </div>
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
        <SectionHeader id="concurrent" title="Concurrent Analysis" icon={Activity}
          subtitle={`Average simultaneous sites in use throughout the operating day — ${MONTH_LABELS[monthFilter]}`} />

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
          </div>

          <div className="w-full" style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={concurrentData} margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
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
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs mt-3 text-center" style={{ color: SLATE }}>
            Averaged across {monthFilter === 'all' ? ANALYSIS_META.weekdayCount : kpis.weekdayCount} weekdays{monthFilter !== 'all' ? ` in ${MONTH_LABELS[monthFilter]}` : ''}. Buffered = 30 min pre-case + 15 min post-case site commitment.
          </p>
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
          subtitle="Original daily OR assignment schedules used for cross-validation (Oct 1 – Nov 17, 2025)" />

        <div className="bg-white rounded-xl border border-border shadow-sm mb-8 p-6">
          <p className="text-sm mb-4" style={{ color: NAVY }}>
            These are the actual daily OR assignment schedules from Medical City Arlington. Each PDF shows the
            scheduled rooms and assignments for that day. We manually reviewed each schedule to count non-L&amp;D
            sites of service, which were then compared against our algorithm&rsquo;s results in the Cross-Validation section above.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {SCHEDULE_PDFS.map(s => {
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
            {SCHEDULE_PDFS.length} schedules available &middot; Click to open PDF in new tab
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
                        Compare algorithm results against 33 actual daily OR schedules (manually reviewed).
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
                    Avg {SUMMARY.avgMinSitesNeeded} sites needed &middot; {Math.round(SUMMARY.daysNeeding10Plus / SUMMARY.totalWeekdays * 100)}% of days exceed contract
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                    Mathematically proven minimum — real-world needs are often higher
                  </div>
                </div>
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
                  <li><strong>Schedule PDFs:</strong> 33 daily OR assignment schedules (Oct 1 &ndash; Nov 17, 2025), manually reviewed to count non-L&amp;D sites for cross-validation. Available for download in the Schedules section above.</li>
                  <li><strong>De-identification:</strong> All patient names, encounter numbers, surgeon names, and EMR links have been removed. Only timing, procedure descriptions, and site classifications are retained.</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-2" style={{ color: NAVY_DEEP }}>Limitations</h4>
                <ul className="text-sm space-y-1 list-disc list-inside" style={{ color: NAVY }}>
                  <li>Algorithm assumes no scheduling preference &mdash; any case can use any site</li>
                  <li>Real-world constraints (room specialization, equipment) may require additional sites</li>
                  <li>Buffer times are fixed estimates; actual turnover varies</li>
                  <li>Weekend data included for completeness but capacity is typically reduced</li>
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
