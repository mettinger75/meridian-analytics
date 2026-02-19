#!/usr/bin/env python3
"""
Export MCA analysis data as a TypeScript file for the Meridian Analytics site.
De-identifies all PHI from the Graphium case detail export.
"""

import json
import heapq
from datetime import datetime, timedelta
from pathlib import Path
import openpyxl

# ── Configuration ───────────────────────────────────────────────────────
EXCEL_PATH = "/Users/markettinger/My Drive (markettingermd@gmail.com)/Downloads/Case Detail (1).xlsx"
JSON_PATH = "/tmp/mca_site_analysis_v2.json"
OUTPUT_PATH = Path(__file__).parent.parent / "app" / "data" / "analysis-data.ts"

PRE_CASE_BUFFER_MIN = 30
POST_CASE_BUFFER_MIN = 15
NON_LD_CONTRACT_SITES = 10
WORKDAY_START_HOUR = 7
WORKDAY_END_HOUR = 19

# Cross-validation data from manual PDF review (Oct 1 - Nov 17)
CROSS_VALIDATION_RAW = {
    "2025-10-01": 10, "2025-10-02": 9,  "2025-10-03": 10,
    "2025-10-06": 12, "2025-10-07": 10, "2025-10-08": 11,
    "2025-10-09": 10, "2025-10-10": 10, "2025-10-13": 11,
    "2025-10-14": 10, "2025-10-20": 8,  "2025-10-21": 11,
    "2025-10-22": 10, "2025-10-23": 10, "2025-10-24": 11,
    "2025-10-27": 11, "2025-10-28": 10, "2025-10-29": 11,
    "2025-10-30": 13, "2025-10-31": 11, "2025-11-03": 12,
    "2025-11-04": 10, "2025-11-05": 11, "2025-11-06": 10,
    "2025-11-07": 10, "2025-11-10": 12, "2025-11-11": 9,
    "2025-11-12": 11, "2025-11-13": 10, "2025-11-17": 10,
}

# ── Helpers ──────────────────────────────────────────────────────────────

def classify_site(form_title: str, procedure: str) -> str:
    ft = (form_title or "").lower()
    pr = (procedure or "").lower()
    if any(k in ft for k in ["labor", "l&d", "epidural", "ob "]):
        return "L&D"
    if any(k in ft for k in ["labor", "l&d", "epidural", "ob "]):
        return "L&D"
    if any(k in pr for k in ["labor epidural", "labor analgesia", "epidural placement"]):
        return "L&D"
    if any(k in ft for k in ["cardiac", "cath"]) or any(k in pr for k in ["cabg", "avr", "mvr", "sternotomy", "bypass", "valve", "tee", "pacemaker", "icd", "ablation", "heart cath", "stent", "angioplasty", "bi-v"]):
        return "Cardiac/Cath Lab"
    if any(k in ft for k in ["gi ", "endo"]) or any(k in pr for k in ["egd", "ercp", "colonoscopy", "gi case", "gi x", "eus", "bronch", "ion bronch", "ebus"]):
        return "GI"
    if any(k in pr for k in ["ir ", "interventional", "embolization", "angiogram"]):
        return "IR"
    if any(k in ft for k in ["mac", "short"]):
        return "Short/MAC"
    return "OR"

def parse_datetime(val):
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    try:
        return datetime.strptime(str(val).strip(), "%Y-%m-%d %H:%M:%S")
    except:
        return None

def minimum_sites_needed(intervals):
    """Interval partitioning via greedy + min-heap. Returns count."""
    if not intervals:
        return 0
    indexed = sorted(enumerate(intervals), key=lambda x: (x[1][0], x[1][1]))
    heap = []
    next_site_id = 0
    for _, (start, end) in indexed:
        if heap and heap[0][0] <= start:
            heapq.heappop(heap)
        else:
            next_site_id += 1
        heapq.heappush(heap, (end,))
    return next_site_id


# ── Step 1: Parse and de-identify case data ─────────────────────────────

print("Reading Excel file...")
wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True)
ws = wb.active

