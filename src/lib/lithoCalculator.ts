/**
 * Lithographic (Offset) Printing Pricing Engine
 * Specialized ERP calculations for sign-shop operations.
 */

export interface LithoPricingOptions {
  /** The cost of a single parent sheet of paper stock (must be non-negative) */
  basePaperCostPerSheet: number;
  /** Ink running cost expressed per 1,000 impressions (must be non-negative) */
  inkCostPerThousand: number;
  /** Fixed cost per plate used on the press towers (must be non-negative) */
  plateCharge: number;
  /** Fixed setup charge representing press crew labor and make-ready sheets (must be non-negative) */
  pressSetupFee: number;
  /** Profit margin markup as a percentage value (e.g. 40 for 40% markup, must be non-negative) */
  desiredMarkupPercent: number;
  /** List of requested target quantities (each quantity must be a positive integer) */
  targetQuantities: number[];
}

export interface LithoPriceBreakTier {
  /** The specific order volume tier requested */
  quantity: number;
  /** Fixed setup costs amortized specifically for this quantity */
  amortizedFixedCostPerUnit: number;
  /** Raw run cost per unit (paper + ink) */
  runningCostPerUnit: number;
  /** The comprehensive actual manufacturer cost of the total run */
  totalManufacturingCost: number;
  /** Selling price for the absolute whole job (rounded to 2 decimal places) */
  totalJobPrice: number;
  /** Selling price for a single unit within this tier (rounded to 4 decimal places for precision) */
  unitPrice: number;
}

export interface LithoPriceBreakResult {
  /** The raw input options used to generate this estimate sheet */
  inputs: Omit<LithoPricingOptions, 'targetQuantities'>;
  /** Tiered results arranged chronologically by quantity */
  priceBreaks: LithoPriceBreakTier[];
}

/**
 * Calculates a tiered volume pricing structure for a litho print run.
 * Amortizes heavy fixed mechanical/chemical setup costs across sequential quantity volumes
 * to display correct scale margins.
 *
 * @param options Litho billing configurations and quantities list.
 * @returns Comprehensive price breakdown metrics.
 * @throws Error when numeric settings are negative, empty quantities lists are provided, or non-integral sizes reside.
 */
export function calculateLithoPriceBreaks(options: LithoPricingOptions): LithoPriceBreakResult {
  if (!options) {
    throw new Error("Options configuration object is required for Litho pricing estimation.");
  }

  const {
    basePaperCostPerSheet,
    inkCostPerThousand,
    plateCharge,
    pressSetupFee,
    desiredMarkupPercent,
    targetQuantities
  } = options;

  // --- Input Validation & Guard Rails ---

  if (typeof basePaperCostPerSheet !== "number" || isNaN(basePaperCostPerSheet) || basePaperCostPerSheet < 0) {
    throw new Error(`Validation Error: basePaperCostPerSheet must be a non-negative number. Provided: ${basePaperCostPerSheet}`);
  }

  if (typeof inkCostPerThousand !== "number" || isNaN(inkCostPerThousand) || inkCostPerThousand < 0) {
    throw new Error(`Validation Error: inkCostPerThousand must be a non-negative number. Provided: ${inkCostPerThousand}`);
  }

  if (typeof plateCharge !== "number" || isNaN(plateCharge) || plateCharge < 0) {
    throw new Error(`Validation Error: plateCharge must be a non-negative number. Provided: ${plateCharge}`);
  }

  if (typeof pressSetupFee !== "number" || isNaN(pressSetupFee) || pressSetupFee < 0) {
    throw new Error(`Validation Error: pressSetupFee must be a non-negative number. Provided: ${pressSetupFee}`);
  }

  if (typeof desiredMarkupPercent !== "number" || isNaN(desiredMarkupPercent) || desiredMarkupPercent < 0) {
    throw new Error(`Validation Error: desiredMarkupPercent must be a non-negative number. Provided: ${desiredMarkupPercent}`);
  }

  if (!Array.isArray(targetQuantities) || targetQuantities.length === 0) {
    throw new Error("Validation Error: targetQuantities must be a non-empty array of numbers.");
  }

  const uniqueSortedQuantities = [...new Set(targetQuantities)].sort((a, b) => a - b);

  // --- Iterative Tier Pricing Amortization ---

  const markupFactor = 1 + (desiredMarkupPercent / 100);
  const totalFixedCosts = plateCharge + pressSetupFee;

  // Unit running ink parameters
  const inkCostPerUnit = inkCostPerThousand / 1000;
  const runningCostPerUnit = basePaperCostPerSheet + inkCostPerUnit;

  const priceBreaks: LithoPriceBreakTier[] = uniqueSortedQuantities.map((quantity) => {
    if (typeof quantity !== "number" || isNaN(quantity)) {
      throw new Error("Validation Error: Quantity list must consist of real numbers.");
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`Validation Error: Quantity tier values must be positive non-zero integers. Provided: ${quantity}`);
    }

    // Amortize fixed prepress setup costs
    const amortizedFixedCostPerUnit = totalFixedCosts / quantity;

    // Combined manufacturing unit values
    const unitManufacturingCost = amortizedFixedCostPerUnit + runningCostPerUnit;
    const totalManufacturingCost = unitManufacturingCost * quantity;

    // Apply the profit markup multiplier
    const totalJobPriceRaw = totalManufacturingCost * markupFactor;
    
    // Financial formatting: Round the main job value to standard cents/currency decimals
    const totalJobPrice = Math.round((totalJobPriceRaw + Number.EPSILON) * 100) / 100;
    
    // Calculate final unit pricing from the rounded overall billable target for continuous balance
    const unitPrice = Math.round((totalJobPrice / quantity + Number.EPSILON) * 10000) / 10000;

    return {
      quantity,
      amortizedFixedCostPerUnit: Math.round((amortizedFixedCostPerUnit + Number.EPSILON) * 10000) / 10000,
      runningCostPerUnit: Math.round((runningCostPerUnit + Number.EPSILON) * 10000) / 10000,
      totalManufacturingCost: Math.round((totalManufacturingCost + Number.EPSILON) * 100) / 100,
      totalJobPrice,
      unitPrice
    };
  });

  return {
    inputs: {
      basePaperCostPerSheet,
      inkCostPerThousand,
      plateCharge,
      pressSetupFee,
      desiredMarkupPercent
    },
    priceBreaks
  };
}
