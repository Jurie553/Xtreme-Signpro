import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Job, Quote, Client, CompanySettings, QuoteItem } from '../types';

// Extend jsPDF with autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const parseDate = (val: any): Date => {
  if (!val) return new Date();
  if (typeof val.toDate === 'function') {
    try {
      return val.toDate();
    } catch (e) {
      console.error('Error calling toDate on Timestamp:', e);
    }
  }
  if (typeof val === 'object' && val.seconds !== undefined) {
    return new Date(val.seconds * 1000 + (val.nanoseconds ? Math.round(val.nanoseconds / 1000000) : 0));
  }
  const parsed = new Date(val);
  if (isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
};

const formatCurrency = (amount: number | undefined | null) => {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(num);
};

const addHeader = (doc: jsPDF, company: CompanySettings | undefined, title: string, number: string, opts?: { showCompanyReg?: boolean }) => {
  // Logo area
  if (company?.logoUrl && (company.logoUrl.startsWith('data:image/') || company.logoUrl.startsWith('http'))) {
    try {
      // Detect format from data URL prefix
      let format = 'PNG';
      if (company.logoUrl.startsWith('data:image/jpeg') || company.logoUrl.startsWith('data:image/jpg')) {
        format = 'JPEG';
      } else if (company.logoUrl.startsWith('data:image/webp')) {
        format = 'WEBP';
      }
      
      doc.addImage(company.logoUrl, format, 15, 12, 35, 18, undefined, 'FAST');
    } catch (e) {
      console.error('PDF Logo Error (handled gracefully):', e);
      doc.setFontSize(22);
      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'bold');
      doc.text(company?.name || 'DYNAMIC PRINT HUB', 15, 25);
    }
  } else {
    doc.setFontSize(22);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.text(company?.name || 'DYNAMIC PRINT HUB', 15, 25);
  }

  // Company Details (Left)
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.setFont('helvetica', 'normal');
  let y = 35;
  
  if (company) {
    const showReg = opts ? !!opts.showCompanyReg : true;
    if (showReg && company.registrationNumber) {
      doc.text(`Co. Reg: ${company.registrationNumber}`, 15, y);
      y += 4;
    }
    if (company.address) {
      const splitAddress = doc.splitTextToSize(company.address, 70);
      doc.text(splitAddress, 15, y);
      y += (splitAddress.length * 4);
    }
    if (showReg && company.vatNumber) {
      doc.text(`VAT: ${company.vatNumber}`, 15, y);
      y += 4;
    }
    const contactInfo = [company.phone, company.email, company.website].filter(Boolean).join(' | ');
    if (contactInfo) {
      doc.text(contactInfo, 15, y);
    }
  }

  // Title (Right)
  doc.setFontSize(32);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), 195, 25, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`# ${number}`, 195, 33, { align: 'right' });
};

const addFooter = (doc: jsPDF) => {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 280, 195, 280);
    doc.text(`${i}`, 195, 285, { align: 'right' });
  }
};

