#!/usr/bin/env python3
"""
Export MCA analysis data as a TypeScript file for the Meridian Analytics site.
De-identifies all PHI from the Graphium case detail exports.

Processes TWO quarters:
  - Q4 2025 (Oct-Dec): Case Detail (1).xlsx + mca_site_analysis_octdec2025.json
  - January 2026: Case Detail.xlsx + mca_site_analysis_jan2026.json
"""

import json
import heapq
from datetime import datetime, timedelta
from pathlib import Path
import openpyxl
from collections import defaultdict

# ── Configuration ───────────────────────────────────────────────────────

DATASETS = [
    {
        "label": "Q4 2025",
        "excel": "/Users/markettinger/My Drive (markettingermd@gmail.com)/Downloads/Case Detail (1).xlsx",
        "json": "/tmp/mca_site_analysis_octdec2025.json",
        "months": ["10", "11", "12"],
    },
    {
        "label": "Jan 2026",
        "excel": "/Users/markettinger/My Drive (markettingermd@gmail.com)/Downloads/Case Detail.xlsx",
        "json": "/tmp/mca_site_analysis_jan2026.json",
        "months": ["01"],
    },
]

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

def classify_site(form_title, procedure):
    ft = (form_title or "").lower()
    pr = (procedure or "").lower()
    if any(k in ft for k in ["labor", "l&d", "epidural", "ob "]):
        return "L&D"
    if any(k in pr for k in ["labor epidural", "labor analgesia", "epidural placement"]):
        return "L&D"
    if "ob c-section" in ft or "cesarean" in pr:
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

def parse_excel(excel_path, starting_case_num):
    """Parse and de-identify cases from an Excel file. Returns (cases, next_case_num)."""
    print(f"  Reading {excel_path}...")
    wb = openpyxl.load_workbook(excel_path, read_only=True)
    ws = wb.active
    cases = []
    case_num = starting_case_num
    ld_count = 0

    for row in ws.iter_rows(min_row=2):
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
            ld_count += 1
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
            "_start": anes_start,
            "_end": anes_end,
        })

    wb.close()
    print(f"    {len(cases)} non-L&D cases, {ld_count} L&D excluded")
    return cases, case_num

def compute_concurrent_heatmap(cases_by_date, date_list, slots):
    """Compute concurrent site heatmap for given dates."""
    heatmap = []
    for h, m in slots:
        key = f"{h:02d}:{m:02d}"
        vals_buf = []
        vals_nobuf = []
        for d in date_list:
            day_cases = cases_by_date.get(d, [])
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
            vals_buf.append(count_buf)
            vals_nobuf.append(count_nobuf)
        heatmap.append({
            "time": key,
            "avgConcurrent": round(sum(vals_nobuf) / len(vals_nobuf), 1) if vals_nobuf else 0,
            "maxConcurrent": max(vals_nobuf) if vals_nobuf else 0,
            "avgConcurrentBuffered": round(sum(vals_buf) / len(vals_buf), 1) if vals_buf else 0,
            "maxConcurrentBuffered": max(vals_buf) if vals_buf else 0,
        })
    return heatmap


# ── Main Processing ─────────────────────────────────────────────────────

all_cases = []
all_daily_analysis = []
all_whatif_9_samples = []
all_whatif_8_samples = []
all_cross_validation = []

# Track aggregate stats
total_weekdays = 0
total_weekday_cases = 0
total_weekday_min_sites_sum = 0
max_min_sites_ever = 0
total_days_ge10 = 0
total_whatif9 = 0
total_whatif8 = 0
total_whatif9_days = 0
total_whatif8_days = 0
total_weekday_committed = 0

case_num_offset = 0

print("=" * 60)
print("PROCESSING ALL DATASETS")
print("=" * 60)

