export type JobStage = 'Prepress' | 'Printing' | 'Laminating' | 'Finishing' | 'Quality Check' | 'Ready' | 'Delivered' | 'Cancelled' | 'Embroidery' | 'Screenprinting';
export type JobPriority = 'Normal' | 'High' | 'Urgent';
export type CostingMethod = 'Area' | 'Per Item' | 'NCR' | 'Hourly' | 'Page';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsappNumber?: string;
  companyName?: string;
  address?: string;
  vatNumber?: string;
  zohoCustomerId?: string;
  zohoSyncStatus?: 'Not Synced' | 'Synced' | 'Error';
  createdAt: number;
  // Additional fields
  contactPerson?: string;
  mobile?: string;
  billingAddress?: string;
  shippingAddress?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  notes?: string;
  customerType?: string;
  paymentTerms?: string;
  creditLimit?: number;
  activeStatus?: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  leadTime: string;
  categories: string[];
  status: 'Active' | 'Inactive';
}

export interface Material {
  id: string;
  name: string;
  category: string;
  stockLevel: number;
  minStock: number;
  unit: string;
  costPrice: number;
  costPerSqm?: number;
  sellPerSqm?: number;
  location: string;
  supplierId: string;
  thickness?: string;
  materialType?: string;
  printMethods?: string[];
  inkTypes?: string[];
  printingConsiderations?: string;
  conversions?: Record<string, number>;
  
  // Enhanced Substrate / Subsystem elements
  sku?: string;
  barcode?: string;
  finish?: 'Glossy' | 'Matte' | 'Frosted' | 'Satin' | 'Textured';
  texture?: string;
  width?: number; // meters
  rollLength?: number; // meters
  gsm?: number;
  durabilityYears?: number;
  indoorOutdoor?: 'Indoor' | 'Outdoor' | 'Both';
  warehouse?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
  reservedStock?: number;
  incomingStock?: number;
  damagedStock?: number;
  lastPurchasePrice?: number;
  pricingTrends?: number[];
  offcuts?: { id: string; width: number; length: number; area: number; notes?: string }[];
  printCompatibility?: string[];
  scratchResistance?: number;
  waterproofRating?: number;
  fireRating?: string;
  fadeResistance?: number;
  reorderLevel?: number;
  usageVelocity?: number;
  wastePercent?: number;
  imageUrl?: string;
}

export interface Machine {
  id: string;
  name: string;
  type: string;
  maxWidth?: number;
  speed?: string;
  costPerHour?: number;
  costPerCopy?: number;
  hourlyRate?: number;
  costUnit: 'hr' | 'm²' | 'item' | 'copy' | 'page';
  status: 'Active' | 'Idle' | 'Maintenance';
  utilization?: number;
  lastMaintenanceDate?: number;
  nextMaintenanceDate?: number;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  color: string; // For categorization on board
  createdAt: number;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string;
  icon?: string;
  active: boolean;
  productGroup?: string;
  defaultWorkflow?: string[];
  defaultCostingRules?: any;
  compatibleMaterials?: string[];
  requiredFields?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  defaultMachineId: string;
  defaultMaterialId?: string;
  defaultDepartmentId?: string;
  setupTime: number; // in minutes
  markupPercent: number;
  costingMethod: CostingMethod;
  dimensions?: string;
  minimumOrderQuantity?: number;
  turnaroundTime?: string;
  finishingOptions?: string[];
  
  // Standardized database fields
  categoryId?: string;
  categoryName?: string;
  productName?: string;
  productType?: string;
  specs?: any;
  pricingRules?: any;
  productionWorkflow?: string[];
  materialRequirements?: any;
  active?: boolean;
  createdAt?: number;
  updatedAt?: number;