cases = []
case_num = 0
for row_idx, row in enumerate(ws.iter_rows(min_row=2)):
    vals = [cell.value for cell in row]
    if len(vals) < 16:
        continue

    form_title = str(vals[8] or "")
    procedure = str(vals[7] or "")
    dos_raw = vals[9]
    anes_start_raw = vals[10]
    anes_end_raw = vals[15]

    dos = parse_datetime(dos_raw)
    anes_start = parse_datetime(anes_start_raw)
    anes_end = parse_datetime(anes_end_raw)

    if not dos or not anes_start or not anes_end:
        continue
    if anes_end <= anes_start:
        continue

    site_type = classify_site(form_title, procedure)
    if site_type == "L&D":
        continue

    case_num += 1
    duration_mins = round((anes_end - anes_start).total_seconds() / 60)

    cases.append({
        "caseNum": case_num,
        "date": dos.strftime("%Y-%m-%d"),
        "startTime": anes_start.strftime("%H:%M"),
        "endTime": anes_end.strftime("%H:%M"),
        "durationMins": duration_mins,
        "siteType": site_type,
        "procedure": procedure[:60],
        "formTitle": form_title,
        # Keep raw datetimes for concurrent analysis
        "_start": anes_start,
        "_end": anes_end,
    })

wb.close()
print(f"  Parsed {case_num} non-L&D cases")

# ── Step 2: Compute concurrent heatmap ──────────────────────────────────

print("Computing concurrent heatmap...")
# Group cases by date
from collections import defaultdict
cases_by_date = defaultdict(list)
for c in cases:
    cases_by_date[c["date"]].append(c)

# Get weekday dates
weekday_dates = []
for d in sorted(cases_by_date.keys()):
    dt = datetime.strptime(d, "%Y-%m-%d")
    if dt.weekday() < 5:  # Mon-Fri
        weekday_dates.append(d)

# For each 15-min slot from 7:00 to 19:00, count concurrent cases (with buffers)
slots = []
for h in range(WORKDAY_START_HOUR, WORKDAY_END_HOUR):
    for m in [0, 15, 30, 45]:
        slots.append((h, m))

concurrent_totals = {f"{h:02d}:{m:02d}": [] for h, m in slots}
concurrent_totals_nobuf = {f"{h:02d}:{m:02d}": [] for h, m in slots}

for d in weekday_dates:
    day_cases = cases_by_date[d]
    for h, m in slots:
        slot_time = datetime.strptime(f"{d} {h:02d}:{m:02d}:00", "%Y-%m-%d %H:%M:%S")
        # With buffers
        count_buf = 0
        count_nobuf = 0
        for c in day_cases:
            buf_start = c["_start"] - timedelta(minutes=PRE_CASE_BUFFER_MIN)
            buf_end = c["_end"] + timedelta(minutes=POST_CASE_BUFFER_MIN)
            if buf_start <= slot_time < buf_end:
                count_buf += 1
            if c["_start"] <= slot_time < c["_end"]:
                count_nobuf += 1
        key = f"{h:02d}:{m:02d}"
        concurrent_totals[key].append(count_buf)
        concurrent_totals_nobuf[key].append(count_nobuf)

heatmap_data = []
for h, m in slots:
    key = f"{h:02d}:{m:02d}"
    vals_buf = concurrent_totals[key]
    vals_nobuf = concurrent_totals_nobuf[key]
    heatmap_data.append({
        "time": key,
        "avgConcurrent": round(sum(vals_nobuf) / len(vals_nobuf), 1) if vals_nobuf else 0,
        "maxConcurrent": max(vals_nobuf) if vals_nobuf else 0,
        "avgConcurrentBuffered": round(sum(vals_buf) / len(vals_buf), 1) if vals_buf else 0,
        "maxConcurrentBuffered": max(vals_buf) if vals_buf else 0,
    })

# Compute per-month concurrent heatmaps
print("Computing per-month concurrent heatmaps...")
months = ["10", "11", "12"]
heatmap_by_month = {}
for month in months:
    month_dates = [d for d in weekday_dates if d[5:7] == month]
    if not month_dates:
        heatmap_by_month[month] = []
        continue
    month_heatmap = []
    for h, m in slots:
        key = f"{h:02d}:{m:02d}"
        slot_buf_vals = []
        slot_nobuf_vals = []
        for d in month_dates:
            day_cases = cases_by_date[d]
            slot_time = datetime.strptime(f"{d} {h:02d}:{m:02d}:00", "%Y-%m-%d %H:%M:%S")
            count_buf = 0
            count_nobuf = 0
            for c in day_cases:
                buf_start = c["_start"] - timedelta(minutes=PRE_CASE_BUFFER_MIN)
                buf_end = c["_end"] + timedelta(minutes=POST_CASE_BUFFER_MIN)
                if buf_start <= slot_time < buf_end:
                    count_buf += 1
                if c["_start"] <= slot_time < c["_end"]:
                    count_nobuf += 1
            slot_buf_vals.append(count_buf)
            slot_nobuf_vals.append(count_nobuf)
        month_heatmap.append({
            "time": key,
            "avgConcurrent": round(sum(slot_nobuf_vals) / len(slot_nobuf_vals), 1) if slot_nobuf_vals else 0,
            "maxConcurrent": max(slot_nobuf_vals) if slot_nobuf_vals else 0,
            "avgConcurrentBuffered": round(sum(slot_buf_vals) / len(slot_buf_vals), 1) if slot_buf_vals else 0,
            "maxConcurrentBuffered": max(slot_buf_vals) if slot_buf_vals else 0,
        })
    heatmap_by_month[month] = month_heatmap

