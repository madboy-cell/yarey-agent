# Monthly Financial Report - PDF Generation

## Overview
A comprehensive 2-page A4 PDF report system that provides detailed monthly financial summaries for the business owner.

## Features

### Page 1: Executive Summary
- **Header Banner** - Branded YAREY WELLNESS title with month/year
- **Financial Overview**
  - Total Revenue (in ฿)
  - Total Guests
  - Net Profit (color-coded: green for profit, red for loss)
- **Secondary Metrics**
  - Total Bookings
  - Average Order Value (AOV)
  - Cost Ratio %
  - Profit Margin %
  - Cancellation Rate %
- **Year-over-Year Comparison** (when available)
  - Previous year revenue
  - Percentage change (+ or -)
- **Cost Analysis Breakdown**
  - Base Salary
  - Sales Commission
  - Therapist/Outsource costs
  - Labor Subtotal with %
  - Other Expenses
  - **Total Costs**
- **Target Achievement** (when set)
  - Monthly target progress bar
  - Visual progress percentage
  - Color-coded: Green (100%+), Orange (80-99%), Red (<80%)

### Page 2: Detailed Analytics
- **Customer Retention**
  - Returning guests count & percentage
  - New guests count
  - Total unique guests
- **Booking Sources**
  - Each source with booking count, percentage, and revenue
  - Sorted by revenue (highest first)
- **Top Performing Staff** (Top 5)
  - Ranked by revenue generated
  - #1 highlighted in gold accent
- **Top Performing Treatments** (Top 5)
  - Ranked by revenue
  - #1 highlighted
- **Top Spending Guests** (Top 5)
  - VIP guests ranked by lifetime spend
  - #1 highlighted

## How to Use

### 1. From Month Card (Collapsed View)
- Hover over any month card in the Yearly Report view
- Click the green **file icon** that appears
- PDF will automatically download

### 2. From Expanded Month View
- Click on any month to expand it
- Click the prominent **"Full Report (PDF)"** button at the top
- PDF will download with all data for that month

## PDF Details
- **Format**: A4 (210mm × 297mm)
- **Pages**: 2 pages
- **File Name**: `Yarey_Monthly_Report_[Month]_[Year].pdf`
  - Example: `Yarey_Monthly_Report_Jan_2026.pdf`
- **Design**: Professional dark theme with YAREY branding colors
- **Footer**: 
  - Generation timestamp
  - "CONFIDENTIAL" marking
  - Page numbers

## Use Cases
1. **End-of-Month Reviews** - Print or save at month-end for owner review
2. **Financial Planning** - Compare month-over-month performance
3. **Stakeholder Reports** - Share with investors or partners
4. **Archive** - Keep PDF records for historical analysis
5. **Tax Preparation** - Organized monthly summaries for accounting

## Technical Details
- **Library**: jsPDF v4.0.0
- **Generation**: Client-side (no server required)
- **Data Source**: Real-time Firestore data
- **Performance**: Instant generation (<1 second)

## Color Coding
- **Primary Gold**: `#D1C09B` - Headers, revenue
- **Green**: `#10b981` - Profits, positive metrics
- **Red**: `#ef4444` - Losses, negative metrics  
- **Orange**: `#f59e0b` - Warnings, mid-range performance
- **Dark**: `#051818` - Backgrounds
- **Light Gray**: `#94a3b8` - Secondary text

## Metrics Included
✅ Revenue breakdown by month  
✅ Guest count & retention rate  
✅ Cost analysis (labor vs. expenses)  
✅ Profit margins  
✅ Target achievement %  
✅ Year-over-year growth  
✅ Top performers (staff, treatments, guests)  
✅ Booking source analytics  
✅ Cancellation rates  

## Future Enhancements (Possible)
- Multi-month comparison reports
- Quarterly/Annual summaries
- Charts and graphs in PDF
- Email delivery option
- Automated end-of-month generation
