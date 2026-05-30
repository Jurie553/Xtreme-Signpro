/**
 * Imposition & Sheet Optimization Engine
 * Commercial Grade Mathematical Layout & Imposition Optimizer
 */

export interface ImpositionInput {
  subjectWidth: number; // finished item width in mm
  subjectHeight: number; // finished item height in mm
  bleed: number; // bleed in mm per side
  gutter: number; // spacing between items in mm
  margin: { top: number; bottom: number; left: number; right: number }; // unprintable borders
  sheetWidth: number; // raw sheet width in mm
  sheetHeight: number; // raw sheet height in mm
  quantity: number; // desired final quantity
  materialCostPerSheet?: number; // material cost per sheet
  clickCost?: number; // per impression print cost
  hourlyRate?: number; // machine operation rate / hr
  speed?: number; // sheets per hour printed
}

export interface ImpositionItemPlacement {
  id: string;
  x: number; // client-side absolute mm offset
  y: number; // client-side absolute mm offset
  width: number; // with bleed included
  height: number; // with bleed included
  rotated: boolean;
  subjectWidth: number; // original finished width
  subjectHeight: number; // original finished height
  bleed: number;
}

export interface ImpositionResult {
  sheetWidth: number;
  sheetHeight: number;
  printableWidth: number;
  printableHeight: number;
  cols: number; // main grid columns
  rows: number; // main grid rows
  ups: number; // total yields per sheet
  orientation: 'Normal' | 'Rotated' | 'Mixed (Optimized)';
  sheetUsagePercent: number; // exact coverage of items with bleed / full sheet size
  wastePercent: number; // raw unprinted / trimmed portion
  sheetsRequired: number; // base print sheets required
  spoilageSheets: number; // run spoilage allowance based on run volume
  totalSheets: number; // sheetsRequired + spoilageSheets
  rawMaterialCost: number; // cost of raw stock
  printCost: number; // click costs or machine ink setup
  finishingCost: number; // cutting labor costs
  totalProductionCost: number;
  unitCost: number; // cost per individual finished item
  cutCount: number; // estimated guillotine shear cuts
  cuttingTimeMinutes: number; // projected finishing duration
  items: ImpositionItemPlacement[];
}

export const STANDARD_SHEETS = [
  { name: 'SRA3', width: 320, height: 450, category: 'Digital/Sheets' },
  { name: 'SRA2', width: 450, height: 640, category: 'Digital/Sheets' },
  { name: 'A0', width: 841, height: 1189, category: 'Large Format' },
  { name: 'A1', width: 594, height: 841, category: 'Large Format/Litho' },
  { name: 'A2', width: 420, height: 594, category: 'Large/Litho' },
  { name: 'A3', width: 297, height: 420, category: 'Digital/Medium' },
  { name: 'A4', width: 210, height: 297, category: 'Office/Digital' },
  { name: 'B1', width: 707, height: 1000, category: 'Litho Full' },
  { name: 'B2', width: 500, height: 707, category: 'Litho Half' },
  { name: 'B3', width: 353, height: 500, category: 'Litho Quarter' },
];

/**
 * Main optimizer function comparing normal, rotated, and mixed layouts. This searches
 * non-linear space of rotated boundaries to find max yield per sheet size.
 */
