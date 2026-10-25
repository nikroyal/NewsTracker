/**
 * Executive Corporate PDF Report Generator
 * Client-side high-fidelity vector PDF builder using jsPDF and jsPDF-autotable
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SynthesisReport } from '../types/ai';

export interface PdfCustomizerOptions {
  includeExecutiveSummary?: boolean;
  includeImpactMatrix?: boolean;
  includeCatalystsAndRisks?: boolean;
  includeCriticalEvents?: boolean;
  includeCitations?: boolean;
}

export function generateExecutivePdf(
  report: SynthesisReport,
  options: PdfCustomizerOptions = {}
): void {
  const {
    includeExecutiveSummary = true,
    includeImpactMatrix = true,
    includeCatalystsAndRisks = true,
    includeCriticalEvents = true,
    includeCitations = true,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  let currentY = margin;

  // --- 1. COVER / HEADER BANNER ---
  // Background Header Block
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Title
  doc.setTextColor(248, 250, 252); // slate-50
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('NEWSTRACKER EXECUTIVE INTELLIGENCE', margin, 18);

  // Subtitle / Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  const dateStr = new Date(report.timestamp).toUTCString();
  doc.text(`REPORT GENERATED: ${dateStr}   |   ORCHESTRATOR MODEL: ${report.modelUsed.toUpperCase()}`, margin, 26);

  const companiesList = Object.keys(report.companyAnalyses).join(', ');
  doc.text(`TRACKED ENTITIES: ${companiesList}`, margin, 33);

  currentY = 50;

  // --- 2. EXECUTIVE GLOBAL BRIEFING ---
  if (includeExecutiveSummary && report.globalSummary) {
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('1. Executive Global Overview', margin, currentY);
    currentY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85); // slate-700
    const splitSummary = doc.splitTextToSize(report.globalSummary, pageWidth - margin * 2);
    doc.text(splitSummary, margin, currentY);
    currentY += splitSummary.length * 5 + 6;
  }

  // --- 3. CROSS-COMPANY ECOSYSTEM IMPACT MATRIX ---
  if (includeImpactMatrix && report.ecosystemImpactMatrix && report.ecosystemImpactMatrix.length > 0) {
    checkPageOverflow(30);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('2. Cross-Company Ecosystem Impact Matrix', margin, currentY);
    currentY += 4;

    const matrixRows = report.ecosystemImpactMatrix.map(row => [
      row.driverCompany,
      row.impactedCompany,
      row.impactType.toUpperCase(),
      row.summary,
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Driver Entity', 'Impacted Entity', 'Impact Nature', 'Strategic Consequence']],
      body: matrixRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { cellWidth: 28, fontStyle: 'bold' },
        1: { cellWidth: 28, fontStyle: 'bold' },
        2: { cellWidth: 26 },
        3: { cellWidth: 'auto' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // --- 4. PER-COMPANY INTELLIGENCE DEEP DIVES ---
  const companies = Object.keys(report.companyAnalyses);

  companies.forEach((company, compIndex) => {
    const analysis = report.companyAnalyses[company];
    checkPageOverflow(40);

    // Company Header Banner
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 9, 1, 1, 'F');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${compIndex + 3}. Corporate Profile: ${company.toUpperCase()}`, margin + 3, currentY + 6.2);

    // Sentiment badge
    const sentimentText = `Sentiment: ${analysis.sentimentLabel.toUpperCase()} (${analysis.sentimentScore > 0 ? '+' : ''}${analysis.sentimentScore.toFixed(2)})`;
    doc.setFontSize(9);
    doc.setTextColor(analysis.sentimentScore >= 0.2 ? 16 : 185, analysis.sentimentScore >= 0.2 ? 149 : 28, 28);
    doc.text(sentimentText, pageWidth - margin - 50, currentY + 6.2);

    currentY += 14;

    // Executive Summary of Company
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    const companySummary = doc.splitTextToSize(analysis.executiveSummary, pageWidth - margin * 2);
    doc.text(companySummary, margin, currentY);
    currentY += companySummary.length * 4.8 + 4;

    // Catalysts & Risks
    if (includeCatalystsAndRisks) {
      checkPageOverflow(25);

      if (analysis.keyCatalysts && analysis.keyCatalysts.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(21, 128, 61); // green-700
        doc.text('Growth Catalysts:', margin, currentY);
        currentY += 4;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        analysis.keyCatalysts.forEach(cat => {
          const split = doc.splitTextToSize(`• ${cat}`, pageWidth - margin * 2 - 4);
          doc.text(split, margin + 2, currentY);
          currentY += split.length * 4.2;
        });
        currentY += 2;
      }

      if (analysis.keyRisks && analysis.keyRisks.length > 0) {
        checkPageOverflow(20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(185, 28, 28); // red-700
        doc.text('Strategic & Regulatory Risks:', margin, currentY);
        currentY += 4;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        analysis.keyRisks.forEach(risk => {
          const split = doc.splitTextToSize(`• ${risk}`, pageWidth - margin * 2 - 4);
          doc.text(split, margin + 2, currentY);
          currentY += split.length * 4.2;
        });
        currentY += 4;
      }
    }

    // Verified Citations Table
    if (includeCitations && analysis.verifiedSourceCitations && analysis.verifiedSourceCitations.length > 0) {
      checkPageOverflow(25);

      const citationRows = analysis.verifiedSourceCitations.map(c => [
        c.sourceName,
        c.title,
        c.credibilityScore ? (c.credibilityScore * 100).toFixed(0) + '%' : '90%',
        c.relevanceQuote || 'Verified Source',
      ]);

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['Source', 'Headline', 'Veracity', 'Evidence Quote']],
        body: citationRows,
        theme: 'striped',
        headStyles: {
          fillColor: [71, 85, 105],
          textColor: [255, 255, 255],
          fontSize: 8,
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: 26, fontStyle: 'bold' },
          1: { cellWidth: 50 },
          2: { cellWidth: 16 },
          3: { cellWidth: 'auto' },
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }
  });

  // Footer on all pages
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `NewsTracker Confidential Intelligence Report   |   Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  // Trigger download
  const filename = `NewsTracker_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);

  function checkPageOverflow(neededHeight: number) {
    if (currentY + neededHeight > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
    }
  }
}
