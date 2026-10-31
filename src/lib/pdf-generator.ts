/**
 * Executive Corporate PDF Report Generator
 * Client-side high-fidelity vector PDF builder using jsPDF and jsPDF-autotable
 * Enriched with quantitative valuation, solvency, DuPont, and Altman Z-Score health tables
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SynthesisReport } from '../types/ai';

export interface PdfCustomizerOptions {
  includeExecutiveSummary?: boolean;
  includeFinancialHealthTable?: boolean;
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
    includeFinancialHealthTable = true,
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

  let sectionCounter = 1;

  // --- 2. EXECUTIVE GLOBAL BRIEFING ---
  if (includeExecutiveSummary && report.globalSummary) {
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`${sectionCounter}. Executive Global Overview`, margin, currentY);
    sectionCounter++;
    currentY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85); // slate-700
    const splitSummary = doc.splitTextToSize(report.globalSummary, pageWidth - margin * 2);
    doc.text(splitSummary, margin, currentY);
    currentY += splitSummary.length * 5 + 6;
  }

  // --- 3. QUANTITATIVE VALUATION & HEALTH BENCHMARKS TABLE (Master Market Engine) ---
  const hasMarketData = report.companyMarketData && Object.keys(report.companyMarketData).length > 0;
  if (includeFinancialHealthTable && hasMarketData) {
    checkPageOverflow(40);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`${sectionCounter}. Quantitative Financial Health & Valuation Benchmarks`, margin, currentY);
    sectionCounter++;
    currentY += 4;

    const marketRows = Object.keys(report.companyAnalyses).map((company) => {
      const data = report.companyMarketData?.[company];
      if (!data) return [company.toUpperCase(), '—', '—', '—', '—', '—', '—'];

      const q = data.quote;
      const r = data.ratios;
      const s = data.scores;

      const priceStr = q
        ? `${q.currency} ${Number(q.lastPrice).toLocaleString()} (${q.percentChange >= 0 ? '+' : ''}${Number(q.percentChange || 0).toFixed(2)}%)`
        : '—';
      const peStr = r?.valuation?.trailingPE ? `${r.valuation.trailingPE}x` : q?.peRatio ? `${q.peRatio}x` : '—';
      const evEbitdaStr = r?.valuation?.enterpriseValueToEbitda ? `${r.valuation.enterpriseValueToEbitda}x` : '—';
      const roeStr = r?.profitability?.returnOnEquityPercent ? `${r.profitability.returnOnEquityPercent}%` : '—';
      const altmanStr = s?.altmanZScore?.score ? `${s.altmanZScore.score} (${s.altmanZScore.zone})` : '—';
      const healthRating = s?.piotroskiFScoreEstimate ? `${s.piotroskiFScoreEstimate.rating} (${s.piotroskiFScoreEstimate.score}/9)` : '—';

      return [
        company.toUpperCase(),
        priceStr,
        peStr,
        evEbitdaStr,
        roeStr,
        altmanStr,
        healthRating,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['Entity', 'Live Price & Chg', 'P/E (TTM)', 'EV/EBITDA', 'ROE %', 'Altman Z-Score', 'Health Strength']],
      body: marketRows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { cellWidth: 26, fontStyle: 'bold' },
        1: { cellWidth: 38 },
        2: { cellWidth: 18 },
        3: { cellWidth: 20 },
        4: { cellWidth: 18 },
        5: { cellWidth: 36 },
        6: { cellWidth: 'auto' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // --- 4. CROSS-COMPANY ECOSYSTEM IMPACT MATRIX ---
  if (includeImpactMatrix && report.ecosystemImpactMatrix && report.ecosystemImpactMatrix.length > 0) {
    checkPageOverflow(30);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`${sectionCounter}. Cross-Company Ecosystem Impact Matrix`, margin, currentY);
    sectionCounter++;
    currentY += 4;

    const matrixRows = report.ecosystemImpactMatrix.map((row) => [
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

  // --- 5. PER-COMPANY INTELLIGENCE DEEP DIVES ---
  const companies = Object.keys(report.companyAnalyses);

  companies.forEach((company, compIndex) => {
    const analysis = report.companyAnalyses[company];
    checkPageOverflow(45);

    // Company Header Banner
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 9, 1, 1, 'F');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${sectionCounter}.${compIndex + 1} Corporate Profile: ${company.toUpperCase()}`, margin + 3, currentY + 6.2);

    // Sentiment badge
    const sentimentText = `Sentiment: ${analysis.sentimentLabel.toUpperCase()} (${analysis.sentimentScore > 0 ? '+' : ''}${analysis.sentimentScore.toFixed(2)})`;
    doc.setFontSize(9);
    doc.setTextColor(analysis.sentimentScore >= 0.2 ? 16 : 185, analysis.sentimentScore >= 0.2 ? 149 : 28, 28);
    doc.text(sentimentText, pageWidth - margin - 50, currentY + 6.2);

    currentY += 13;

    // Detailed Financial & DuPont Snapshot Box for Company
    const compMarket = report.companyMarketData?.[company];
    if (includeFinancialHealthTable && compMarket) {
      checkPageOverflow(26);

      const q = compMarket.quote;
      const r = compMarket.ratios;
      const d = compMarket.dupont?.threeStage;
      const s = compMarket.scores;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, currentY, pageWidth - margin * 2, 22, 1, 1, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('FINANCIAL FUNDAMENTALS & BALANCE SHEET SNAPSHOT:', margin + 3, currentY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);

      const line1 = `Market Price: ${q?.currency || 'USD'} ${q?.lastPrice || '—'} (${q?.percentChange >= 0 ? '+' : ''}${q?.percentChange?.toFixed(2) || '0.00'}%)  |  Market Cap: ${q?.marketCap ? Number(q.marketCap).toLocaleString() : '—'}  |  52W Range: ${q?.yearLow || '—'} - ${q?.yearHigh || '—'}`;
      doc.text(line1, margin + 3, currentY + 9);

      const line2 = `Valuation & Solvency: P/E: ${r?.valuation?.trailingPE || '—'}x  |  EV/EBITDA: ${r?.valuation?.enterpriseValueToEbitda || '—'}x  |  Debt/Equity: ${r?.liquidityAndSolvency?.debtToEquity || '—'}x  |  Current Ratio: ${r?.liquidityAndSolvency?.currentRatio || '—'}x`;
      doc.text(line2, margin + 3, currentY + 13.5);

      const line3 = `DuPont 3-Stage ROE: Net Margin (${d?.netProfitMargin || '—'}) × Asset Turnover (${d?.assetTurnover || '—'}) × Financial Leverage (${d?.equityMultiplier || '—'}) = ${d?.returnOnEquity || '—'}%  |  Altman Z: ${s?.altmanZScore?.score || '—'} (${s?.altmanZScore?.zone || 'Safe'})`;
      doc.text(line3, margin + 3, currentY + 18);

      currentY += 26;
    }

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
        analysis.keyCatalysts.forEach((cat) => {
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
        analysis.keyRisks.forEach((risk) => {
          const split = doc.splitTextToSize(`• ${risk}`, pageWidth - margin * 2 - 4);
          doc.text(split, margin + 2, currentY);
          currentY += split.length * 4.2;
        });
        currentY += 4;
      }
    }

    // Critical Events
    if (includeCriticalEvents && analysis.criticalEvents && analysis.criticalEvents.length > 0) {
      checkPageOverflow(25);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(234, 88, 12); // orange-600
      doc.text('Critical & High-Volatility Catalysts:', margin, currentY);
      currentY += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      analysis.criticalEvents.forEach((ev) => {
        const title = `[${ev.type.toUpperCase()}] ${ev.title} (${ev.severity.toUpperCase()} IMPACT)`;
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin + 2, currentY);
        currentY += 4;

        doc.setFont('helvetica', 'normal');
        const split = doc.splitTextToSize(ev.description, pageWidth - margin * 2 - 4);
        doc.text(split, margin + 2, currentY);
        currentY += split.length * 4.2 + 2;
      });
      currentY += 2;
    }

    // Verified Citations Table
    if (includeCitations && analysis.verifiedSourceCitations && analysis.verifiedSourceCitations.length > 0) {
      checkPageOverflow(25);

      const citationRows = analysis.verifiedSourceCitations.map((c) => [
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
