/**
 * NCR (No Carbon Required) Printing Material Calculator
 * Specialized utility for print manufacturing ERP workflows.
 */

export interface NCRRequiredMaterialsOptions {
  /** Total number of books ordered (must be a positive integer) */
  booksOrdered: number;
  /** Number of carbonless sets per book (e.g., 50 or 100, must be a positive integer) */
  setsPerBook: number;
  /** Number of parts per set (e.g., 2 for Duplicate, 3 for Triplicate, must be a positive integer >= 1) */
  partsCount: number;
  /** Waste buffer percentage as a decimal (e.g., 0.05 for 5%, must be non-negative) */
  wasteBufferPercentage?: number;
}

export interface NCRMaterialsResult {
  /** Net sheets required per single color layer (before waste buffer) */
  netSheetsPerColorLayer: number;
  /** Total physical sheets required per single color layer (including waste, rounded up for production) */
  totalSheetsPerColorLayer: number;
  /** Total combined physical sheets required for the entire press run (across all layers) */
  totalOverallSheets: number;
  /** Detailed breakdown of the calculated waste margin sheets */
  wasteBreakdown: {
    /** The waste percentage applied (multiplier format, e.g., 0.05) */
    percentageUsed: number;
    /** Raw fractional waste sheets per color layer */
    rawWastePerLayer: number;
    /** Rounded up waste sheets per color layer used in production */
    roundedWastePerLayer: number;
    /** Total physical waste sheets combined across all color layers */
    totalWasteSheetsCombined: number;
  };
}

/**
 * Calculates the exact material requirements for an NCR Book printing run.
 * Handles duplicate, triplicate, quadruplicate, and multi-part custom configurations
 * with manufacturing waste buffer allowances.
 *
 * @param options Calculation parameters including books ordered, sets per book, parts count, and waste buffer.
 * @returns Detailed physical material break-downs and waste sheets counters.
 * @throws Error when validation thresholds are violated (e.g., negative/zero values, missing parameters).
 */
export function calculateNCRRequiredMaterials(options: NCRRequiredMaterialsOptions): NCRMaterialsResult {
  if (!options) {
    throw new Error("Options configuration object is required for NCR material calculation.");
  }

  const {
    booksOrdered,
    setsPerBook,
    partsCount,
    wasteBufferPercentage = 0.05, // Default to 5% waste buffer if not specified
  } = options;

  // --- Input Validation & Guard Rails ---
  
  // 1. Books Ordered validation
  if (typeof booksOrdered !== "number" || isNaN(booksOrdered)) {
    throw new Error("Invalid input: booksOrdered must be a valid number.");
  }
  if (!Number.isInteger(booksOrdered) || booksOrdered <= 0) {
    throw new Error(`Validation Error: booksOrdered must be a positive integer. Provided value: ${booksOrdered}`);
  }

  // 2. Sets Per Book validation
  if (typeof setsPerBook !== "number" || isNaN(setsPerBook)) {
    throw new Error("Invalid input: setsPerBook must be a valid number.");
  }
  if (!Number.isInteger(setsPerBook) || setsPerBook <= 0) {
    throw new Error(`Validation Error: setsPerBook must be a positive integer. Provided value: ${setsPerBook}`);
  }

  // 3. Parts Count validation
  if (typeof partsCount !== "number" || isNaN(partsCount)) {
    throw new Error("Invalid input: partsCount must be a valid number.");
  }
  if (!Number.isInteger(partsCount) || partsCount <= 0) {
    throw new Error(`Validation Error: partsCount must be a positive integer representing the layers (e.g. 2 for Duplicate, 3 for Triplicate). Provided value: ${partsCount}`);
  }

  // 4. Waste Buffer Percentage validation
  if (typeof wasteBufferPercentage !== "number" || isNaN(wasteBufferPercentage)) {
    throw new Error("Invalid input: wasteBufferPercentage must be a valid number.");
  }
  if (wasteBufferPercentage < 0) {
    throw new Error(`Validation Error: wasteBufferPercentage cannot be negative. Provided value: ${wasteBufferPercentage}`);
  }

  // --- Core Manufacturing Calculations ---

  // Net sheets required per carbon color layer (e.g., White top layer, Yellow bottom layer)
  const netSheetsPerColorLayer = booksOrdered * setsPerBook;

  // Calculate waste amount
  const rawWastePerLayer = netSheetsPerColorLayer * wasteBufferPercentage;
  // In sheet-fed offset and digital production, we deal with whole physical paper sheets.
  // Therefore, we round up waste sheets to the nearest integer for absolute security.
  const roundedWastePerLayer = Math.ceil(rawWastePerLayer);

  // Total sheets per color layer (Net + Rounded Waste)
  const totalSheetsPerColorLayer = netSheetsPerColorLayer + roundedWastePerLayer;

  // Total overall physical sheets required for the continuous press run across all parts
  const totalOverallSheets = totalSheetsPerColorLayer * partsCount;

  // Total waste sheets combined across all color layers
  const totalWasteSheetsCombined = roundedWastePerLayer * partsCount;

  return {
    netSheetsPerColorLayer,
    totalSheetsPerColorLayer,
    totalOverallSheets,
    wasteBreakdown: {
      percentageUsed: wasteBufferPercentage,
      rawWastePerLayer,
      roundedWastePerLayer,
      totalWasteSheetsCombined,
    }
  };
}
