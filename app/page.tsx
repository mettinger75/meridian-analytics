'use client';

import { useState, useMemo } from 'react';
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
  BookOpen,
} from 'lucide-react';
import {
  ANALYSIS_META, SUMMARY, DAILY_ANALYSIS, WHATIF_DATA,
  CONCURRENT_HEATMAP, CASE_LOG, CROSS_VALIDATION,
} from './data/analysis-data';
import type { CaseLogEntry } from './data/analysis-data';

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

// ── Section IDs ────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'summary', label: 'Executive Summary', icon: BarChart3 },
  { id: 'daily', label: 'Daily Analysis', icon: Calendar },
  { id: 'crossval', label: 'Cross-Validation', icon: Shield },
  { id: 'whatif', label: 'What-If Analysis', icon: AlertTriangle },
  { id: 'concurrent', label: 'Concurrent Analysis', icon: Activity },
  { id: 'caselog', label: 'Case Log', icon: FileText },
  { id: 'methodology', label: 'Methodology', icon: BookOpen },
] as const;

// ── Helpers ────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getBarColor(sites: number): string {
  if (sites > 10) return RED;
  if (sites === 10) return GOLD;
  return EMERALD;
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

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const row = DAILY_ANALYSIS.find(d => formatDate(d.date) === label || d.date === label);
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

// ── Main Page ──────────────────────────────────────────────────────────

