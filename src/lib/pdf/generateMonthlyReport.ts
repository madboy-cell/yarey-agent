// jspdf + autotable loaded dynamically to avoid bundling 29MB at build time

interface MonthlyReportData {
    month: string
    year: number
    revenue: number
    guests: number
    bookings: number
    aov: number
    costs: {
        baseSalary: number
        commissions: number
        therapistCosts: number
        laborTotal: number
        otherExpenses: number
        totalCost: number
        laborRatio: number
        totalRatio: number
        // Detailed Breakdowns
        staffPayrolls: Array<{
            name: string;
            role: string;
            base: number;
            comms: number;
            service: number;
            totalPayout: number
        }>
        outsourceCost: number
        expenseItems: Array<{ title: string; amount: number; category: string }>
    }
    target: number
    netProfit: number
    yoyComparison?: {
        previousRev: number
        change: number
    }
    topStaff: Array<{ name: string; revenue: number }>
    topRituals: Array<{ name: string; revenue: number }>
    topGuests: Array<{ name: string; revenue: number }>
    retention?: {
        returning: number
        new: number
        rate: number
    }
    cancellationRate: number
    sources: Array<{
        name: string
        count: number
        revenue: number
        percentage: number
    }>
}

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────
const COLORS = {
    brandDark: '#0f172a',      // Slate 900
    brandPrimary: '#0d9488',   // Teal 600
    brandAccent: '#f59e0b',    // Amber 500
    textMain: '#1e293b',       // Slate 800
    textSecondary: '#64748b',  // Slate 500
    textLight: '#94a3b8',      // Slate 400
    bgLight: '#f8fafc',        // Slate 50
    border: '#e2e8f0',         // Slate 200
    success: '#10b981',        // Emerald 500
    negative: '#ef4444',       // Red 500
}