print(f"  Computed {len(heatmap_data)} time slots (all), plus 3 monthly heatmaps")

# ── Step 3: Load algorithm results JSON ─────────────────────────────────

print("Loading algorithm JSON...")
with open(JSON_PATH) as f:
    algo_data = json.load(f)

meta = algo_data["meta"]
summary = algo_data["summary"]
min_sites = algo_data["min_sites"]
site_minutes = algo_data["site_minutes"]
whatif_8 = algo_data["whatif_8"]
whatif_9 = algo_data["whatif_9"]

# Build daily analysis array (with per-day what-if data)
daily_analysis = []
for d in sorted(min_sites.keys()):
    ms = min_sites[d]
    sm = site_minutes.get(d, {})
    w9 = whatif_9.get(d, {})
    w8 = whatif_8.get(d, {})
    daily_analysis.append({
        "date": d,
        "dow": ms["dow"],
        "isWeekday": ms["is_weekday"],
        "isHoliday": ms.get("is_holiday", False),
        "totalCases": ms["total_cases"],
        "minSitesWithBuffers": ms["min_sites_with_buffers"],
        "minSitesNoBuffers": ms["min_sites_no_buffers"],
        "committedMins": sm.get("committed_minutes", 0),
        "capacityMins": sm.get("capacity_minutes", 7200),
        "utilizationPct": sm.get("utilization_pct", 0),
        "whatif9Uncovered": w9.get("uncovered_count", 0),
        "whatif8Uncovered": w8.get("uncovered_count", 0),
    })

# Build what-if data
whatif_9_total = sum(v.get("uncovered_count", 0) for v in whatif_9.values())
whatif_8_total = sum(v.get("uncovered_count", 0) for v in whatif_8.values())
whatif_9_days = sum(1 for v in whatif_9.values() if v.get("uncovered_count", 0) > 0)
whatif_8_days = sum(1 for v in whatif_8.values() if v.get("uncovered_count", 0) > 0)

# Collect sample uncovered procedures for what-if (all months)
whatif_9_samples = []
whatif_8_samples = []
for d in sorted(whatif_9.keys()):
    for uc in whatif_9[d].get("uncovered_cases", [])[:3]:
        if len(whatif_9_samples) < 20:
            whatif_9_samples.append({
                "date": d,
                "procedure": uc.get("procedure", "")[:50],
                "siteType": uc.get("site_type", "OR"),
                "start": uc.get("start", ""),
                "end": uc.get("end", ""),
            })
for d in sorted(whatif_8.keys()):
    for uc in whatif_8[d].get("uncovered_cases", [])[:3]:
        if len(whatif_8_samples) < 20:
            whatif_8_samples.append({
                "date": d,
                "procedure": uc.get("procedure", "")[:50],
                "siteType": uc.get("site_type", "OR"),
                "start": uc.get("start", ""),
                "end": uc.get("end", ""),
            })

# Build cross-validation array
cross_validation = []
for d in sorted(min_sites.keys()):
    ms = min_sites[d]
    if not ms["is_weekday"]:
        continue
    sched = CROSS_VALIDATION_RAW.get(d)
    cross_validation.append({
        "date": d,
        "dow": ms["dow"],
        "totalCases": ms["total_cases"],
        "algorithmMinSites": ms["min_sites_with_buffers"],
        "algorithmMinSitesNoBuf": ms["min_sites_no_buffers"],
        "scheduledSites": sched,
    })

# ── Step 4: Write TypeScript output ─────────────────────────────────────

print("Writing TypeScript output...")

# Remove internal datetime fields from case log
case_log_clean = []
for c in cases:
    case_log_clean.append({
        "caseNum": c["caseNum"],
        "date": c["date"],
        "startTime": c["startTime"],
        "endTime": c["endTime"],
        "durationMins": c["durationMins"],
        "siteType": c["siteType"],
        "procedure": c["procedure"],
        "formTitle": c["formTitle"],
    })

