# Yarey Sanctuary: Technical Specification (Low-Level)

This low-level guide details the exact code structures, types, and logic flow used in the Yarey Biomarker Engine (v2.1). Use this context to train AI assistants or onboard developers.

---

## 1. Data Structures (Interfaces)

**Source File**: `src/lib/biomarker/analysis.ts`

```typescript
// The atomic unit of physiological data
export interface BiometricData {
    hrv: number;          // Heart Rate Variability (ms)
    rhr: number;          // Resting Heart Rate (bpm)
    deepSleep: number;    // Slow Wave Sleep (minutes)
    respRate: number;     // Respiratory Rate (breaths/min)
    sleepMidpoint: number;// Minutes from midnight (e.g. 180 = 3:00 AM)
}

// The output of the 14-Day Mirror Analysis
export interface AnalysisResult {
    pillarId: 1 | 2 | 3 | 4 | 5;
    pillarName: string;   // e.g. "Nervous System", "Physical Repair"
    trigger: string;      // Description of the trigger (e.g. "HRV dropped by 20%")
    metrics: {
        baseline: BiometricData; // 14-Day Average
        current: BiometricData;  // Today's Intake
        deltas: Partial<BiometricData>; // Percentage change
    };
}
```

---

## 2. Core Algorithm: `analyzeSession`

**Source File**: `src/lib/biomarker/analysis.ts`
**Goal**: Determine the `pillarId`.

**Logic Flow**:
1.  **Calculate Baselines**: `mean(last_14_days)` for all metrics.
2.  **Calculate Deltas**: `(current - baseline) / baseline`.
3.  **Priority Waterfall (If/Else Chain)**:
    *   **IF** `delta.hrv < -0.15` (15% drop) → **Pillar 1 (Nervous System)**.
    *   **ELSE IF** `delta.deepSleep < -0.20` (20% drop) → **Pillar 2 (Physical Repair)**.
    *   **ELSE IF** `delta.sleepTiming > 180` (3hr shift) → **Pillar 5 (Circadian)**.
    *   **ELSE IF** `delta.respRate > 1.0` (Absolute rise) → **Pillar 4 (Respiratory)**.
    *   **ELSE** → **Pillar 3 (Resilience)**.

---

## 3. Protocol Generation: `generateProtocol`

**Source File**: `src/lib/biomarker/protocol-engine.ts`
**Goal**: Map `pillarName` + `metrics` to specific Treatments.

**Helper Flags (Safety Checks)**:
```typescript
const isFragile = metrics.hrv < 30;
const isStressed = metrics.rhr > 70;
const isDepleted = metrics.deepSleep < 45;
```

**Treatment Logic Map**:

### A. Manual Therapy
*   **Selection (By Pillar)**:
    *   Nervous System → `Vagus Nerve Stimulation`
    *   Physical Repair → `Deep Tissue & Percussion`
    *   Metabolic Reset → `Lymphatic Drainage`
    *   Default → `Myofascial Release`
*   **Modifier (By Metric)**:
    *   IF `isStressed` → Adds tag `"Modified Pressure (High RHR)"`

### B. Contrast Therapy
*   **Selection (By Pillar)**:
    *   Physical Repair → `Viking Protocol` (100°C / 4°C)
    *   Default → `Standard Contrast` (80°C / 15°C)
*   **SAFETY OVERRIDE (By Metric)**:
    *   IF `isFragile` (`HRV < 30`) → **FORCE** `Soft Restore` (60°C / No Cold).

### C. IV Prescription
*   **Selection (By Pillar)**:
    *   Nervous System → `Neuro-Calm` (Mg/B12)
    *   Physical Repair → `Mito-Charge` (NAD+)
    *   Circadian → `Deep Sleep` (Glycine)
    *   Default → `Immune Repair` (Vit C)
*   **Modifier (By Metric)**:
    *   IF `isStressed` (`RHR > 70`) → Adds tag `"Slow Drip Rate"`

---

## 4. Hardware Simulation (Demo Mode)

**Source File**: `src/lib/biomarker/analysis.ts` -> `simulateAnalysis`

For demonstration without a real device, the client-side code replicates a simplified version of `analyzeSession` using assumed averages:
```typescript
export function simulateAnalysis(metrics: any): string {
    // Assumptions: Avg HRV=50, DeepSleep=60m
    const deltas = { hrv: (hrv - 50)/50, deepSleep: (deepSleep - 60)/60 };

    if (deltas.hrv < -0.20) return "Nervous System";
    else if (deltas.deepSleep < -0.20) return "Physical Repair";
    // ...
    return "Resilience"; 
}
```

---

## 5. API Endpoints

*   **POST** `/api/biomarker/analyze`: Performs the 14-day analysis. Returns `{ result: AnalysisResult, sessionId }`.
*   **GET** `/api/whoop/metrics`: (Legacy) Fetches raw metrics.
*   **GET** `/api/whoop/auth`: Initiates OAuth.
*   **GET** `/api/whoop/callback`: Handles OAuth code exchange.

---
*Technical Context for AI Update - v2.1*
