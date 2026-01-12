# Biomarker Inspector Protocol - Refinement Plan (v3: Research-Backed)

## Core Philosophy
**"The Pillar is the Foundation, The Biomarkers are the Blueprint."**
Recommendations are dynamically tailored based on specific metric deficits (HRV, Deep Sleep, RHR), moving beyond static text to personalized prescription.

---

## 5-Dimensional Protocol Structure (Research-Backed)

### 1. Manual Therapy (Massage)
*Tailored by: Muscle Tone & Stress Load*
- **Base**: Pillar-specific technique.
- **Dynamic Twist**: 
    - **High Muscle Tension / Pain**: Add "Percussive Therapy" & Myofascial Release.
    - **High Stress (Low HRV)**: Focus on "Vagus Nerve Stimulation" (Neck/Ear) & Cranial Sacral.
    - **Poor Circulation**: Lymphatic Drainage focus.

### 2. Contrast Therapy (Thermal)
*Tailored by: Autonomic Resilience (HRV)*
- **Research**: High intensity contrast is hormetic (stressful) and benefits those with high resilience. Low resilience requires gentle restoration.
- **Logic**:
    - **Fragile (HRV < 30ms)**: "Soft Restore" - Warm Sauna 60°C (15m) + Cool Air Rest (No cold plunge).
    - **Balanced (HRV 30-60ms)**: "Standard Contrast" - 80°C Sauna + 15°C Water (2 cycles).
    - **Robust (HRV > 60ms)**: "Viking Protocol" - 100°C Sauna + 4°C Ice Bath (3 cycles).

### 3. IV Drip Prescription
*Tailored by: Depletion Signals (RHR & Sleep)*
- **Research**: Sympathetic dominance depletes neurologic minerals; Fatigue requires mitochondrial support.
- **Menu**:
    - **"Neuro-Calm" (Low HRV/High Stress)**: Magnesium, B-Complex (B12/B6), Taurine, Vitamin C.
    - **"Mito-Charge" (General Fatigue)**: NAD+ Precursor, Glutathione, CoQ10.
    - **"Deep Sleep" (Low Deep Sleep)**: Glycine (3g), Magnesium Glycinate, Zinc.
    - **"Immune/Repair" (Physical Stress)**: High Dose Vitamin C, Zinc, Lysine.

### 4. Botanical Elixir (Juice/Rotavap)
*Tailored by: Neurotransmitter Needs*
- **Research**: Adaptogens modulate cortisol; Polyphenols protect neural tissue.
- **Menu**:
    - **"The Grounding" (Anxiety/Stress)**: Celery (Apigenin), Cucumber, Green Apple, *Ashwagandha Root*.
    - **"The Flame" (Inflammation)**: Turmeric, Ginger, Pineapple (Bromelain), Black Pepper, *Holy Basil*.
    - **"The Clarity" (Brain Fog)**: Beetroot (Blood Flow), Blueberry (Anthocyanins), *Lion's Mane Mushroom*.
    - **"The Sedative" (Sleep)**: Tart Cherry (Melatonin), Chamomile, *Reishi Spore*.

### 5. Lifestyle & Life Advice
*Tailored by: The "Weakest Link"*
- **Content**: Targeted advice for the specific deficit.
- **Example**: 
    - **Low Deep Sleep**: "Protocol: Magnesium Bi-Glycinate 500mg at 8pm. Complete blackout curtain. No screens 90m before bed."
    - **High RHR (Sympathetic)**: "Protocol: Morning sunlight (10m) to reset circadian cortisol. Physiological Sigh (Double inhale, long exhale) 5x per day."

---

## Implementation Strategy: `generateProtocol`

We will implement a factory function `generateProtocol(biomarkers, pillarId)` that:
1.  Takes the user's raw metrics (from Apple/Whoop).
2.  Evaluates thresholds (e.g. `isLowHRV = hrv < 35`).
3.  Selects the appropriate `Contrast`, `IV`, and `Elixir` from the Content Library above.
4.  Returns a unified `Protocol` object to the UI.

## UI Layout Update
- **5-Column Grid (Desktop)** / **Stack (Mobile)**.
- **Dynamic Tags**: "Tailored for Low HRV" badge on the cards to show *why* a specific therapy was chosen.
