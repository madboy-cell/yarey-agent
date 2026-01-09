import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export interface PayslipData {
    period: string // e.g. "January 2026"
    generatedDate: string
    staff: {
        name: string
        role: string
        id?: string
    }
    earnings: {
        baseSalary: number
        salesCommission: number
        salesCount: number
        serviceFee: number
        other: number
    }
    deductions: {
        tax: number
        socialSecurity: number
        other: number
    }
    netPay: number
}

export const generatePayslip = (data: PayslipData) => {
    const doc = new jsPDF()

    // -- Colors & Fonts --
    const primaryColor = [209, 192, 155] as [number, number, number] // #D1C09B (Gold)
    const secureColor = [5, 24, 24] as [number, number, number] // #051818 (Dark)
    const grayColor = [100, 100, 100] as [number, number, number]

    // -- Header --
    doc.setFont("times", "bold")
    doc.setFontSize(22)
    doc.setTextColor(secureColor[0], secureColor[1], secureColor[2])
    doc.text("YAREY WELLNESS", 105, 20, { align: "center" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
    doc.text("Official Payslip Document", 105, 26, { align: "center" })

    // -- Divider --
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.setLineWidth(0.5)
    doc.line(20, 32, 190, 32)

    // -- Staff & Period Info --
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(secureColor[0], secureColor[1], secureColor[2])

    doc.text(`Staff Name: ${data.staff.name}`, 20, 45)
    doc.text(`Role: ${data.staff.role.toUpperCase()}`, 20, 52)

    doc.text(`Period: ${data.period}`, 190, 45, { align: "right" })
    doc.text(`Issue Date: ${data.generatedDate}`, 190, 52, { align: "right" })

    // -- Earnings Table --
    const earningsBody = [
        ["Base Salary", "", `THB ${data.earnings.baseSalary.toLocaleString()}`],
        [`Sales Commission (${data.earnings.salesCount} sales)`, "", `THB ${data.earnings.salesCommission.toLocaleString()}`],
        ["Service/Therapy Fees", "", `THB ${data.earnings.serviceFee.toLocaleString()}`],
        ["Other Allowances", "", `THB ${data.earnings.other.toLocaleString()}`]
    ]

    autoTable(doc, {
        startY: 65,
        head: [["EARNINGS", "DETAILS", "AMOUNT"]],
        body: earningsBody,
        theme: "plain",
        headStyles: {
            fillColor: secureColor,
            textColor: [255, 255, 255],
            fontStyle: "bold"
        },
        styles: {
            fontSize: 10,
            cellPadding: 5
        },
        columnStyles: {
            0: { cellWidth: 100 },
            2: { halign: "right", fontStyle: "bold" }
        }
    })

    // -- Summary Box --
    const finalY = (doc as any).lastAutoTable.finalY + 20

    doc.setFillColor(245, 245, 245)
    doc.roundedRect(120, finalY, 70, 30, 2, 2, "F")

    doc.setFontSize(14)
    doc.setTextColor(secureColor[0], secureColor[1], secureColor[2])
    doc.text("NET PAY", 130, finalY + 10)

    doc.setFontSize(16)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text(`THB ${data.netPay.toLocaleString()}`, 180, finalY + 22, { align: "right" })

    // -- Footer --
    doc.setFontSize(8)
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2])
    doc.text("Yarey Wellness Operating System - Automatic Generation", 105, 280, { align: "center" })
    doc.text("This document is confidential.", 105, 285, { align: "center" })

    // Save
    doc.save(`Payslip_${data.staff.name.replace(/\s+/g, '_')}_${data.period.replace(/\s+/g, '-')}.pdf`)
}