  // Re-engineered additional fields
  department?: string;
  defaultSize?: string;
  allowCustomSize?: boolean;
  materialIds?: string[];
  paperStockIds?: string[];
  finishingOptionIds?: string[];
  machineIds?: string[];
  baseCost?: number;
  markupPercentage?: number;
  vatApplicable?: boolean;
  minimumCharge?: number;
  imageUrl?: string;
  isActive?: boolean;
  isArchived?: boolean;
  notes?: string;
  defaultQuantities?: string; // e.g. "100, 250, 500, 1000"
}

export interface SignageProduct extends Product {
  subtitle: string;
  substrateOptions: string[];
  environmentTags: string[];
  basePriceRate: number; // Price per m²
  thicknessOptions: string[];
}

export interface QuoteItem {
  id: string;
  type: 'Product' | 'Material' | 'NCR' | 'Package' | 'Litho';
  originId: string;
  productId?: string; // Keep for backward compatibility or refactor later
  productName?: string;
  categoryId?: string;
  categoryName?: string;
  productType?: string;
  specsSnapshot?: any;
  costingSnapshot?: any;
  materialId?: string;
  machineId?: string;
  description: string;
  width?: number; // in mm
  length?: number; // in mm
  quantity: number;
  unitCost: number;
  totalCost: number;
  discountType?: 'percentage' | 'amount';
  discountValue?: number;
  basePrice?: number;
  totalPrice: number;
  startNumber?: string;
  endNumber?: string;
  perforationPosition?: string;
  bindingType?: string;
  bindingPosition?: string;
  firstPageColor?: string;
  secondPageColor?: string;
  lastPageColor?: string;
}

export interface PricingSettings {
  id: string;
  expressSurchargeType: 'percentage' | 'flat';
  expressSurchargeValue: number;
  vatRate: number;
  currency: string;
  // NCR Specific Pricing
  ncrBaseRate: number;
  ncrSizeFactors: Record<string, number>;
  ncrPartFactors: Record<string, number>;
  ncrPrintFactors: Record<string, number>;
  ncrBindingRates: Record<string, number>;
  ncrVolumeDiscounts: { minQty: number; discount: number }[];
  ncrSets100Factor: number;
  ncrNumberingFee: number;
  ncrPerforationFee: number;
  ncrCoverFee: number;
  materialMarkupPercent: number;
}

export interface CompanySettings {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  vatNumber?: string;
  registrationNumber?: string;
  bankName?: string;
  accountNumber?: string;
  branchCode?: string;
  website?: string;
  logoUrl?: string;
  jobCardPrefix?: string;
  // Messaging Templates
  quoteEmailTemplate?: string;
  quoteWhatsappTemplate?: string;
  jobEmailTemplate?: string;
  jobWhatsappTemplate?: string;
  // Artwork Approval Templates
  artworkEmailTemplate?: string;
  artworkWhatsappTemplate?: string;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  clientId: string;
  items: QuoteItem[];
  subtotal: number;
  isExpress: boolean;
  expressSurcharge: number;
  vat: number;
  total: number;
  profit: number;
  notes?: string;
  status: 'Draft' | 'Sent' | 'Viewed' | 'Accepted' | 'Rejected' | 'Expired';
  expiryDate: number;
  createdAt: number;
  zohoEstimateId?: string;
  zohoSynced?: boolean;
  zohoSyncDate?: number;
}

export interface NCRPricingTier {
  quantity: number;
  cost: number;
  sell: number;
}

export interface NCRBook {
  id: string;
  name: string;
  description: string;
  parts: string;
  setsPerBook: number;
  size: string;
  binding: string;
  print: string;
  options: string[];
  paperWeight?: string;
  coverType?: string;
  turnaroundTime?: string;
  pricingGrid: NCRPricingTier[];
  layers?: Array<{ id: number; color: string; purpose: string; printSide: 'single' | 'double' }>;
  status: 'Active' | 'Archived';
  createdAt: number;
}

export interface PackageItem {
  label: string;
  price: number;
}

export interface Package {
  id: string;
  name: string;
  description: string;
  featured: boolean;
  items: PackageItem[];
  fullPrice: number;
  packagePrice: number;
  savings: number;
  savingsPercent: number;
  category: string;
  leadTime?: string;
  targetAudience?: string;
  status: 'Active' | 'Inactive';
  createdAt: number;
}