ts_content = '''// Auto-generated by scripts/export-data.py
// DO NOT EDIT MANUALLY — all PHI has been removed
// Generated: ''' + datetime.now().strftime("%Y-%m-%d %H:%M") + '''

// ── Types ──────────────────────────────────────────────────────────────

export interface DailyAnalysisRow {
  date: string;
  dow: string;
  isWeekday: boolean;
  isHoliday: boolean;
  totalCases: number;
  minSitesWithBuffers: number;
  minSitesNoBuffers: number;
  committedMins: number;
  capacityMins: number;
  utilizationPct: number;
  whatif9Uncovered: number;
  whatif8Uncovered: number;
}

export interface ConcurrentSlot {
  time: string;
  avgConcurrent: number;
  maxConcurrent: number;
  avgConcurrentBuffered: number;
  maxConcurrentBuffered: number;
}

export interface CaseLogEntry {
  caseNum: number;
  date: string;
  startTime: string;
  endTime: string;
  durationMins: number;
  siteType: string;
  procedure: string;
  formTitle: string;
}

export interface WhatIfSample {
  date: string;
  procedure: string;
  siteType: string;
  start: string;
  end: string;
}

export interface CrossValidationRow {
  date: string;
  dow: string;
  totalCases: number;
  algorithmMinSites: number;
  algorithmMinSitesNoBuf: number;
  scheduledSites: number | null;
}

// ── Data ───────────────────────────────────────────────────────────────

export const ANALYSIS_META = ''' + json.dumps({
    "facility": "Medical City Arlington",
    "facilityCode": "MCA",
    "dateRange": meta["date_range"],
    "totalNonLdCases": meta["total_non_ld_cases"],
    "ldExcluded": meta["ld_excluded"],
    "weekdayCount": meta["weekday_count"],
    "weekendCount": meta["weekend_count"],
    "preCaseBufferMin": PRE_CASE_BUFFER_MIN,
    "postCaseBufferMin": POST_CASE_BUFFER_MIN,
    "contractSites": NON_LD_CONTRACT_SITES,
    "analysisDate": datetime.now().strftime("%Y-%m-%d"),
}, indent=2) + ''' as const;

export const SUMMARY = ''' + json.dumps({
    "avgWeekdayCases": summary["avg_weekday_cases"],
    "avgWeekdayCommittedMins": summary["avg_weekday_committed_mins"],
    "avgMinSitesNeeded": summary["avg_min_sites_needed"],
    "maxMinSitesNeeded": summary["max_min_sites_needed"],
    "daysNeeding10Plus": summary["days_needing_10plus"],
    "totalWeekdays": summary["total_weekdays"],
    "whatif9Uncovered": summary["whatif_9_uncovered"],
    "whatif8Uncovered": summary["whatif_8_uncovered"],
    "avgPeakConcurrent": summary["avg_peak_concurrent"],
}, indent=2) + ''' as const;

export const WHATIF_DATA = ''' + json.dumps({
    "nineSites": {
        "totalUncovered": whatif_9_total,
        "daysAffected": whatif_9_days,
        "samples": whatif_9_samples,
    },
    "eightSites": {
        "totalUncovered": whatif_8_total,
        "daysAffected": whatif_8_days,
        "samples": whatif_8_samples,
    },
}, indent=2) + ''' as const;

export const DAILY_ANALYSIS: DailyAnalysisRow[] = ''' + json.dumps(daily_analysis, indent=2) + ''';

export const CONCURRENT_HEATMAP: ConcurrentSlot[] = ''' + json.dumps(heatmap_data, indent=2) + ''';

export const CONCURRENT_HEATMAP_BY_MONTH: Record<string, ConcurrentSlot[]> = ''' + json.dumps(heatmap_by_month, indent=2) + ''';

export const CROSS_VALIDATION: CrossValidationRow[] = ''' + json.dumps(cross_validation, indent=2) + ''';

export const CASE_LOG: CaseLogEntry[] = ''' + json.dumps(case_log_clean, indent=2) + ''';
'''

OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
OUTPUT_PATH.write_text(ts_content)
print(f"  Written to {OUTPUT_PATH}")
print(f"  File size: {OUTPUT_PATH.stat().st_size / 1024:.0f} KB")
print(f"  Cases exported: {len(case_log_clean)}")
print(f"  Daily entries: {len(daily_analysis)}")
print(f"  Heatmap slots: {len(heatmap_data)}")
print(f"  Cross-validation rows: {len(cross_validation)}")

# Verify no PHI
content = OUTPUT_PATH.read_text()
phi_checks = ["KARIE", "BELL-87971", "I00983", "graphiumemr.com", "QUATTROCHI-64766"]
for check in phi_checks:
    if check in content:
        print(f"  WARNING: PHI detected: {check}")
    else:
        print(f"  OK: No '{check}' found")
print("\nDone!")
