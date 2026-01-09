# Yarey Wellness System - Development Roadmap

This document outlines the strategic plan to evolve the Yarey Wellness Operating System from a local prototype into a production-grade enterprise application.

## 🟢 Phase 1: Resilience & Security (Top Priority)
Transition from a single-device prototype to a secure, cloud-synced platform.

- [ ] **Guest Online Booking Engine (New)**
    - **Current Status:** Guests can only view a static "Concierge" page.
    - **Goal:** Build a new `/booking` flow connected to Firestore so guests can self-book.
- [ ] **Authentication & Roles**
    - **Current:** `/admin` is open to everyone.
    - **Goal:** Secure login. Role-based access (Owner, Manager, Therapist).
- [ ] **Automated Backups**
    - **Goal:** Daily snapshots of booking data to prevent data loss.

## 🔵 Phase 2: Operational Depth
Enhance the detailed management of daily spa operations.

- [ ] **Therapist & Room Assignment**
    - **Current:** We track "Sold By" (Sales Commission).
    - **Goal:** Track "Performed By" (Therapist labor) and Room Occupancy to prevent double-booking.
- [ ] **Shift Management**
    - **Goal:** Track staff clock-in/out and calculate daily labor costs.
- [ ] **Inventory & Stock**
    - **Goal:** Deduct consumables (Introduction Oil, Massage Oil) automatically when a ritual is booked.
- [ ] **End-of-Day (EOD) Reports**
    - **Goal:** One-click PDF generation of daily revenue, cash/credit split, and staff commissions.

## 🟣 Phase 3: Guest Experience & CRM
Connect the digital sanctuary directly to the guest.

- [ ] **Online Booking Engine**
    - **Current:** `/booking` page exists but may not be sync-ed.
    - **Goal:** Guests book online -> Instantly appears in Admin POS (with deposit handling).
- [ ] **Guest CRM & History**
    - **Current:** Basic "Alchemist's Lab" history.
    - **Goal:** Detailed profile: "Last visit 30 days ago", "Prefers Lavendar Oil", "Birthday coming up".
- [ ] **Loyalty & Membership**
    - **Goal:** Track points/visits or sell Membership Packages (e.g., "10-pack Sauna").

## 🟤 Phase 5: Owner's Command (Strategic)
New modules designed specifically for the Business Owner, distinct from daily Manager operations.

- [ ] **Financial Health & Payroll**
    - **Goal:** One-click payroll calculation.
    - **Features:** Total Commissions owed, Tip tracking, Net Profit estimation (Revenue - Labor).
- [ ] **Customer Intelligence (LTV)**
    - **Goal:** Identify VIPs and "Lost Souls".
    - **Features:** "Top 10 Spenders", "Retention Rate per Therapist", "Win-back List" (Guests who haven't visited in 90 days).
- [ ] **Asset Management**
    - **Goal:** Track high-value equipment health.
    - **Features:** Maintenance logs for Saunas/Ice Baths, Filter change reminders.