export function calculateImposition(input: ImpositionInput): ImpositionResult {
  const {
    subjectWidth,
    subjectHeight,
    bleed,
    gutter,
    margin,
    sheetWidth,
    sheetHeight,
    quantity,
    materialCostPerSheet = 2.50,
    clickCost = 0.85,
    hourlyRate = 450,
    speed = 2000
  } = input;

  const printableW = Math.max(0, sheetWidth - margin.left - margin.right);
  const printableH = Math.max(0, sheetHeight - margin.top - margin.bottom);

  // Spaced finished bounds
  const outerW = subjectWidth + 2 * bleed;
  const outerH = subjectHeight + 2 * bleed;

  if (outerW <= 0 || outerH <= 0 || printableW <= 0 || printableH <= 0) {
    return createEmptyResult(sheetWidth, sheetHeight, printableW, printableH);
  }

  // --- Option 1: ALL NORMAL (Portrait/Landscape matching) ---
  const normalCols = Math.floor((printableW + gutter) / (outerW + gutter));
  const normalRows = Math.floor((printableH + gutter) / (outerH + gutter));
  const normalUps = Math.max(0, normalCols * normalRows);

  // --- Option 2: ALL ROTATED 90 DEG ---
  const rotCols = Math.floor((printableW + gutter) / (outerH + gutter));
  const rotRows = Math.floor((printableH + gutter) / (outerW + gutter));
  const rotUps = Math.max(0, rotCols * rotRows);

  // --- Option 3: MIXED (PINWHEEL / LEFT-OVER RE-NESTING) ---
  // We place a smaller block of normal, then look at leftover width & height for rotated items.
  let mixedUps = 0;
  let mixedPlacements: ImpositionItemPlacement[] = [];
  let bestMixedSubtype = '';

  // Mixed Subtype A: Normal main block + rotated items in the right margin
  if (normalCols > 0 && normalRows > 0) {
    const mainWidthUsed = normalCols * (outerW + gutter) - gutter;
    const rightLeftoverWidth = printableW - (mainWidthUsed + gutter);
    if (rightLeftoverWidth >= outerH) {
      const extraCols = Math.floor((rightLeftoverWidth + gutter) / (outerH + gutter));
      const extraRows = Math.floor((printableH + gutter) / (outerW + gutter));
      const extraUps = extraCols * extraRows;
      const totalMix = normalUps + extraUps;

      if (totalMix > mixedUps) {
        mixedUps = totalMix;
        bestMixedSubtype = 'RightRotated';
      }
    }

    const mainHeightUsed = normalRows * (outerH + gutter) - gutter;
    const bottomLeftoverHeight = printableH - (mainHeightUsed + gutter);
    if (bottomLeftoverHeight >= outerW) {
      const extraCols = Math.floor((printableW + gutter) / (outerH + gutter));
      const extraRows = Math.floor((bottomLeftoverHeight + gutter) / (outerW + gutter));
      const extraUps = extraCols * extraRows;
      const totalMix = normalUps + extraUps;

      if (totalMix > mixedUps) {
        mixedUps = totalMix;
        bestMixedSubtype = 'BottomRotated';
      }
    }
  }

  // Mixed Subtype B: Rotated main block + normal items in the leftovers
  if (rotCols > 0 && rotRows > 0) {
    const mainWidthUsed = rotCols * (outerH + gutter) - gutter;
    const rightLeftoverWidth = printableW - (mainWidthUsed + gutter);
    if (rightLeftoverWidth >= outerW) {
      const extraCols = Math.floor((rightLeftoverWidth + gutter) / (outerW + gutter));
      const extraRows = Math.floor((printableH + gutter) / (outerH + gutter));
      const extraUps = extraCols * extraRows;
      const totalMix = rotUps + extraUps;

      if (totalMix > mixedUps) {
        mixedUps = totalMix;
        bestMixedSubtype = 'RightNormal';
      }
    }

    const mainHeightUsed = rotRows * (outerW + gutter) - gutter;
    const bottomLeftoverHeight = printableH - (mainHeightUsed + gutter);
    if (bottomLeftoverHeight >= outerH) {
      const extraCols = Math.floor((printableW + gutter) / (outerW + gutter));
      const extraRows = Math.floor((bottomLeftoverHeight + gutter) / (outerH + gutter));
      const extraUps = extraCols * extraRows;
      const totalMix = rotUps + extraUps;

      if (totalMix > mixedUps) {
        mixedUps = totalMix;
        bestMixedSubtype = 'BottomNormal';
      }
    }
  }

  // Choose the optimal orientation
  let winningOrientation: 'Normal' | 'Rotated' | 'Mixed (Optimized)' = 'Normal';
  let finalUps = normalUps;
  let finalItems: ImpositionItemPlacement[] = [];

  if (rotUps > finalUps) {
    winningOrientation = 'Rotated';
    finalUps = rotUps;
  }
  if (mixedUps > finalUps) {
    winningOrientation = 'Mixed (Optimized)';
    finalUps = mixedUps;
  }

  // --- PLACEMENT BUILDER ---
  if (winningOrientation === 'Normal') {
    for (let r = 0; r < normalRows; r++) {
      for (let c = 0; c < normalCols; c++) {
        const x = margin.left + c * (outerW + gutter);
        const y = margin.top + r * (outerH + gutter);
        finalItems.push({
          id: `item-n-${r}-${c}`,
          x,
          y,
          width: outerW,
          height: outerH,
          rotated: false,
          subjectWidth,
          subjectHeight,
          bleed
        });
      }
    }
  } else if (winningOrientation === 'Rotated') {
    for (let r = 0; r < rotRows; r++) {
      for (let c = 0; c < rotCols; c++) {
        const x = margin.left + c * (outerH + gutter);
        const y = margin.top + r * (outerW + gutter);
        finalItems.push({
          id: `item-r-${r}-${c}`,
          x,
          y,
          width: outerH,
          height: outerW,
          rotated: true,
          subjectWidth,
          subjectHeight,
          bleed
        });
      }
    }
  } else {
    // Mixed Orientation Placements
    if (bestMixedSubtype === 'RightRotated') {
      // Main block
      for (let r = 0; r < normalRows; r++) {
        for (let c = 0; c < normalCols; c++) {
          finalItems.push({
            id: `item-mix-main-${r}-${c}`,
            x: margin.left + c * (outerW + gutter),
            y: margin.top + r * (outerH + gutter),
            width: outerW,
            height: outerH,
            rotated: false,
            subjectWidth,
            subjectHeight,
            bleed
          });
        }
      }
      // Right Rotated strip
      const mainWidthUsed = normalCols * (outerW + gutter);
      const startX = margin.left + mainWidthUsed;
      const extraCols = Math.floor((printableW - mainWidthUsed + gutter) / (outerH + gutter));
      const extraRows = Math.floor((printableH + gutter) / (outerW + gutter));
      for (let r = 0; r < extraRows; r++) {
        for (let c = 0; c < extraCols; c++) {
          finalItems.push({
            id: `item-mix-extra-${r}-${c}`,
            x: startX + c * (outerH + gutter),
            y: margin.top + r * (outerW + gutter),
            width: outerH,
            height: outerW,
            rotated: true,
            subjectWidth,
            subjectHeight,
            bleed
          });
        }
      }
    } else if (bestMixedSubtype === 'BottomRotated') {
      // Main block
      for (let r = 0; r < normalRows; r++) {
        for (let c = 0; c < normalCols; c++) {
          finalItems.push({
            id: `item-mix-main-${r}-${c}`,
            x: margin.left + c * (outerW + gutter),
            y: margin.top + r * (outerH + gutter),
            width: outerW,
            height: outerH,
            rotated: false,
            subjectWidth,
            subjectHeight,
            bleed
          });
        }
      }
      // Bottom Rotated strip
      const mainHeightUsed = normalRows * (outerH + gutter);
      const startY = margin.top + mainHeightUsed;
      const extraCols = Math.floor((printableW + gutter) / (outerH + gutter));
      const extraRows = Math.floor((printableH - mainHeightUsed + gutter) / (outerW + gutter));
      for (let r = 0; r < extraRows; r++) {
        for (let c = 0; c < extraCols; c++) {
          finalItems.push({
            id: `item-mix-extra-${r}-${c}`,
            x: margin.left + c * (outerH + gutter),
            y: startY + r * (outerW + gutter),
            width: outerH,
            height: outerW,
            rotated: true,
            subjectWidth,
            subjectHeight,
            bleed
          });
        }
      }
    } else if (bestMixedSubtype === 'RightNormal') {
      // Main block (rotated)
      for (let r = 0; r < rotRows; r++) {
        for (let c = 0; c < rotCols; c++) {
          finalItems.push({
            id: `item-mix-main-r-${r}-${c}`,
            x: margin.left + c * (outerH + gutter),
            y: margin.top + r * (outerW + gutter),
            width: outerH,
            height: outerW,
            rotated: true,
            subjectWidth,
            subjectHeight,
            bleed
          });
        }
      }
      // Right Normal strip
      const mainWidthUsed = rotCols * (outerH + gutter);
      const startX = margin.left + mainWidthUsed;
      const extraCols = Math.floor((printableW - mainWidthUsed + gutter) / (outerW + gutter));
      const extraRows = Math.floor((printableH + gutter) / (outerH + gutter));
      for (let r = 0; r < extraRows; r++) {
        for (let c = 0; c < extraCols; c++) {
          finalItems.push({
            id: `item-mix-extra-n-${r}-${c}`,
            x: startX + c * (outerW + gutter),
            y: margin.top + r * (outerH + gutter),
            width: outerW,
            height: outerH,
            rotated: false,
            subjectWidth,
            subjectHeight,
            bleed
          });
        }
      }
    } else if (bestMixedSubtype === 'BottomNormal') {
      // Main block (rotated)
      for (let r = 0; r < rotRows; r++) {
        for (let c = 0; c < rotCols; c++) {
          finalItems.push({
            id: `item-mix-main-r-${r}-${c}`,
            x: margin.left + c * (outerH + gutter),
            y: margin.top + r * (outerW + gutter),
            width: outerH,
            height: outerW,
            rotated: true,
            subjectWidth,
            subjectHeight,
            bleed
          });
        }
      }
      // Bottom Normal strip
      const mainHeightUsed = rotRows * (outerW + gutter);
      const startY = margin.top + mainHeightUsed;
      const extraCols = Math.floor((printableW + gutter) / (outerW + gutter));
      const extraRows = Math.floor((printableH - mainHeightUsed + gutter) / (outerH + gutter));
      for (let r = 0; r < extraRows; r++) {
        for (let c = 0; c < extraCols; c++) {
          finalItems.push({
            id: `item-mix-extra-n-${r}-${c}`,
            x: margin.left + c * (outerW + gutter),
            y: startY + r * (outerH + gutter),
            width: outerW,
            height: outerH,
            rotated: false,
            subjectWidth,
            subjectHeight,
            bleed
          });
        }
      }
    }
  }

  // --- SHEET COUNTS & WASTE CALCULATIONS ---
  const activeUps = finalUps > 0 ? finalUps : 1;
  const rawSheetsNeeded = Math.ceil(quantity / activeUps);
  // Spoilage calculation: 5% of order size, with a minimum of 20 sheets to account for press calibration/setup alignment
  const spoilageVal = Math.max(12, Math.ceil(rawSheetsNeeded * 0.045));
  const finalSheetsTotal = rawSheetsNeeded + (quantity > 0 ? spoilageVal : 0);

  // Compute percentage calculations
  const totalSheetArea = sheetWidth * sheetHeight;
  const singleItemArea = (subjectWidth + (2 * bleed)) * (subjectHeight + (2 * bleed));
  const totalItemAreaOnSheet = finalUps * singleItemArea;
  
  const usagePercent = Math.min(100, Math.max(0, (totalItemAreaOnSheet / totalSheetArea) * 100));
  const wastePercent = Math.max(0, 100 - usagePercent);

  // --- GUILLOTINE TRIM & COMPLEXITY LOGIC ---
  // A standard grid of R x C cuts: requires (R + 1) horizontal + (C + 1) vertical shear runs.
  // Rotated / Mixed has elevated shear complexities because of offset grid layout.
  const baseRowsIdx = winningOrientation === 'Normal' ? normalRows : winningOrientation === 'Rotated' ? rotRows : Math.ceil(finalUps / 3);
  const baseColsIdx = winningOrientation === 'Normal' ? normalCols : winningOrientation === 'Rotated' ? rotCols : 3;
  const cutCount = Math.max(4, (baseRowsIdx + 1) + (baseColsIdx + 1) + (winningOrientation === 'Mixed (Optimized)' ? 4 : 0));
  
  // 15 seconds per standard crop shear cut on a programmable guillotine
  const cuttingTimeMin = Math.round((cutCount * rowBatchFactor(finalSheetsTotal) * 12) / 60);

  // --- COSTING MODULES ---
  const materialsCost = finalSheetsTotal * materialCostPerSheet;
  const printingCost = finalSheetsTotal * clickCost;
  // Finishing labor estimated at R180 per hour
  const finishingCost = Math.max(45, (cuttingTimeMin / 60) * 180 + (finalSheetsTotal * 0.05));
  const productionCost = materialsCost + printingCost + finishingCost;
  const unitCostRaw = quantity > 0 ? productionCost / quantity : 0;

  return {
    sheetWidth,
    sheetHeight,
    printableWidth: printableW,
    printableHeight: printableH,
    cols: winningOrientation === 'Normal' ? normalCols : winningOrientation === 'Rotated' ? 0 : normalCols,
    rows: winningOrientation === 'Normal' ? normalRows : winningOrientation === 'Rotated' ? 0 : normalRows,
    ups: finalUps,
    orientation: winningOrientation,
    sheetUsagePercent: parseFloat(usagePercent.toFixed(1)),
    wastePercent: parseFloat(wastePercent.toFixed(1)),
    sheetsRequired: rawSheetsNeeded,
    spoilageSheets: quantity > 0 ? spoilageVal : 0,
    totalSheets: finalSheetsTotal,
    rawMaterialCost: parseFloat(materialsCost.toFixed(2)),
    printCost: parseFloat(printingCost.toFixed(2)),
    finishingCost: parseFloat(finishingCost.toFixed(2)),
    totalProductionCost: parseFloat(productionCost.toFixed(2)),
    unitCost: parseFloat(unitCostRaw.toFixed(3)),
    cutCount,
    cuttingTimeMinutes: cuttingTimeMin > 0 ? cuttingTimeMin : 1,
    items: finalItems
  };
}

function rowBatchFactor(sheets: number): number {
  // Industrial guillotines cut sheets in batches of ~250-500 sheets at once!
  return Math.ceil(sheets / 300);
}

function createEmptyResult(sw: number, sh: number, pw: number, ph: number): ImpositionResult {
  return {
    sheetWidth: sw,
    sheetHeight: sh,
    printableWidth: pw,
    printableHeight: ph,
    cols: 0,
    rows: 0,
    ups: 0,
    orientation: 'Normal',
    sheetUsagePercent: 0,
    wastePercent: 100,
    sheetsRequired: 0,
    spoilageSheets: 0,
    totalSheets: 0,
    rawMaterialCost: 0,
    printCost: 0,
    finishingCost: 0,
    totalProductionCost: 0,
    unitCost: 0,
    cutCount: 0,
    cuttingTimeMinutes: 0,
    items: []
  };
}