export const generateJobCardPDF = (
  job: Job, 
  client: Client | undefined, 
  company: CompanySettings | undefined,
  jobcardConfig?: any
) => {
  const doc = new jsPDF();

  // Load PDF Customisation Settings
  const pdfSettings = {
    showPricing: false,
    showCompanyRegistration: false,
    showSafetyNotes: false,
    showDetailedCompliance: false,
    showArtworkHaltRules: 'unapproved',
    showCustomerNotes: true,
    showInternalNotes: true,
    showProductionSpecs: true,
    showProductionChecklist: true,
    showQcChecklist: true,
    ...(jobcardConfig?.pdfSettings || {})
  };

  // Add Company Header (using opts to respect registration details toggle)
  addHeader(doc, company, 'Job Card', job.jobNumber, { showCompanyReg: !!pdfSettings.showCompanyRegistration });

  // 1. Job Card Main Details (Dynamic Grid)
  autoTable(doc, {
    startY: 42,
    body: [
      ['Job Card Number:', job.jobNumber, 'Salesperson / Created By:', (job as any).salesperson || (job as any).createdBy || 'Print Admin'],
      ['Client Name:', client?.companyName || client?.name || job.clientName || 'Unknown', 'Current Stage / Status:', `${job.stage} (${job.status || 'Active'})`],
      ['Job Date:', parseDate(job.createdAt).toLocaleDateString('en-ZA'), 'Priority Level:', job.priority || 'Normal'],
      ['Due Date:', parseDate(job.dueDate).toLocaleDateString('en-ZA'), 'Department:', (job as any).departmentName || job.stage || 'Production Floor']
    ],
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 1.5 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [100, 100, 100], cellWidth: 32 },
      1: { fontStyle: 'bold', textColor: [0, 0, 0], cellWidth: 64 },
      2: { fontStyle: 'bold', textColor: [100, 100, 100], cellWidth: 40 },
      3: { fontStyle: 'bold', textColor: [0, 0, 0], cellWidth: 'auto' }
    }
  });

  let finalY = (doc as any).lastAutoTable.finalY + 8;

  // 2. Items Table (Dynamic columns based on showPricing setting)
  const showPricing = !!pdfSettings.showPricing;
  const itemHeaders = showPricing
    ? ['#', 'Item & Description', 'Length (mm)', 'Width (mm)', 'Type', 'Qty', 'Rate', 'VAT', 'Amount']
    : ['#', 'Item & Description', 'Length (mm)', 'Width (mm)', 'Type', 'Qty'];

  const itemBody = (job.items || []).map((item, idx) => {
    const desc = item.startNumber || item.endNumber 
      ? `${item.description}\n(Numbering: ${item.startNumber ?? ''} to ${item.endNumber ?? ''})`
      : item.description || '';
    
    if (showPricing) {
      return [
        (idx + 1).toString(),
        desc,
        item.length?.toString() || '-',
        item.width?.toString() || '-',
        item.type || '-',
        (item.quantity ?? 0).toString(),
        formatCurrency(item.unitCost).replace('ZAR', '').trim(),
        formatCurrency((item.totalPrice ?? 0) * 0.15).replace('ZAR', '').trim(),
        formatCurrency(item.totalPrice).replace('ZAR', '').trim()
      ];
    } else {
      return [
        (idx + 1).toString(),
        desc,
        item.length?.toString() || '-',
        item.width?.toString() || '-',
        item.type || '-',
        (item.quantity ?? 0).toString()
      ];
    }
  });

  autoTable(doc, {
    startY: finalY,
    head: [itemHeaders],
    body: itemBody,
    headStyles: { fillColor: [31, 41, 55], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    columnStyles: showPricing
      ? {
          0: { cellWidth: 8 },
          1: { cellWidth: 'auto' },
          8: { halign: 'right' }
        }
      : {
          0: { cellWidth: 8 },
          1: { cellWidth: 'auto' },
          5: { halign: 'right' }
        },
    theme: 'striped'
  });

  finalY = (doc as any).lastAutoTable.finalY + 8;

  // 3. Totals Summary (Only if showPricing is enabled)
  if (showPricing) {
    if (finalY > 260) { doc.addPage(); finalY = 20; }
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Value (Inc. VAT)', 160, finalY, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(job.total), 195, finalY, { align: 'right' });
    finalY += 10;
  }

  // 4. Product / Job Specifications (Only visible if showProductionSpecs is enabled)
  if (pdfSettings.showProductionSpecs) {
    // Generate Specifications Row list
    const specsRows: [string, string][] = [];
    
    (job.items || []).forEach((item, index) => {
      const prefix = `Item #${index + 1} (${item.type})`;
      
      // Pull and list only specified specs
      if (item.length && item.width) {
        specsRows.push([`${prefix} - Size Dimensions`, `${item.length}mm x ${item.width}mm`]);
      }
      if (item.productName) {
        specsRows.push([`${prefix} - Product Name`, item.productName]);
      }
      if (item.firstPageColor && item.firstPageColor !== 'None') {
        specsRows.push([`${prefix} - Top Ply (CB) Color`, item.firstPageColor]);
      }
      if (item.secondPageColor && item.secondPageColor !== 'None') {
        specsRows.push([`${prefix} - Middle Ply (CFB) Color`, item.secondPageColor]);
      }
      if (item.lastPageColor && item.lastPageColor !== 'None') {
        specsRows.push([`${prefix} - Bottom Ply (CF) Color`, item.lastPageColor]);
      }
      if (item.perforationPosition && item.perforationPosition !== 'None') {
        specsRows.push([`${prefix} - Perforation Position`, item.perforationPosition]);
      }
      if (item.bindingType && item.bindingType !== 'None') {
        specsRows.push([`${prefix} - Binding Type`, `${item.bindingType} (${item.bindingPosition || 'Standard'})`]);
      }
      if (item.startNumber || item.endNumber) {
        specsRows.push([`${prefix} - Numbering Sequence Range`, `${item.startNumber || '0001'} to ${item.endNumber || '1000'}`]);
      }

      // Check specsSnapshot for other properties
      if (item.specsSnapshot) {
        const snap = item.specsSnapshot;
        if (snap.material && snap.material !== 'None') specsRows.push([`${prefix} - Material`, snap.material]);
        if (snap.paperType && snap.paperType !== 'None') specsRows.push([`${prefix} - Paper Type`, snap.paperType]);
        if (snap.gsm) specsRows.push([`${prefix} - GSM Basis Weight`, `${snap.gsm} gsm`]);
        if (snap.colorOption && snap.colorOption !== 'None') specsRows.push([`${prefix} - Color Config`, snap.colorOption]);
        if (snap.sides && snap.sides !== 'None') specsRows.push([`${prefix} - Sides`, snap.sides]);
        if (snap.lamination && snap.lamination !== 'None') specsRows.push([`${prefix} - Lamination / Coating`, snap.lamination]);
        if (snap.finishing) {
          const fStr = Array.isArray(snap.finishing) ? snap.finishing.join(', ') : snap.finishing;
          if (fStr && fStr !== 'None') specsRows.push([`${prefix} - Finishing Options`, fStr]);
        }
      }
    });

    // Check parent NCR Details if NCR type exists on Job
    if (job.ncrDetails) {
      const ncr = job.ncrDetails;
      if (ncr.booksCount) specsRows.push(['NCR Volume Count', `${ncr.booksCount} Books`]);
      if (ncr.setsPerBook) specsRows.push(['NCR Plies / Sets per book', `${ncr.setsPerBook} Sets`]);
      if (ncr.paperColors && ncr.paperColors !== 'None' && ncr.paperColors.trim() !== '') {
        specsRows.push(['NCR Ply Sequence Colors', ncr.paperColors]);
      }
      if (ncr.perforationPosition && ncr.perforationPosition !== 'None') {
        specsRows.push(['NCR Perforation Position', ncr.perforationPosition]);
      }
      if (ncr.bindingType && ncr.bindingType !== 'None') {
        specsRows.push(['NCR Binding Style', `${ncr.bindingType} (${ncr.bindingPosition || 'Left'})`]);
      }
    }

    if (specsRows.length > 0) {
      if (finalY > 230) { doc.addPage(); finalY = 20; }
      autoTable(doc, {
        startY: finalY,
        head: [['PRODUCTION SPECIFICATION PARAMETER', 'ACTIVE WORKSHOP CONFIGURATION']],
        body: specsRows,
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        theme: 'grid'
      });
      finalY = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  // 5. Artwork Status & Protocols Section
  const showHaltRules = 
    pdfSettings.showArtworkHaltRules === 'yes' || 
    (pdfSettings.showArtworkHaltRules === 'unapproved' && job.artworkStatus !== 'Approved');

  if (pdfSettings.showArtworkHaltRules !== 'no') {
    if (finalY > 230) { doc.addPage(); finalY = 20; }
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text('ARTWORK PROTOCOLS & APPROVAL STATE:', 15, finalY);
    finalY += 6;

    doc.setFontSize(8.5);
    if (job.artworkStatus === 'Approved') {
      doc.setTextColor(21, 128, 61); // Green color
      doc.text(`Artwork Status: APPROVED (Cleared for production).`, 15, finalY);
      finalY += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text('Proofing completed. Ready to proceed with high speed printing runs.', 15, finalY);
    } else {
      doc.setTextColor(220, 38, 38); // Red color
      doc.text(`Artwork Status: ${job.artworkStatus || 'PENDING APPROVAL'}.`, 15, finalY);
      finalY += 5;

      if (showHaltRules) {
        doc.setFont('helvetica', 'bold');
        doc.text('COMPLIANCE NOTICE: HALT ARTWORK RUNS. Approval still required.', 15, finalY);
        finalY += 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Do not initiate plates or direct digital printing. Contact admin to resolve.', 15, finalY);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text('Baseline pre-flight proofing in progress.', 15, finalY);
      }
    }
    finalY += 10;
    doc.setTextColor(0, 0, 0);
  }

  // 6. Simple Production Steps Checklist (Only if showProductionChecklist is enabled)
  if (pdfSettings.showProductionChecklist) {
    const defaultSteps = (jobcardConfig?.productionSteps || [
      { name: 'Stock Checking', description: 'Count raw sheets from warehouse and log sheet dimensions.', safetyPrecautions: 'Use paper lifting techniques' },
      { name: 'Numbering Registration', description: 'Double check the printer numbering position block is clean.', safetyPrecautions: 'Wear standard eye protection' },
      { name: 'Creasing & Scoring', description: 'Run test folds to calibrate line placement and crease depths.', safetyPrecautions: 'Guard fingers from roller pinch' },
      { name: 'Final Trimming', description: 'Stack finished blocks and cut to target size margins.', safetyPrecautions: 'Always use safe dual-button trigger on blade' }
    ]);

    const activeSteps = (job.productionSteps && job.productionSteps.length > 0)
      ? job.productionSteps.map((name: string) => {
          const match = defaultSteps.find((s: any) => s.name === name);
          return {
            name,
            description: match?.description || 'Daily compliance check tasks',
            safetyPrecautions: match?.safetyPrecautions || 'Wear safety gear'
          };
        })
      : defaultSteps;

    if (activeSteps.length > 0) {
      if (finalY > 230) { doc.addPage(); finalY = 20; }
      
      const stepsHeaders = ['Done', 'Production Checklist Step', 'Task Instructions'];
      const showSafety = !!pdfSettings.showSafetyNotes;
      if (showSafety) {
        stepsHeaders.push('Safety Requirements / PPE');
      }

      const stepsBody = activeSteps.map((s: any) => {
        const row = [
          '[   ]',
          s.name || 'Checklist Step',
          s.description || 'Proceed with manufacturing validation'
        ];
        if (showSafety) {
          row.push(s.safetyPrecautions || 'Use standard safeguards');
        }
        return row;
      });

      autoTable(doc, {
        startY: finalY,
        head: [stepsHeaders],
        body: stepsBody,
        headStyles: { fillColor: [13, 148, 136], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { fontStyle: 'bold', cellWidth: 45 }
        },
        theme: 'grid'
      });
      finalY = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  // 7. Factory Production Sequence Flow
  const customSequence = jobcardConfig?.productionSequence || [
    { stepNo: 1, department: 'DTP / Prepress', actionItem: 'Client file proof alignment and preflight confirmation.', signOffRequired: true, verificationMethod: 'Digital visual file match' },
    { stepNo: 2, department: 'Printing Press', actionItem: 'Execute press run with color profiling checks.', signOffRequired: true, verificationMethod: 'Spectrophotometer reading' },
    { stepNo: 3, department: 'Bindery Hand', actionItem: 'Numbering, perforation sequence assembly and collation check.', signOffRequired: false, verificationMethod: 'Visual count checking' },
    { stepNo: 4, department: 'Finishing Shop', actionItem: 'Staple, wrap tape, trim and QA checklist signoff.', signOffRequired: true, verificationMethod: 'QA checklist review' }
  ];

  if (customSequence.length > 0) {
    if (finalY > 230) { doc.addPage(); finalY = 20; }

    const seqHeaders = ['Step', 'Department / Operator Line', 'Chronological milestone instruction', 'Verification Sign-Off'];
    const showComp = !!pdfSettings.showDetailedCompliance;
    if (showComp) {
      seqHeaders.push('Audit / Verification Method');
    }

    const seqBody = customSequence.map((s: any) => {
      const row = [
        s.stepNo?.toString() || '',
        s.department || 'Workshop',
        s.actionItem || 'Execute item assembly steps',
        s.signOffRequired ? 'Sign: ___________________' : 'Visual confirmation'
      ];
      if (showComp) {
        row.push(s.verificationMethod || 'Visual checking');
      }
      return row;
    });

    autoTable(doc, {
      startY: finalY,
      head: [seqHeaders],
      body: seqBody,
      headStyles: { fillColor: [41, 56, 82], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { fontStyle: 'bold', cellWidth: 42 },
        3: { cellWidth: 45 }
      },
      theme: 'grid'
    });
    finalY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 8. Quality Control Section (Only if showQcChecklist is enabled)
  if (pdfSettings.showQcChecklist) {
    if (finalY > 230) { doc.addPage(); finalY = 20; }
    
    autoTable(doc, {
      startY: finalY,
      head: [['QUALITY CONTROL FLOOR INSPECTION CHECKPOINTS', 'VERIFICATION STATUS']],
      body: [
        ['Check correct quantity count matches order sheet specifications precisely.', '[   ] Count Verified'],
        ['Check finished product sizes and trimmed margins match dimensions.', '[   ] Size Verified'],
        ['Visual inspection for print smudges, paper tearing, or mechanical binder damage.', '[   ] Damage Free'],
        ['Audit sequential numbering index accuracy (start copy matches end copy series).', '[   ] Numbering Verified']
      ],
      headStyles: { fillColor: [124, 58, 237], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      theme: 'grid'
    });
    
    finalY = (doc as any).lastAutoTable.finalY + 4;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(31, 41, 55);
    doc.text('Certified Quality Controller Sign-Of: ________________________   Sign Date: ______________', 15, finalY + 4);
    finalY += 10;
  }

  // 9. Delivery / Collection Section
  if (finalY > 230) { doc.addPage(); finalY = 20; }
  const delMethod = (job as any).deliveryMethod || 'Collection by client / Courier to schedule';
  const delAddress = (job as any).deliveryAddress || client?.address || 'No address specified';
  
  autoTable(doc, {
    startY: finalY,
    head: [['DISPATCH & COLLECTION DIRECTION AND LOGISTICS COURIER RUNNER', 'VALUE']],
    body: [
      ['Delivery Logistics Method', delMethod],
      ['Shipping Destination / Special Handlers', delAddress],
      ['Courier Provider / Waybill Slip Assignment', (job as any).courierDetails || '_______________________________________']
    ],
    headStyles: { fillColor: [219, 110, 51], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    theme: 'grid'
  });
  finalY = (doc as any).lastAutoTable.finalY + 8;

  // 10. Notes Section (Separated into Customer Notes and Internal Notes)
  if (pdfSettings.showCustomerNotes) {
    const custNotes = (job as any).customerNotes;
    if (custNotes && custNotes.trim() !== '') {
      if (finalY > 230) { doc.addPage(); finalY = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(219, 110, 51); // Highlight orange for client
      doc.text('CUSTOMER / CLIENT INSTRUCTIONS:', 15, finalY);
      finalY += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(31, 41, 55);
      const splitCustNotes = doc.splitTextToSize(custNotes, 180);
      doc.text(splitCustNotes, 15, finalY);
      finalY += (splitCustNotes.length * 4) + 4;
    }
  }

  if (pdfSettings.showInternalNotes) {
    const internalNotes = job.notes;
    if (internalNotes && internalNotes.trim() !== '') {
      if (finalY > 230) { doc.addPage(); finalY = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(31, 41, 55);
      doc.text('INTERNAL PRODUCTION REMARKS & INSTRUCTIONS:', 15, finalY);
      finalY += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(31, 41, 55);
      const splitIntNotes = doc.splitTextToSize(internalNotes, 180);
      doc.text(splitIntNotes, 15, finalY);
      finalY += (splitIntNotes.length * 4) + 4;
    }
  }

  addFooter(doc);
  return doc;
};

export const generateQuotePDF = (quote: Quote, client: Client | undefined, company: CompanySettings | undefined) => {
  console.log('Generating PDF for quote:', quote?.quoteNumber, 'Items:', quote?.items?.length);
  const doc = new jsPDF();

  addHeader(doc, company, 'Quote', quote.quoteNumber);

  // Bill To / Date section
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('Bill To', 15, 75);
  doc.text('Quote Date :', 140, 75);

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(client?.companyName || client?.name || 'Valued Client', 15, 80);
  doc.text(parseDate(quote.createdAt).toLocaleDateString('en-ZA'), 195, 75, { align: 'right' });

  // Items Table
  const tableData = quote.items.map((item, idx) => {
    let discStr = '0.00%';
    if (item.discountValue) {
      discStr = item.discountType === 'amount' 
        ? `R${item.discountValue.toFixed(2)}` 
        : `${item.discountValue.toFixed(2)}%`;
    }
    
    const qty = item.quantity ?? 0;
    const rate = qty > 0 ? (item.basePrice ? item.basePrice / qty : item.unitCost || 0) : (item.unitCost || 0);
    
    return [
      (idx + 1).toString(),
      item.startNumber || item.endNumber 
        ? `${item.description}\n(Numbering: ${item.startNumber ?? ''} to ${item.endNumber ?? ''})`
        : item.description || '',
      item.length?.toString() || '-',
      item.width?.toString() || '-',
      item.type || '-',
      qty.toString(),
      formatCurrency(rate).replace('ZAR', '').trim(),
      discStr,
      '15.00',
      formatCurrency((item.totalPrice ?? 0) * 0.15).replace('ZAR', '').trim(),
      formatCurrency(item.totalPrice).replace('ZAR', '').trim()
    ];
  });

  autoTable(doc, {
    startY: 90,
    head: [['#', 'Item & Description', 'Length_mm', 'Width_mm', 'Type', 'Qty', 'Rate', 'Disc', 'VAT %', 'VAT', 'Amount']],
    body: tableData,
    headStyles: { fillColor: [31, 41, 55], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 'auto' },
      10: { halign: 'right' }
    },
    theme: 'striped'
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;

  // Totals Summary
  if (finalY > 260) { doc.addPage(); finalY = 20; }
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  
  const rightX = 195;
  const labelX = 160;

  doc.setFont('helvetica', 'normal');
  doc.text('Sub Total', labelX, finalY, { align: 'right' });
  doc.text(formatCurrency(quote.subtotal).replace('ZAR', '').trim(), rightX, finalY, { align: 'right' });
  finalY += 8;

  doc.text('Standard Rate (15%)', labelX, finalY, { align: 'right' });
  doc.text(formatCurrency(quote.vat).replace('ZAR', '').trim(), rightX, finalY, { align: 'right' });
  finalY += 8;

  // Total with Background
  doc.setFillColor(243, 244, 246); // gray-100
  doc.rect(130, finalY - 5, 75, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Total', 160, finalY + 2.5, { align: 'right' });
  doc.text(formatCurrency(quote.total), rightX, finalY + 2.5, { align: 'right' });
  finalY += 25;

  // VAT Summary
  if (finalY > 260) { doc.addPage(); finalY = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('VAT Summary', 15, finalY);
  finalY += 5;

  autoTable(doc, {
    startY: finalY,
    head: [['VAT Details', 'Taxable Amount (R)', 'VAT Amount (R)']],
    body: [
      ['Standard Rate (15%)', formatCurrency(quote.subtotal).replace('ZAR', '').trim(), formatCurrency(quote.vat).replace('ZAR', '').trim()],
      ['Total', formatCurrency(quote.subtotal).replace('ZAR', '').trim(), formatCurrency(quote.vat).replace('ZAR', '').trim()]
    ],
    headStyles: { fillColor: [31, 41, 55], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 15, right: 15 },
    theme: 'striped'
  });

  finalY = (doc as any).lastAutoTable.finalY + 15;

  // Notes & Banking
  if (finalY > 260) { doc.addPage(); finalY = 20; }
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Notes', 15, finalY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  finalY += 5;
  doc.text('Banking Details:', 15, finalY);
  finalY += 4;
  doc.text(company?.name || 'Dynamic Print Hub', 15, finalY);
  if (company?.bankName) {
    finalY += 4;
    doc.text(company.bankName, 15, finalY);
  }
  if (company?.branchCode) {
    finalY += 4;
    doc.text(`Branch: ${company.branchCode}`, 15, finalY);
  }
  if (company?.accountNumber) {
    finalY += 4;
    doc.text(`Account No: ${company.accountNumber}`, 15, finalY);
  }
  if (company?.vatNumber) {
    finalY += 4;
    doc.text(`VAT: ${company.vatNumber}`, 15, finalY);
  }

  // Terms & Conditions
  finalY += 10;
  if (finalY > 260) { doc.addPage(); finalY = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Terms & Conditions', 15, finalY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const termsText = [
    'Lead Time on standard orders is 3-5 business days. Litho and Large signs 10-15 business days. All COD orders require a mandatory 70% deposit of total order value. Deposit is payable on acceptance of quote and the outstanding balance prior to collection. Orders requiring overtime (weekends and public holidays) will be charged accordingly.'
  ];
  doc.text(termsText, 15, finalY + 10, { maxWidth: 180 });

  addFooter(doc);
  return doc;
};
