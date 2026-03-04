# Yarey Sanctuary System: Architecture & Logic Guide

## 1. Core Philosophy
The Yarey Engine determines personalized wellness protocols by answering two fundamental physiological questions:
1.  **"What does the guest need?"** (Determined by deviation from their 14-day baseline).
2.  **"What can the guest handle?"** (Determined by their absolute capacity today).

---

## 2. System Architecture (Data Flow)

The system follows a linear, deterministic flow to ensure medical safety and consistency.

### **Step 1: Bio-Ingestion (The Intake)**
*   **Source**: WHOOP API (v2) via OAuth2.
*   **Data Points**: The system fetches two datasets:
    *   **The Mirror**: 14 days of historical sleep & recovery data.
    *   **The Snapshot**: The current day's primary metrics (HRV, RHR, SWS, Resp Rate).
*   **Fallback**: If no device is connected, the simulation engine allows manual entry or demo-mode generation.

### **Step 2: The Mirror Analysis (The Brain)**
*   **Baseline Calculation**: Computes the arithmetic mean of the last 14 days.
*   **Delta Detection**: Compares *Today* vs. *Baseline* to calculate percentage shifts.
*   **Pillar Assignment**: The system selects the "Dominant Pathology" based on the largest negative deviation.

| Criticality Priority | Trigger Condition | Assigned Pillar | Meaning |
| :--- | :--- | :--- | :--- |
| **1. Highest** | HRV drop > 15% | **Nervous System** | Sympathetic Dominance / Stress |
| **2. High** | Deep Sleep drop > 20% | **Physical Repair** | Lack of Structural Recovery |
| **3. Medium** | Sleep Timing shift > 3hr | **Circadian** | Rhythm Disruption / Jetlag |
| **4. Low** | Resp Rate spike > 1.0 | **Respiratory** | Metabolic/Immune Load |
| **5. Base** | No triggers | **Resilience** | Optimized State |

### **Step 3: Protocol Generation (The Prescription)**
The system applies a **Double-Filter Logic** to generate the 5-step ritual.

#### **Filter A: The Remedy (Choice of Modality)**
*Selected strictly by the assigned Pillar.*

| Component | Nervous System | Physical Repair | Circadian | Resilience |
| :--- | :--- | :--- | :--- | :--- |
| **Manual** | Vagus Nerve Stimulation | Deep Tissue | Myofascial | Myofascial |
| **IV Drip** | Neuro-Calm (Mg/B12) | Mito-Charge (NAD+) | Deep Sleep (Glycine) | Immune Repair |
| **Elixir** | The Grounding | The Flame | The Sedative | The Clarity |
| **Lifestyle** | Physiological Sighs | Mobility | Sleep Hygiene | Sunlight |

#### **Filter B: The Brakes (Safety Overrides)**
*Selected strictly by absolute metric capacity on the day of service.*

| Metric Threshold | Safety Action Applied |
| :--- | :--- |
| **Fragile Heart** (HRV < 30ms) | **Contrast Adjustment**: Force "Soft Restore" (No Ice Bath). |
| **High Stress** (RHR > 70 bpm) | **Massage Adjustment**: Use "Modified Pressure".<br>**IV Adjustment**: Use "Slow Drip Rate". |

---

## 3. Technical Implementation Stack
*   **Frontend**: Next.js 14 (App Router)
*   **Language**: TypeScript (Strict)
*   **Database**: Google Firestore (NoSQL)
*   **Auth**: Custom OAuth handler for WHOOP
*   **Hosting**: Firebase Hosting & Functions

---
*Documentation generated for Yarey Wellness Sanctuary - v2.1*
