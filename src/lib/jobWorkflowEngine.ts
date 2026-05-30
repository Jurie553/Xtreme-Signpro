import { JobStage, QuoteItem, Product, Material, Machine, PricingSettings } from '../types';

export interface WorkflowStage {
  id: string;
  name: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Delayed';
  operator?: string;
  estimatedDurationMinutes?: number;
  startedAt?: number;
  completedAt?: number;
  notes?: string;
  delayWarning?: boolean;
}

export interface CostingBreakdown {
  materialCost: number;
  machineCost: number;
  laborFinishingCost: number;
  overheadCost: number;
  totalProductionCost: number;
  recommendedPrice: number;
  marginAmount: number;
  marginPercent: number;
  warningState?: 'low-margin' | 'negative-margin' | 'healthy';
}

export interface MaterialAllocation {
  requiredAmount: number;
  unit: string;
  stockLevel: number;
  isShortage: boolean;
  remainingStock: number;
}

/**
 * Automatically generates a structured array of production stages based on product category.
 */
export function generateWorkflowStages(categoryName: string = ''): WorkflowStage[] {
  const normalized = categoryName.trim().toLowerCase();
  
  const commonStages = [
    { id: 'Prepress', name: 'Artwork Pre-flight & Setup', duration: 15 },
    { id: 'Printing', name: 'Press & Printing Run', duration: 45 },
  ];

  let stages: { id: string; name: string; duration: number }[] = [];

  if (normalized.includes('ncr') || normalized.includes('book')) {
    stages = [
      ...commonStages,
      { id: 'Finishing', name: 'Perforation & Seq Numbering', duration: 30 },
      { id: 'Finishing', name: 'Collating & Binding Craft', duration: 60 },
    ];
  } else if (normalized.includes('litho') || normalized.includes('leaflet') || normalized.includes('flyer')) {
    stages = [
      ...commonStages,
      { id: 'Finishing', name: 'High Precision Die Cutting / Slitting', duration: 35 },
      { id: 'Finishing', name: 'Folding & Custom Laminations', duration: 40 },
    ];
  } else if (normalized.includes('sign') || normalized.includes('large format') || normalized.includes('vinyl') || normalized.includes('banner')) {
    stages = [
      ...commonStages,
      { id: 'Laminating', name: 'Roll Protective Lamination', duration: 20 },
      { id: 'Finishing', name: 'Eyeleting, Trimming & Welds', duration: 30 },
    ];
  } else if (normalized.includes('embroidery') || normalized.includes('apparel')) {
    stages = [
      { id: 'Prepress', name: 'Embroidery Vector Digitizing', duration: 30 },
      { id: 'Embroidery', name: 'Multi-head Embroidery Stitching', duration: 90 },
      { id: 'Finishing', name: 'Trim, Clean & Steam', duration: 25 },
    ];
  } else if (normalized.includes('screen') || normalized.includes('screenprint')) {
    stages = [
      { id: 'Prepress', name: 'Exposure & Film Positive Production', duration: 40 },
      { id: 'Screenprinting', name: 'Manual/Carousel Ink Pressing', duration: 60 },
      { id: 'Finishing', name: 'Tunnel Dryer Heat Binding', duration: 15 },
    ];
  } else {
    // Default fallback workflow stages
    stages = [
      ...commonStages,
      { id: 'Finishing', name: 'Finishing & Assembly', duration: 30 },
    ];
  }

  // Append standard checks & terminal stages
  stages.push({ id: 'Quality Check', name: 'Quality Inspection (QA)', duration: 10 });
  stages.push({ id: 'Ready', name: 'Packaging, Labeling & dispatch', duration: 10 });

  return stages.map(s => ({
    id: s.id,
    name: s.name,
    status: 'Pending',
    estimatedDurationMinutes: s.duration,
    notes: ''
  }));
}

/**
 * Calculates high-precision costing breakups for deep ERP operational analytics.
 */