export interface LithoPricingTier {
  quantity: number;
  cost: number;
  sell: number;
}

export interface LithoProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  size: string; // Finished size
  paperType: string;
  finishing?: string;
  colorProfile?: string;
  bleedRequirement?: string;
  turnaroundTime?: string;
  pricingGrid: LithoPricingTier[];
  status: 'Active' | 'Archived';
  createdAt: number;
  
  // Enterprise Specifications
  finishedSize?: string;
  flatSize?: string;
  openSize?: string;
  orientation?: 'Portrait' | 'Landscape' | 'Square';
  foldType?: string;
  numberOfPages?: number;
  sidesPrinted?: 'Single Sided' | 'Double Sided';
  colorConfig?: string;
  paperGsm?: number;
  paperFinish?: string; // Gloss, Matt, Uncoated, Satin
  coatingType?: string; // Aqueous, Machine Varnish, UV Flood, None
  laminationType?: 'Gloss' | 'Matt' | 'Soft Touch' | 'None';
  spotUv?: boolean;
  foiling?: boolean;
  foilingColor?: string;
  embossing?: boolean;
  dieCutting?: boolean;
  perforation?: boolean;
  numberingEnabled?: boolean;
  numberingStart?: string;
  ncrSetsEnabled?: boolean;
  bindingType?: string; // Perfect Bind, Saddle Stitch, Wire-O, Fold Only, None
  packagingMethod?: string; // Kraft Wrap, Shrinkwrap, Boxed, Banded
  
  // Sheet Optimization & Imposition
  sheetOptimization?: {
    optimalSheetSize?: string;
    pressSize?: string;
    upsPerSheet?: number;
    wastePercent?: number;
    rotationAngle?: number;
    grainDirection?: 'Short' | 'Long';
    layoutRows?: number;
    layoutCols?: number;
    totalSheetsRequired?: number;
  };

  // Preflight Status
  preflight?: {
    status: 'PASS' | 'FAIL' | 'UNCHECKED';
    checkedAt?: number;
    dpi?: number;
    bleedOk?: boolean;
    cmykMode?: boolean;
    fontsOutlined?: boolean;
    transparencyWarning?: boolean;
    safeAreaOk?: boolean;
    overprintOk?: boolean;
    issues?: string[];
  };

  // Client Approval Hub
  clientApproval?: {
    approved: boolean;
    status: 'Pending' | 'Approved' | 'Changes Requested';
    clientComments?: string;
    approvedBy?: string;
    approvedAt?: number;
    digitalSignature?: string;
    proofUrl?: string;
  };

  // Dedicated Production Stages
  workflowStages?: {
    id: string;
    name: string;
    status: 'Pending' | 'In Progress' | 'Completed' | 'Delayed';
    operator?: string;
    estimatedDurationMinutes?: number;
    startedAt?: number;
    completedAt?: number;
    notes?: string;
    delayWarning?: boolean;
  }[];
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  materialId: string;
  quantity: number;
  rollWidth?: number;
  rollLength?: number;
  totalM2?: number;
  orderDate: number;
  expectedDate: number;
  status: 'Sent' | 'Received' | 'Cancelled';
  totalCost: number;
}