for ds in DATASETS:
    print(f"\n--- {ds['label']} ---")

    # Parse Excel
    cases, case_num_offset = parse_excel(ds["excel"], case_num_offset)
    all_cases.extend(cases)

    # Load algorithm JSON
    print(f"  Loading {ds['json']}...")
    with open(ds["json"]) as f:
        algo_data = json.load(f)

    meta = algo_data["meta"]
    summary = algo_data["summary"]
    min_sites = algo_data["min_sites"]
    site_minutes = algo_data["site_minutes"]
    whatif_8 = algo_data["whatif_8"]
    whatif_9 = algo_data["whatif_9"]

    # Build daily analysis
    for d in sorted(min_sites.keys()):
        ms = min_sites[d]
        sm = site_minutes.get(d, {})
        w9 = whatif_9.get(d, {})
        w8 = whatif_8.get(d, {})
        all_daily_analysis.append({
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

    # Aggregate stats
    weekday_sites = [min_sites[d] for d in min_sites if min_sites[d]["is_weekday"]]
    total_weekdays += len(weekday_sites)
    total_weekday_cases += sum(ms["total_cases"] for ms in weekday_sites)
    total_weekday_min_sites_sum += sum(ms["min_sites_with_buffers"] for ms in weekday_sites)
    max_min_sites_ever = max(max_min_sites_ever, max(ms["min_sites_with_buffers"] for ms in weekday_sites) if weekday_sites else 0)
    total_days_ge10 += sum(1 for ms in weekday_sites if ms["min_sites_with_buffers"] >= 10)
    total_weekday_committed += sum(site_minutes.get(d, {}).get("committed_minutes", 0) for d in min_sites if min_sites[d]["is_weekday"])

    # What-if
    for d in sorted(whatif_9.keys()):
        w9 = whatif_9[d]
        total_whatif9 += w9.get("uncovered_count", 0)
        if w9.get("uncovered_count", 0) > 0:
            total_whatif9_days += 1
        for uc in w9.get("uncovered_cases", [])[:3]:
            if len(all_whatif_9_samples) < 30:
                all_whatif_9_samples.append({
                    "date": d,
                    "procedure": uc.get("procedure", "")[:50],
                    "siteType": uc.get("site_type", "OR"),
                    "start": uc.get("start", ""),
                    "end": uc.get("end", ""),
                })

    for d in sorted(whatif_8.keys()):
        w8 = whatif_8[d]
        total_whatif8 += w8.get("uncovered_count", 0)
        if w8.get("uncovered_count", 0) > 0:
            total_whatif8_days += 1
        for uc in w8.get("uncovered_cases", [])[:3]:
            if len(all_whatif_8_samples) < 30:
                all_whatif_8_samples.append({
                    "date": d,
                    "procedure": uc.get("procedure", "")[:50],
                    "siteType": uc.get("site_type", "OR"),
                    "start": uc.get("start", ""),
                    "end": uc.get("end", ""),
                })

    # Cross-validation (only applies to Oct-Nov schedule dates)
    for d in sorted(min_sites.keys()):
        ms = min_sites[d]
        if not ms["is_weekday"]:
            continue
        sched = CROSS_VALIDATION_RAW.get(d)
        all_cross_validation.append({
            "date": d,
            "dow": ms["dow"],
            "totalCases": ms["total_cases"],
            "algorithmMinSites": ms["min_sites_with_buffers"],
            "algorithmMinSitesNoBuf": ms["min_sites_no_buffers"],
            "scheduledSites": sched,
        })

    print(f"    {ds['label']}: {len(weekday_sites)} weekdays, avg {summary['avg_min_sites_needed']} sites")

# Sort everything by date
all_daily_analysis.sort(key=lambda x: x["date"])
all_cross_validation.sort(key=lambda x: x["date"])
all_cases.sort(key=lambda x: (x["date"], x["startTime"]))

# Re-number cases sequentially
for i, c in enumerate(all_cases, 1):
    c["caseNum"] = i

# ── Compute concurrent heatmaps ─────────────────────────────────────────

print("\nComputing concurrent heatmaps...")

cases_by_date = defaultdict(list)
for c in all_cases:
    cases_by_date[c["date"]].append(c)

weekday_dates = sorted([d for d in cases_by_date.keys() if datetime.strptime(d, "%Y-%m-%d").weekday() < 5])

slots = []
for h in range(WORKDAY_START_HOUR, WORKDAY_END_HOUR):
    for m in [0, 15, 30, 45]:
        slots.append((h, m))

# Overall heatmap
heatmap_data = compute_concurrent_heatmap(cases_by_date, weekday_dates, slots)

# Per-month heatmaps
all_months = ["10", "11", "12", "01"]
heatmap_by_month = {}
for month in all_months:
    month_dates = [d for d in weekday_dates if d[5:7] == month]
    if not month_dates:
        continue
    heatmap_by_month[month] = compute_concurrent_heatmap(cases_by_date, month_dates, slots)
    print(f"  Month {month}: {len(month_dates)} weekdays")

print(f"  Overall: {len(weekday_dates)} weekdays, {len(heatmap_data)} slots")

# ── Compute aggregate stats ─────────────────────────────────────────────

total_non_ld_cases = len(all_cases)
all_dates = sorted(set(c["date"] for c in all_cases))
date_range = f"{all_dates[0]} to {all_dates[-1]}"
weekday_count = len(weekday_dates)
weekend_count = len([d for d in set(c["date"] for c in all_cases) if datetime.strptime(d, "%Y-%m-%d").weekday() >= 5])
avg_min_sites = round(total_weekday_min_sites_sum / total_weekdays, 1) if total_weekdays > 0 else 0
avg_peak = round(max(s["avgConcurrentBuffered"] for s in heatmap_data), 1) if heatmap_data else 0
avg_weekday_cases = round(total_weekday_cases / total_weekdays, 1) if total_weekdays > 0 else 0
avg_weekday_committed = round(total_weekday_committed / total_weekdays) if total_weekdays > 0 else 0

print(f"\n=== AGGREGATE STATS ===")
print(f"  Total non-L&D cases: {total_non_ld_cases}")
print(f"  Date range: {date_range}")
print(f"  Weekdays: {total_weekdays}, Weekends: {weekend_count}")
print(f"  Avg min sites (weekdays): {avg_min_sites}")
print(f"  Max min sites: {max_min_sites_ever}")
print(f"  Days >= 10 sites: {total_days_ge10}/{total_weekdays} ({round(total_days_ge10/total_weekdays*100)}%)")
print(f"  What-if 9: {total_whatif9} patients, {total_whatif9_days} days")
print(f"  What-if 8: {total_whatif8} patients, {total_whatif8_days} days")

# ── Write TypeScript output ─────────────────────────────────────────────

print("\nWriting TypeScript output...")

case_log_clean = []
for c in all_cases:
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
// Includes: Q4 2025 (Oct-Dec) + January 2026

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
    "dateRange": date_range,
    "totalNonLdCases": total_non_ld_cases,
    "ldExcluded": True,
    "weekdayCount": weekday_count,
    "weekendCount": weekend_count,
    "preCaseBufferMin": PRE_CASE_BUFFER_MIN,
    "postCaseBufferMin": POST_CASE_BUFFER_MIN,
    "contractSites": NON_LD_CONTRACT_SITES,
    "analysisDate": datetime.now().strftime("%Y-%m-%d"),
}, indent=2) + ''' as const;

export const SUMMARY = ''' + json.dumps({
    "avgWeekdayCases": avg_weekday_cases,
    "avgWeekdayCommittedMins": avg_weekday_committed,
    "avgMinSitesNeeded": avg_min_sites,
    "maxMinSitesNeeded": max_min_sites_ever,
    "daysNeeding10Plus": total_days_ge10,
    "totalWeekdays": total_weekdays,
    "whatif9Uncovered": total_whatif9,
    "whatif8Uncovered": total_whatif8,
    "avgPeakConcurrent": avg_peak,
}, indent=2) + ''' as const;

export const WHATIF_DATA = ''' + json.dumps({
    "nineSites": {
        "totalUncovered": total_whatif9,
        "daysAffected": total_whatif9_days,
        "samples": all_whatif_9_samples,
    },
    "eightSites": {
        "totalUncovered": total_whatif8,
        "daysAffected": total_whatif8_days,
        "samples": all_whatif_8_samples,
    },
}, indent=2) + ''' as const;

export const DAILY_ANALYSIS: DailyAnalysisRow[] = ''' + json.dumps(all_daily_analysis, indent=2) + ''';

export const CONCURRENT_HEATMAP: ConcurrentSlot[] = ''' + json.dumps(heatmap_data, indent=2) + ''';

export const CONCURRENT_HEATMAP_BY_MONTH: Record<string, ConcurrentSlot[]> = ''' + json.dumps(heatmap_by_month, indent=2) + ''';

export const CROSS_VALIDATION: CrossValidationRow[] = ''' + json.dumps(all_cross_validation, indent=2) + ''';

export const CASE_LOG: CaseLogEntry[] = ''' + json.dumps(case_log_clean, indent=2) + ''';
'''

OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
OUTPUT_PATH.write_text(ts_content)
print(f"  Written to {OUTPUT_PATH}")
print(f"  File size: {OUTPUT_PATH.stat().st_size / 1024:.0f} KB")
print(f"  Cases exported: {len(case_log_clean)}")
print(f"  Daily entries: {len(all_daily_analysis)}")
print(f"  Heatmap slots: {len(heatmap_data)}")
print(f"  Cross-validation rows: {len(all_cross_validation)}")

# Verify no PHI
content = OUTPUT_PATH.read_text()
phi_checks = ["KARIE", "BELL-87971", "I00983", "graphiumemr.com", "QUATTROCHI-64766"]
for check in phi_checks:
    if check in content:
        print(f"  WARNING: PHI detected: {check}")
    else:
        print(f"  OK: No '{check}' found")
print("\nDone!")