export default function ScheduleAnalysisPage() {
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [dayTypeFilter, setDayTypeFilter] = useState<'weekday' | 'weekend' | 'all'>('weekday');
  const [caseSearch, setCaseSearch] = useState('');
  const [caseSiteFilter, setCaseSiteFilter] = useState('all');
  const [casePage, setCasePage] = useState(0);
  const [caseSortKey, setCaseSortKey] = useState<keyof CaseLogEntry>('caseNum');
  const [caseSortDir, setCaseSortDir] = useState<'asc' | 'desc'>('asc');
  const CASES_PER_PAGE = 50;
  const [methodOpen, setMethodOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('summary');

  const filteredDaily = useMemo(() => {
    return DAILY_ANALYSIS.filter(d => {
      if (dayTypeFilter === 'weekday' && !d.isWeekday) return false;
      if (dayTypeFilter === 'weekend' && d.isWeekday) return false;
      if (monthFilter !== 'all') {
        const month = d.date.substring(5, 7);
        if (month !== monthFilter) return false;
      }
      return true;
    });
  }, [monthFilter, dayTypeFilter]);

  const filteredCases = useMemo(() => {
    let data = [...CASE_LOG];
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
  }, [caseSearch, caseSiteFilter, caseSortKey, caseSortDir]);

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

  const cvWithSchedule = CROSS_VALIDATION.filter(r => r.scheduledSites !== null);
  const cvAlgoGe10 = cvWithSchedule.filter(r => r.algorithmMinSites >= 10).length;
  const cvSchedGe10 = cvWithSchedule.filter(r => r.scheduledSites !== null && r.scheduledSites >= 10).length;
  const cvBothGe10 = cvWithSchedule.filter(r => r.algorithmMinSites >= 10 && r.scheduledSites !== null && r.scheduledSites >= 10).length;

  const siteTypes = [...new Set(CASE_LOG.map(c => c.siteType))].sort();

  const peakSlot = CONCURRENT_HEATMAP.reduce((max, s) =>
    s.avgConcurrentBuffered > max.avgConcurrentBuffered ? s : max, CONCURRENT_HEATMAP[0]);

  function scrollTo(id: string) {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
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

      {/* ── Sticky Nav ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b shadow-sm" style={{ backgroundColor: '#fff', borderColor: '#D8DCE3' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto py-2 -mx-1">
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
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 pb-16">

        {/* ── Executive Summary ─────────────────────────────────────── */}
        <SectionHeader id="summary" title="Executive Summary" icon={BarChart3}
          subtitle="Key performance indicators from the interval partitioning algorithm" />

        <div className="bg-white rounded-xl border border-border p-6 mb-6 shadow-sm">
          <p className="text-base leading-relaxed" style={{ color: NAVY }}>
            Analysis of <strong>{ANALYSIS_META.totalNonLdCases.toLocaleString()}</strong> non-L&amp;D
            anesthesia cases over <strong>{ANALYSIS_META.weekdayCount} weekdays</strong> demonstrates
            that {ANALYSIS_META.facility} consistently requires <strong>10 or more simultaneous
            sites of service</strong>. On average, the mathematical minimum number of concurrent sites
            needed is <strong>{SUMMARY.avgMinSitesNeeded}</strong>, exceeding the {ANALYSIS_META.contractSites}-site
            contract on <strong>{Math.round(SUMMARY.daysNeeding10Plus / SUMMARY.totalWeekdays * 100)}%</strong> of
            operating weekdays. Reducing capacity to 9 sites would affect{' '}
            <strong>{SUMMARY.whatif9Uncovered} patients</strong>; reducing to 8 would
            affect <strong>{SUMMARY.whatif8Uncovered}</strong>.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <KPICard icon={FileText} value={ANALYSIS_META.totalNonLdCases.toLocaleString()} label="Non-L&D Cases" sublabel={`${ANALYSIS_META.dateRange}`} />
          <KPICard icon={TrendingUp} value={SUMMARY.avgMinSitesNeeded} label="Avg Min Sites" sublabel="Per weekday (with buffers)" />
          <KPICard icon={BarChart3} value={SUMMARY.maxMinSitesNeeded} label="Peak Sites" sublabel="Single-day maximum" color={RED} />
          <KPICard icon={Calendar} value={`${Math.round(SUMMARY.daysNeeding10Plus / SUMMARY.totalWeekdays * 100)}%`} label="Days >= 10 Sites" sublabel={`${SUMMARY.daysNeeding10Plus} of ${SUMMARY.totalWeekdays} weekdays`} />
          <KPICard icon={AlertTriangle} value={SUMMARY.whatif9Uncovered} label="At Risk (9 Sites)" sublabel="Patients affected" color={AMBER} />
          <KPICard icon={Users} value={SUMMARY.whatif8Uncovered} label="At Risk (8 Sites)" sublabel="Patients affected" color={RED} />
        </div>

        {/* ── Daily Analysis Chart ──────────────────────────────────── */}
        <SectionHeader id="daily" title="Daily Analysis" icon={Calendar}
          subtitle="Minimum simultaneous sites of service needed per day" />

        <div className="bg-white rounded-xl border border-border p-6 mb-8 shadow-sm">
          <div className="flex flex-wrap gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold uppercase mb-1" style={{ color: SLATE }}>Month</label>
              <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: '#D8DCE3', color: NAVY }}>
                <option value="all">All Months</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>
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
                <Tooltip content={<CustomTooltip />} />
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
          subtitle="Algorithm results validated against actual daily OR schedules (Oct 1 - Nov 17)" />

        <div className="bg-white rounded-xl border border-border p-6 mb-4 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: `${GOLD}10` }}>
              <div className="text-2xl font-bold" style={{ color: NAVY_DEEP }}>{cvWithSchedule.length}</div>
              <div className="text-xs font-medium" style={{ color: SLATE }}>Matched Days</div>
            </div>
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: `${EMERALD}10` }}>
              <div className="text-2xl font-bold" style={{ color: NAVY_DEEP }}>{Math.round(cvSchedGe10 / cvWithSchedule.length * 100)}%</div>
              <div className="text-xs font-medium" style={{ color: SLATE }}>Schedule Shows &ge;10</div>
            </div>
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: `${EMERALD}10` }}>
              <div className="text-2xl font-bold" style={{ color: NAVY_DEEP }}>{Math.round(cvAlgoGe10 / cvWithSchedule.length * 100)}%</div>
              <div className="text-xs font-medium" style={{ color: SLATE }}>Algorithm Says &ge;10</div>
            </div>
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: `${GOLD}10` }}>
              <div className="text-2xl font-bold" style={{ color: NAVY_DEEP }}>{Math.round(cvBothGe10 / cvWithSchedule.length * 100)}%</div>
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
              {cvWithSchedule.map((row, i) => {
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

        {/* ── What-If Analysis ──────────────────────────────────────── */}
        <SectionHeader id="whatif" title="What-If Analysis" icon={AlertTriangle}
          subtitle="Patient impact of reducing contracted sites of service" />

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl border-l-4 border border-border shadow-sm overflow-hidden"
            style={{ borderLeftColor: AMBER }}>
            <div className="p-6">
              <h3 className="text-lg font-bold mb-1" style={{ color: NAVY_DEEP }}>What if only 9 sites?</h3>
              <p className="text-sm mb-4" style={{ color: SLATE }}>Impact of reducing by 1 site below contract</p>
              <div className="flex gap-6 mb-4">
                <div>
                  <div className="text-3xl font-bold" style={{ color: AMBER }}>{WHATIF_DATA.nineSites.totalUncovered}</div>
                  <div className="text-xs" style={{ color: SLATE }}>Patients Affected</div>
                </div>
                <div>
                  <div className="text-3xl font-bold" style={{ color: NAVY }}>{WHATIF_DATA.nineSites.daysAffected}</div>
                  <div className="text-xs" style={{ color: SLATE }}>Days Impacted</div>
                </div>
                <div>
                  <div className="text-3xl font-bold" style={{ color: NAVY }}>
                    {Math.round(WHATIF_DATA.nineSites.daysAffected / SUMMARY.totalWeekdays * 100)}%
                  </div>
                  <div className="text-xs" style={{ color: SLATE }}>Of Weekdays</div>
                </div>
              </div>
              <div className="text-xs font-semibold uppercase mb-2" style={{ color: SLATE }}>Sample Affected Cases</div>
              <div className="space-y-1">
                {WHATIF_DATA.nineSites.samples.slice(0, 5).map((s, i) => (
                  <div key={i} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: LIGHT_BG, color: NAVY }}>
                    {formatDate(s.date)} &middot; {s.procedure} <span style={{ color: SLATE }}>({s.siteType})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border-l-4 border border-border shadow-sm overflow-hidden"
            style={{ borderLeftColor: RED }}>
            <div className="p-6">
              <h3 className="text-lg font-bold mb-1" style={{ color: NAVY_DEEP }}>What if only 8 sites?</h3>
              <p className="text-sm mb-4" style={{ color: SLATE }}>Impact of reducing by 2 sites below contract</p>
              <div className="flex gap-6 mb-4">
                <div>
                  <div className="text-3xl font-bold" style={{ color: RED }}>{WHATIF_DATA.eightSites.totalUncovered}</div>
                  <div className="text-xs" style={{ color: SLATE }}>Patients Affected</div>
                </div>
                <div>
                  <div className="text-3xl font-bold" style={{ color: NAVY }}>{WHATIF_DATA.eightSites.daysAffected}</div>
                  <div className="text-xs" style={{ color: SLATE }}>Days Impacted</div>
                </div>
                <div>
                  <div className="text-3xl font-bold" style={{ color: NAVY }}>
                    {Math.round(WHATIF_DATA.eightSites.daysAffected / SUMMARY.totalWeekdays * 100)}%
                  </div>
                  <div className="text-xs" style={{ color: SLATE }}>Of Weekdays</div>
                </div>
              </div>
              <div className="text-xs font-semibold uppercase mb-2" style={{ color: SLATE }}>Sample Affected Cases</div>
              <div className="space-y-1">
                {WHATIF_DATA.eightSites.samples.slice(0, 5).map((s, i) => (
                  <div key={i} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: LIGHT_BG, color: NAVY }}>
                    {formatDate(s.date)} &middot; {s.procedure} <span style={{ color: SLATE }}>({s.siteType})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Concurrent Analysis ───────────────────────────────────── */}
        <SectionHeader id="concurrent" title="Concurrent Analysis" icon={Activity}
          subtitle="Average simultaneous sites in use throughout the operating day" />

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
              <AreaChart data={CONCURRENT_HEATMAP} margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
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
            Averaged across {ANALYSIS_META.weekdayCount} weekdays. Buffered = 30 min pre-case + 15 min post-case site commitment.
          </p>
        </div>

        {/* ── De-identified Case Log ────────────────────────────────── */}
        <SectionHeader id="caselog" title="De-identified Case Log" icon={FileText}
          subtitle={`All ${CASE_LOG.length.toLocaleString()} non-L&D cases — patient names, encounter numbers, and surgeon identifiers removed`} />

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
              Page {casePage + 1} of {totalCasePages} ({filteredCases.length.toLocaleString()} cases)
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

        {/* ── Methodology ───────────────────────────────────────────── */}
        <SectionHeader id="methodology" title="Methodology" icon={BookOpen}
          subtitle="Algorithm design, definitions, and data sources" />

        <div className="bg-white rounded-xl border border-border shadow-sm mb-8 overflow-hidden">
          <button onClick={() => setMethodOpen(!methodOpen)}
            className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
            <div>
              <h3 className="text-lg font-bold" style={{ color: NAVY_DEEP }}>
                Interval Partitioning Algorithm &amp; Analysis Framework
              </h3>
              <p className="text-sm" style={{ color: SLATE }}>
                Click to {methodOpen ? 'collapse' : 'expand'} the full methodology explanation
              </p>
            </div>
            {methodOpen ? <ChevronUp size={20} color={SLATE} /> : <ChevronDown size={20} color={SLATE} />}
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
                <h4 className="font-bold mb-2" style={{ color: NAVY_DEEP }}>The Interval Partitioning Algorithm</h4>
                <p className="text-sm leading-relaxed mb-3" style={{ color: NAVY }}>
                  We use the classic greedy interval partitioning algorithm to compute the minimum number of
                  simultaneous sites needed. Each anesthesia case defines a time interval [start, end]. The algorithm
                  sorts cases by start time and assigns each to the earliest-available site using a min-heap.
                  The result equals the maximum number of overlapping intervals at any point &mdash; this is provably
                  optimal (it equals the maximum clique in the interval graph).
                </p>
                <div className="p-4 rounded-lg text-sm font-mono" style={{ backgroundColor: NAVY_DEEP, color: GOLD_LIGHT }}>
                  <pre className="whitespace-pre-wrap text-xs">{`# Pseudocode
sort cases by start time
heap = []  # min-heap of (end_time, site_id)
sites_used = 0

for each case (start, end):
  if heap is not empty AND heap[0].end <= start:
    reuse earliest-finishing site
  else:
    sites_used += 1
    open new site
  push (end, site_id) to heap

return sites_used  # = minimum concurrent sites needed`}</pre>
                </div>
              </div>
              <div>
                <h4 className="font-bold mb-2" style={{ color: NAVY_DEEP }}>Buffer Times</h4>
                <p className="text-sm leading-relaxed" style={{ color: NAVY }}>
                  Each case &ldquo;commits&rdquo; a site for <strong>[anesthesia_start - 30 min, anesthesia_end + 15 min]</strong>.
                  The 30-minute pre-case buffer accounts for room setup, patient positioning, and line placement.
                  The 15-minute post-case buffer accounts for emergence, transport, and room turnover.
                  These buffers are conservative &mdash; actual site commitment is often longer.
                </p>
              </div>
              <div>
                <h4 className="font-bold mb-2" style={{ color: NAVY_DEEP }}>Data Sources</h4>
                <ul className="text-sm space-y-2" style={{ color: NAVY }}>
                  <li><strong>Case Data:</strong> Graphium EMR Case Detail export, {ANALYSIS_META.dateRange}. {ANALYSIS_META.totalNonLdCases.toLocaleString()} non-L&amp;D cases across {ANALYSIS_META.weekdayCount} weekdays and {ANALYSIS_META.weekendCount} weekends.</li>
                  <li><strong>Schedule PDFs:</strong> 33 daily OR assignment schedules (Oct 1 &ndash; Nov 17, 2025), manually reviewed to count non-L&amp;D sites for cross-validation.</li>
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