export interface NCRLayer {
  id: string;
  name: string; // Layer Name (e.g. Original, Office Copy, Client Copy, File Copy)
  purpose: string; // Copy purpose
  color: 'White' | 'Pink' | 'Yellow' | 'Blue' | 'Green' | 'Custom';
  customColor?: string; // Custom hex or name
  paperType: 'CB' | 'CFB' | 'CF'; // Coated Back, Coated Front & Back, Coated Front
  gsm: number; // GSM/Grammage (e.g. 53, 57, 60, 80)
  printSides: 'Front Only' | 'Front + Back' | 'Back Only' | 'None';
  inkConfig: 'Single Color Black' | 'Single Color Blue' | 'Double Sided K/K' | 'Full Colour' | 'Custom';
  customInkConfig?: string;
  numberingReq: 'Sequential' | 'Shared' | 'Unique' | 'None';
  startNumber?: string;
  endNumber?: string;
  prefix?: string;
  suffix?: string;
  numberColor?: 'Red' | 'Black' | 'Blue';
  numberPosition?: 'Top Right' | 'Bottom Right' | 'Top Left' | 'Custom';
  perforationReq: boolean;
  perforationNotes?: string;
  bindingInstructions?: string;
  variableDataReq: boolean;
  specialInstructions?: string;
}

export interface NCRCostBreakdown {
  paperCost: number;
  printCost: number;
  numberingCost: number;
  collationCost: number;
  bindingCost: number;
  perforationCost: number;
  finishingCost: number;
  totalProductionCost: number;
  marginPercent: number;
  suggestedSellPrice: number;
}

export interface NCRStockAllocation {
  materialId: string;
  materialName: string;
  reservedQty: number;
  available: boolean;
  substituteName?: string;
}

export interface JobTemplate {
  id: string;
  name: string;
  description?: string;
  productName: string;
  departmentId?: string;
  items?: QuoteItem[];
  ncrDetails?: {
    paperColors: string;
    startNumber: string;
    endNumber: string;
    perforationPosition?: string;
    bindingType?: string;
    bindingPosition?: string;
    // Enhanced NCR parameters
    layers?: NCRLayer[];
    setsCount?: number;
    booksCount?: number;
    setsPerBook?: number;
    totalSets?: number;
    bindingEdge?: 'Top' | 'Left' | 'Right' | 'Bottom';
    coverType?: 'Softback' | 'Hardback' | 'Board' | 'None';
    costBreakdown?: NCRCostBreakdown;
    stockAllocation?: NCRStockAllocation[];
  };
  notes?: string;
  createdAt: number;
}

export interface Job {
  id: string;
  jobNumber: string;
  quoteId?: string;
  clientId: string;
  clientName: string;
  productName: string;
  departmentId?: string;
  zohoInvoiceId?: string;
  zohoInvoiceNumber?: string;
  zohoSynced?: boolean;
  zohoSyncDate?: number;
  artwork?: {
    id: string;
    url: string;
    name: string;
    status: 'Pending' | 'Approved' | 'Changes Requested';
    version: number;
    uploadedAt: number;
    feedback?: string; // Kept for legacy compatibility
    comments?: {
      id: string;
      text: string;
      author: 'Client' | 'Staff' | 'System';
      createdAt: number;
    }[];
  }[];
  items?: QuoteItem[];
  total?: number;
  profit?: number;
  stage: JobStage;
  status?: 'Active' | 'Completed';
  priority: JobPriority;
  dueDate: number;
  assignedMachineId?: string;
  artworkStatus: 'Pending' | 'Approved' | 'N/A' | 'Changes Requested';
  artworkDeadline?: number;
  artworkApprovedAt?: number;
  completionPhotos?: {
    id: string;
    url: string;
    uploadedAt: number;
    notes?: string;
  }[];
  productionSteps?: string[];
  designReferenceImageUrl?: string;
  ncrDetails?: {
    paperColors: string;
    startNumber: string;
    endNumber: string;
    perforationPosition?: string;
    bindingType?: string;
    bindingPosition?: string;
    // Enhanced NCR parameters
    layers?: NCRLayer[];
    setsCount?: number;
    booksCount?: number;
    setsPerBook?: number;
    totalSets?: number;
    bindingEdge?: 'Top' | 'Left' | 'Right' | 'Bottom';
    coverType?: 'Softback' | 'Hardback' | 'Board' | 'None';
    costBreakdown?: NCRCostBreakdown;
    stockAllocation?: NCRStockAllocation[];
  };
  notes?: string;
  createdAt: number;
  updatedAt?: number;
}
