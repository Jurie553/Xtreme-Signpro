import { PricingSettings } from '../types';

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  id: 'global-pricing',
  expressSurchargeType: 'percentage',
  expressSurchargeValue: 15, // 15% premium by default
  vatRate: 15,
  currency: 'ZAR',
  // NCR Defaults
  ncrBaseRate: 45.00,
  ncrSizeFactors: {
    'A4': 1.0,
    'A5': 0.6,
    'A6': 0.4,
    'DL': 0.35,
  },
  ncrPartFactors: {
    '2-part': 1.0,
    '3-part': 1.5,
    '4-part': 2.0,
  },
  ncrPrintFactors: {
    'Greyscale': 1.0,
    'Full Colour': 1.6,
  },
  ncrBindingRates: {
    'Glued': 15.00,
    'Stapled & Tabbed': 25.00,
  },
  ncrVolumeDiscounts: [
    { minQty: 200, discount: 0.45 },
    { minQty: 100, discount: 0.35 },
    { minQty: 50, discount: 0.25 },
    { minQty: 20, discount: 0.15 },
    { minQty: 10, discount: 0.08 },
  ],
  ncrSets100Factor: 1.8,
  ncrNumberingFee: 8.50,
  ncrPerforationFee: 4.00,
  ncrCoverFee: 12.00,
  materialMarkupPercent: 40,
};

export const calculateQuoteTotals = (
  items: { totalPrice: number; totalCost: number; basePrice?: number }[],
  isExpress: boolean,
  settings: PricingSettings
) => {
  const baseSubtotal = items.reduce((sum, item) => sum + ((item.basePrice !== undefined ? item.basePrice : item.totalPrice) || 0), 0);
  const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const totalCost = items.reduce((sum, item) => sum + (item.totalCost || 0), 0);
  const totalDiscount = Math.max(0, baseSubtotal - subtotal);
  
  let expressSurcharge = 0;
  if (isExpress) {
    if (settings.expressSurchargeType === 'percentage') {
      expressSurcharge = subtotal * (settings.expressSurchargeValue / 100);
    } else {
      expressSurcharge = settings.expressSurchargeValue;
    }
  }

  const taxableAmount = subtotal + expressSurcharge;
  const vat = taxableAmount * (settings.vatRate / 100);
  const total = taxableAmount + vat;
  const profit = taxableAmount - totalCost;

  return {
    baseSubtotal,
    totalDiscount,
    subtotal,
    expressSurcharge,
    vat,
    total,
    profit
  };
};

export const getActivePricingSettings = (settingsList: PricingSettings[]): PricingSettings => {
  if (!settingsList || settingsList.length === 0) return DEFAULT_PRICING_SETTINGS;
  return settingsList.find(s => s.id === 'pricing') || settingsList[0] || DEFAULT_PRICING_SETTINGS;
};

export const calculateNCRPrice = (
  settings: PricingSettings,
  size: string,
  parts: string,
  print: string,
  quantity: number,
  hasNumbering: boolean,
  hasPerforation: boolean,
  hasCover: boolean
) => {
  const sizeFactor = settings.ncrSizeFactors[size] || 1.0;
  const partFactor = settings.ncrPartFactors[parts] || 1.0;
  const printFactor = settings.ncrPrintFactors[print] || 1.0;
  
  // Base unit price calculation
  let unitPrice = settings.ncrBaseRate * sizeFactor * partFactor * printFactor;
  
  // Apply volume discounts
  const discount = settings.ncrVolumeDiscounts
    .sort((a, b) => b.minQty - a.minQty)
    .find(d => quantity >= d.minQty)?.discount || 0;
    
  unitPrice = unitPrice * (1 - discount);
  
  // Add fees per unit
  let unitFees = 0;
  if (hasNumbering) unitFees += settings.ncrNumberingFee;
  if (hasPerforation) unitFees += settings.ncrPerforationFee;
  if (hasCover) unitFees += settings.ncrCoverFee;
  
  const totalPrice = (unitPrice + unitFees) * quantity;
  const markup = 1 + ((settings.materialMarkupPercent ?? 40) / 100);
  const costPrice = totalPrice / markup;
  
  return {
    unitPrice: unitPrice + unitFees,
    totalPrice,
    costPrice
  };
};
