# Yarey Sanctuary: WHOOP Biomarker Engine
## Code-Level Implementation Summary

This document represents the **actual** logic and algorithm extracted directly from the Yarey codebase (`src/app/members/page.tsx`, `src/lib/biomarker/analysis.ts`, and `src/app/api/biomarker/analyze/route.ts`).

---

### 1. The 14-Day Mirror (Baseline Algorithm)
The system calculates a "Mirror" of the guest's biological state using a 14-day rolling window of WHOOP data.

*   **Baseline Metrics**: The arithmetic mean of HRV, RHR, Deep Sleep (SWS), Respiratory Rate, and Sleep Midpoint over the last 14 days.
*   **Comparison Engine**: The current "Intake Scan" metrics are compared against this 14-day mean to calculate **Deltas** (percentage for HRV/Sleep, absolute for others).

---

### 2. Pillar Assignment Logic (Priority Based)
The algorithm assigns one of 5 "Pathological Pillars" based on which metric shows the most significant negative deviation from the baseline.

| Pillar | Trigger Condition (Delta) | Logic Context |
| :--- | :--- | :--- |
| **Pillar 1: Nervous System** | HRV drop > 15% (`deltas.hrv < -0.15`) | Detection of sympathetic dominance. |
| **Pillar 2: Physical Repair** | Deep Sleep drop > 20% (`deltas.deepSleep < -0.20`) | Detection of impaired physical recovery. |
| **Pillar 5: Circadian** | Timing shift > 180 mins (`deltas.sleepTiming > 180`) | Detection of significant rhythm disruption. |
| **Pillar 4: Respiratory** | Rate increase > 1.0 bpm (`deltas.respRate > 1.0`) | Detection of metabolic or immune stress. |
| **Pillar 3: Resilience** | No triggers hit (Fallback) | "Metrics stable. Optimization mode." |

---

### 3. Wellness Score Weights
The single "Wellness Score" (0-100) visible to the guest is a weighted calculation:
1.  **HRV (40%)**: Normalized against a range of [20ms - 100ms].
2.  **RHR (30%)**: Normalized against a range of [90 BPM - 40 BPM] (Lower is better).
3.  **Deep Sleep (30%)**: Normalized against a target of 120 minutes (Base 30m).

---

### 4. Prescriptive Protocol Pool (Double Filter Architecture)
The Logic strictly follows: **"The Pillar chooses the REMEDY, The Metrics choose the INTENSITY."**

#### **Filter A: The Direction (Pillar-Driven)**
The specific treatment type is selected entirely by the assigned Pillar.

| Component | Nervous System | Physical Repair | Circadian / Metabolic |
| :--- | :--- | :--- | :--- |
| **Manual** | Vagus Nerve Stimulation | Deep Tissue & Percussion | Lymphatic / Myofascial |
| **IV Drip** | **Neuro-Calm** (Mg/B12) | **Mito-Charge** (NAD+) | **Deep Sleep** (Glycine) |
| **Elixir** | **The Grounding** (Ashwagandha) | **The Flame** (Turmeric) | **The Sedative** (Reishi) |
| **Lifestyle** | Physiological Sighs | Mobility / Recovery | Sleep Hygiene Protocol |

#### **Filter B: The Brakes (Metric-Driven)**
Daily biological capacity determines if the treatment is safe or needs modification.

| Condition | Metric Threshold | Safety Override Applied |
| :--- | :--- | :--- |
| **Fragile Heart** | HRV < 30ms | **Force "Soft Restore"** Contrast Therapy (No Ice Bath). |
| **Sympathetic Stress** | RHR > 70 bpm | **Slow Drip Rate** (IV) & **Modified Pressure** (Massage). |
| **Severe Fatigue** | Deep Sleep < 45m | *Internal Flag for staff awareness.* |

---
*Technical Summary generated from Project Source Code - v2.1 (Optimized Architecture)*