export async function generateMonthlyReport(data: MonthlyReportData) {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true
    })

    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    const margin = 15

    // ─── HELPER FUNCTIONS ─────────────────────────────────────────────────

    // THB Currency
    const formatCurrency = (val: number) => {
        return `THB ${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    }

    const formatNumber = (val: number) => val.toLocaleString('en-US')

    const addHeader = (title: string, subtitle?: string) => {
        const totalPages = 4 // Updated to 4 pages

        // Top Brand Bar
        doc.setFillColor(COLORS.brandDark)
        doc.rect(0, 0, pageWidth, 5, 'F') // 5mm top bar

        // Report Title
        doc.setFontSize(24)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(COLORS.brandDark)
        doc.text(title.toUpperCase(), margin, 20)

        // Date / Context
        if (subtitle) {
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(COLORS.textSecondary)
            doc.text(subtitle, margin, 26)
        }

        // Company Logo / Right Text
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(COLORS.brandPrimary)
        doc.text('YAREY WELLNESS', pageWidth - margin, 20, { align: 'right' })

        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(COLORS.textLight)
        doc.text('CONFIDENTIAL FINANCIAL REPORT', pageWidth - margin, 25, { align: 'right' })

        // Separator
        doc.setDrawColor(COLORS.border)
        doc.setLineWidth(0.5)
        doc.line(margin, 32, pageWidth - margin, 32)
    }

    const addFooter = (currentPage: number, totalPages: number) => {
        const footerY = pageHeight - 10
        doc.setDrawColor(COLORS.border)
        doc.setLineWidth(0.2)
        doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)

        doc.setFontSize(7)
        doc.setTextColor(COLORS.textLight)
        doc.text(`Generated: ${new Date().toLocaleDateString()} | Board Report`, margin, footerY)
        doc.text(`Page ${currentPage} of ${totalPages}`, pageWidth - margin, footerY, { align: 'right' })
    }

    // ─── PAGE 1: EXECUTIVE DASHBOARD ──────────────────────────────────────
    addHeader(`${data.month} ${data.year}`, 'Executive Financial Summary')

    let currentY = 40

    // 1. KPI CARDS (Custom Draw)
    // We draw 3 clear cards horizontally
    const cardGap = 5
    const cardWidth = (pageWidth - (margin * 2) - (cardGap * 2)) / 3
    const cardHeight = 35

    const drawKPICard = (x: number, label: string, value: string, subtext: string, isPositive?: boolean) => {
        // Card Background
        doc.setFillColor(COLORS.bgLight)
        doc.setDrawColor(COLORS.border)
        doc.roundedRect(x, currentY, cardWidth, cardHeight, 2, 2, 'FD')

        // Label
        doc.setFontSize(8)
        doc.setTextColor(COLORS.textSecondary)
        doc.setFont('helvetica', 'bold')
        doc.text(label.toUpperCase(), x + 5, currentY + 10)

        // Main Value
        doc.setFontSize(16)
        doc.setTextColor(COLORS.brandDark)
        doc.setFont('helvetica', 'bold')
        doc.text(value, x + 5, currentY + 22)

        // Subtext (Trend/Context)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        if (isPositive !== undefined) {
            doc.setTextColor(isPositive ? COLORS.success : COLORS.negative)
        } else {
            doc.setTextColor(COLORS.textLight)
        }
        doc.text(subtext, x + 5, currentY + 30)
    }

    // Net Profit Logic
    const profitColor = data.netProfit >= 0
    const marginPercent = data.revenue > 0 ? Math.round((data.netProfit / data.revenue) * 100) : 0

    // YoY Logic
    let yoyText = "-"
    let yoyPositive = undefined
    if (data.yoyComparison) {
        yoyText = `${data.yoyComparison.change > 0 ? '▲' : '▼'} ${data.yoyComparison.change}% YoY`
        yoyPositive = data.yoyComparison.change >= 0
    }

    drawKPICard(margin, "Total Revenue", formatCurrency(data.revenue), yoyText, yoyPositive)
    drawKPICard(margin + cardWidth + cardGap, "Net Profit", formatCurrency(data.netProfit), `${marginPercent}% Margin`, profitColor)
    drawKPICard(margin + (cardWidth + cardGap) * 2, "Total Guests", formatNumber(data.guests), `${data.bookings} Bookings`, undefined)

    currentY += cardHeight + 10

    // 2. PROFIT & LOSS SUMMARY
    // Simplified P&L on Page 1, Details on Page 2
    autoTable(doc, {
        startY: currentY,
        head: [['PROFIT & LOSS SUMMARY', 'AMOUNT', '% REV']],
        body: [
            ['Total Revenue', formatCurrency(data.revenue), '100%'],
            [{ content: '', colSpan: 3, styles: { minCellHeight: 2 } }],

            // Summarized Costs
            ['Total Labor Costs', formatCurrency(data.costs.laborTotal), `${data.costs.laborRatio}%`],
            ['Total Operational Expenses', formatCurrency(data.costs.otherExpenses), `${data.costs.totalRatio - data.costs.laborRatio}%`],

            // Total Costs
            [{ content: 'TOTAL COSTS', styles: { fontStyle: 'bold', fillColor: COLORS.bgLight } }, { content: formatCurrency(data.costs.totalCost), styles: { fontStyle: 'bold', fillColor: COLORS.bgLight } }, { content: `${data.costs.totalRatio}%`, styles: { fontStyle: 'bold', fillColor: COLORS.bgLight } }],

            [{ content: '', colSpan: 3, styles: { minCellHeight: 2 } }],
            // Net Profit
            [{ content: 'NET PROFIT', styles: { fontStyle: 'bold', fontSize: 11, textColor: COLORS.brandPrimary } },
            { content: formatCurrency(data.netProfit), styles: { fontStyle: 'bold', fontSize: 11, textColor: COLORS.brandPrimary } },
            { content: `${marginPercent}%`, styles: { fontStyle: 'bold', fontSize: 11, textColor: COLORS.brandPrimary } }]
        ],
        theme: 'plain',
        headStyles: {
            fillColor: COLORS.brandDark,
            textColor: 255,
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'left'
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 50, halign: 'right' },
            2: { cellWidth: 30, halign: 'right' }
        },
        styles: {
            fontSize: 9,
            cellPadding: 3,
            lineWidth: { bottom: 0.1 },
            lineColor: COLORS.border
        }
    })

    // Capture Y position after the table
    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 15

    // 3. OPERATIONAL METRICS GRID
    // Heading
    doc.setFontSize(11)
    doc.setTextColor(COLORS.brandDark)
    doc.setFont('helvetica', 'bold')
    doc.text('OPERATIONAL METRICS', margin, currentY)
    currentY += 5

    // Metric Grid (2 columns)
    const metrics = [
        ['Average Order Value', formatCurrency(data.aov)],
        ['Cost of Goods Ratio', `${data.costs.totalRatio}%`],
        ['Cancellation Rate', `${data.cancellationRate}%`],
        ['Monthly Target', formatCurrency(data.target)],
        ['Target Achievement', `${Math.min(100, Math.round((data.revenue / (data.target || 1)) * 100))}%`]
    ]

    autoTable(doc, {
        startY: currentY,
        body: metrics,
        theme: 'grid',
        styles: {
            fontSize: 9,
            textColor: COLORS.textMain,
            cellPadding: 4,
            lineWidth: 0.1,
            lineColor: COLORS.border
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 80, fillColor: COLORS.bgLight },
            1: { halign: 'right' }
        }
    })

    addFooter(1, 4)
    doc.addPage()

    // ─── PAGE 2: DETAILED COST ANALYSIS ───────────────────────────────────
    addHeader(`${data.month} ${data.year}`, 'Detailed Cost Analysis')
    currentY = 40

    // 1. DETAILED PAYROLL TABLE
    doc.setFontSize(11)
    doc.setTextColor(COLORS.brandDark)
    doc.setFont('helvetica', 'bold')
    doc.text('LABOR COST BREAKDOWN', margin, currentY)
    currentY += 5

    // Build Payroll Body
    let payrollBody = data.costs.staffPayrolls
        .sort((a, b) => b.totalPayout - a.totalPayout)
        .map(s => [
            s.name,
            s.role,
            formatCurrency(s.base),
            formatCurrency(s.comms),
            formatCurrency(s.service),
            { content: formatCurrency(s.totalPayout), styles: { fontStyle: 'bold' } }
        ])

    // Add Outsource as a final row if necessary
    if (data.costs.outsourceCost > 0) {
        payrollBody.push([
            'Outsourced Services',
            'Vendor',
            '-',
            '-',
            formatCurrency(data.costs.outsourceCost),
            { content: formatCurrency(data.costs.outsourceCost), styles: { fontStyle: 'bold' } }
        ])
    }

    // Add Total Row
    payrollBody.push([
        { content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold' } } as any,
        { content: formatCurrency(data.costs.staffPayrolls.reduce((s, x) => s + x.base, 0)), styles: { fontStyle: 'bold' } } as any,
        { content: formatCurrency(data.costs.staffPayrolls.reduce((s, x) => s + x.comms, 0)), styles: { fontStyle: 'bold' } } as any,
        { content: formatCurrency(data.costs.staffPayrolls.reduce((s, x) => s + x.service, 0) + data.costs.outsourceCost), styles: { fontStyle: 'bold' } } as any,
        { content: formatCurrency(data.costs.laborTotal), styles: { fontStyle: 'bold', textColor: 255, fillColor: COLORS.brandDark } } as any
    ])

    autoTable(doc, {
        startY: currentY,
        head: [['STAFF MEMBER', 'ROLE', 'BASE SALARY', 'COMMISSIONS', 'SERVICE FEES', 'TOTAL']],
        body: payrollBody as any,
        theme: 'striped',
        headStyles: { fillColor: COLORS.brandPrimary },
        columnStyles: {
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' }
        },
        styles: { fontSize: 8 }
    })

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 15

    // 2. DETAILED EXPENSES
    doc.setFontSize(11)
    doc.setTextColor(COLORS.brandDark)
    doc.text('OPERATIONAL EXPENSE BREAKDOWN', margin, currentY)
    currentY += 5

    // Prepare Body
    const expenseBody = data.costs.expenseItems.length > 0 ?
        data.costs.expenseItems
            .sort((a, b) => b.amount - a.amount)
            .map(e => [e.title, e.category, formatCurrency(e.amount)])
        : [['No expenses recorded', '-', '-']]

    // Expense Total Row
    if (data.costs.expenseItems.length > 0) {
        expenseBody.push([
            { content: 'TOTAL EXPENSES', colSpan: 2, styles: { fontStyle: 'bold', fillColor: COLORS.bgLight } },
            { content: formatCurrency(data.costs.otherExpenses), styles: { fontStyle: 'bold', fillColor: COLORS.brandDark, textColor: 255, halign: 'right' } }
        ] as any)
    }

    autoTable(doc, {
        startY: currentY,
        head: [['EXPENSE ITEM', 'CATEGORY', 'AMOUNT']],
        body: expenseBody as any,
        theme: 'striped',
        headStyles: { fillColor: COLORS.textSecondary },
        columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
        styles: { fontSize: 9 }
    })

    addFooter(2, 4)
    doc.addPage()

    // ─── PAGE 3: PERFORMANCE ANALYTICS ────────────────────────────────────
    addHeader(`${data.month} ${data.year}`, 'Performance Analytics')

    currentY = 40

    // Layout: Two Tables Side by Side (Staff & Treatments)
    const colWidth = (pageWidth - (margin * 2) - 10) / 2

    doc.setFontSize(11)
    doc.setTextColor(COLORS.brandDark)
    doc.text('TOP PERFORMING STAFF', margin, currentY)
    doc.text('TOP TREATMENTS', margin + colWidth + 10, currentY)

    currentY += 5

    // Prepare Data
    const staffBody = data.topStaff.slice(0, 5).map((s, i) => [
        `${i + 1}. ${s.name}`, formatCurrency(s.revenue)
    ])

    const treatmentsBody = data.topRituals.slice(0, 5).map((t, i) => [
        `${i + 1}. ${t.name}`, formatCurrency(t.revenue)
    ])

    // Render Staff Table
    autoTable(doc, {
        startY: currentY,
        head: [['NAME', 'REV']],
        body: staffBody,
        theme: 'striped',
        margin: { right: margin + colWidth + 10 }, // Constrain to left col
        headStyles: { fillColor: COLORS.textSecondary, fontSize: 8 },
        styles: { fontSize: 8 },
        columnStyles: { 1: { halign: 'right' } }
    })

    // Capture Y to sync
    // @ts-ignore
    const tableEnd1 = doc.lastAutoTable.finalY

    // Render Treatments Table
    autoTable(doc, {
        startY: currentY,
        head: [['RITUAL', 'REV']],
        body: treatmentsBody,
        theme: 'striped',
        margin: { left: margin + colWidth + 10 }, // Constrain to right col
        headStyles: { fillColor: COLORS.textSecondary, fontSize: 8 },
        styles: { fontSize: 8 },
        columnStyles: { 1: { halign: 'right' } }
    })

    // @ts-ignore
    const tableEnd2 = doc.lastAutoTable.finalY
    currentY = Math.max(tableEnd1, tableEnd2) + 15

    // 4. BOOKING SOURCES & RETENTION
    doc.setFontSize(11)
    doc.setTextColor(COLORS.brandDark)
    doc.text('BOOKING CHANNELS & INSIGHTS', margin, currentY)
    currentY += 5

    const sourceBody = data.sources.map(s => [
        s.name,
        s.count.toString(),
        `${s.percentage}%`,
        formatCurrency(s.revenue)
    ])

    autoTable(doc, {
        startY: currentY,
        head: [['SOURCE CHANNEL', 'BOOKINGS', 'MIX %', 'REVENUE']],
        body: sourceBody,
        theme: 'grid',
        headStyles: { fillColor: COLORS.brandPrimary },
        columnStyles: {
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'right', fontStyle: 'bold' }
        },
        styles: { fontSize: 9, cellPadding: 3 }
    })

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 15

    // 5. TOP GUESTS
    doc.setFontSize(11)
    doc.setTextColor(COLORS.brandDark)
    doc.text('TOP SPENDING GUESTS', margin, currentY)
    currentY += 5

    const guestBody = data.topGuests.slice(0, 5).map((g, i) => [
        `${i + 1}`, g.name, formatCurrency(g.revenue)
    ])

    autoTable(doc, {
        startY: currentY,
        head: [['#', 'GUEST NAME', 'TOTAL SPEND']],
        body: guestBody,
        theme: 'plain',
        headStyles: { fillColor: COLORS.brandAccent, textColor: COLORS.brandDark },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            2: { halign: 'right', fontStyle: 'bold' }
        },
        styles: { fontSize: 9, cellPadding: 2, lineColor: COLORS.border, lineWidth: { bottom: 0.1 } }
    })

    addFooter(2, 2)

    // Save
    doc.save(`Yarey_Financial_Report_${data.month}_${data.year}.pdf`)
}
