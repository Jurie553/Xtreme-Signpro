import { Material } from '../../types';

export interface MaterialValidationError {
  name?: string;
  category?: string;
  unit?: string;
  costPrice?: string;
  sellPerSqm?: string;
  stockLevel?: string;
  minStock?: string;
  sku?: string;
}

export function validateMaterial(data: Partial<Material>): MaterialValidationError {
  const errors: MaterialValidationError = {};

  if (!data.name || !data.name.trim()) {
    errors.name = 'Material name is required.';
  } else if (data.name.length > 100) {
    errors.name = 'Material name must be under 100 characters.';
  }

  if (!data.category) {
    errors.category = 'Classification/Category is required.';
  }

  if (!data.unit) {
    errors.unit = 'Billing metric/unit is required.';
  }

  if (data.costPrice === undefined || isNaN(Number(data.costPrice)) || Number(data.costPrice) <= 0) {
    errors.costPrice = 'Cost price must be greater than zero.';
  }

  if (data.sellPerSqm === undefined || isNaN(Number(data.sellPerSqm)) || Number(data.sellPerSqm) <= 0) {
    errors.sellPerSqm = 'Selling price must be greater than zero.';
  }

  if (data.stockLevel === undefined || isNaN(Number(data.stockLevel)) || Number(data.stockLevel) < 0) {
    errors.stockLevel = 'Current stock level cannot be negative.';
  }

  if (data.minStock === undefined || isNaN(Number(data.minStock)) || Number(data.minStock) < 0) {
    errors.minStock = 'Reorder level cannot be negative.';
  }

  if (data.sku && data.sku.trim().length > 30) {
    errors.sku = 'SKU should be under 30 characters.';
  }

  return errors;
}

export function sanitizeMaterial(data: Partial<Material>, defaultSupplierId: string): Omit<Material, 'id'> {
  const cost = Number(data.costPrice) || 0;
  const sell = Number(data.sellPerSqm) || 0;
  
  // Create warehouse location details if not already present
  const wh = data.warehouse || 'Warehouse Alpha';
  const rk = data.rack || '03';
  const sh = data.shelf || 'B';
  const bn = data.bin || '14';
  const locationCombined = data.location || `${wh} (Rack ${rk}, Shelf ${sh}, Bin ${bn})`;

  return {
    name: (data.name || '').trim(),
    category: data.category || 'Print Media',
    unit: data.unit || 'm²',
    costPrice: cost,
    costPerSqm: Number(data.costPerSqm) || cost,
    sellPerSqm: sell,
    stockLevel: Number(data.stockLevel) || 0,
    minStock: Number(data.minStock) || 0,
    reorderLevel: Number(data.minStock) || 0,
    supplierId: data.supplierId || defaultSupplierId || '',
    location: locationCombined,

    // Rich tech details
    thickness: data.thickness || '',
    materialType: data.materialType || '',
    printMethods: data.printMethods || [],
    inkTypes: data.inkTypes || [],
    printingConsiderations: data.printingConsiderations || '',
    conversions: data.conversions || {},

    sku: data.sku || `MAT-${Math.floor(1000 + Math.random() * 9000)}`,
    barcode: data.barcode || `9${Math.floor(100000000 + Math.random() * 900000000)}7`,
    finish: data.finish || 'Glossy',
    texture: data.texture || 'Smooth',
    width: Number(data.width) || 1.37,
    rollLength: Number(data.rollLength) || 50,
    gsm: Number(data.gsm) || 120,
    durabilityYears: Number(data.durabilityYears) || 3,
    indoorOutdoor: data.indoorOutdoor || 'Both',
    warehouse: wh,
    rack: rk,
    shelf: sh,
    bin: bn,
    reservedStock: Number(data.reservedStock) || 0,
    incomingStock: Number(data.incomingStock) || 0,
    damagedStock: Number(data.damagedStock) || 0,
    lastPurchasePrice: Number(data.lastPurchasePrice) || cost,
    pricingTrends: data.pricingTrends || [100, 102, 98, 105, 100],
    offcuts: data.offcuts || [],
    scratchResistance: Number(data.scratchResistance) || 4,
    waterproofRating: Number(data.waterproofRating) || 5,
    fireRating: data.fireRating || 'Class B1',
    fadeResistance: Number(data.fadeResistance) || 4,
    imageUrl: data.imageUrl || '',
  };
}
