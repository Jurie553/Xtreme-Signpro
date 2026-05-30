/**
 * Production Routing Task Slippage Generator Utility
 * Automatically designs sequential manufacturing actions for ERP job tickets.
 */

export interface RoutingSlipOptions {
  /** The generic or categorized product identifier (e.g., "NCR Book") */
  productType: string;
  /** Binding mechanical style (e.g., "Book Form (Perforated)", "Glued Pad") */
  bindingType?: string;
  /** True when consecutive tracking serial codes must be printed */
  hasNumbering?: boolean | string; // Handle both true/false and string versions like "true"
  /** The beginning reference sequence code for numbering calibration */
  startingNumber?: number | string;
}

export interface RoutingStep {
  /** Unique sequential identifier e.g., "STEP-001" */
  id: string;
  /** Step order index */
  stepNumber: number;
  /** Target manufacturing department (e.g. "Prepress", "Pressroom", "Bindery", "QC Check") */
  department: string;
  /** Specific instruction details for the machinists and technicians */
  description: string;
  /** High priority indicator for hazardous blocks or critical setup calibrations */
  isHighPriority: boolean;
}

/**
 * Automates the creation of manufacturing checkpoints and routing operations
 * for print production staff. Ensures high-risk or specific binding tasks
 * are explicitly flagged to avoid waste.
 * 
 * @param options Order specifications including category, binding types, and serialization keys
 * @returns Array of sequential routing step tasks
 */
export function generatePrintRoutingSlip(options: RoutingSlipOptions): RoutingStep[] {
  if (!options) {
    throw new Error("Parameters options configuration are required to construct a routing slip.");
  }

  const {
    productType,
    bindingType = "",
    hasNumbering = false,
    startingNumber = ""
  } = options;

  // Track sequential orders
  const steps: RoutingStep[] = [];
  let currentStep = 1;

  const addStep = (dept: string, desc: string, highPriority: boolean = false) => {
    steps.push({
      id: `STEP-${currentStep.toString().padStart(3, '0')}`,
      stepNumber: currentStep,
      department: dept,
      description: desc,
      isHighPriority: highPriority
    });
    currentStep++;
  };

  // --- Step 1: Default Prepress Setup ---
  addStep(
    "Prepress", 
    `Retrieve master template for ${productType}. Calibrate plate setters or digital print queues for correct imposition.`, 
    false
  );

  // --- Step 2: Product Special Rule Mapping ---
  const isNCR = productType.toLowerCase().includes("ncr") || productType.toLowerCase().includes("carbonless");
  const isPerforatedBook = bindingType.toLowerCase().includes("book form (perforated)") || bindingType.toLowerCase().includes("perforated");

  if (isNCR && isPerforatedBook) {
    // Satisfy specific prompt rule 1
    addStep(
      "Pressroom",
      "Pressroom: Set up inline perforation wheels",
      true
    );
    addStep(
      "Bindery",
      "Bindery: Spine stitch/staple block text sheets",
      false
    );
    addStep(
      "Bindery",
      "Bindery: Score and wrap structural wraparound cover",
      false
    );
  } else {
    // Normal print flow fallback for non-special or general NCR jobs
    addStep(
      "Pressroom",
      `Print pages on suitable machine stock matching ${productType} quality guidelines.`,
      false
    );
    if (bindingType) {
      addStep(
        "Bindery",
        `Execute binding operation: Apply standard ${bindingType} instructions.`,
        false
      );
    }
  }

  // --- Step 3: Sequential Numbering Rules ---
  // Ensure we check hasNumbering in multiple representation formats safely (boolean or "true" string)
  const numberingEnabled = hasNumbering === true || String(hasNumbering).toLowerCase() === "true";

  if (numberingEnabled) {
    // Satisfy specific prompt rule 2
    const startNumFormatted = startingNumber !== undefined && startingNumber !== null && String(startingNumber).trim() !== ""
      ? startingNumber
      : "1001"; // Fallback to safe default index if empty
      
    addStep(
      "QC Check",
      `QC Check: Calibrate mechanical numbering head to start precisely at ${startNumFormatted}`,
      true // high priority sequential calibration check
    );
  }

  // --- Step 4: Final Inspection and Packing ---
  addStep(
    "Quality Check",
    "Inspect alignment, cover fold margins, numbering sequences, and package in secure batch shrinkwraps.",
    false
  );

  return steps;
}