export function calculateItemCostDetails(
  item: QuoteItem,
  product?: Product,
  material?: Material,
  machine?: Machine,
  settings?: PricingSettings
): CostingBreakdown {
  const qty = item.quantity || 1;
  const widthMm = item.width || 0;
  const lengthMm = item.length || 0;
  
  // Calculate raw dimensions
  const areaSqm = (widthMm * lengthMm) / 1000000;
  const totalAreaSqm = areaSqm * qty;

  const isAreaCosting = (item.type === 'Product' && product?.costingMethod === 'Area') ||
                        (item.type === 'Material' && (material?.unit === 'm²' || material?.unit === 'sqm'));

  // 1. Raw Material Cost calculation
  let materialCost = 0;
  if (item.type === 'Material') {
    const costPerUnit = material?.costPrice || item.unitCost || 0;
    materialCost = isAreaCosting ? totalAreaSqm * costPerUnit : qty * costPerUnit;
  } else {
    const rawCost = material?.costPrice || item.unitCost || 0;
    materialCost = isAreaCosting ? totalAreaSqm * rawCost : qty * rawCost;
  }

  // 2. Machine Operational Run Costs
  let machineCost = 0;
  if (item.type === 'Product' && machine) {
    const costPerHour = machine.costPerHour || machine.hourlyRate || 0;
    if (machine.costUnit === 'hr') {
      const setupTimeHr = (product?.setupTime || 0) / 60;
      machineCost = setupTimeHr * costPerHour;
    } else if (machine.costUnit === 'm²') {
      machineCost = totalAreaSqm * costPerHour;
    } else {
      machineCost = qty * costPerHour;
    }
  }

  // 3. Labor & Core Finishing markup
  let laborCost = 0;
  if (item.type === 'Product' && product) {
    // Estimate labor costs based on setup minutes
    laborCost = (product.setupTime || 15) * 2.50; // R2.50 per minute standard labor coefficient
  }

  // 4. Overheads cushion (10%)
  const rawSubtotal = materialCost + machineCost + laborCost;
  const overheadCost = rawSubtotal * 0.10;

  const totalProductionCost = rawSubtotal + overheadCost;

  // Recommended price based on active markup settings
  const activeMarkupPercent = product?.markupPercent || settings?.materialMarkupPercent || 40;
  const recommendedPrice = totalProductionCost * (1 + (activeMarkupPercent / 100));

  // Determine actual margins relative to sell price set by user (Excluding VAT)
  const actualSellPriceNoVat = (item.totalPrice || 0) / 1.15; // ZAR vat factor
  const marginAmount = actualSellPriceNoVat - totalProductionCost;
  const marginPercent = actualSellPriceNoVat > 0 ? (marginAmount / actualSellPriceNoVat) * 100 : 0;

  let warningState: CostingBreakdown['warningState'] = 'healthy';
  if (marginPercent < 0) {
    warningState = 'negative-margin';
  } else if (marginPercent < 20) {
    warningState = 'low-margin';
  }

  return {
    materialCost,
    machineCost,
    laborFinishingCost: laborCost,
    overheadCost,
    totalProductionCost,
    recommendedPrice,
    marginAmount,
    marginPercent,
    warningState
  };
}

/**
 * Checks materials allocation requirements and provides shortage alerts.
 */
export function checkMaterialAllocation(
  item: QuoteItem,
  material?: Material
): MaterialAllocation | null {
  if (!material) return null;

  const qty = item.quantity || 1;
  const widthMm = item.width || 0;
  const lengthMm = item.length || 0;
  const areaSqm = (widthMm * lengthMm) / 1000000;
  const totalAreaSqm = areaSqm * qty;

  const isAreaUnit = material.unit === 'm²' || material.unit === 'sqm' || material.unit === 'roll';
  const requiredAmount = isAreaUnit ? totalAreaSqm : qty;

  const stockLevel = material.stockLevel || 0;
  const isShortage = stockLevel < requiredAmount;
  const remainingStock = Math.max(0, stockLevel - requiredAmount);

  return {
    requiredAmount,
    unit: material.unit || 'units',
    stockLevel,
    isShortage,
    remainingStock
  };
}
