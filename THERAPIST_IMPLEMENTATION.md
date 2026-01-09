# Therapist & Outsource Implementation Plan

## 1. Database Schema Updates
We need to evolve the `salesmen` collection into a broader `staff` registry.

### 1.1 Update `Staff` Document Structure
```typescript
interface Staff {
  id: string;
  nickname: string;
  fullname: string;
  role: "sales" | "therapist" | "manager" | "dual"; // New
  active: boolean;
  
  // Financials
  baseSalary: number;         // e.g. 15,000 THB/mo
  commissionRate_Sales: number; // e.g. 0.05 (5%)
  commissionRate_Service: number; // e.g. 100 THB/hour (In-House Rate)
}
```

### 1.2 Global Settings (for Outsource)
We need a place to store the standard Outsource Rate so we don't type it every time.
*   **Setting Key:** `outsource_hourly_rate` (e.g. 300 THB/hour).

## 2. UI Action Plan

### 2.1 Staff Settings (Admin)
*   [ ] **Modify Staff Form:** Add fields for `Base Salary` and `Hourly Rate`.
*   [ ] **Add "Role" Switch:** Allow toggling between "Sales", "Therapist", or "Both".

### 2.2 Booking Flow (POS & Admin)
*   [ ] **Add "Therapist" Selection:** 
    *   Dropdown list of all active In-House Therapists.
    *   **Special Option:** "Outsource / External".
*   [ ] **Logic:**
    *   Upon selection, store `therapistId` (or `OUTSOURCE`) in the booking.
    *   Store `therapistCostSnapshot` = `(TreatmentDuration / 60) * Rate`.

## 3. Financial Logic (Payroll)

### 3.1 In-House Payroll
*   **Monthly Pay** = `Base Salary` + `(Total Hours Worked * In-House Rate)`.

### 3.2 Outsource Payouts (Cash/Daily)
*   **Daily Calculation** = `Total Outsource Hours * Outsource Rate`.
*   *Note:* Outsource staff are usually paid daily or weekly in cash. The system should track this liability.

## 4. Execution Order
1.  **Modify Staff Schema** (Add fields).
2.  **Update Booking Form** (Add dropdown).
3.  **Build Payroll Report** (Sum it all up).
